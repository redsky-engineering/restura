import { expect } from 'chai';
import {
	escapeColumnName,
	insertObjectQuery,
	questionMarksToOrderedParams,
	SQL,
	toSqlLiteral,
	updateObjectQuery
} from '../sql/PsqlUtils.js';

describe('PsqlUtils', () => {
	it('should convert an object to an insert statement', () => {
		const query = insertObjectQuery('USER', { id: 1, firstName: 'bob', isActive: true });
		const expectedQuery = `INSERT INTO "USER" ("id", "firstName", "isActive")
                           VALUES (1, 'bob', true)
                           RETURNING *`;
		expect(trimRedundantWhitespace(query)).to.equal(trimRedundantWhitespace(expectedQuery));
	});
	it('should convert an object with an assignment to an insert statement', () => {
		const query = insertObjectQuery('USER', { id: 1, partnerId: '?' });
		const expectedQuery = `INSERT INTO "USER" ("id", "partnerId")
                           VALUES (1, ?)
                           RETURNING *`;
		expect(trimRedundantWhitespace(query)).to.equal(trimRedundantWhitespace(expectedQuery));
	});
	it('should convert an object to an update statement', () => {
		const query = updateObjectQuery('USER', { firstName: 'bob', isActive: true }, 'WHERE "id" = 1');
		const expectedQuery = `UPDATE "USER"
                           SET "firstName" = 'bob',
                               "isActive"  = true
                           WHERE "id" = 1
                           RETURNING *`;
		expect(trimRedundantWhitespace(query)).to.equal(trimRedundantWhitespace(expectedQuery));
	});
	it('should escape a column name that is simple', () => {
		const columnName = 'id';
		const escapedColumnName = escapeColumnName(columnName);
		expect(escapedColumnName).to.equal('"id"');
	});
	it('should escape a column name that is has sql injection', () => {
		const columnName = '""; drop db;';
		const escapedColumnName = escapeColumnName(columnName);
		expect(escapedColumnName).to.equal('"; drop db;"');
	});
	it('should escape a column that has a period in it', () => {
		const columnName = 'user.id';
		const escapedColumnName = escapeColumnName(columnName);
		expect(escapedColumnName).to.equal('"user"."id"');
	});
	it('should format a query and escape user input', () => {
		const firstName = 'bob';
		const isActive = true;
		const id = 1;
		const query = SQL`UPDATE "USER"
                      SET "firstName" = ${firstName},
                          "isActive"  = ${isActive}
                      WHERE "id" = ${id}
                      RETURNING *`;
		const expectedQuery = `UPDATE "USER"
                           SET "firstName" = 'bob',
                               "isActive"  = true
                           WHERE "id" = 1
                           RETURNING *`;
		expect(trimRedundantWhitespace(query)).to.equal(trimRedundantWhitespace(expectedQuery));
	});
	it('should format a query and treat phone_numbers as a string', () => {
		const phoneNumber = '+18018885555';
		const id = 1;
		const query = SQL`UPDATE "USER"
                      SET "phone" = ${phoneNumber},
                      WHERE "id" = ${id}
                      RETURNING *`;
		const expectedQuery = `UPDATE "USER"
                           SET "phone" = '+18018885555',
                           WHERE "id" = 1
                           RETURNING *`;
		expect(trimRedundantWhitespace(query)).to.equal(trimRedundantWhitespace(expectedQuery));
	});
	it('should format a query and prevent sql injection', () => {
		const firstName = "'; drop db;";
		const isActive = true;
		const id = 1;
		const query = SQL`UPDATE "USER"
                      SET "firstName" =${firstName},
                          "isActive"  = ${isActive}
                      WHERE "id" = ${id}
                      RETURNING *`;
		const expectedQuery = `UPDATE "USER"
                           SET "firstName" ='''; drop db;',
                               "isActive"  = true
                           WHERE "id" = 1
                           RETURNING *`;
		expect(trimRedundantWhitespace(query)).to.equal(trimRedundantWhitespace(expectedQuery));
	});
	it('should format a query and properly parse JSON root array as an escaped JSON string', () => {
		const issues = [{ key: "'; SELECT 1; --" }];
		const id = 1;
		const query = SQL`UPDATE "component"
                      SET "issues" =${issues}
                      WHERE "id" = ${id}
                      RETURNING *`;
		const expectedQuery = `UPDATE "component"
                           SET "issues" ='[{"key":"''; SELECT 1; --"}]'::jsonb
                           WHERE "id" = 1
                           RETURNING *`;
		expect(trimRedundantWhitespace(query)).to.equal(trimRedundantWhitespace(expectedQuery));
	});
	it('should replace ? with numbered params', () => {
		const query = questionMarksToOrderedParams(`UPDATE "USER"
                                                SET "firstName" =?,
                                                    "isActive"  =?
                                                WHERE "id" = ?
                                                RETURNING *`);
		const expectedQuery = `UPDATE "USER"
                           SET "firstName" =$1,
                               "isActive"  =$2
                           WHERE "id" = $3
                           RETURNING *`;
		expect(trimRedundantWhitespace(query)).to.equal(trimRedundantWhitespace(expectedQuery));
	});
	it('should replace ? with numbered params and handle the issue of string literals that might have ? inside them', () => {
		const query = questionMarksToOrderedParams(`UPDATE "USER"
												SET "firstName" ='Jimmy?'
												WHERE "id" = ?
												RETURNING *`);
		const expectedQuery = `UPDATE "USER"
						   SET "firstName" ='Jimmy?'
						   WHERE "id" = $1
						   RETURNING *`;
		expect(trimRedundantWhitespace(query)).to.equal(trimRedundantWhitespace(expectedQuery));
	});

	describe('toSqlLiteral', () => {
		it('should format a string with quotes', () => {
			expect(toSqlLiteral('test')).to.equal("'test'");
		});

		it('should escape special characters in strings', () => {
			expect(toSqlLiteral("it's a test")).to.equal("'it''s a test'");
		});

		it('should return NULL for null', () => {
			expect(toSqlLiteral(null)).to.equal('NULL');
		});

		it('should return NULL for undefined', () => {
			expect(toSqlLiteral(undefined)).to.equal('NULL');
		});

		it('should format numbers as unquoted literals', () => {
			expect(toSqlLiteral(42)).to.equal('42');
			expect(toSqlLiteral(3.14)).to.equal('3.14');
			expect(toSqlLiteral(-100)).to.equal('-100');
			expect(toSqlLiteral(0)).to.equal('0');
		});

		it('should return NULL for non-finite numbers', () => {
			expect(toSqlLiteral(Infinity)).to.equal('NULL');
			expect(toSqlLiteral(-Infinity)).to.equal('NULL');
			expect(toSqlLiteral(NaN)).to.equal('NULL');
		});

		it('should format booleans as TRUE/FALSE', () => {
			expect(toSqlLiteral(true)).to.equal('TRUE');
			expect(toSqlLiteral(false)).to.equal('FALSE');
		});

		it('should format simple arrays', () => {
			expect(toSqlLiteral([1, 2, 3])).to.equal('ARRAY[1, 2, 3]');
			expect(toSqlLiteral(['a', 'b'])).to.equal("ARRAY['a', 'b']");
		});

		it('should format arrays with mixed types', () => {
			expect(toSqlLiteral([1, 'two', true, null])).to.equal("ARRAY[1, 'two', TRUE, NULL]");
		});

		it('should format nested arrays', () => {
			expect(
				toSqlLiteral([
					[1, 2],
					[3, 4]
				])
			).to.equal('ARRAY[ARRAY[1, 2], ARRAY[3, 4]]');
		});

		it('should format empty arrays', () => {
			expect(toSqlLiteral([])).to.equal('ARRAY[]');
		});

		it('should format Date objects', () => {
			const date = new Date('2024-01-15T12:00:00.000Z');
			const formatted = toSqlLiteral(date);
			expect(formatted).to.include('2024');
		});
	});
});
const trimRedundantWhitespace = (str: string) => str.replace(/\s+/g, ' ').trim();
