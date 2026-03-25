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
			expect(createStory).to.exist;
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
			expect(createCategory).to.exist;
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
			expect(createProduct).to.exist;
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
			expect(createOrder).to.exist;
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
			expect(createPost).to.exist;
			expect(createPost).to.include('CONSTRAINT "post_userId_user_id_fk" FOREIGN KEY');

			const alterFks = statements.filter(
				(s) => s.includes('ALTER TABLE "post"') && s.includes('FOREIGN KEY')
			);
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

			expect(statements).to.include(
				'ALTER TABLE "subscription" DROP CONSTRAINT "subscription_status_check";'
			);
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

			expect(statements).to.include(
				'ALTER TABLE "product" DROP CONSTRAINT "product_price_positive";'
			);
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

			expect(statements).to.include(
				'ALTER TABLE "user" ALTER COLUMN "bio" TYPE VARCHAR USING "bio"::VARCHAR;'
			);
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
			expect(statements).to.include(
				'CREATE INDEX "user_search_index" ON "user" ("email" ASC, "firstName" ASC);'
			);
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
			expect(statements).to.include(
				'CREATE UNIQUE INDEX "user_email_index" ON "user" ("email" ASC);'
			);
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
			expect(statements).to.include(
				'CREATE INDEX "event_createdAt_index" ON "event" ("createdAt" DESC);'
			);
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

			const indexStatements = statements.filter(
				(s) => s.includes('user_email_index')
			);
			expect(indexStatements).to.have.length(0);
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
});
