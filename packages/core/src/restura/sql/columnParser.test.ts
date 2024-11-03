import { expect } from 'chai';
import { Done } from 'mocha';
import columnParser from './columnParser.js';
function test(inputString: string, expected: string, testName?: string) {
	const result: string = columnParser.parse(inputString);
	// console.log(JSON.stringify(result, null, 1));

	console.log(result);
	try {
		expect(expected).to.exist.with.length.greaterThan(0).and.is.equal(result);
	} catch (e) {
		if (testName) console.error(testName, 'failed');
		throw e;
	}
}

describe('Column Parsing test', function () {
	it('Should parse valid columns', function (done: Done) {
		test('name,age,date', 'name,age,date', 'single column select');

		done();
	});
	it('Should reject invalid strings', function (done: Done) {
		done();
	});
});
