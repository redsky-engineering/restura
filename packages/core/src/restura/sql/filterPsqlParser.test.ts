import { expect, assert } from 'chai';
import { Done } from 'mocha';
import filterPsqlParser from './filterPsqlParser.js';
function test(inputString: string, expectedString: string, testName?: string) {
	const result: string = filterPsqlParser.parse(inputString);
	try {
		expect(result).to.exist.with.length.greaterThan(0).and.is.equal(expectedString);
	} catch (e) {
		if (testName) console.error(testName, 'failed');
		throw e;
	}
}

function testBadInput(inputString: string, testName?: string) {
	try {
		filterPsqlParser.parse(inputString);
		assert.fail(`The parsing should have failed on ${inputString} ` + testName);
		// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	} catch (e: any) {
		if (e.name !== 'SyntaxError') {
			throw e;
		}
	}
}

describe('Filter Psql Parsing test', function () {
	it('Should parse valid strings', function (done: Done) {
		test('!(column:id,value:4504055,type:contains)', ` NOT ("id" ILIKE '%4504055%')`);
		test('!(column:id,value:4504055,type:startsWith)', ` NOT ("id" ILIKE '4504055%')`);
		test('(column:id,value:Tanner B,type:startsWith)', `("id" ILIKE 'Tanner B%')`, 'allow space');
		test('(column: id ,value: Tanner B ,type:startsWith)', `(" id " ILIKE ' Tanner B %')`, 'allow space');
		test('(column:id,value:Tanner  B,type:startsWith)', `("id" ILIKE 'Tanner  B%')`, 'allow spaces');
		test(`(column:id,value:Tanner	B,type:startsWith)`, `("id" ILIKE 'Tanner	B%')`, 'allow tab');
		test(
			`(column:id,value:Tanner
B,type:startsWith)`,
			`("id" ILIKE 'Tanner
B%')`,
			'allow newline'
		);
		test(
			'!(column:id,value:4504055,type:contains)and!(column:name,value:jim,type:endsWith)',
			` NOT ("id" ILIKE '%4504055%') and  NOT ("name" ILIKE '%jim')`
		);
		test(
			'!(column:id,value:4504055,type:contains)   and!(column:name,value:jim,type:endsWith)',
			` NOT ("id" ILIKE '%4504055%') and  NOT ("name" ILIKE '%jim')`,
			'allow but trim whitespace'
		);
		test(
			'! ( column :id, value :4504055,  type: contains )   and ! ( column :name, value :jim, type : endsWith ) ',
			` NOT ("id" ILIKE '%4504055%') and  NOT ("name" ILIKE '%jim')`,
			'allow but trim whitespace'
		);
		test(
			'!(column:id,value:4504055,type :contains)   and!(column:name,value:jim,type:endsWith)',
			` NOT ("id" ILIKE '%4504055%') and  NOT ("name" ILIKE '%jim')`,
			'allow but trim whitespace'
		);
		test(
			'!(column:id,value:4504055 ,  type:contains)   and!(column:name,value:jim,type:endsWith)',
			` NOT ("id" ILIKE '%4504055 %') and  NOT ("name" ILIKE '%jim')`,
			'allow but trim whitespace'
		);

		test('(((column:id,value:4504055,type:contains)))', `((("id" ILIKE '%4504055%')))`);

		test('(column:id,value:15234,type:exact)', `("id" = '15234')`);
		test('(column:userId,value:15234,type:exact)', `("userId" = '15234')`);
		test('!(column:userId,value:15234,type:exact)', ` NOT ("userId" = '15234')`);
		test(
			'!(!(column:userId,value:15234,type:exact)and!(column:name,value:jim,type:startsWith))or(column:name,value:bob)',
			` NOT ( NOT ("userId" = '15234') and  NOT ("name" ILIKE 'jim%')) or ("name" = 'bob')`
		);

		test('(column:id,value:251,type:contains)', `("id" ILIKE '%251%')`);
		test('(column:id,value:25,type:exact)', `("id" = '25')`);
		test('(column:id,value:251,type:startsWith)', `("id" ILIKE '251%')`);
		test('(column:id,value:251,type:endsWith)', `("id" ILIKE '%251')`);

		test(
			'(column:id,value:251,type:endsWith)or(column:id,value:278,type:endsWith)',
			`("id" ILIKE '%251') or ("id" ILIKE '%278')`
		);
		test(
			'((column:id,value:251)or(column:id,value:278)or(column:id,value:215))AND(column:status,value:PROCESSING,type:exact)',
			`(("id" = '251') or ("id" = '278') or ("id" = '215')) AND ("status" = 'PROCESSING')`
		);

		test(
			'(column:id,value:215)AND(column:totalPriceCents,value:3069,type:greaterThan)',
			`("id" = '215') AND ("totalPriceCents" > '3069')`
		);
		test(
			'(column:id,value:215)AND(column:totalPriceCents,value:3070,type:greaterThan)',
			`("id" = '215') AND ("totalPriceCents" > '3070')`
		);
		test(
			'(column:id,value:215)AND!(column:totalPriceCents,value:3070,type:greaterThan)',
			`("id" = '215') AND  NOT ("totalPriceCents" > '3070')`
		);
		test(
			'(column:id,value:215)AND!(column:totalPriceCents,value:3071,type:lessThan)',
			`("id" = '215') AND  NOT ("totalPriceCents" < '3071')`
		);
		test(
			'(column:id,value:215)AND!(column:totalPriceCents,value:3071,type:lessThanEqual)',
			`("id" = '215') AND  NOT ("totalPriceCents" <= '3071')`
		);

		test(
			'(column:id,value:215)AND!(column:totalPriceCents,value:3071,type:lessThan)',
			`("id" = '215') AND  NOT ("totalPriceCents" < '3071')`
		);
		test('(column:orderV2.id,value:215)', `("orderV2"."id" = '215')`);
		test(
			'(column:orderV2.id,value:215)AND(column:orderV2.totalPriceCents,value:3070,type:greaterThanEqual)and(column:totalPriceCents,value:3070,type:lessThanEqual)',
			`("orderV2"."id" = '215') AND ("orderV2"."totalPriceCents" >= '3070') and ("totalPriceCents" <= '3070')`
		);

		test(
			'(column:id)AND!(column:totalPriceCents,value:3071,type:lessThan)',
			`("id" = NULL) AND  NOT ("totalPriceCents" < '3071')`
		);

		test(
			'(column:id,type:isNull)AND!(column:totalPriceCents,value:3071,type:lessThan)',
			`(isNull("id")) AND  NOT ("totalPriceCents" < '3071')`
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
