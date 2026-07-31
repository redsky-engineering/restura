import { expect } from 'chai';
import { setLogger, type ResturaLogger } from '../../logger/logger.js';
import {
	foreignKeyColumns,
	foreignKeyRefColumns,
	isSchemaValid,
	type ColumnData,
	type ForeignKeyData,
	type IndexData,
	type ResturaSchema,
	type TableData
} from '../schemas/resturaSchema.js';

function makeColumn(name: string, overrides: Partial<ColumnData> = {}): ColumnData {
	return { name, type: 'BIGINT', isNullable: false, roles: [], scopes: [], ...overrides };
}

function makeTable(name: string, overrides: Partial<TableData> = {}): TableData {
	return {
		name,
		columns: [],
		indexes: [],
		foreignKeys: [],
		checkConstraints: [],
		roles: [],
		scopes: [],
		...overrides
	};
}

function makeSchema(database: TableData[]): ResturaSchema {
	return { database, endpoints: [], globalParams: [], roles: [], scopes: [], customTypes: [] };
}

function primaryKeyIndex(tableName: string): IndexData {
	return { name: `${tableName}_pkey`, columns: ['id'], isUnique: true, isPrimaryKey: true, order: 'ASC' };
}

function makeDefinitionTable(): TableData {
	return makeTable('customerPropertyDefinition', {
		columns: [makeColumn('id', { type: 'BIGSERIAL', isPrimary: true }), makeColumn('storeId')],
		indexes: [
			primaryKeyIndex('customerPropertyDefinition'),
			{
				name: 'customerPropertyDefinition_id_storeId_unique',
				columns: ['id', 'storeId'],
				isUnique: true,
				isPrimaryKey: false,
				order: 'ASC'
			}
		]
	});
}

function makeCompositeForeignKey(overrides: Partial<ForeignKeyData> = {}): ForeignKeyData {
	return {
		name: 'customerProperty_customerPropertyDefinitionId_fk',
		columns: ['customerPropertyDefinitionId', 'storeId'],
		refTable: 'customerPropertyDefinition',
		refColumns: ['id', 'storeId'],
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE',
		...overrides
	};
}

function makeChildTable(foreignKey: ForeignKeyData): TableData {
	return makeTable('customerProperty', {
		columns: [
			makeColumn('id', { type: 'BIGSERIAL', isPrimary: true }),
			makeColumn('customerPropertyDefinitionId'),
			makeColumn('storeId')
		],
		indexes: [primaryKeyIndex('customerProperty')],
		foreignKeys: [foreignKey]
	});
}

describe('foreignKeyColumns / foreignKeyRefColumns', () => {
	it('normalizes the scalar form to single-element arrays', () => {
		const foreignKey: ForeignKeyData = {
			name: 'item_orderId_order_id_fk',
			column: 'orderId',
			refTable: 'order',
			refColumn: 'id',
			onDelete: 'NO ACTION',
			onUpdate: 'NO ACTION'
		};

		expect(foreignKeyColumns(foreignKey)).to.deep.equal(['orderId']);
		expect(foreignKeyRefColumns(foreignKey)).to.deep.equal(['id']);
	});

	it('passes the array form through in declaration order', () => {
		const foreignKey = makeCompositeForeignKey();

		expect(foreignKeyColumns(foreignKey)).to.deep.equal(['customerPropertyDefinitionId', 'storeId']);
		expect(foreignKeyRefColumns(foreignKey)).to.deep.equal(['id', 'storeId']);
	});
});

describe('isSchemaValid: foreign keys', () => {
	let warnings: string[] = [];
	let originalConsoleError: typeof console.error;

	function captureLogger(): ResturaLogger {
		return {
			level: 'info',
			fatal: () => {},
			error: () => {},
			warn: (msg) => {
				warnings.push(String(msg));
			},
			info: () => {},
			debug: () => {},
			trace: () => {}
		};
	}

	beforeEach(() => {
		warnings = [];
		setLogger(captureLogger());
		// isSchemaValid prints Zod failures straight to console.error; silence it so the
		// intentionally-invalid cases below don't spam the test output.
		originalConsoleError = console.error;
		console.error = () => {};
	});

	afterEach(() => {
		console.error = originalConsoleError;
		setLogger({
			level: 'info',
			fatal: (msg, ...args) => console.error(msg, ...args),
			error: (msg, ...args) => console.error(msg, ...args),
			warn: (msg, ...args) => console.warn(msg, ...args),
			info: (msg, ...args) => console.log(msg, ...args),
			debug: (msg, ...args) => console.debug(msg, ...args),
			trace: (msg, ...args) => console.debug(msg, ...args)
		});
	});

	it('accepts the legacy single-column scalar form', async () => {
		const schema = makeSchema([
			makeTable('order', {
				columns: [makeColumn('id', { type: 'BIGSERIAL', isPrimary: true })],
				indexes: [primaryKeyIndex('order')]
			}),
			makeTable('item', {
				columns: [makeColumn('id', { type: 'BIGSERIAL', isPrimary: true }), makeColumn('orderId')],
				indexes: [primaryKeyIndex('item')],
				foreignKeys: [
					{
						name: 'item_orderId_order_id_fk',
						column: 'orderId',
						refTable: 'order',
						refColumn: 'id',
						onDelete: 'NO ACTION',
						onUpdate: 'NO ACTION'
					}
				]
			})
		]);

		expect(await isSchemaValid(schema)).to.equal(true);
	});

	it('accepts a composite foreign key backed by a matching unique index', async () => {
		const schema = makeSchema([makeDefinitionTable(), makeChildTable(makeCompositeForeignKey())]);

		expect(await isSchemaValid(schema)).to.equal(true);
		expect(warnings).to.have.length(0);
	});

	it('rejects a foreign key declaring both column and columns', async () => {
		const schema = makeSchema([
			makeDefinitionTable(),
			makeChildTable(makeCompositeForeignKey({ column: 'customerPropertyDefinitionId' }))
		]);

		expect(await isSchemaValid(schema)).to.equal(false);
	});

	it('rejects a foreign key declaring neither column nor columns', async () => {
		const foreignKey = makeCompositeForeignKey();
		delete foreignKey.columns;

		expect(await isSchemaValid(makeSchema([makeDefinitionTable(), makeChildTable(foreignKey)]))).to.equal(false);
	});

	it('rejects mismatched column and refColumn counts', async () => {
		const schema = makeSchema([
			makeDefinitionTable(),
			makeChildTable(makeCompositeForeignKey({ refColumns: ['id'] }))
		]);

		expect(await isSchemaValid(schema)).to.equal(false);
	});

	it('rejects empty column arrays', async () => {
		const schema = makeSchema([
			makeDefinitionTable(),
			makeChildTable(makeCompositeForeignKey({ columns: [], refColumns: [] }))
		]);

		expect(await isSchemaValid(schema)).to.equal(false);
	});

	it('warns when the referenced columns have no unique constraint declared', async () => {
		const definitionTable = makeDefinitionTable();
		// Drop the (id, storeId) unique index — PostgreSQL would reject the composite FK.
		definitionTable.indexes = [primaryKeyIndex('customerPropertyDefinition')];
		const schema = makeSchema([definitionTable, makeChildTable(makeCompositeForeignKey())]);

		expect(await isSchemaValid(schema)).to.equal(true);
		expect(warnings).to.have.length(1);
		expect(warnings[0]).to.contain('customerProperty_customerPropertyDefinitionId_fk');
		expect(warnings[0]).to.contain('no unique constraint or index');
	});

	it('warns when the only matching unique index is partial', async () => {
		const definitionTable = makeDefinitionTable();
		definitionTable.indexes[1]!.where = '"deletedOn" IS NULL';
		const schema = makeSchema([definitionTable, makeChildTable(makeCompositeForeignKey())]);

		// PostgreSQL rejects a partial unique index as a foreign-key target.
		expect(await isSchemaValid(schema)).to.equal(true);
		expect(warnings).to.have.length(1);
		expect(warnings[0]).to.contain('no unique constraint or index');
	});

	it('warns when the only matching unique index uses a non-btree method', async () => {
		const definitionTable = makeDefinitionTable();
		definitionTable.indexes[1]!.using = 'hash';
		const schema = makeSchema([definitionTable, makeChildTable(makeCompositeForeignKey())]);

		expect(await isSchemaValid(schema)).to.equal(true);
		expect(warnings).to.have.length(1);
	});

	it('accepts a unique index whose column order differs from the referenced order', async () => {
		const definitionTable = makeDefinitionTable();
		definitionTable.indexes[1]!.columns = ['storeId', 'id'];
		const schema = makeSchema([definitionTable, makeChildTable(makeCompositeForeignKey())]);

		expect(await isSchemaValid(schema)).to.equal(true);
		expect(warnings).to.have.length(0);
	});

	it('treats a single isUnique column as a valid reference target', async () => {
		const schema = makeSchema([
			makeTable('store', {
				columns: [
					makeColumn('id', { type: 'BIGSERIAL', isPrimary: true }),
					makeColumn('slug', { type: 'VARCHAR', isUnique: true })
				]
			}),
			makeTable('storeAlias', {
				columns: [makeColumn('id', { type: 'BIGSERIAL', isPrimary: true }), makeColumn('storeSlug')],
				foreignKeys: [
					{
						name: 'storeAlias_storeSlug_store_slug_fk',
						column: 'storeSlug',
						refTable: 'store',
						refColumn: 'slug',
						onDelete: 'CASCADE',
						onUpdate: 'CASCADE'
					}
				]
			})
		]);

		expect(await isSchemaValid(schema)).to.equal(true);
		expect(warnings).to.have.length(0);
	});
});
