import { type ColumnData, type ResturaSchema } from '../schemas/resturaSchema.js';
import { PsqlPool } from './PsqlPool.js';
import { schemaToPsqlType, systemUser } from './psqlSchemaUtils.js';

export interface DbColumn {
	name: string;
	udtName: string;
	isNullable: boolean;
	columnDefault: string | null;
	characterMaximumLength: number | null;
	numericPrecision: number | null;
	numericScale: number | null;
}

export interface DbIndex {
	name: string;
	tableName: string;
	isUnique: boolean;
	isPrimary: boolean;
	columns: string[];
	order: 'ASC' | 'DESC';
	where: string | null;
}

export interface DbForeignKey {
	name: string;
	tableName: string;
	column: string;
	refTable: string;
	refColumn: string;
	onDelete: string;
	onUpdate: string;
}

export interface DbCheckConstraint {
	name: string;
	tableName: string;
	expression: string;
}

export interface DbTable {
	name: string;
	columns: DbColumn[];
	indexes: DbIndex[];
	foreignKeys: DbForeignKey[];
	checkConstraints: DbCheckConstraint[];
}

export interface DbSnapshot {
	tables: DbTable[];
}

const RESTURA_TO_PG_UDT: Record<string, string> = {
	BIGSERIAL: 'int8',
	SERIAL: 'int4',
	BIGINT: 'int8',
	INTEGER: 'int4',
	INT: 'int4',
	SMALLINT: 'int2',
	DECIMAL: 'numeric',
	NUMERIC: 'numeric',
	REAL: 'float4',
	'DOUBLE PRECISION': 'float8',
	FLOAT: 'float8',
	DOUBLE: 'float8',
	BOOLEAN: 'bool',
	TEXT: 'text',
	VARCHAR: 'varchar',
	CHAR: 'bpchar',
	BYTEA: 'bytea',
	JSON: 'json',
	JSONB: 'jsonb',
	DATE: 'date',
	TIME: 'time',
	TIMESTAMP: 'timestamp',
	TIMESTAMPTZ: 'timestamptz',
	INTERVAL: 'interval',
	ENUM: 'text',
	DATETIME: 'timestamptz',
	MEDIUMINT: 'int4',
	TINYINT: 'int2'
};

function resturaTypeToUdt(column: ColumnData): string {
	const psqlType = schemaToPsqlType(column);
	return RESTURA_TO_PG_UDT[psqlType] ?? psqlType.toLowerCase();
}

const PG_FK_ACTION: Record<string, string> = {
	a: 'NO ACTION',
	r: 'RESTRICT',
	c: 'CASCADE',
	n: 'SET NULL',
	d: 'SET DEFAULT'
};

export async function introspectDatabase(pool: PsqlPool): Promise<DbSnapshot> {
	const [tableRows, columnRows, indexRows, fkRows, checkRows] = await Promise.all([
		pool.runQuery<{ table_name: string }>(
			`SELECT table_name
			 FROM information_schema.tables
			 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
			 ORDER BY table_name`,
			[],
			systemUser
		),
		pool.runQuery<{
			table_name: string;
			column_name: string;
			udt_name: string;
			is_nullable: string;
			column_default: string | null;
			character_maximum_length: number | null;
			numeric_precision: number | null;
			numeric_scale: number | null;
		}>(
			`SELECT table_name, column_name, udt_name, is_nullable, column_default,
			        character_maximum_length, numeric_precision, numeric_scale
			 FROM information_schema.columns
			 WHERE table_schema = 'public'
			 ORDER BY table_name, ordinal_position`,
			[],
			systemUser
		),
		pool.runQuery<{
			tablename: string;
			indexname: string;
			indexdef: string;
			indisprimary: boolean;
		}>(
			`SELECT pi.tablename, pi.indexname, pi.indexdef, ix.indisprimary
			 FROM pg_indexes pi
			 JOIN pg_class ic ON ic.relname = pi.indexname
			 JOIN pg_index ix ON ix.indexrelid = ic.oid
			 WHERE pi.schemaname = 'public'
			 ORDER BY pi.tablename, pi.indexname`,
			[],
			systemUser
		),
		pool.runQuery<{
			constraint_name: string;
			table_name: string;
			column_name: string;
			ref_table: string;
			ref_column: string;
			delete_rule: string;
			update_rule: string;
		}>(
			`SELECT
				constraint_def.conname AS constraint_name,
				source_table.relname AS table_name,
				source_column.attname AS column_name,
				referenced_table.relname AS ref_table,
				referenced_column.attname AS ref_column,
				constraint_def.confdeltype AS delete_rule,
				constraint_def.confupdtype AS update_rule
			 FROM pg_constraint constraint_def
			 JOIN pg_class source_table ON source_table.oid = constraint_def.conrelid
			 JOIN pg_namespace schema_ns ON schema_ns.oid = source_table.relnamespace
			 JOIN pg_class referenced_table ON referenced_table.oid = constraint_def.confrelid
			 JOIN pg_attribute source_column ON source_column.attrelid = constraint_def.conrelid AND source_column.attnum = ANY(constraint_def.conkey)
			 JOIN pg_attribute referenced_column ON referenced_column.attrelid = constraint_def.confrelid AND referenced_column.attnum = ANY(constraint_def.confkey)
			 WHERE constraint_def.contype = 'f' AND schema_ns.nspname = 'public'
			 ORDER BY source_table.relname, constraint_def.conname`,
			[],
			systemUser
		),
		pool.runQuery<{
			constraint_name: string;
			table_name: string;
			check_clause: string;
		}>(
			`SELECT
				constraint_def.conname AS constraint_name,
				parent_table.relname AS table_name,
				pg_get_constraintdef(constraint_def.oid) AS check_clause
			 FROM pg_constraint constraint_def
			 JOIN pg_class parent_table ON parent_table.oid = constraint_def.conrelid
			 JOIN pg_namespace schema_ns ON schema_ns.oid = parent_table.relnamespace
			 WHERE constraint_def.contype = 'c' AND schema_ns.nspname = 'public'
			   AND constraint_def.conname NOT LIKE '%_not_null'
			 ORDER BY parent_table.relname, constraint_def.conname`,
			[],
			systemUser
		)
	]);

	const tableMap = new Map<string, DbTable>();
	for (const row of tableRows) {
		tableMap.set(row.table_name, {
			name: row.table_name,
			columns: [],
			indexes: [],
			foreignKeys: [],
			checkConstraints: []
		});
	}

	for (const row of columnRows) {
		const table = tableMap.get(row.table_name);
		if (!table) continue;
		table.columns.push({
			name: row.column_name,
			udtName: row.udt_name,
			isNullable: row.is_nullable === 'YES',
			columnDefault: row.column_default,
			characterMaximumLength: row.character_maximum_length,
			numericPrecision: row.numeric_precision,
			numericScale: row.numeric_scale
		});
	}

	for (const row of indexRows) {
		const table = tableMap.get(row.tablename);
		if (!table) continue;

		const isPrimary = row.indisprimary;

		const unique = /CREATE UNIQUE INDEX/i.test(row.indexdef);
		const order: 'ASC' | 'DESC' = row.indexdef.toUpperCase().includes(' DESC') ? 'DESC' : 'ASC';

		const columnMatch = row.indexdef.match(/\((.+?)\)(?:\s+WHERE\s+(.+))?$/i);
		const columns = columnMatch
			? columnMatch[1].split(',').map((colExpr) =>
					colExpr
						.trim()
						.replace(/^"(.*)"$/, '$1')
						.replace(/\s+(ASC|DESC)$/i, '')
				)
			: [];
		const whereClause = columnMatch?.[2] ?? null;

		table.indexes.push({
			name: row.indexname,
			tableName: row.tablename,
			isUnique: unique,
			isPrimary,
			columns,
			order,
			where: whereClause
		});
	}

	for (const row of fkRows) {
		const table = tableMap.get(row.table_name);
		if (!table) continue;
		table.foreignKeys.push({
			name: row.constraint_name,
			tableName: row.table_name,
			column: row.column_name,
			refTable: row.ref_table,
			refColumn: row.ref_column,
			onDelete: PG_FK_ACTION[row.delete_rule] ?? 'NO ACTION',
			onUpdate: PG_FK_ACTION[row.update_rule] ?? 'NO ACTION'
		});
	}

	for (const row of checkRows) {
		const table = tableMap.get(row.table_name);
		if (!table) continue;
		table.checkConstraints.push({
			name: row.constraint_name,
			tableName: row.table_name,
			expression: row.check_clause
		});
	}

	return { tables: Array.from(tableMap.values()) };
}

export function diffSchemaToDatabase(schema: ResturaSchema, snapshot: DbSnapshot): string[] {
	const statements: string[] = [];
	const desiredTables = new Map(schema.database.map((table) => [table.name, table]));
	const liveTableMap = new Map(snapshot.tables.map((table) => [table.name, table]));

	const tablesToCreate = schema.database.filter((table) => !liveTableMap.has(table.name));
	const tablesToDrop = snapshot.tables.filter((table) => !desiredTables.has(table.name));
	const tablesToAlter = schema.database.filter((table) => liveTableMap.has(table.name));

	const changedChecksPerTable = new Map<string, Set<string>>();

	for (const desired of tablesToAlter) {
		const live = liveTableMap.get(desired.name)!;

		const desiredFkNames = new Set(desired.foreignKeys.map((fk) => pgTruncate(fk.name)));
		for (const liveFk of live.foreignKeys) {
			if (!desiredFkNames.has(liveFk.name) || isFkChanged(desired, liveFk)) {
				statements.push(`ALTER TABLE "${desired.name}" DROP CONSTRAINT "${liveFk.name}";`);
			}
		}

		const desiredCheckExprMap = new Map<string, string>();
		for (const check of desired.checkConstraints) {
			desiredCheckExprMap.set(pgTruncate(check.name), check.check);
		}
		for (const col of desired.columns) {
			if (col.type === 'ENUM' && col.value) {
				desiredCheckExprMap.set(
					pgTruncate(`${desired.name}_${col.name}_check`),
					`"${col.name}" IN (${col.value})`
				);
			}
		}
		const changedChecks = new Set<string>();
		for (const liveCheck of live.checkConstraints) {
			if (!desiredCheckExprMap.has(liveCheck.name)) {
				statements.push(`ALTER TABLE "${desired.name}" DROP CONSTRAINT "${liveCheck.name}";`);
			} else if (
				normalizeCheckExpression(desiredCheckExprMap.get(liveCheck.name)!) !==
				normalizeCheckExpression(liveCheck.expression)
			) {
				statements.push(`ALTER TABLE "${desired.name}" DROP CONSTRAINT "${liveCheck.name}";`);
				changedChecks.add(liveCheck.name);
			}
		}
		changedChecksPerTable.set(desired.name, changedChecks);

		const desiredIdxSignatures = new Map<string, string>();
		for (const idx of desired.indexes) {
			if (idx.isPrimaryKey) continue;
			desiredIdxSignatures.set(
				pgTruncate(idx.name),
				indexSignature(pgTruncate(idx.name), idx.columns, idx.isUnique, idx.order, idx.where)
			);
		}
		const autoUniqueNames = new Set<string>();
		for (const col of desired.columns) {
			if (col.isUnique) {
				autoUniqueNames.add(pgTruncate(`${desired.name}_${col.name}_unique_index`));
			}
		}
		for (const liveIdx of live.indexes) {
			if (liveIdx.isPrimary) continue;
			if (autoUniqueNames.has(liveIdx.name)) continue;
			const liveSig = indexSignature(
				liveIdx.name,
				liveIdx.columns,
				liveIdx.isUnique,
				liveIdx.order,
				liveIdx.where
			);
			const desiredSig = desiredIdxSignatures.get(liveIdx.name);
			if (!desiredSig || desiredSig !== liveSig) {
				statements.push(`DROP INDEX "${liveIdx.name}";`);
			}
		}

		diffColumns(desired, live, statements);
	}

	for (const table of tablesToDrop) {
		statements.push(`DROP TABLE "${table.name}";`);
	}

	const { sorted: sortedTablesToCreate, deferredFkNames } = topologicalSortTables(tablesToCreate);

	for (const table of sortedTablesToCreate) {
		statements.push(buildCreateTable(table, deferredFkNames));
	}

	for (const table of sortedTablesToCreate) {
		for (const index of table.indexes) {
			if (!index.isPrimaryKey) {
				statements.push(buildCreateIndex(table.name, index));
			}
		}
	}
	for (const desired of tablesToAlter) {
		const live = liveTableMap.get(desired.name)!;
		const liveIdxSignatures = new Map<string, string>();
		for (const idx of live.indexes) {
			liveIdxSignatures.set(idx.name, indexSignature(idx.name, idx.columns, idx.isUnique, idx.order, idx.where));
		}
		for (const index of desired.indexes) {
			if (index.isPrimaryKey) continue;
			const desiredSig = indexSignature(
				pgTruncate(index.name),
				index.columns,
				index.isUnique,
				index.order,
				index.where
			);
			const liveSig = liveIdxSignatures.get(pgTruncate(index.name));
			if (!liveSig || liveSig !== desiredSig) {
				statements.push(buildCreateIndex(desired.name, index));
			}
		}
	}

	for (const table of sortedTablesToCreate) {
		for (const fk of table.foreignKeys) {
			if (deferredFkNames.has(fk.name)) {
				statements.push(buildAddForeignKey(table.name, fk));
			}
		}
	}
	for (const desired of tablesToAlter) {
		const live = liveTableMap.get(desired.name)!;
		const liveFkNames = new Set(live.foreignKeys.map((fk) => fk.name));
		for (const fk of desired.foreignKeys) {
			if (
				!liveFkNames.has(pgTruncate(fk.name)) ||
				isFkChanged(
					desired,
					liveTableMap.get(desired.name)!.foreignKeys.find((liveFk) => liveFk.name === pgTruncate(fk.name))!
				)
			) {
				statements.push(buildAddForeignKey(desired.name, fk));
			}
		}
	}

	for (const desired of tablesToAlter) {
		const live = liveTableMap.get(desired.name)!;
		const liveCheckNames = new Set(live.checkConstraints.map((check) => check.name));
		const changedChecks = changedChecksPerTable.get(desired.name) ?? new Set<string>();
		for (const check of desired.checkConstraints) {
			if (!liveCheckNames.has(pgTruncate(check.name)) || changedChecks.has(pgTruncate(check.name))) {
				statements.push(buildAddCheckConstraint(desired.name, check));
			}
		}
		for (const col of desired.columns) {
			if (col.type === 'ENUM' && col.value) {
				const checkName = pgTruncate(`${desired.name}_${col.name}_check`);
				if (!liveCheckNames.has(checkName) || changedChecks.has(checkName)) {
					statements.push(
						`ALTER TABLE "${desired.name}" ADD CONSTRAINT "${checkName}" CHECK ("${col.name}" IN (${col.value}));`
					);
				}
			}
		}
	}

	return statements;
}

function diffColumns(desired: ResturaSchema['database'][0], live: DbTable, statements: string[]): void {
	const liveColMap = new Map(live.columns.map((col) => [col.name, col]));
	const desiredColNames = new Set(desired.columns.map((col) => col.name));

	for (const liveCol of live.columns) {
		if (!desiredColNames.has(liveCol.name)) {
			statements.push(`ALTER TABLE "${desired.name}" DROP COLUMN "${liveCol.name}";`);
		}
	}

	for (const column of desired.columns) {
		const liveColumn = liveColMap.get(column.name);
		if (!liveColumn) {
			statements.push(buildAddColumn(desired.name, column));
			continue;
		}

		const desiredUdt = resturaTypeToUdt(column);
		const udtMismatch = liveColumn.udtName !== desiredUdt && !isSerialMatch(column, liveColumn);
		if (udtMismatch || (!udtMismatch && modifiersDiffer(column, liveColumn))) {
			const pgType = resturaTypeToPgCast(column);
			statements.push(
				`ALTER TABLE "${desired.name}" ALTER COLUMN "${column.name}" TYPE ${pgType} USING "${column.name}"::${pgType};`
			);
		}

		if (column.isNullable && !liveColumn.isNullable) {
			statements.push(`ALTER TABLE "${desired.name}" ALTER COLUMN "${column.name}" DROP NOT NULL;`);
		} else if (!column.isNullable && liveColumn.isNullable) {
			statements.push(`ALTER TABLE "${desired.name}" ALTER COLUMN "${column.name}" SET NOT NULL;`);
		}

		const desiredDefault = getDesiredDefault(column);
		const liveDefault = liveColumn.columnDefault;
		if (!defaultsMatch(desiredDefault, liveDefault, column)) {
			if (desiredDefault === null) {
				statements.push(`ALTER TABLE "${desired.name}" ALTER COLUMN "${column.name}" DROP DEFAULT;`);
			} else {
				statements.push(
					`ALTER TABLE "${desired.name}" ALTER COLUMN "${column.name}" SET DEFAULT ${desiredDefault};`
				);
			}
		}
	}
}

interface TopologicalSortResult {
	sorted: ResturaSchema['database'];
	deferredFkNames: Set<string>;
}

function topologicalSortTables(tables: ResturaSchema['database']): TopologicalSortResult {
	const tableNames = new Set(tables.map((table) => table.name));
	const tableMap = new Map(tables.map((table) => [table.name, table]));

	const inDegree = new Map<string, number>();
	const tableDeps = new Map<string, Set<string>>();
	const reverseDeps = new Map<string, Set<string>>();

	for (const table of tables) {
		inDegree.set(table.name, 0);
		tableDeps.set(table.name, new Set());
		reverseDeps.set(table.name, new Set());
	}

	for (const table of tables) {
		for (const fk of table.foreignKeys) {
			if (
				tableNames.has(fk.refTable) &&
				fk.refTable !== table.name &&
				!tableDeps.get(table.name)!.has(fk.refTable)
			) {
				tableDeps.get(table.name)!.add(fk.refTable);
				inDegree.set(table.name, (inDegree.get(table.name) ?? 0) + 1);
				reverseDeps.get(fk.refTable)!.add(table.name);
			}
		}
	}

	const queue: string[] = [];
	for (const [name, degree] of inDegree) {
		if (degree === 0) queue.push(name);
	}

	const sorted: string[] = [];
	while (queue.length > 0) {
		const name = queue.shift()!;
		sorted.push(name);
		for (const dependent of reverseDeps.get(name) ?? []) {
			const newDegree = (inDegree.get(dependent) ?? 1) - 1;
			inDegree.set(dependent, newDegree);
			if (newDegree === 0) queue.push(dependent);
		}
	}

	const sortedSet = new Set(sorted);
	const deferredFkNames = new Set<string>();
	const cycleTables = tables.filter((table) => !sortedSet.has(table.name));

	const placed = new Set(sorted);
	for (const table of cycleTables) {
		sorted.push(table.name);
		for (const fk of table.foreignKeys) {
			if (fk.refTable !== table.name && tableNames.has(fk.refTable) && !placed.has(fk.refTable)) {
				deferredFkNames.add(fk.name);
			}
		}
		placed.add(table.name);
	}

	return { sorted: sorted.map((name) => tableMap.get(name)!), deferredFkNames };
}

function buildCreateTable(table: ResturaSchema['database'][0], deferredFkNames: Set<string> = new Set()): string {
	const definitions: string[] = [];
	for (const column of table.columns) {
		let definition = `"${column.name}" ${buildColumnType(column)}`;
		if (column.isPrimary) definition += ' PRIMARY KEY';
		if (column.isUnique)
			definition += ` CONSTRAINT "${pgTruncate(`${table.name}_${column.name}_unique_index`)}" UNIQUE`;
		if (!column.isNullable) definition += ' NOT NULL';
		else definition += ' NULL';
		if (column.default) definition += ` DEFAULT ${column.default}`;
		definitions.push(definition);
	}
	for (const fk of table.foreignKeys) {
		if (deferredFkNames.has(fk.name)) continue;
		definitions.push(
			`CONSTRAINT "${pgTruncate(fk.name)}" FOREIGN KEY ("${fk.column}") REFERENCES "${fk.refTable}" ("${fk.refColumn}") ON DELETE ${fk.onDelete} ON UPDATE ${fk.onUpdate}`
		);
	}
	for (const check of table.checkConstraints) {
		definitions.push(`CONSTRAINT "${pgTruncate(check.name)}" CHECK (${check.check})`);
	}
	for (const col of table.columns) {
		if (col.type === 'ENUM' && col.value) {
			definitions.push(
				`CONSTRAINT "${pgTruncate(`${table.name}_${col.name}_check`)}" CHECK ("${col.name}" IN (${col.value}))`
			);
		}
	}
	return `CREATE TABLE "${table.name}" (\n\t${definitions.join(',\n\t')}\n);`;
}

function buildColumnType(column: ColumnData): string {
	const baseType = schemaToPsqlType(column);
	let value = column.value;
	if (column.type === 'JSON' || column.type === 'JSONB') value = '';
	if (column.type === 'DECIMAL' && value) {
		value = value.replace('-', ',').replace(/['"]/g, '');
	}
	if (value && column.type !== 'ENUM') {
		return `${baseType}(${value})`;
	}
	if (column.length) return `${baseType}(${column.length})`;
	return baseType;
}

function buildAddColumn(tableName: string, column: ColumnData): string {
	let definition = `ALTER TABLE "${tableName}" ADD COLUMN "${column.name}" ${buildColumnType(column)}`;
	if (column.isPrimary) definition += ' PRIMARY KEY';
	if (column.isUnique) definition += ` CONSTRAINT "${pgTruncate(`${tableName}_${column.name}_unique_index`)}" UNIQUE`;
	if (!column.isNullable) definition += ' NOT NULL';
	else definition += ' NULL';
	if (column.default) definition += ` DEFAULT ${column.default}`;
	definition += ';';
	return definition;
}

interface IndexLike {
	name: string;
	columns: string[];
	isUnique: boolean;
	isPrimaryKey: boolean;
	order: string;
	where?: string;
}

function buildCreateIndex(tableName: string, index: IndexLike): string {
	const unique = index.isUnique ? 'UNIQUE ' : '';
	let sql = `CREATE ${unique}INDEX "${pgTruncate(index.name)}" ON "${tableName}" (${index.columns.map((column) => `"${column}" ${index.order}`).join(', ')})`;
	if (index.where) sql += ` WHERE ${index.where}`;
	sql += ';';
	return sql;
}

interface FkLike {
	name: string;
	column: string;
	refTable: string;
	refColumn: string;
	onDelete: string;
	onUpdate: string;
}

function buildAddForeignKey(tableName: string, foreignKey: FkLike): string {
	return `ALTER TABLE "${tableName}" ADD CONSTRAINT "${pgTruncate(foreignKey.name)}" FOREIGN KEY ("${foreignKey.column}") REFERENCES "${foreignKey.refTable}" ("${foreignKey.refColumn}") ON DELETE ${foreignKey.onDelete} ON UPDATE ${foreignKey.onUpdate};`;
}

interface CheckLike {
	name: string;
	check: string;
}

function buildAddCheckConstraint(tableName: string, constraint: CheckLike): string {
	return `ALTER TABLE "${tableName}" ADD CONSTRAINT "${pgTruncate(constraint.name)}" CHECK (${constraint.check});`;
}

function lowercaseOutsideStrings(s: string): string {
	return s.replace(/'(?:[^']|'')*'|[^']+/g, (match) => {
		if (match.startsWith("'")) return match;
		return match.toLowerCase();
	});
}

/**
 * Recursively strips parentheses around leaf conditions (those containing no AND/OR
 * and no nested parens). PostgreSQL wraps individual conditions in redundant parens
 * (e.g., `(a = 1) AND (b = 2)`) while the Restura schema stores them without.
 * Parens around sub-expressions that contain AND/OR are kept to preserve precedence.
 */
function stripLeafParens(expr: string): string {
	let prev = '';
	let curr = expr;
	while (prev !== curr) {
		prev = curr;
		curr = curr.replace(/\(([^()]*)\)/g, (match, inner) => {
			if (/\b(?:and|or)\b/i.test(inner)) return match;
			return inner;
		});
	}
	return curr;
}

function normalizeWhere(whereExpr: string | null | undefined): string {
	if (!whereExpr) return '';
	let normalized = whereExpr
		.replace(/::\w+(\[\])?/g, '')
		.replace(/"(\w+)"/g, '$1')
		.replace(/\((\w+)\)/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
	normalized = lowercaseOutsideStrings(normalized);
	while (normalized.startsWith('(') && normalized.endsWith(')')) {
		const inner = normalized.slice(1, -1);
		let depth = 0;
		let balanced = true;
		for (const char of inner) {
			if (char === '(') depth++;
			if (char === ')') depth--;
			if (depth < 0) {
				balanced = false;
				break;
			}
		}
		if (balanced && depth === 0) normalized = inner.trim();
		else break;
	}
	normalized = stripLeafParens(normalized);
	return normalized;
}

function indexSignature(
	name: string,
	columns: string[],
	isUnique: boolean,
	order: string,
	where?: string | null
): string {
	return `${name}|${columns.join(',')}|${isUnique}|${order}|${normalizeWhere(where)}`;
}

function isFkChanged(desired: ResturaSchema['database'][0], liveFk: DbForeignKey): boolean {
	const desiredFk = desired.foreignKeys.find((fk) => pgTruncate(fk.name) === liveFk.name);
	if (!desiredFk) return true;
	return (
		desiredFk.column !== liveFk.column ||
		desiredFk.refTable !== liveFk.refTable ||
		desiredFk.refColumn !== liveFk.refColumn ||
		desiredFk.onDelete !== liveFk.onDelete ||
		desiredFk.onUpdate !== liveFk.onUpdate
	);
}

const PG_MAX_IDENTIFIER = 63;
function pgTruncate(name: string): string {
	const buf = Buffer.from(name, 'utf8');
	if (buf.length <= PG_MAX_IDENTIFIER) return name;
	let end = PG_MAX_IDENTIFIER;
	while (end > 0 && (buf[end] & 0xc0) === 0x80) end--;
	return buf.subarray(0, end).toString('utf8');
}

function normalizeCheckExpression(expr: string): string {
	let normalized = expr;
	const checkMatch = normalized.match(/^CHECK\s*\(([\s\S]*)\)\s*$/i);
	if (checkMatch) normalized = checkMatch[1];
	normalized = normalized.replace(/::\w+(\[\])?/g, '');
	normalized = normalized.replace(/=\s*ANY\s*\(\s*\(\s*ARRAY\s*\[([^\]]*)\]\s*\)\s*\)/gi, 'IN ($1)');
	normalized = normalized.replace(/=\s*ANY\s*\(\s*ARRAY\s*\[([^\]]*)\]\s*\)/gi, 'IN ($1)');
	normalized = normalized.replace(/"(\w+)"/g, '$1');
	normalized = normalized.replace(/\((\w+)\)/g, '$1');
	normalized = normalized.replace(/\s+/g, ' ').trim();
	normalized = lowercaseOutsideStrings(normalized);
	normalized = normalized.replace(/<>/g, '!=');
	while (normalized.startsWith('(') && normalized.endsWith(')')) {
		const inner = normalized.slice(1, -1);
		let depth = 0;
		let balanced = true;
		for (const char of inner) {
			if (char === '(') depth++;
			if (char === ')') depth--;
			if (depth < 0) {
				balanced = false;
				break;
			}
		}
		if (balanced && depth === 0) normalized = inner.trim();
		else break;
	}
	normalized = stripLeafParens(normalized);
	normalized = normalized.replace(/\s*,\s*/g, ', ');
	return normalized;
}

function isSerialMatch(column: ColumnData, liveCol: DbColumn): boolean {
	if (column.hasAutoIncrement || column.type === 'BIGSERIAL' || column.type === 'SERIAL') {
		const serialUdt = column.type === 'SERIAL' ? 'int4' : 'int8';
		return liveCol.udtName === serialUdt && liveCol.columnDefault?.startsWith('nextval(') === true;
	}
	return false;
}

function modifiersDiffer(column: ColumnData, liveColumn: DbColumn): boolean {
	const desiredLength = column.length ?? null;
	if (desiredLength !== liveColumn.characterMaximumLength) return true;

	if (column.type === 'DECIMAL' && column.value) {
		const parts = column.value.replace(/['"]/g, '').split(/[-,]/);
		const desiredPrecision = parseInt(parts[0], 10);
		const desiredScale = parts.length > 1 ? parseInt(parts[1], 10) : 0;
		if (liveColumn.numericPrecision !== desiredPrecision || liveColumn.numericScale !== desiredScale) return true;
	}

	return false;
}

function resturaTypeToPgCast(column: ColumnData): string {
	const baseType = schemaToPsqlType(column);
	const castMap: Record<string, string> = {
		BIGSERIAL: 'BIGINT',
		SERIAL: 'INTEGER',
		INT: 'INTEGER',
		TIMESTAMPTZ: 'TIMESTAMPTZ',
		TIMESTAMP: 'TIMESTAMP',
		'DOUBLE PRECISION': 'DOUBLE PRECISION'
	};
	let pgType = castMap[baseType] ?? baseType;
	let value = column.value;
	if (column.type === 'DECIMAL' && value) {
		value = value.replace('-', ',').replace(/['"]/g, '');
		pgType = `${pgType}(${value})`;
	} else if (column.length) {
		pgType = `${pgType}(${column.length})`;
	}
	return pgType;
}

function getDesiredDefault(column: ColumnData): string | null {
	if (column.hasAutoIncrement || column.type === 'BIGSERIAL' || column.type === 'SERIAL') return null;
	return column.default ?? null;
}

function defaultsMatch(desired: string | null, live: string | null, column: ColumnData): boolean {
	if (column.hasAutoIncrement || column.type === 'BIGSERIAL' || column.type === 'SERIAL') return true;
	if (desired === null && live === null) return true;
	if (desired === null || live === null) return false;
	const normalizedLive = live.replace(/::[a-z][a-z0-9_ ]*(\[\])?$/gi, '').trim();
	return lowercaseOutsideStrings(desired.trim()) === lowercaseOutsideStrings(normalizedLive);
}
