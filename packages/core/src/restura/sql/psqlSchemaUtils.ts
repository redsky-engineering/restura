import getDiff from '@wmfs/pg-diff-sync';
import pgInfo from '@wmfs/pg-info';
import pg from 'pg';
import {
	foreignKeyColumns,
	foreignKeyRefColumns,
	indexColumnOpclass,
	indexColumnText,
	pgTruncate,
	type ColumnData,
	type ForeignKeyData,
	type IndexColumnData,
	type ResturaSchema
} from '../schemas/resturaSchema.js';
import { DynamicObject, RequesterDetails } from '../types/customExpressTypes.js';
import { PsqlPool } from './PsqlPool.js';
import { escapeColumnName } from './PsqlUtils.js';

const { Client } = pg;

export const systemUser: RequesterDetails = {
	role: '',
	scopes: [],
	host: '',
	ipAddress: '',
	isSystemUser: true
};

export function schemaToPsqlType(column: ColumnData): string {
	if (column.hasAutoIncrement) return 'BIGSERIAL';
	if (column.type === 'ENUM') return 'TEXT';
	if (column.type === 'DATETIME') return 'TIMESTAMPTZ';
	if (column.type === 'MEDIUMINT') return 'INT';
	return column.type;
}

export function buildIndexColumnSql(entry: IndexColumnData, method: string, order: string): string {
	const text = indexColumnText(entry);
	const opclass = indexColumnOpclass(entry);
	let sql = /^[A-Za-z_][A-Za-z0-9_$]*$/.test(text) ? `"${text}"` : text;
	if (opclass) sql += ` ${opclass}`;
	if (method === 'btree') sql += ` ${order}`;
	return sql;
}

export function buildForeignKeyClause(foreignKey: ForeignKeyData): string {
	const columns = foreignKeyColumns(foreignKey);
	const refColumns = foreignKeyRefColumns(foreignKey);
	// Zod already refines this; a schema object built in TypeScript never goes through parse.
	if (columns.length === 0 || columns.length !== refColumns.length) {
		throw new Error(
			`Foreign key "${foreignKey.name}" must declare an equal, non-zero number of columns and refColumns`
		);
	}
	const columnList = columns.map((column) => `"${column}"`).join(', ');
	const refColumnList = refColumns.map((column) => `"${column}"`).join(', ');
	return (
		`FOREIGN KEY (${columnList}) REFERENCES "${foreignKey.refTable}" (${refColumnList})` +
		` ON DELETE ${foreignKey.onDelete} ON UPDATE ${foreignKey.onUpdate}`
	);
}

export const OUTBOX_TABLE_NAME = 'dbEventOutbox';
export const DEFAULT_OUTBOX_CHANNEL = 'restura_outbox';

// Columns whose names suggest secrets are excluded from trigger payloads (OWASP never-log list)
const SENSITIVE_COLUMN_PATTERN = /password|token|secret|credential|guid|key$/i;

export function isSensitiveColumnName(columnName: string): boolean {
	return SENSITIVE_COLUMN_PATTERN.test(columnName);
}

export interface TriggerSqlOptions {
	delivery?: 'direct' | 'outbox';
	channel?: string;
	tableColumns?: string[];
	columnTypes?: Record<string, string>;
}

export interface SchemaGenerationOptions {
	eventDelivery?: 'direct' | 'outbox';
	outboxChannel?: string;
}

export function createOutboxTableSql(): string {
	return `
CREATE TABLE IF NOT EXISTS "${OUTBOX_TABLE_NAME}"
(
	"id" BIGSERIAL PRIMARY KEY,
	"createdOn" TIMESTAMPTZ NOT NULL DEFAULT now(),
	"tableName" TEXT NOT NULL,
	"operation" TEXT NOT NULL,
	"recordId" BIGINT NULL,
	"record" JSONB NULL,
	"previousRecord" JSONB NULL,
	"queryMetadata" JSONB NULL,
	"processedOn" TIMESTAMPTZ NULL,
	"attempts" INT NOT NULL DEFAULT 0,
	"nextAttemptOn" TIMESTAMPTZ NULL,
	"isDeadLetter" BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS "${OUTBOX_TABLE_NAME}_unprocessed_index" ON "${OUTBOX_TABLE_NAME}" ("id") WHERE "processedOn" IS NULL AND "isDeadLetter" = FALSE;
CREATE INDEX IF NOT EXISTS "${OUTBOX_TABLE_NAME}_processedOn_index" ON "${OUTBOX_TABLE_NAME}" ("processedOn") WHERE "processedOn" IS NOT NULL;
`;
}

type NotifyConfig = ResturaSchema['database'][0]['notify'];

// Sensitive-named columns throw unless '!'-prefixed to force-include; 'ALL' expands minus sensitive names.
// Exported so type generation resolves the same column list the triggers are built from.
export function resolveNotifyColumns(tableName: string, notify: NotifyConfig, tableColumns?: string[]): string[] {
	if (!notify) return [];
	let columns: string[];
	if (notify === 'ALL') {
		if (!tableColumns) {
			throw new Error(
				`notify: "ALL" on table "${tableName}" requires tableColumns so the sensitive-column denylist can be applied. ` +
					`Pass options.tableColumns or list columns explicitly.`
			);
		}
		columns = tableColumns.filter((column) => !isSensitiveColumnName(column));
	} else {
		columns = notify.map((entry) => {
			if (entry.startsWith('!')) return entry.slice(1);
			if (isSensitiveColumnName(entry)) {
				throw new Error(
					`Refusing to include sensitive column "${tableName}"."${entry}" in notify trigger payloads. ` +
						`Remove it from the notify list or prefix it with '!' to force-include it.`
				);
			}
			return entry;
		});
	}
	if (!columns.length) {
		throw new Error(
			`notify config on table "${tableName}" resolves to no columns — remove the notify key or list at least one column.`
		);
	}
	return columns;
}

function sqlStringLiteral(value: string): string {
	return value.replace(/'/g, "''");
}

function buildRowJson(rowVariable: 'NEW' | 'OLD', columns: string[]): string {
	return `jsonb_build_object(
							${columns.map((column) => `'${sqlStringLiteral(column)}', ${rowVariable}."${column}"`).join(',\n							')}
						)`;
}

const QUERY_METADATA_DECLARE_BLOCK = `
	SELECT INTO query_metadata
			(regexp_match(
					current_query(),
					'^--QUERY_METADATA\\(({.*})', 'n'
			))[1]::json;
`;

function buildTriggerFunctionSql(
	tableName: string,
	operation: 'insert' | 'update' | 'delete',
	notify: NotifyConfig,
	options?: TriggerSqlOptions
): string {
	if (!notify) return '';
	const columns = resolveNotifyColumns(tableName, notify, options?.tableColumns);
	const delivery = options?.delivery || 'direct';
	const channel = options?.channel || DEFAULT_OUTBOX_CHANNEL;
	const tableNameLiteral = sqlStringLiteral(tableName);
	const channelLiteral = sqlStringLiteral(channel);
	const functionName = `notify_${tableName}_${operation}`;
	const rowVariable = operation === 'delete' ? 'OLD' : 'NEW';

	let body: string;
	if (delivery === 'outbox') {
		const recordJson = operation === 'delete' ? 'NULL' : buildRowJson('NEW', columns);
		const previousRecordJson = operation === 'insert' ? 'NULL' : buildRowJson('OLD', columns);
		body = `	INSERT INTO "${OUTBOX_TABLE_NAME}" ("tableName", "operation", "recordId", "record", "previousRecord", "queryMetadata")
	VALUES ('${tableNameLiteral}', '${operation.toUpperCase()}', ${rowVariable}.id, ${recordJson}, ${previousRecordJson}, query_metadata::jsonb)
	RETURNING "id" INTO outbox_id;

	PERFORM pg_notify('${channelLiteral}', outbox_id::text);`;
	} else {
		const idField =
			operation === 'insert'
				? `'insertedId', NEW.id`
				: operation === 'update'
					? `'changedId', NEW.id`
					: `'deletedId', OLD.id`;
		const payloadFields = [`'table', '${tableNameLiteral}'`, `'queryMetadata', query_metadata`, idField];
		if (operation !== 'delete') payloadFields.push(`'record', ${buildRowJson('NEW', columns)}`);
		if (operation !== 'insert') payloadFields.push(`'previousRecord', ${buildRowJson('OLD', columns)}`);
		body = `	PERFORM pg_notify(
		'${operation}',
		json_build_object(
						${payloadFields.join(',\n						')}
		)::text
		);`;
	}

	const outboxDeclare = delivery === 'outbox' ? '\n	outbox_id BIGINT;' : '';
	// DROP heals the pre-existing unquoted (case-folded) update trigger name before creating the quoted one
	const legacyDrop =
		operation === 'update' && tableName !== tableName.toLowerCase()
			? `DROP TRIGGER IF EXISTS ${tableName}_update ON "${tableName}";\n`
			: '';
	let updateScope = '';
	let updateGuard = '';
	if (operation === 'update') {
		updateScope = ` OF ${columns.map((column) => `"${column}"`).join(', ')}`;
		// json has no equality operator in Postgres, so JSON columns compare as jsonb
		const columnComparison = (column: string) =>
			options?.columnTypes?.[column] === 'JSON'
				? `OLD."${column}"::jsonb IS DISTINCT FROM NEW."${column}"::jsonb`
				: `OLD."${column}" IS DISTINCT FROM NEW."${column}"`;
		updateGuard = `\n	WHEN (${columns.map(columnComparison).join(' OR ')})`;
	}

	return `
CREATE OR REPLACE FUNCTION ${functionName}()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;${outboxDeclare}
BEGIN
${QUERY_METADATA_DECLARE_BLOCK}
${body}

	RETURN ${rowVariable};
END;
$$ LANGUAGE plpgsql;

${legacyDrop}CREATE OR REPLACE TRIGGER "${tableName}_${operation}"
	AFTER ${operation.toUpperCase()}${updateScope} ON "${tableName}"
	FOR EACH ROW${updateGuard}
EXECUTE FUNCTION ${functionName}();
`;
}

export function createInsertTriggerSql(
	tableName: string,
	notify: ResturaSchema['database'][0]['notify'],
	options?: TriggerSqlOptions
): string {
	return buildTriggerFunctionSql(tableName, 'insert', notify, options);
}

export function createUpdateTriggerSql(
	tableName: string,
	notify: ResturaSchema['database'][0]['notify'],
	options?: TriggerSqlOptions
): string {
	return buildTriggerFunctionSql(tableName, 'update', notify, options);
}

export function createDeleteTriggerSql(
	tableName: string,
	notify: ResturaSchema['database'][0]['notify'],
	options?: TriggerSqlOptions
): string {
	return buildTriggerFunctionSql(tableName, 'delete', notify, options);
}

export function generateNotifyTriggersSql(schema: ResturaSchema, options?: SchemaGenerationOptions): string[] {
	const statements: string[] = [];
	const hasNotifyTables = schema.database.some((table) => table.notify);
	if (options?.eventDelivery === 'outbox' && hasNotifyTables) {
		statements.push(createOutboxTableSql());
	}
	for (const table of schema.database) {
		if (!table.notify) continue;
		const triggerOptions: TriggerSqlOptions = {
			delivery: options?.eventDelivery,
			channel: options?.outboxChannel,
			tableColumns: table.columns.map((column) => column.name),
			columnTypes: Object.fromEntries(table.columns.map((column) => [column.name, column.type]))
		};
		statements.push(createInsertTriggerSql(table.name, table.notify, triggerOptions));
		statements.push(createUpdateTriggerSql(table.name, table.notify, triggerOptions));
		statements.push(createDeleteTriggerSql(table.name, table.notify, triggerOptions));
	}
	return statements;
}

export function generateDatabaseSchemaFromSchema(schema: ResturaSchema, options?: SchemaGenerationOptions): string {
	const sqlStatements = [];
	const indexes = [];
	const triggers = generateNotifyTriggersSql(schema, options);

	if (schema.extensions?.length) {
		sqlStatements.push(
			schema.extensions.map((extension) => `CREATE EXTENSION IF NOT EXISTS "${extension}";`).join('\n')
		);
	}

	for (const table of schema.database) {
		let sql = `CREATE TABLE "${table.name}"
				   ( `;
		const tableColumns = [];
		for (const column of table.columns) {
			let columnSql = '';

			columnSql += `\t"${column.name}" ${schemaToPsqlType(column)}`;
			let value = column.value;
			// JSON's value is used only for typescript not for the database
			if (column.type === 'JSON') value = '';
			if (column.type === 'JSONB') value = '';
			if (column.type === 'DECIMAL' && value) {
				// replace the character '-' with comma since we use it to separate the values in restura for decimals
				// also remove single and double quotes
				value = value.replace('-', ',').replace(/['"]/g, '');
			}
			if (value && column.type !== 'ENUM') {
				columnSql += `(${value})`;
			} else if (column.length) columnSql += `(${column.length})`;
			if (column.isPrimary) {
				columnSql += ' PRIMARY KEY ';
			}
			if (column.isUnique) {
				columnSql += ` CONSTRAINT "${pgTruncate(`${table.name}_${column.name}_unique_index`)}" UNIQUE `;
			}
			if (column.isNullable) columnSql += ' NULL';
			else columnSql += ' NOT NULL';
			if (column.default) columnSql += ` DEFAULT ${column.default}`;
			if (value && column.type === 'ENUM') {
				columnSql += ` CHECK ("${column.name}" IN (${value}))`;
			}
			tableColumns.push(columnSql);
		}
		sql += tableColumns.join(', \n');
		for (const index of table.indexes) {
			if (!index.isPrimaryKey) {
				let unique = ' ';
				if (index.isUnique) unique = 'UNIQUE ';

				const method = index.using ?? 'btree';
				let indexSQL = `\tCREATE ${unique}INDEX "${pgTruncate(index.name)}" ON "${table.name}"`;
				indexSQL += method === 'btree' ? '' : ` USING ${method}`;
				indexSQL += ` (${index.columns.map((item) => buildIndexColumnSql(item, method, index.order)).join(', ')})`;
				indexSQL += index.where ? ` WHERE ${index.where}` : '';
				indexSQL += ';';
				indexes.push(indexSQL);
			}
		}
		sql += '\n);';
		sqlStatements.push(sql);
	}

	// Now setup foreign keys
	for (const table of schema.database) {
		if (!table.foreignKeys.length) continue;
		const sql = `ALTER TABLE "${table.name}" `;
		const constraints: string[] = [];
		for (const foreignKey of table.foreignKeys) {
			constraints.push(
				`\t ADD CONSTRAINT "${pgTruncate(foreignKey.name)}"\n        ${buildForeignKeyClause(foreignKey)}`
			);
		}
		sqlStatements.push(sql + constraints.join(',\n') + ';');
	}

	// Now setup check constraints
	for (const table of schema.database) {
		if (!table.checkConstraints.length) continue;
		const sql = `ALTER TABLE "${table.name}" `;
		const constraints: string[] = [];
		for (const check of table.checkConstraints) {
			const constraint = `ADD CONSTRAINT "${pgTruncate(check.name)}" CHECK (${check.check})`;
			constraints.push(constraint);
		}
		sqlStatements.push(sql + constraints.join(',\n') + ';');
	}

	sqlStatements.push(indexes.join('\n'));
	sqlStatements.push(triggers.join('\n'));

	return sqlStatements.join('\n\n');
}

export async function getNewPublicSchemaAndScratchPool(targetPool: PsqlPool, scratchDbName: string): Promise<PsqlPool> {
	const scratchDbExists = await targetPool.runQuery<DynamicObject>(
		`SELECT * FROM pg_database WHERE datname = ?;`,
		[scratchDbName],
		systemUser
	);
	if (scratchDbExists.length === 0) {
		await targetPool.runQuery(`CREATE DATABASE ${escapeColumnName(scratchDbName)};`, [], systemUser);
	}

	const scratchPool = new PsqlPool({
		host: targetPool.poolConfig.host,
		port: targetPool.poolConfig.port,
		user: targetPool.poolConfig.user,
		database: scratchDbName,
		password: targetPool.poolConfig.password,
		max: targetPool.poolConfig.max,
		idleTimeoutMillis: targetPool.poolConfig.idleTimeoutMillis,
		connectionTimeoutMillis: targetPool.poolConfig.connectionTimeoutMillis
	});
	await scratchPool.runQuery(`DROP SCHEMA public CASCADE;`, [], systemUser);
	await scratchPool.runQuery(
		`CREATE SCHEMA public AUTHORIZATION ${escapeColumnName(targetPool.poolConfig.user)};`,
		[],
		systemUser
	);
	const schemaComment = await targetPool.runQuery<{ description: string }>(
		`
		SELECT pg_description.description
		FROM pg_description
		JOIN pg_namespace ON pg_namespace.oid = pg_description.objoid
		WHERE pg_namespace.nspname = 'public';`,
		[],
		systemUser
	);
	if (schemaComment[0]?.description) {
		const escaped = schemaComment[0].description.replace(/'/g, "''");
		await scratchPool.runQuery(`COMMENT ON SCHEMA public IS '${escaped}';`, [], systemUser);
	}
	return scratchPool;
}

export async function diffDatabaseToSchema(
	schema: ResturaSchema,
	targetPool: PsqlPool,
	scratchDbName: string,
	options?: SchemaGenerationOptions
): Promise<string> {
	let scratchPool: PsqlPool | undefined;
	let originalClient: InstanceType<typeof Client> | undefined;
	let scratchClient: InstanceType<typeof Client> | undefined;

	try {
		scratchPool = await getNewPublicSchemaAndScratchPool(targetPool, scratchDbName);
		const sqlFullStatement = generateDatabaseSchemaFromSchema(schema, options);
		await scratchPool.runQuery(sqlFullStatement, [], systemUser);

		const connectionConfig = {
			host: targetPool.poolConfig.host,
			port: targetPool.poolConfig.port,
			user: targetPool.poolConfig.user,
			password: targetPool.poolConfig.password,
			ssl: targetPool.poolConfig.ssl
		};
		originalClient = new Client({ ...connectionConfig, database: targetPool.poolConfig.database });
		scratchClient = new Client({ ...connectionConfig, database: scratchDbName });

		await Promise.all([originalClient.connect(), scratchClient.connect()]);
		const [info1, info2] = await Promise.all([
			pgInfo({ client: originalClient }),
			pgInfo({ client: scratchClient })
		]);
		const diff = getDiff(info1, info2);
		return diff.join('\n');
	} finally {
		const cleanups: Promise<void>[] = [];
		if (originalClient) cleanups.push(originalClient.end());
		if (scratchClient) cleanups.push(scratchClient.end());
		if (scratchPool) cleanups.push(scratchPool.pool.end());
		await Promise.allSettled(cleanups);
	}
}
