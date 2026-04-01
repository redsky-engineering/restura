import getDiff from '@wmfs/pg-diff-sync';
import pgInfo from '@wmfs/pg-info';
import pg from 'pg';
import { type ColumnData, type ResturaSchema } from '../schemas/resturaSchema.js';
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

export function createInsertTriggerSql(tableName: string, notify: ResturaSchema['database'][0]['notify']): string {
	if (!notify) return '';
	if (notify === 'ALL') {
		return `
CREATE OR REPLACE FUNCTION notify_${tableName}_insert()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;
BEGIN
	SELECT INTO query_metadata
			(regexp_match(
					current_query(),
					'^--QUERY_METADATA\\(({.*})', 'n'
			))[1]::json;

	PERFORM pg_notify(
		'insert',
		json_build_object(
						'table', '${tableName}',
						'queryMetadata', query_metadata,
						'insertedId', NEW.id,
						'record', NEW
		)::text
		);

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "${tableName}_insert"
	AFTER INSERT ON "${tableName}"
	FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_insert();
`;
	}

	const notifyColumnNewBuildString = notify.map((column) => `'${column}', NEW."${column}"`).join(',\n');

	return `
CREATE OR REPLACE FUNCTION notify_${tableName}_insert()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;
BEGIN
	SELECT INTO query_metadata
			(regexp_match(
					current_query(),
					'^--QUERY_METADATA\\(({.*})', 'n'
			))[1]::json;

	PERFORM pg_notify(
		'insert',
		json_build_object(
						'table', '${tableName}',
						'queryMetadata', query_metadata,
						'insertedId', NEW.id,
						'record', json_build_object(
							${notifyColumnNewBuildString}
						)
		)::text
		);

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "${tableName}_insert"
	AFTER INSERT ON "${tableName}"
	FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_insert();
`;
}

export function createUpdateTriggerSql(tableName: string, notify: ResturaSchema['database'][0]['notify']): string {
	if (!notify) return '';
	if (notify === 'ALL') {
		return `
CREATE OR REPLACE FUNCTION notify_${tableName}_update()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;
BEGIN
	SELECT INTO query_metadata
				(regexp_match(
						current_query(),
						'^--QUERY_METADATA\\(({.*})', 'n'
				))[1]::json;

	PERFORM pg_notify(
		'update',
		json_build_object(
						'table', '${tableName}',
						'queryMetadata', query_metadata,
						'changedId', NEW.id,
						'record', NEW,
						'previousRecord', OLD
		)::text
		);
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER ${tableName}_update
	AFTER UPDATE ON "${tableName}"
	FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_update();
`;
	}

	const notifyColumnNewBuildString = notify.map((column) => `'${column}', NEW."${column}"`).join(',\n');
	const notifyColumnOldBuildString = notify.map((column) => `'${column}', OLD."${column}"`).join(',\n');

	return `
CREATE OR REPLACE FUNCTION notify_${tableName}_update()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;
BEGIN
	SELECT INTO query_metadata
				(regexp_match(
						current_query(),
						'^--QUERY_METADATA\\(({.*})', 'n'
				))[1]::json;

	PERFORM pg_notify(
		'update',
		json_build_object(
						'table', '${tableName}',
						'queryMetadata', query_metadata,
						'changedId', NEW.id,
						'record', json_build_object(
							${notifyColumnNewBuildString}
						),
						'previousRecord', json_build_object(
							${notifyColumnOldBuildString}
						)
		)::text
		);
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER ${tableName}_update
	AFTER UPDATE ON "${tableName}"
	FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_update();
		`;
}

export function createDeleteTriggerSql(tableName: string, notify: ResturaSchema['database'][0]['notify']): string {
	if (!notify) return '';
	if (notify === 'ALL') {
		return `
CREATE OR REPLACE FUNCTION notify_${tableName}_delete()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;
BEGIN
	SELECT INTO query_metadata
			(regexp_match(
					current_query(),
					'^--QUERY_METADATA\\(({.*})', 'n'
			))[1]::json;

	PERFORM pg_notify(
		'delete',
		json_build_object(
						'table', '${tableName}',
						'queryMetadata', query_metadata,
						'deletedId', OLD.id,
						'previousRecord', OLD
		)::text
		);
	RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "${tableName}_delete"
	AFTER DELETE ON "${tableName}"
	FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_delete();
`;
	}

	const notifyColumnOldBuildString = notify.map((column) => `'${column}', OLD."${column}"`).join(',\n');

	return `
CREATE OR REPLACE FUNCTION notify_${tableName}_delete()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;
BEGIN
	SELECT INTO query_metadata
			(regexp_match(
					current_query(),
					'^--QUERY_METADATA\\(({.*})', 'n'
			))[1]::json;

	PERFORM pg_notify(
		'delete',
		json_build_object(
						'table', '${tableName}',
						'queryMetadata', query_metadata,
						'deletedId', OLD.id,
						'previousRecord', json_build_object(
							${notifyColumnOldBuildString}
						)
		)::text
		);
	RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "${tableName}_delete"
	AFTER DELETE ON "${tableName}"
	FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_delete();
		`;
}

export function generateDatabaseSchemaFromSchema(schema: ResturaSchema): string {
	const sqlStatements = [];
	const indexes = [];
	const triggers = [];

	for (const table of schema.database) {
		if (table.notify) {
			triggers.push(createInsertTriggerSql(table.name, table.notify));
			triggers.push(createUpdateTriggerSql(table.name, table.notify));
			triggers.push(createDeleteTriggerSql(table.name, table.notify));
		}

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
				columnSql += ` CONSTRAINT "${table.name}_${column.name}_unique_index" UNIQUE `;
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

				let indexSQL = `\tCREATE ${unique}INDEX "${index.name}" ON "${table.name}"`;
				indexSQL += ` (${index.columns.map((item) => `"${item}" ${index.order}`).join(', ')})`;
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
			let constraint = `\t ADD CONSTRAINT "${foreignKey.name}"
        FOREIGN KEY ("${foreignKey.column}") REFERENCES "${foreignKey.refTable}" ("${foreignKey.refColumn}")`;
			constraint += ` ON DELETE ${foreignKey.onDelete}`;
			constraint += ` ON UPDATE ${foreignKey.onUpdate}`;
			constraints.push(constraint);
		}
		sqlStatements.push(sql + constraints.join(',\n') + ';');
	}

	// Now setup check constraints
	for (const table of schema.database) {
		if (!table.checkConstraints.length) continue;
		const sql = `ALTER TABLE "${table.name}" `;
		const constraints: string[] = [];
		for (const check of table.checkConstraints) {
			const constraint = `ADD CONSTRAINT "${check.name}" CHECK (${check.check})`;
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
	scratchDbName: string
): Promise<string> {
	let scratchPool: PsqlPool | undefined;
	let originalClient: InstanceType<typeof Client> | undefined;
	let scratchClient: InstanceType<typeof Client> | undefined;

	try {
		scratchPool = await getNewPublicSchemaAndScratchPool(targetPool, scratchDbName);
		const sqlFullStatement = generateDatabaseSchemaFromSchema(schema);
		await scratchPool.pool.query(sqlFullStatement);

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
