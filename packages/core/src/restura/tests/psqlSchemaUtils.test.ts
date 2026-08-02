import { expect } from 'chai';
import { pgTruncate, type ResturaSchema } from '../schemas/resturaSchema.js';
import { buildForeignKeyClause, generateDatabaseSchemaFromSchema } from '../sql/psqlSchemaUtils.js';

function makeSchema(database: ResturaSchema['database'], extensions?: string[]): ResturaSchema {
	return {
		database,
		endpoints: [],
		globalParams: [],
		roles: [],
		scopes: [],
		customTypes: [],
		...(extensions ? { extensions } : {})
	};
}

describe('generateDatabaseSchemaFromSchema: index methods, opclasses, extensions', () => {
	const storeCustomer: ResturaSchema['database'][0] = {
		name: 'storeCustomer',
		columns: [
			{ name: 'id', type: 'BIGSERIAL', isNullable: false, isPrimary: true, roles: [], scopes: [] },
			{ name: 'email', type: 'TEXT', isNullable: false, roles: [], scopes: [] }
		],
		indexes: [
			{
				name: 'storeCustomer_email_index',
				columns: ['email'],
				isPrimaryKey: false,
				isUnique: true,
				order: 'ASC'
			},
			{
				name: 'storeCustomer_email_trgm_index',
				using: 'gin',
				columns: [
					{ column: 'email', opclass: 'gin_trgm_ops' },
					{ expression: '(("orderNumber")::text)', opclass: 'gin_trgm_ops' }
				],
				isPrimaryKey: false,
				isUnique: false,
				order: 'ASC'
			}
		],
		foreignKeys: [],
		checkConstraints: [],
		roles: [],
		scopes: []
	};

	it('emits USING gin with opclasses and no ASC/DESC for a GIN index', () => {
		const sql = generateDatabaseSchemaFromSchema(makeSchema([storeCustomer]));
		expect(sql).to.include(
			'CREATE  INDEX "storeCustomer_email_trgm_index" ON "storeCustomer" USING gin ("email" gin_trgm_ops, (("orderNumber")::text) gin_trgm_ops);'
		);
	});

	it('keeps the legacy btree index output unchanged', () => {
		const sql = generateDatabaseSchemaFromSchema(makeSchema([storeCustomer]));
		expect(sql).to.include('CREATE UNIQUE INDEX "storeCustomer_email_index" ON "storeCustomer" ("email" ASC);');
	});

	it('emits CREATE EXTENSION IF NOT EXISTS before any table DDL when extensions are declared', () => {
		const sql = generateDatabaseSchemaFromSchema(makeSchema([storeCustomer], ['pg_trgm']));
		const extensionPosition = sql.indexOf('CREATE EXTENSION IF NOT EXISTS "pg_trgm";');
		const tablePosition = sql.indexOf('CREATE TABLE');
		expect(extensionPosition).to.be.at.least(0);
		expect(extensionPosition).to.be.lessThan(tablePosition);
	});

	it('emits no extension statements when none are declared', () => {
		const sql = generateDatabaseSchemaFromSchema(makeSchema([storeCustomer]));
		expect(sql).to.not.include('CREATE EXTENSION');
	});
});

describe('generateDatabaseSchemaFromSchema: 63-byte identifier truncation', () => {
	const longIndexName = 'customerProperty_storeCustomerId_customerPropertyDefinitionId_unique_index';

	const customerProperty: ResturaSchema['database'][0] = {
		name: 'customerProperty',
		columns: [
			{ name: 'id', type: 'BIGSERIAL', isNullable: false, isPrimary: true, roles: [], scopes: [] },
			{ name: 'storeCustomerId', type: 'BIGINT', isNullable: false, roles: [], scopes: [] },
			{ name: 'customerPropertyDefinitionId', type: 'BIGINT', isNullable: false, roles: [], scopes: [] }
		],
		indexes: [
			{
				name: longIndexName,
				columns: ['storeCustomerId', 'customerPropertyDefinitionId'],
				isPrimaryKey: false,
				isUnique: true,
				order: 'ASC'
			}
		],
		foreignKeys: [],
		checkConstraints: [],
		roles: [],
		scopes: []
	};

	it('truncates over-long index names the same way PostgreSQL would', () => {
		const sql = generateDatabaseSchemaFromSchema(makeSchema([customerProperty]));
		expect(Buffer.byteLength(longIndexName, 'utf8')).to.be.greaterThan(63);
		expect(sql).to.not.include(`"${longIndexName}"`);
		expect(sql).to.include('"customerProperty_storeCustomerId_customerPropertyDefinitionId_u"');
	});

	it('pgTruncate keeps 63-byte-or-shorter names untouched and cuts on a byte boundary', () => {
		expect(pgTruncate('short_name')).to.equal('short_name');
		const sixtyThree = 'a'.repeat(63);
		expect(pgTruncate(sixtyThree)).to.equal(sixtyThree);
		expect(pgTruncate('a'.repeat(70))).to.equal(sixtyThree);
		// 31 two-byte characters = 62 bytes; one more must not leave a split character behind.
		const multiByte = 'é'.repeat(35);
		expect(Buffer.byteLength(pgTruncate(multiByte), 'utf8')).to.be.at.most(63);
		expect(pgTruncate(multiByte)).to.equal('é'.repeat(31));
	});
});

describe('generateDatabaseSchemaFromSchema: composite foreign keys', () => {
	const customerPropertyDefinition: ResturaSchema['database'][0] = {
		name: 'customerPropertyDefinition',
		columns: [
			{ name: 'id', type: 'BIGSERIAL', isNullable: false, isPrimary: true, roles: [], scopes: [] },
			{ name: 'storeId', type: 'BIGINT', isNullable: false, roles: [], scopes: [] }
		],
		indexes: [
			{
				name: 'customerPropertyDefinition_id_storeId_unique',
				columns: ['id', 'storeId'],
				isPrimaryKey: false,
				isUnique: true,
				order: 'ASC'
			}
		],
		foreignKeys: [],
		checkConstraints: [],
		roles: [],
		scopes: []
	};

	const customerProperty: ResturaSchema['database'][0] = {
		name: 'customerProperty',
		columns: [
			{ name: 'id', type: 'BIGSERIAL', isNullable: false, isPrimary: true, roles: [], scopes: [] },
			{ name: 'customerPropertyDefinitionId', type: 'BIGINT', isNullable: false, roles: [], scopes: [] },
			{ name: 'storeId', type: 'BIGINT', isNullable: false, roles: [], scopes: [] }
		],
		indexes: [],
		foreignKeys: [
			{
				name: 'customerProperty_customerPropertyDefinitionId_fk',
				columns: ['customerPropertyDefinitionId', 'storeId'],
				refTable: 'customerPropertyDefinition',
				refColumns: ['id', 'storeId'],
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE'
			},
			{
				name: 'customerProperty_storeId_store_id_fk',
				column: 'storeId',
				refTable: 'store',
				refColumn: 'id',
				onDelete: 'NO ACTION',
				onUpdate: 'NO ACTION'
			}
		],
		checkConstraints: [],
		roles: [],
		scopes: []
	};

	it('emits both column lists in declaration order', () => {
		const sql = generateDatabaseSchemaFromSchema(makeSchema([customerPropertyDefinition, customerProperty]));
		expect(sql).to.include(
			'FOREIGN KEY ("customerPropertyDefinitionId", "storeId") REFERENCES "customerPropertyDefinition" ("id", "storeId") ON DELETE CASCADE ON UPDATE CASCADE'
		);
	});

	it('keeps the single-column scalar form unchanged', () => {
		const sql = generateDatabaseSchemaFromSchema(makeSchema([customerPropertyDefinition, customerProperty]));
		expect(sql).to.include(
			'FOREIGN KEY ("storeId") REFERENCES "store" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
		);
	});
});

describe('buildForeignKeyClause: malformed column vectors', () => {
	it('throws instead of emitting FOREIGN KEY () when no columns are declared', () => {
		expect(() =>
			buildForeignKeyClause({
				name: 'broken_fk',
				refTable: 'store',
				refColumn: 'id',
				onDelete: 'NO ACTION',
				onUpdate: 'NO ACTION'
			})
		).to.throw('must declare an equal, non-zero number of columns and refColumns');
	});

	it('throws when the two column vectors differ in length', () => {
		expect(() =>
			buildForeignKeyClause({
				name: 'broken_fk',
				columns: ['storeId', 'definitionId'],
				refTable: 'store',
				refColumns: ['id'],
				onDelete: 'NO ACTION',
				onUpdate: 'NO ACTION'
			})
		).to.throw('must declare an equal, non-zero number of columns and refColumns');
	});
});
