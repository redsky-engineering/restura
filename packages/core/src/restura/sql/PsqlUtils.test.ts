import { insertObjectQuery, questionMarksToOrderedParams, SQL, updateObjectQuery } from './PsqlUtils';

describe('PsqlUtils', () => {
	it('should convert an object to an insert statement', () => {
		const query = insertObjectQuery('USER', { id: 1, firstName: 'bob', isActive: true });
		const expectedQuery = `INSERT INTO "USER" ("id", "firstName", "isActive")
                           VALUES (1, 'bob', true)
                           RETURNING *`;
		expect(trimRedundantWhitespace(query)).toBe(trimRedundantWhitespace(expectedQuery));
	});
	it('should convert an object to an update statement', () => {
		const query = updateObjectQuery('USER', { firstName: 'bob', isActive: true }, 'WHERE "id" = 1');
		const expectedQuery = `UPDATE "USER"
                           SET "firstName" = 'bob',
                               "isActive"  = true
                           WHERE "id" = 1
                           RETURNING *`;
		expect(trimRedundantWhitespace(query)).toBe(trimRedundantWhitespace(expectedQuery));
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
		expect(trimRedundantWhitespace(query)).toBe(trimRedundantWhitespace(expectedQuery));
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
		expect(trimRedundantWhitespace(query)).toBe(trimRedundantWhitespace(expectedQuery));
	});
	it('should replace ? with numbered params', () => {
		const query = questionMarksToOrderedParams(`UPDATE "USER"
                                                SET "firstName" ='?',
                                                    "isActive"  ='?'
                                                WHERE "id" = '?'
                                                RETURNING *`);
		const expectedQuery = `UPDATE "USER"
                           SET "firstName" =$1,
                               "isActive"  =$2
                           WHERE "id" = $3
                           RETURNING *`;
		expect(trimRedundantWhitespace(query)).toBe(trimRedundantWhitespace(expectedQuery));
	});
});
const trimRedundantWhitespace = (str: string) => str.replace(/\s+/g, ' ').trim();
