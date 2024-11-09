import { assert, expect } from 'chai';
import { Done } from 'mocha';
import filterMySqlParser from '../sql/filterMySqlParser.js';

function test(inputString: string, expectedString: string) {
	const result: string = filterMySqlParser.parse(inputString);
	expect(result).to.exist.with.length.greaterThan(0).and.is.equal(expectedString);
}

function testBadInput(inputString: string) {
	try {
		filterMySqlParser.parse(inputString);
		assert.fail(`The parsing should have failed on ${inputString}`);
	} catch (e: unknown) {
		if (e instanceof Error && e.name !== 'SyntaxError') {
			throw e;
		}
	}
}

describe('Filter Sql Parsing test', function () {
	it('Should parse valid strings', function (done: Done) {
		test('!(column:id,value:4504055,type:contains)', "!(`id` LIKE '%4504055%')");
		test('!(column:id,value:4504055,type:startsWith)', "!(`id` LIKE '4504055%')");
		test(
			'!(column:id,value:4504055,type:contains)and!(column:name,value:jim,type:endsWith)',
			"!(`id` LIKE '%4504055%') and !(`name` LIKE '%jim')"
		);
		test('(((column:id,value:4504055,type:contains)))', "(((`id` LIKE '%4504055%')))");
		test(
			'!(!(column:userId,value:15234,type:exact)and!(column:name,value:jim,type:startsWith))or(column:name,value:bob)',
			"!(!(`userId` = '15234') and !(`name` LIKE 'jim%')) or (`name` = 'bob')"
		);

		test('(column:id,value:251,type:contains)', "(`id` LIKE '%251%')");
		test('(column:id,value:25,type:exact)', "(`id` = '25')");
		test('(column:id,value:251,type:startsWith)', "(`id` LIKE '251%')");
		test('(column:id,value:251,type:endsWith)', "(`id` LIKE '%251')");

		test(
			'(column:id,value:251,type:endsWith)or(column:id,value:278,type:endsWith)',
			"(`id` LIKE '%251') or (`id` LIKE '%278')"
		);
		test(
			'((column:id,value:251)or(column:id,value:278)or(column:id,value:215))AND(column:status,value:PROCESSING,type:exact)',
			"((`id` = '251') or (`id` = '278') or (`id` = '215')) AND (`status` = 'PROCESSING')"
		);

		test(
			'(column:id,value:215)AND(column:totalPriceCents,value:3069,type:greaterThan)',
			"(`id` = '215') AND (`totalPriceCents` > '3069')"
		);
		test(
			'(column:id,value:215)AND(column:totalPriceCents,value:3070,type:greaterThan)',
			"(`id` = '215') AND (`totalPriceCents` > '3070')"
		);
		test(
			'(column:id,value:215)AND!(column:totalPriceCents,value:3070,type:greaterThan)',
			"(`id` = '215') AND !(`totalPriceCents` > '3070')"
		);
		test(
			'(column:id,value:215)AND!(column:totalPriceCents,value:3071,type:lessThan)',
			"(`id` = '215') AND !(`totalPriceCents` < '3071')"
		);
		test(
			'(column:id,value:215)AND!(column:totalPriceCents,value:3071,type:lessThanEqual)',
			"(`id` = '215') AND !(`totalPriceCents` <= '3071')"
		);

		test(
			'(column:id,value:215)AND!(column:totalPriceCents,value:3071,type:lessThan)',
			"(`id` = '215') AND !(`totalPriceCents` < '3071')"
		);
		test(
			'(column:orderV2.id,value:215)AND(column:orderV2.totalPriceCents,value:3070,type:greaterThanEqual)and(column:totalPriceCents,value:3070,type:lessThanEqual)',
			"(`orderV2`.`id` = '215') AND (`orderV2`.`totalPriceCents` >= '3070') and (`totalPriceCents` <= '3070')"
		);

		test(
			'(column:id)AND!(column:totalPriceCents,value:3071,type:lessThan)',
			"(`id` = NULL) AND !(`totalPriceCents` < '3071')"
		);

		test(
			'(column:id,type:isNull)AND!(column:totalPriceCents,value:3071,type:lessThan)',
			"(isNull(`id`)) AND !(`totalPriceCents` < '3071')"
		);

		done();
	});
	it('Should reject invalid strings', function (done: Done) {
		testBadInput(
			'(colum:orderV2.id,value:215)AND(column:orderV2.totalPriceCents,value:3070,type:greaterThanEqual)and(column:totalPriceCents,value:3070,type:lessThanEqual)'
		);
		testBadInput(
			'(value:215)AND(column:orderV2.totalPriceCents,value:3070,type:greaterThanEqual)and(column:totalPriceCents,value:3070,type:lessThanEqual)'
		);
		testBadInput(
			'(colum:orderV2.id,value:215)AND(column:orderV2.totalPriceCents,value:3070,type:greaterThanEqual)and(value:3070,column:totalPriceCents,,type:lessThanEqual)'
		);
		testBadInput('');
		testBadInput('()');
		testBadInput('%(column:id,value:4504055,type:contains)and!(column:name,value:jim,type:endsWith)');
		testBadInput(
			"!(column:id,value:4504055,type:contains)and!(column:name,value:jim'; 'DROP TABLE userV2'; ,type:endsWith)"
		);
		testBadInput(
			'(colum:orderV2.id,value:215)AND(column:orderV2.totalPriceCents,value:3070,type:greaterThanEqual)xor(value:3070,column:totalPriceCents,,type:lessThanEqual)'
		);
		done();
	});
});
