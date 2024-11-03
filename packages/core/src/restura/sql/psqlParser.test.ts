import { expect } from 'chai';
import { Done } from 'mocha';
import psqlParser from './psqlParser.js';

function test(inputString: string, testName?: string) {
	const result: string = psqlParser.parse(inputString);
	const { select, from, joins, where, groupBy, orderBy, limit } = result;
	const query =
		`${select} ${from} ${joins || ''} ${where || ''} ${groupBy || ''} ${orderBy || ''} ${limit || ''}`.trim();

	try {
		expect(query).to.exist.with.length.greaterThan(0).and.is.equal(inputString);
	} catch (e) {
		if (testName) console.error(testName, 'failed');
		throw e;
	}
}
function testRemoveSpace(inputString: string, testName?: string) {
	const result: string = psqlParser.parse(inputString);
	const { select, from, joins, where, groupBy, orderBy, limit } = result;
	const query =
		`${select} ${from} ${joins || ''} ${where || ''} ${groupBy || ''} ${orderBy || ''} ${limit || ''}`.trim();
	try {
		expect(query.toLowerCase().replace(/\n/g, '').replace(/ /g, ''))
			.to.exist.with.length.greaterThan(0)
			.and.is.equal(inputString.toLowerCase().replace(/ /g, '').replace(/\n/g, ''));
	} catch (e) {
		if (testName) console.error(testName, 'failed');
		throw e;
	}
}

describe('Psql Parsing test', function () {
	it('Should parse valid queries', function (done: Done) {
		test(
			'SELECT name FROM users LEFT JOIN orders ON users.id = orders.user_id WHERE age > 18 GROUP BY name ORDER BY age LIMIT 10',
			'single column select'
		);
		test(
			'SELECT "user".name,date,age FROM "user" LEFT JOIN orders ON users.id = orders.user_id WHERE age > 18 GROUP BY name ORDER BY age LIMIT 10',
			'multi column select'
		);
		test('SELECT "users".name,"users".date,age FROM users', 'quote support');
		test('SELECT "users".name,"users".date,age FROM users', 'quote support');
		testRemoveSpace('SELECT "users".name, "users".date,age FROM users', 'space support');
		test(
			'SELECT users.name,date,age FROM users LEFT JOIN orders ON users.id = orders.user_id WHERE age > 18 GROUP BY users.name,id ORDER BY age LIMIT 10',
			'multi column select'
		);
		testRemoveSpace(
			`select company.*
from company
         join "user" on company.id = "user"."companyId"
group by company.id`,
			''
		);
		testRemoveSpace(
			`select company.*, count(1)
from company
         join "user" on company.id = "user"."companyId"
group by company.id`,
			'aggregate select'
		);
		testRemoveSpace(
			`select company.name AS num_users from company
         join "user" on company.id = "user"."companyId"
group by company.id`,
			'alias'
		);
		testRemoveSpace(
			`select company.name AS "numUsers" from company
         join "user" on company.id = "user"."companyId"
group by company.id`,
			'quoted alias'
		);
		testRemoveSpace(
			`select count("user".id) AS "numUsers" from company
         join "user" on company.id = "user"."companyId"
group by company.id`,
			'quoted alias with aggregate'
		);

		// testRemoveSpace(
		// 	`select ( select user.id from users ) AS total from company`,
		// 	'subQuery'
		// );

		done();
	});
	it('Should reject invalid strings', function (done: Done) {
		done();
	});
});
