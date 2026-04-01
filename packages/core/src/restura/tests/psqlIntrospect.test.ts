import { expect } from 'chai';
import { diffSchemaToDatabase, type DbSnapshot, type DbTable } from '../sql/psqlIntrospect.js';
import type { ResturaSchema } from '../schemas/resturaSchema.js';

function makeDbTable(overrides: Partial<DbTable> & { name: string }): DbTable {
	return {
		columns: [],
		indexes: [],
		foreignKeys: [],
		checkConstraints: [],
		...overrides
	};
}

function makeSchema(database: ResturaSchema['database']): ResturaSchema {
	return {
		database,
		endpoints: [],
		globalParams: [],
		roles: [],
		scopes: [],
		customTypes: []
	};
}

describe('diffSchemaToDatabase', () => {
	describe('table drops', () => {
		it('should emit only DROP TABLE without redundant index drops', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'cart',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							}
						],
						indexes: [
							{
								name: 'cart_pkey',
								tableName: 'cart',
								isUnique: true,
								isPrimary: true,
								columns: ['id'],
								order: 'ASC',
								where: null
							},
							{
								name: 'cart_currencyId_index',
								tableName: 'cart',
								isUnique: false,
								isPrimary: false,
								columns: ['currencyId'],
								order: 'ASC',
								where: null
							},
							{
								name: 'cart_marketId_index',
								tableName: 'cart',
								isUnique: false,
								isPrimary: false,
								columns: ['marketId'],
								order: 'ASC',
								where: null
							}
						]
					})
				]
			};

			const schema = makeSchema([]);
			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.deep.equal(['DROP TABLE "cart";']);
		});

		it('should emit only DROP TABLE without redundant FK constraint drops', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'order',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							}
						],
						foreignKeys: [
							{
								name: 'order_userId_user_id_fk',
								tableName: 'order',
								column: 'userId',
								refTable: 'user',
								refColumn: 'id',
								onDelete: 'CASCADE',
								onUpdate: 'NO ACTION'
							},
							{
								name: 'order_productId_product_id_fk',
								tableName: 'order',
								column: 'productId',
								refTable: 'product',
								refColumn: 'id',
								onDelete: 'RESTRICT',
								onUpdate: 'NO ACTION'
							}
						]
					})
				]
			};

			const schema = makeSchema([]);
			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.deep.equal(['DROP TABLE "order";']);
		});

		it('should emit only DROP TABLE without redundant check constraint drops', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'product',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							}
						],
						checkConstraints: [
							{
								name: 'product_status_check',
								tableName: 'product',
								expression: "CHECK (status IN ('active', 'inactive'))"
							}
						]
					})
				]
			};

			const schema = makeSchema([]);
			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.deep.equal(['DROP TABLE "product";']);
		});

		it('should emit only DROP TABLE when table has indexes, FKs, and check constraints combined', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'cart',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							}
						],
						indexes: [
							{
								name: 'cart_pkey',
								tableName: 'cart',
								isUnique: true,
								isPrimary: true,
								columns: ['id'],
								order: 'ASC',
								where: null
							},
							{
								name: 'cart_currencyId_index',
								tableName: 'cart',
								isUnique: false,
								isPrimary: false,
								columns: ['currencyId'],
								order: 'ASC',
								where: null
							}
						],
						foreignKeys: [
							{
								name: 'cart_currencyId_currency_id_fk',
								tableName: 'cart',
								column: 'currencyId',
								refTable: 'currency',
								refColumn: 'id',
								onDelete: 'CASCADE',
								onUpdate: 'NO ACTION'
							}
						],
						checkConstraints: [
							{
								name: 'cart_status_check',
								tableName: 'cart',
								expression: "CHECK (status IN ('open', 'closed'))"
							}
						]
					})
				]
			};

			const schema = makeSchema([]);
			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.deep.equal(['DROP TABLE "cart";']);
		});

		it('should emit one DROP TABLE per table when dropping multiple tables', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'cart',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							}
						],
						indexes: [
							{
								name: 'cart_userId_index',
								tableName: 'cart',
								isUnique: false,
								isPrimary: false,
								columns: ['userId'],
								order: 'ASC',
								where: null
							}
						],
						foreignKeys: [
							{
								name: 'cart_userId_user_id_fk',
								tableName: 'cart',
								column: 'userId',
								refTable: 'user',
								refColumn: 'id',
								onDelete: 'CASCADE',
								onUpdate: 'NO ACTION'
							}
						]
					}),
					makeDbTable({
						name: 'wishlist',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							}
						],
						checkConstraints: [
							{
								name: 'wishlist_priority_check',
								tableName: 'wishlist',
								expression: 'CHECK (priority >= 0)'
							}
						]
					})
				]
			};

			const schema = makeSchema([]);
			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.deep.equal(['DROP TABLE "cart";', 'DROP TABLE "wishlist";']);
		});
	});

	describe('table creates', () => {
		it('should inline FK constraints in CREATE TABLE', () => {
			const snapshot: DbSnapshot = { tables: [] };
			const schema = makeSchema([
				{
					name: 'book',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				},
				{
					name: 'story',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'bookId', type: 'INTEGER', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [
						{
							name: 'story_bookId_book_id_fk',
							column: 'bookId',
							refTable: 'book',
							refColumn: 'id',
							onDelete: 'CASCADE',
							onUpdate: 'NO ACTION'
						}
					],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const createStory = statements.find((s) => s.startsWith('CREATE TABLE "story"'));
			expect(createStory).to.not.equal(undefined);
			expect(createStory).to.include('CONSTRAINT "story_bookId_book_id_fk" FOREIGN KEY');
			expect(createStory).to.include('REFERENCES "book" ("id")');

			const alterFks = statements.filter((s) => s.includes('ALTER TABLE') && s.includes('FOREIGN KEY'));
			expect(alterFks).to.have.length(0);
		});

		it('should create tables in dependency order', () => {
			const snapshot: DbSnapshot = { tables: [] };
			const schema = makeSchema([
				{
					name: 'story',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'bookId', type: 'INTEGER', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [
						{
							name: 'story_bookId_book_id_fk',
							column: 'bookId',
							refTable: 'book',
							refColumn: 'id',
							onDelete: 'CASCADE',
							onUpdate: 'NO ACTION'
						}
					],
					checkConstraints: [],
					roles: [],
					scopes: []
				},
				{
					name: 'book',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const createStatements = statements.filter((s) => s.startsWith('CREATE TABLE'));
			expect(createStatements).to.have.length(2);
			expect(createStatements[0]).to.include('CREATE TABLE "book"');
			expect(createStatements[1]).to.include('CREATE TABLE "story"');
		});

		it('should handle multi-level dependency chains', () => {
			const snapshot: DbSnapshot = { tables: [] };
			const schema = makeSchema([
				{
					name: 'chapter',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'bookId', type: 'INTEGER', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [
						{
							name: 'chapter_bookId_book_id_fk',
							column: 'bookId',
							refTable: 'book',
							refColumn: 'id',
							onDelete: 'CASCADE',
							onUpdate: 'NO ACTION'
						}
					],
					checkConstraints: [],
					roles: [],
					scopes: []
				},
				{
					name: 'book',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'publisherId',
							type: 'INTEGER',
							isNullable: false,
							roles: [],
							scopes: []
						}
					],
					indexes: [],
					foreignKeys: [
						{
							name: 'book_publisherId_publisher_id_fk',
							column: 'publisherId',
							refTable: 'publisher',
							refColumn: 'id',
							onDelete: 'CASCADE',
							onUpdate: 'NO ACTION'
						}
					],
					checkConstraints: [],
					roles: [],
					scopes: []
				},
				{
					name: 'publisher',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const createStatements = statements.filter((s) => s.startsWith('CREATE TABLE'));
			expect(createStatements).to.have.length(3);
			expect(createStatements[0]).to.include('CREATE TABLE "publisher"');
			expect(createStatements[1]).to.include('CREATE TABLE "book"');
			expect(createStatements[2]).to.include('CREATE TABLE "chapter"');
		});

		it('should handle self-referencing FK inline', () => {
			const snapshot: DbSnapshot = { tables: [] };
			const schema = makeSchema([
				{
					name: 'category',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'parentId', type: 'INTEGER', isNullable: true, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [
						{
							name: 'category_parentId_category_id_fk',
							column: 'parentId',
							refTable: 'category',
							refColumn: 'id',
							onDelete: 'SET NULL',
							onUpdate: 'NO ACTION'
						}
					],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const createCategory = statements.find((s) => s.startsWith('CREATE TABLE "category"'));
			expect(createCategory).to.not.equal(undefined);
			expect(createCategory).to.include('CONSTRAINT "category_parentId_category_id_fk" FOREIGN KEY');

			const alterFks = statements.filter((s) => s.includes('ALTER TABLE') && s.includes('FOREIGN KEY'));
			expect(alterFks).to.have.length(0);
		});

		it('should inline check constraints in CREATE TABLE', () => {
			const snapshot: DbSnapshot = { tables: [] };
			const schema = makeSchema([
				{
					name: 'product',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'price', type: 'DECIMAL', isNullable: false, roles: [], scopes: [], value: '10-2' }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [{ name: 'product_price_positive', check: '"price" > 0' }],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const createProduct = statements.find((s) => s.startsWith('CREATE TABLE "product"'));
			expect(createProduct).to.not.equal(undefined);
			expect(createProduct).to.include('CONSTRAINT "product_price_positive" CHECK ("price" > 0)');

			const alterChecks = statements.filter((s) => s.includes('ALTER TABLE') && s.includes('CHECK'));
			expect(alterChecks).to.have.length(0);
		});

		it('should inline enum checks in CREATE TABLE', () => {
			const snapshot: DbSnapshot = { tables: [] };
			const schema = makeSchema([
				{
					name: 'order',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'status',
							type: 'ENUM',
							isNullable: false,
							roles: [],
							scopes: [],
							value: "'pending','shipped','delivered'"
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const createOrder = statements.find((s) => s.startsWith('CREATE TABLE "order"'));
			expect(createOrder).to.not.equal(undefined);
			expect(createOrder).to.include(
				`CONSTRAINT "order_status_check" CHECK ("status" IN ('pending','shipped','delivered'))`
			);

			const alterChecks = statements.filter((s) => s.includes('ALTER TABLE') && s.includes('CHECK'));
			expect(alterChecks).to.have.length(0);
		});

		it('should handle circular FKs by deferring cycle-breaking FK to ALTER TABLE', () => {
			const snapshot: DbSnapshot = { tables: [] };
			const schema = makeSchema([
				{
					name: 'employee',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'departmentId', type: 'INTEGER', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [
						{
							name: 'employee_departmentId_department_id_fk',
							column: 'departmentId',
							refTable: 'department',
							refColumn: 'id',
							onDelete: 'CASCADE',
							onUpdate: 'NO ACTION'
						}
					],
					checkConstraints: [],
					roles: [],
					scopes: []
				},
				{
					name: 'department',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'managerId', type: 'INTEGER', isNullable: true, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [
						{
							name: 'department_managerId_employee_id_fk',
							column: 'managerId',
							refTable: 'employee',
							refColumn: 'id',
							onDelete: 'SET NULL',
							onUpdate: 'NO ACTION'
						}
					],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			const createStatements = statements.filter((s) => s.startsWith('CREATE TABLE'));
			expect(createStatements).to.have.length(2);

			expect(createStatements[0]).to.include('CREATE TABLE "employee"');
			expect(createStatements[0]).to.not.include('FOREIGN KEY');

			expect(createStatements[1]).to.include('CREATE TABLE "department"');
			expect(createStatements[1]).to.include('CONSTRAINT "department_managerId_employee_id_fk" FOREIGN KEY');

			const alterFks = statements.filter((s) => s.includes('ALTER TABLE') && s.includes('FOREIGN KEY'));
			expect(alterFks).to.have.length(1);
			expect(alterFks[0]).to.include('employee_departmentId_department_id_fk');
		});

		it('should inline FK when new table references an existing table', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				},
				{
					name: 'post',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'userId', type: 'INTEGER', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [
						{
							name: 'post_userId_user_id_fk',
							column: 'userId',
							refTable: 'user',
							refColumn: 'id',
							onDelete: 'CASCADE',
							onUpdate: 'NO ACTION'
						}
					],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const createPost = statements.find((s) => s.startsWith('CREATE TABLE "post"'));
			expect(createPost).to.not.equal(undefined);
			expect(createPost).to.include('CONSTRAINT "post_userId_user_id_fk" FOREIGN KEY');

			const alterFks = statements.filter((s) => s.includes('ALTER TABLE "post"') && s.includes('FOREIGN KEY'));
			expect(alterFks).to.have.length(0);
		});
	});

	describe('table alters (new FKs still use ALTER TABLE)', () => {
		it('should use ALTER TABLE for new FKs on existing tables', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'teamId',
								udtName: 'int4',
								isNullable: true,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							}
						]
					}),
					makeDbTable({
						name: 'team',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'teamId', type: 'INTEGER', isNullable: true, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [
						{
							name: 'user_teamId_team_id_fk',
							column: 'teamId',
							refTable: 'team',
							refColumn: 'id',
							onDelete: 'SET NULL',
							onUpdate: 'NO ACTION'
						}
					],
					checkConstraints: [],
					roles: [],
					scopes: []
				},
				{
					name: 'team',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements.filter((s) => s.startsWith('CREATE TABLE'))).to.have.length(0);
			expect(statements).to.include(
				'ALTER TABLE "user" ADD CONSTRAINT "user_teamId_team_id_fk" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;'
			);
		});
	});

	describe('check constraint expression changes', () => {
		it('should drop and re-add an ENUM check when the allowed values change', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'subscription',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'status',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						checkConstraints: [
							{
								name: 'subscription_status_check',
								tableName: 'subscription',
								expression:
									"CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::text, 'PAUSED'::text, 'CANCELLED'::text])::text[])))"
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'subscription',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'status',
							type: 'ENUM',
							isNullable: false,
							roles: [],
							scopes: [],
							value: "'ACTIVE','EXPIRED','CANCELED'"
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include('ALTER TABLE "subscription" DROP CONSTRAINT "subscription_status_check";');
			expect(statements).to.include(
				`ALTER TABLE "subscription" ADD CONSTRAINT "subscription_status_check" CHECK ("status" IN ('ACTIVE','EXPIRED','CANCELED'));`
			);
		});

		it('should not drop or re-add an ENUM check when values are unchanged', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'subscription',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'status',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						checkConstraints: [
							{
								name: 'subscription_status_check',
								tableName: 'subscription',
								expression:
									"CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::text, 'EXPIRED'::text, 'CANCELED'::text])::text[])))"
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'subscription',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'status',
							type: 'ENUM',
							isNullable: false,
							roles: [],
							scopes: [],
							value: "'ACTIVE','EXPIRED','CANCELED'"
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			const checkStatements = statements.filter((s) => s.includes('subscription_status_check'));
			expect(checkStatements).to.have.length(0);
		});

		it('should drop and re-add an explicit check constraint when the expression changes', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'product',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'price',
								udtName: 'numeric',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 10,
								numericScale: 2
							}
						],
						checkConstraints: [
							{
								name: 'product_price_positive',
								tableName: 'product',
								expression: 'CHECK ((price > (0)::numeric))'
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'product',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'price', type: 'DECIMAL', isNullable: false, roles: [], scopes: [], value: '10-2' }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [{ name: 'product_price_positive', check: '"price" >= 0' }],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include('ALTER TABLE "product" DROP CONSTRAINT "product_price_positive";');
			expect(statements).to.include(
				'ALTER TABLE "product" ADD CONSTRAINT "product_price_positive" CHECK ("price" >= 0);'
			);
		});

		it('should not drop or re-add an explicit check when the expression is unchanged', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'product',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'price',
								udtName: 'numeric',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 10,
								numericScale: 2
							}
						],
						checkConstraints: [
							{
								name: 'product_price_positive',
								tableName: 'product',
								expression: 'CHECK (("price" > 0))'
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'product',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'price', type: 'DECIMAL', isNullable: false, roles: [], scopes: [], value: '10-2' }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [{ name: 'product_price_positive', check: '"price" > 0' }],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			const checkStatements = statements.filter((s) => s.includes('product_price_positive'));
			expect(checkStatements).to.have.length(0);
		});

		it('should handle adding a single ENUM value to an existing check', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'order',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'status',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						checkConstraints: [
							{
								name: 'order_status_check',
								tableName: 'order',
								expression:
									"CHECK (((status)::text = ANY ((ARRAY['PENDING'::text, 'SHIPPED'::text])::text[])))"
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'order',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'status',
							type: 'ENUM',
							isNullable: false,
							roles: [],
							scopes: [],
							value: "'PENDING','SHIPPED','DELIVERED'"
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include('ALTER TABLE "order" DROP CONSTRAINT "order_status_check";');
			expect(statements).to.include(
				`ALTER TABLE "order" ADD CONSTRAINT "order_status_check" CHECK ("status" IN ('PENDING','SHIPPED','DELIVERED'));`
			);
		});

		it('should handle removing an ENUM value from an existing check', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'order',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'status',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						checkConstraints: [
							{
								name: 'order_status_check',
								tableName: 'order',
								expression:
									"CHECK (((status)::text = ANY ((ARRAY['PENDING'::text, 'SHIPPED'::text, 'DELIVERED'::text])::text[])))"
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'order',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'status',
							type: 'ENUM',
							isNullable: false,
							roles: [],
							scopes: [],
							value: "'PENDING','SHIPPED'"
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include('ALTER TABLE "order" DROP CONSTRAINT "order_status_check";');
			expect(statements).to.include(
				`ALTER TABLE "order" ADD CONSTRAINT "order_status_check" CHECK ("status" IN ('PENDING','SHIPPED'));`
			);
		});
	});

	describe('column type modifier diffs', () => {
		it('should emit ALTER COLUMN TYPE when VARCHAR length is tightened', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('user_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'firstName',
								udtName: 'varchar',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: 255,
								numericPrecision: null,
								numericScale: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'firstName', type: 'VARCHAR', isNullable: false, roles: [], scopes: [], length: 30 }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include(
				'ALTER TABLE "user" ALTER COLUMN "firstName" TYPE VARCHAR(30) USING "firstName"::VARCHAR(30);'
			);
		});

		it('should emit ALTER COLUMN TYPE when VARCHAR length is widened', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('user_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'email',
								udtName: 'varchar',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: 50,
								numericPrecision: null,
								numericScale: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'email', type: 'VARCHAR', isNullable: false, roles: [], scopes: [], length: 100 }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include(
				'ALTER TABLE "user" ALTER COLUMN "email" TYPE VARCHAR(100) USING "email"::VARCHAR(100);'
			);
		});

		it('should not emit ALTER COLUMN TYPE when VARCHAR length matches', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('user_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'firstName',
								udtName: 'varchar',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: 30,
								numericPrecision: null,
								numericScale: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'firstName', type: 'VARCHAR', isNullable: false, roles: [], scopes: [], length: 30 }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			const typeAlters = statements.filter((s) => s.includes('ALTER COLUMN') && s.includes('TYPE'));
			expect(typeAlters).to.have.length(0);
		});

		it('should emit ALTER COLUMN TYPE when adding a length constraint to unconstrained VARCHAR', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('user_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'password',
								udtName: 'varchar',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'password', type: 'VARCHAR', isNullable: false, roles: [], scopes: [], length: 70 }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include(
				'ALTER TABLE "user" ALTER COLUMN "password" TYPE VARCHAR(70) USING "password"::VARCHAR(70);'
			);
		});

		it('should emit ALTER COLUMN TYPE when removing a length constraint from VARCHAR', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('user_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'bio',
								udtName: 'varchar',
								isNullable: true,
								columnDefault: null,
								characterMaximumLength: 200,
								numericPrecision: null,
								numericScale: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'bio', type: 'VARCHAR', isNullable: true, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include('ALTER TABLE "user" ALTER COLUMN "bio" TYPE VARCHAR USING "bio"::VARCHAR;');
		});

		it('should emit multiple ALTER COLUMN TYPE statements for several columns with length changes', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('user_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'firstName',
								udtName: 'varchar',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: 255,
								numericPrecision: null,
								numericScale: null
							},
							{
								name: 'lastName',
								udtName: 'varchar',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: 255,
								numericPrecision: null,
								numericScale: null
							},
							{
								name: 'email',
								udtName: 'varchar',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: 255,
								numericPrecision: null,
								numericScale: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'firstName', type: 'VARCHAR', isNullable: false, roles: [], scopes: [], length: 30 },
						{ name: 'lastName', type: 'VARCHAR', isNullable: false, roles: [], scopes: [], length: 30 },
						{ name: 'email', type: 'VARCHAR', isNullable: false, roles: [], scopes: [], length: 100 }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include(
				'ALTER TABLE "user" ALTER COLUMN "firstName" TYPE VARCHAR(30) USING "firstName"::VARCHAR(30);'
			);
			expect(statements).to.include(
				'ALTER TABLE "user" ALTER COLUMN "lastName" TYPE VARCHAR(30) USING "lastName"::VARCHAR(30);'
			);
			expect(statements).to.include(
				'ALTER TABLE "user" ALTER COLUMN "email" TYPE VARCHAR(100) USING "email"::VARCHAR(100);'
			);
		});

		it('should emit ALTER COLUMN TYPE when DECIMAL precision changes', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'product',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('product_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'price',
								udtName: 'numeric',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 10,
								numericScale: 2
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'product',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'price', type: 'DECIMAL', isNullable: false, roles: [], scopes: [], value: '12-4' }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include(
				'ALTER TABLE "product" ALTER COLUMN "price" TYPE DECIMAL(12,4) USING "price"::DECIMAL(12,4);'
			);
		});

		it('should not emit ALTER COLUMN TYPE when DECIMAL precision and scale match', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'product',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('product_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'price',
								udtName: 'numeric',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 10,
								numericScale: 2
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'product',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'price', type: 'DECIMAL', isNullable: false, roles: [], scopes: [], value: '10-2' }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			const typeAlters = statements.filter((s) => s.includes('ALTER COLUMN') && s.includes('TYPE'));
			expect(typeAlters).to.have.length(0);
		});

		it('should not emit ALTER COLUMN TYPE when TEXT columns match with no length', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'post',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('post_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'body',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'post',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'body', type: 'TEXT', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			const typeAlters = statements.filter((s) => s.includes('ALTER COLUMN') && s.includes('TYPE'));
			expect(typeAlters).to.have.length(0);
		});
	});

	describe('table alters (constraints/indexes still dropped individually)', () => {
		it('should still emit DROP INDEX when an index is removed from a kept table', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'email',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						indexes: [
							{
								name: 'user_email_index',
								tableName: 'user',
								isUnique: false,
								isPrimary: false,
								columns: ['email'],
								order: 'ASC',
								where: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'email', type: 'TEXT', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include('DROP INDEX "user_email_index";');
			expect(statements).to.not.include('DROP TABLE "user";');
		});

		it('should not emit DROP INDEX for primary key indexes on a kept table', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'subscription',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('subscription_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'name',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						indexes: [
							{
								name: 'subscription_pkey',
								tableName: 'subscription',
								isUnique: true,
								isPrimary: true,
								columns: ['id'],
								order: 'ASC',
								where: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'subscription',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'name', type: 'TEXT', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.not.include('DROP INDEX "subscription_pkey";');
			const dropIndexes = statements.filter((s) => s.startsWith('DROP INDEX'));
			expect(dropIndexes).to.have.length(0);
		});

		it('should emit DROP + CREATE when index columns change', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'email',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							},
							{
								name: 'firstName',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						indexes: [
							{
								name: 'user_search_index',
								tableName: 'user',
								isUnique: false,
								isPrimary: false,
								columns: ['email'],
								order: 'ASC',
								where: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'email', type: 'TEXT', isNullable: false, roles: [], scopes: [] },
						{ name: 'firstName', type: 'TEXT', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [
						{
							name: 'user_search_index',
							columns: ['email', 'firstName'],
							isUnique: false,
							isPrimaryKey: false,
							order: 'ASC'
						}
					],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include('DROP INDEX "user_search_index";');
			expect(statements).to.include('CREATE INDEX "user_search_index" ON "user" ("email" ASC, "firstName" ASC);');
		});

		it('should emit DROP + CREATE when index uniqueness changes', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'email',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						indexes: [
							{
								name: 'user_email_index',
								tableName: 'user',
								isUnique: false,
								isPrimary: false,
								columns: ['email'],
								order: 'ASC',
								where: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'email', type: 'TEXT', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [
						{
							name: 'user_email_index',
							columns: ['email'],
							isUnique: true,
							isPrimaryKey: false,
							order: 'ASC'
						}
					],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include('DROP INDEX "user_email_index";');
			expect(statements).to.include('CREATE UNIQUE INDEX "user_email_index" ON "user" ("email" ASC);');
		});

		it('should emit DROP + CREATE when index order changes', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'event',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'createdAt',
								udtName: 'timestamptz',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						indexes: [
							{
								name: 'event_createdAt_index',
								tableName: 'event',
								isUnique: false,
								isPrimary: false,
								columns: ['createdAt'],
								order: 'ASC',
								where: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'event',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'createdAt', type: 'TIMESTAMPTZ', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [
						{
							name: 'event_createdAt_index',
							columns: ['createdAt'],
							isUnique: false,
							isPrimaryKey: false,
							order: 'DESC'
						}
					],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include('DROP INDEX "event_createdAt_index";');
			expect(statements).to.include('CREATE INDEX "event_createdAt_index" ON "event" ("createdAt" DESC);');
		});

		it('should emit DROP + CREATE when index where clause changes', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'email',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							},
							{
								name: 'isActive',
								udtName: 'bool',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						indexes: [
							{
								name: 'user_email_active_index',
								tableName: 'user',
								isUnique: true,
								isPrimary: false,
								columns: ['email'],
								order: 'ASC',
								where: '"isActive" = true'
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'email', type: 'TEXT', isNullable: false, roles: [], scopes: [] },
						{ name: 'isActive', type: 'BOOLEAN', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [
						{
							name: 'user_email_active_index',
							columns: ['email'],
							isUnique: true,
							isPrimaryKey: false,
							order: 'ASC',
							where: '"isActive" = true AND "email" IS NOT NULL'
						}
					],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include('DROP INDEX "user_email_active_index";');
			expect(statements).to.include(
				'CREATE UNIQUE INDEX "user_email_active_index" ON "user" ("email" ASC) WHERE "isActive" = true AND "email" IS NOT NULL;'
			);
		});

		it('should emit DROP + CREATE when where clause is added to an index', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'email',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						indexes: [
							{
								name: 'user_email_index',
								tableName: 'user',
								isUnique: true,
								isPrimary: false,
								columns: ['email'],
								order: 'ASC',
								where: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'email', type: 'TEXT', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [
						{
							name: 'user_email_index',
							columns: ['email'],
							isUnique: true,
							isPrimaryKey: false,
							order: 'ASC',
							where: '"email" IS NOT NULL'
						}
					],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include('DROP INDEX "user_email_index";');
			expect(statements).to.include(
				'CREATE UNIQUE INDEX "user_email_index" ON "user" ("email" ASC) WHERE "email" IS NOT NULL;'
			);
		});

		it('should not emit DROP or CREATE when index structure is unchanged', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'user',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'email',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						indexes: [
							{
								name: 'user_email_index',
								tableName: 'user',
								isUnique: true,
								isPrimary: false,
								columns: ['email'],
								order: 'ASC',
								where: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'user',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'email', type: 'TEXT', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [
						{
							name: 'user_email_index',
							columns: ['email'],
							isUnique: true,
							isPrimaryKey: false,
							order: 'ASC'
						}
					],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			const indexStatements = statements.filter((s) => s.includes('user_email_index'));
			expect(indexStatements).to.have.length(0);
		});

		it('should not emit DROP or CREATE when index name exceeds 63 chars but matches after truncation', () => {
			const longName = 'storeIntegrationWorkflow_storeId_taskType_triggerEvent_unique_index'; // 67 chars
			const truncatedName = longName.slice(0, 63); // 'storeIntegrationWorkflow_storeId_taskType_triggerEvent_unique_i'

			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'storeIntegrationWorkflow',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'storeId',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'taskType',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							},
							{
								name: 'triggerEvent',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						indexes: [
							{
								name: truncatedName,
								tableName: 'storeIntegrationWorkflow',
								isUnique: true,
								isPrimary: false,
								columns: ['storeId', 'taskType', 'triggerEvent'],
								order: 'ASC',
								where: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'storeIntegrationWorkflow',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'storeId', type: 'INTEGER', isNullable: false, roles: [], scopes: [] },
						{ name: 'taskType', type: 'TEXT', isNullable: false, roles: [], scopes: [] },
						{ name: 'triggerEvent', type: 'TEXT', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [
						{
							name: longName,
							columns: ['storeId', 'taskType', 'triggerEvent'],
							isUnique: true,
							isPrimaryKey: false,
							order: 'ASC'
						}
					],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const indexStatements = statements.filter((s) => s.includes(truncatedName) || s.includes(longName));
			expect(indexStatements).to.have.length(0);
		});

		it('should use truncated name in CREATE INDEX SQL when index name exceeds 63 chars', () => {
			const longName = 'storeIntegrationWorkflow_storeId_taskType_triggerEvent_unique_index'; // 67 chars
			const truncatedName = longName.slice(0, 63);

			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'storeIntegrationWorkflow',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'storeId',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'taskType',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							},
							{
								name: 'triggerEvent',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'storeIntegrationWorkflow',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'storeId', type: 'INTEGER', isNullable: false, roles: [], scopes: [] },
						{ name: 'taskType', type: 'TEXT', isNullable: false, roles: [], scopes: [] },
						{ name: 'triggerEvent', type: 'TEXT', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [
						{
							name: longName,
							columns: ['storeId', 'taskType', 'triggerEvent'],
							isUnique: true,
							isPrimaryKey: false,
							order: 'ASC'
						}
					],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			expect(statements).to.include(
				`CREATE UNIQUE INDEX "${truncatedName}" ON "storeIntegrationWorkflow" ("storeId" ASC, "taskType" ASC, "triggerEvent" ASC);`
			);
			expect(statements.some((s) => s.includes(longName))).to.equal(false);
		});

		it('should not emit DROP or CREATE when FK name exceeds 63 chars but matches after truncation', () => {
			const longName = 'subscription_customerPaymentMethodId_customerPaymentMethod_id_fk'; // 64 chars
			const truncatedName = longName.slice(0, 63); // 'subscription_customerPaymentMethodId_customerPaymentMethod_id_f'

			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'subscription',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'customerPaymentMethodId',
								udtName: 'int4',
								isNullable: true,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							}
						],
						foreignKeys: [
							{
								name: truncatedName,
								tableName: 'subscription',
								column: 'customerPaymentMethodId',
								refTable: 'customerPaymentMethod',
								refColumn: 'id',
								onDelete: 'NO ACTION',
								onUpdate: 'NO ACTION'
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'subscription',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'customerPaymentMethodId', type: 'INTEGER', isNullable: true, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [
						{
							name: longName,
							column: 'customerPaymentMethodId',
							refTable: 'customerPaymentMethod',
							refColumn: 'id',
							onDelete: 'NO ACTION',
							onUpdate: 'NO ACTION'
						}
					],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const fkStatements = statements.filter((s) => s.includes(truncatedName) || s.includes(longName));
			expect(fkStatements).to.have.length(0);
		});

		it('should use truncated name in ADD CONSTRAINT FK SQL when FK name exceeds 63 chars', () => {
			const longName = 'subscription_customerPaymentMethodId_customerPaymentMethod_id_fk'; // 64 chars
			const truncatedName = longName.slice(0, 63);

			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'subscription',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'customerPaymentMethodId',
								udtName: 'int4',
								isNullable: true,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'subscription',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'customerPaymentMethodId', type: 'INTEGER', isNullable: true, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [
						{
							name: longName,
							column: 'customerPaymentMethodId',
							refTable: 'customerPaymentMethod',
							refColumn: 'id',
							onDelete: 'NO ACTION',
							onUpdate: 'NO ACTION'
						}
					],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			expect(statements).to.include(
				`ALTER TABLE "subscription" ADD CONSTRAINT "${truncatedName}" FOREIGN KEY ("customerPaymentMethodId") REFERENCES "customerPaymentMethod" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;`
			);
			expect(statements.some((s) => s.includes(longName))).to.equal(false);
		});

		it('should not emit DROP or CREATE when check constraint name exceeds 63 chars but matches after truncation', () => {
			const longName = 'priceProperty_pricePropertyDefinitionId_pricePropertyDefinition_id_fk_chk'; // 74 chars
			const truncatedName = longName.slice(0, 63);

			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'priceProperty',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'amount',
								udtName: 'numeric',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 10,
								numericScale: 2
							}
						],
						checkConstraints: [
							{
								name: truncatedName,
								tableName: 'priceProperty',
								expression: 'CHECK (("amount" > 0))'
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'priceProperty',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'amount', type: 'DECIMAL', isNullable: false, roles: [], scopes: [], value: '10-2' }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [{ name: longName, check: '"amount" > 0' }],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const checkStatements = statements.filter((s) => s.includes(truncatedName) || s.includes(longName));
			expect(checkStatements).to.have.length(0);
		});

		it('should use truncated name in ADD CONSTRAINT CHECK SQL when check constraint name exceeds 63 chars', () => {
			const longName = 'priceProperty_pricePropertyDefinitionId_pricePropertyDefinition_id_fk_chk'; // 74 chars
			const truncatedName = longName.slice(0, 63);

			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'priceProperty',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'amount',
								udtName: 'numeric',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 10,
								numericScale: 2
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'priceProperty',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'amount', type: 'DECIMAL', isNullable: false, roles: [], scopes: [], value: '10-2' }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [{ name: longName, check: '"amount" > 0' }],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			expect(statements).to.include(
				`ALTER TABLE "priceProperty" ADD CONSTRAINT "${truncatedName}" CHECK ("amount" > 0);`
			);
			expect(statements.some((s) => s.includes(longName))).to.equal(false);
		});

		it('should not emit DROP or CREATE when ENUM check name exceeds 63 chars but matches after truncation', () => {
			// Table name 55 chars + '_status_check' = 68 chars total
			const tableName = 'aVeryLongTableNameThatWillCauseTheEnumCheckNameToExceedTheLimit';
			const fullCheckName = `${tableName}_status_check`; // > 63 chars
			const truncatedCheckName = fullCheckName.slice(0, 63);

			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: tableName,
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'status',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						checkConstraints: [
							{
								name: truncatedCheckName,
								tableName,
								expression:
									"CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::text, 'INACTIVE'::text])::text[])))"
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: tableName,
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'status',
							type: 'ENUM',
							isNullable: false,
							roles: [],
							scopes: [],
							value: "'ACTIVE','INACTIVE'"
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const checkStatements = statements.filter(
				(s) => s.includes(truncatedCheckName) || s.includes(fullCheckName)
			);
			expect(checkStatements).to.have.length(0);
		});

		it('should use truncated name in CREATE TABLE when FK and check constraint names exceed 63 chars', () => {
			const longFkName = 'subscription_customerPaymentMethodId_customerPaymentMethod_id_fk'; // 64 chars
			const truncatedFkName = longFkName.slice(0, 63);
			const longCheckName = 'priceProperty_pricePropertyDefinitionId_pricePropertyDefinition_nonneg_chk'; // 74 chars
			const truncatedCheckName = longCheckName.slice(0, 63);

			const snapshot: DbSnapshot = { tables: [] };

			const schema = makeSchema([
				{
					name: 'testTable',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'refId', type: 'INTEGER', isNullable: false, roles: [], scopes: [] },
						{ name: 'amount', type: 'DECIMAL', isNullable: false, roles: [], scopes: [], value: '10-2' }
					],
					indexes: [],
					foreignKeys: [
						{
							name: longFkName,
							column: 'refId',
							refTable: 'otherTable',
							refColumn: 'id',
							onDelete: 'NO ACTION',
							onUpdate: 'NO ACTION'
						}
					],
					checkConstraints: [{ name: longCheckName, check: '"amount" > 0' }],
					roles: [],
					scopes: []
				},
				{
					name: 'otherTable',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const createTestTable = statements.find((s) => s.startsWith('CREATE TABLE "testTable"'));
			expect(createTestTable).to.not.equal(undefined);
			expect(createTestTable).to.include(`CONSTRAINT "${truncatedFkName}" FOREIGN KEY`);
			expect(createTestTable).to.include(`CONSTRAINT "${truncatedCheckName}" CHECK`);
			expect(createTestTable).to.not.include(longFkName);
			expect(createTestTable).to.not.include(longCheckName);
		});

		it('should still emit DROP CONSTRAINT when a FK is removed from a kept table', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'post',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'authorId',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							}
						],
						foreignKeys: [
							{
								name: 'post_authorId_user_id_fk',
								tableName: 'post',
								column: 'authorId',
								refTable: 'user',
								refColumn: 'id',
								onDelete: 'CASCADE',
								onUpdate: 'NO ACTION'
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'post',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'authorId', type: 'INTEGER', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);

			expect(statements).to.include('ALTER TABLE "post" DROP CONSTRAINT "post_authorId_user_id_fk";');
			expect(statements).to.not.include('DROP TABLE "post";');
		});
	});

	describe('normalization: ENUM CHECK constraints with Postgres = ANY(ARRAY[...]) format', () => {
		it('should not diff when Postgres stores ENUM as = ANY (ARRAY[...]) without inner parens', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'attribute',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('attribute_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'type',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						checkConstraints: [
							{
								name: 'attribute_type_check',
								tableName: 'attribute',
								expression:
									"CHECK ((type = ANY (ARRAY['COLOR'::text, 'BUTTON_LIST'::text, 'IMAGE'::text, 'DROPDOWN'::text])))"
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'attribute',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'type',
							type: 'ENUM',
							isNullable: false,
							roles: [],
							scopes: [],
							value: "'COLOR','BUTTON_LIST','IMAGE','DROPDOWN'"
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const checkStatements = statements.filter((s) => s.includes('attribute_type_check'));
			expect(checkStatements).to.have.length(0);
		});

		it('should not diff when Postgres stores camelCase ENUM as = ANY (ARRAY[...])', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'customerPaymentMethod',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('customerPaymentMethod_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'paymentType',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						checkConstraints: [
							{
								name: 'customerPaymentMethod_paymentType_check',
								tableName: 'customerPaymentMethod',
								expression:
									`CHECK (("paymentType" = ANY (ARRAY['CARD'::text, 'BANK'::text, 'CRYPTO'::text, 'DIGITAL_WALLET'::text])))`
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'customerPaymentMethod',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'paymentType',
							type: 'ENUM',
							isNullable: false,
							roles: [],
							scopes: [],
							value: "'CARD','BANK','CRYPTO','DIGITAL_WALLET'"
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const checkStatements = statements.filter((s) =>
				s.includes('customerPaymentMethod_paymentType_check')
			);
			expect(checkStatements).to.have.length(0);
		});

		it('should not diff when Postgres stores ENUM with inner parens around ARRAY', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'subscription',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'status',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						checkConstraints: [
							{
								name: 'subscription_status_check',
								tableName: 'subscription',
								expression:
									"CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::text, 'PAUSED'::text, 'CANCELLED'::text, 'FAILED'::text])::text[])))"
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'subscription',
					columns: [
						{ name: 'id', type: 'INTEGER', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'status',
							type: 'ENUM',
							isNullable: false,
							roles: [],
							scopes: [],
							value: "'ACTIVE','PAUSED','CANCELLED','FAILED'"
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const checkStatements = statements.filter((s) => s.includes('subscription_status_check'));
			expect(checkStatements).to.have.length(0);
		});
	});

	describe('normalization: DECIMAL comma separator', () => {
		it('should not diff when schema uses comma separator for DECIMAL precision/scale', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'couponRedemption',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('couponRedemption_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'discountAmount',
								udtName: 'numeric',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 15,
								numericScale: 4
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'couponRedemption',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'discountAmount',
							type: 'DECIMAL',
							isNullable: false,
							roles: [],
							scopes: [],
							value: '15,4'
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const typeAlters = statements.filter((s) => s.includes('ALTER COLUMN') && s.includes('TYPE'));
			expect(typeAlters).to.have.length(0);
		});
	});

	describe('normalization: default value casts and boolean case', () => {
		it('should not diff when Postgres stores VARCHAR default with ::character varying cast', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'store',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('store_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'timezone',
								udtName: 'varchar',
								isNullable: false,
								columnDefault: "'UTC'::character varying",
								characterMaximumLength: 50,
								numericPrecision: null,
								numericScale: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'store',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'timezone',
							type: 'VARCHAR',
							isNullable: false,
							roles: [],
							scopes: [],
							length: 50,
							default: "'UTC'"
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const defaultAlters = statements.filter((s) => s.includes('SET DEFAULT'));
			expect(defaultAlters).to.have.length(0);
		});

		it('should diff when string literal default changes case (e.g. UTC to utc)', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'store',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('store_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'timezone',
								udtName: 'varchar',
								isNullable: false,
								columnDefault: "'UTC'::character varying",
								characterMaximumLength: 50,
								numericPrecision: null,
								numericScale: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'store',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'timezone',
							type: 'VARCHAR',
							isNullable: false,
							roles: [],
							scopes: [],
							length: 50,
							default: "'utc'"
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			expect(statements).to.include(
				`ALTER TABLE "store" ALTER COLUMN "timezone" SET DEFAULT 'utc';`
			);
		});

		it('should not diff when schema has uppercase boolean default and Postgres has lowercase', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'marketLanguage',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('marketLanguage_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'isDefault',
								udtName: 'bool',
								isNullable: false,
								columnDefault: 'true',
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'marketLanguage',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{
							name: 'isDefault',
							type: 'BOOLEAN',
							isNullable: false,
							roles: [],
							scopes: [],
							default: 'TRUE'
						}
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const defaultAlters = statements.filter((s) => s.includes('SET DEFAULT'));
			expect(defaultAlters).to.have.length(0);
		});
	});

	describe('normalization: index WHERE clause', () => {
		it('should not diff when Postgres wraps WHERE clause in parens and lowercases booleans', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'shippingZone',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('shippingZone_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'storeId',
								udtName: 'int8',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 64,
								numericScale: 0
							},
							{
								name: 'isFallback',
								udtName: 'bool',
								isNullable: false,
								columnDefault: 'false',
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						indexes: [
							{
								name: 'shippingZone_storeId_isFallback_unique_index',
								tableName: 'shippingZone',
								isUnique: true,
								isPrimary: false,
								columns: ['storeId'],
								order: 'ASC',
								where: '(("isFallback" = true))'
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'shippingZone',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'storeId', type: 'BIGINT', isNullable: false, roles: [], scopes: [] },
						{
							name: 'isFallback',
							type: 'BOOLEAN',
							isNullable: false,
							roles: [],
							scopes: [],
							default: 'false'
						}
					],
					indexes: [
						{
							name: 'shippingZone_storeId_isFallback_unique_index',
							columns: ['storeId'],
							isUnique: true,
							isPrimaryKey: false,
							order: 'ASC',
							where: '"isFallback" = TRUE'
						}
					],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const indexStatements = statements.filter((s) =>
				s.includes('shippingZone_storeId_isFallback_unique_index')
			);
			expect(indexStatements).to.have.length(0);
		});

		it('should not diff when Postgres wraps multiple WHERE conditions in sub-expression parens', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'storePaymentProvider',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('storePaymentProvider_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'storeId',
								udtName: 'int4',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'isActive',
								udtName: 'bool',
								isNullable: false,
								columnDefault: 'false',
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							},
							{
								name: 'isDefault',
								udtName: 'bool',
								isNullable: false,
								columnDefault: 'false',
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						indexes: [
							{
								name: 'storePaymentProvider_storeId_isActive_isDefault_unique_index',
								tableName: 'storePaymentProvider',
								isUnique: true,
								isPrimary: false,
								columns: ['storeId', 'isActive', 'isDefault'],
								order: 'ASC',
								where: '(("isActive" = true) AND ("isDefault" = true))'
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'storePaymentProvider',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'storeId', type: 'INTEGER', isNullable: false, roles: [], scopes: [] },
						{
							name: 'isActive',
							type: 'BOOLEAN',
							isNullable: false,
							roles: [],
							scopes: [],
							default: 'false'
						},
						{
							name: 'isDefault',
							type: 'BOOLEAN',
							isNullable: false,
							roles: [],
							scopes: [],
							default: 'false'
						}
					],
					indexes: [
						{
							name: 'storePaymentProvider_storeId_isActive_isDefault_unique_index',
							columns: ['storeId', 'isActive', 'isDefault'],
							isUnique: true,
							isPrimaryKey: false,
							order: 'ASC',
							where: '"isActive" = true AND "isDefault" = true'
						}
					],
					foreignKeys: [],
					checkConstraints: [],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const indexStatements = statements.filter((s) =>
				s.includes('storePaymentProvider_storeId_isActive_isDefault_unique_index')
			);
			expect(indexStatements).to.have.length(0);
		});
	});

	describe('normalization: CHECK constraint != vs <> and sub-expression parens', () => {
		it('should not diff when Postgres uses <> and schema uses !=', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'coupon',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('coupon_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'type',
								udtName: 'text',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							},
							{
								name: 'value',
								udtName: 'numeric',
								isNullable: false,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						checkConstraints: [
							{
								name: 'coupon_percentage_max_chk',
								tableName: 'coupon',
								expression:
									"CHECK (((type <> 'PERCENTAGE'::text) OR (value <= (100)::numeric)))"
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'coupon',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'type', type: 'TEXT', isNullable: false, roles: [], scopes: [] },
						{ name: 'value', type: 'DECIMAL', isNullable: false, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [
						{
							name: 'coupon_percentage_max_chk',
							check: `"type" != 'PERCENTAGE' OR "value" <= 100`
						}
					],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const checkStatements = statements.filter((s) => s.includes('coupon_percentage_max_chk'));
			expect(checkStatements).to.have.length(0);
		});

		it('should not diff when Postgres wraps OR operands in sub-expression parens', () => {
			const snapshot: DbSnapshot = {
				tables: [
					makeDbTable({
						name: 'coupon',
						columns: [
							{
								name: 'id',
								udtName: 'int4',
								isNullable: false,
								columnDefault: "nextval('coupon_id_seq'::regclass)",
								characterMaximumLength: null,
								numericPrecision: 32,
								numericScale: 0
							},
							{
								name: 'startDate',
								udtName: 'timestamp',
								isNullable: true,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							},
							{
								name: 'endDate',
								udtName: 'timestamp',
								isNullable: true,
								columnDefault: null,
								characterMaximumLength: null,
								numericPrecision: null,
								numericScale: null
							}
						],
						checkConstraints: [
							{
								name: 'coupon_date_order_chk',
								tableName: 'coupon',
								expression:
									'CHECK ((("endDate" IS NULL) OR ("startDate" IS NULL) OR ("endDate" >= "startDate")))'
							}
						]
					})
				]
			};

			const schema = makeSchema([
				{
					name: 'coupon',
					columns: [
						{ name: 'id', type: 'SERIAL', isNullable: false, roles: [], scopes: [], isPrimary: true },
						{ name: 'startDate', type: 'TIMESTAMP', isNullable: true, roles: [], scopes: [] },
						{ name: 'endDate', type: 'TIMESTAMP', isNullable: true, roles: [], scopes: [] }
					],
					indexes: [],
					foreignKeys: [],
					checkConstraints: [
						{
							name: 'coupon_date_order_chk',
							check: '"endDate" IS NULL OR "startDate" IS NULL OR "endDate" >= "startDate"'
						}
					],
					roles: [],
					scopes: []
				}
			]);

			const statements = diffSchemaToDatabase(schema, snapshot);
			const checkStatements = statements.filter((s) => s.includes('coupon_date_order_chk'));
			expect(checkStatements).to.have.length(0);
		});
	});
});
