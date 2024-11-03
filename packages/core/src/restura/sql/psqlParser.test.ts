import { expect } from 'chai';
import { Done } from 'mocha';
import { psqlParser } from './psqlParser.js';

const trimRedundantWhitespace = (str: string) => str.replace(/\s+/g, ' ').trim();

describe('Psql Parsing test', function () {
	it('should find the total from any query', function (done: Done) {
		expect(
			psqlParser.toTotalQuery(`SELECT id
                                        from user;`)
		).to.equal(
			trimRedundantWhitespace(`SELECT COUNT(*) AS "total"
             FROM "user"`)
		);
		expect(
			psqlParser.toTotalQuery(`SELECT id
                                        from user
                                        group by user.id
                                        order by user.id
                                        limit 1;`)
		).to.equal(
			trimRedundantWhitespace(`SELECT COUNT(*) AS "total"
             FROM "user"`)
		);
		expect(
			psqlParser.toTotalQuery(`SELECT id, (select id from company) as company_ids
                                        from user
                                        group by user.id
                                        order by user.id
                                        limit 1;`)
		).to.equal(
			trimRedundantWhitespace(`SELECT COUNT(*) AS "total"
             FROM "user"`)
		);
		done();
	});
	it('Should reject invalid strings', function (done: Done) {
		done();
	});
});
