import { expect } from 'chai';
import addQuotesToStrings from '../utils/addQuotesToStrings.js';

describe('addQuotesToStrings', () => {
	it('should not add quotes to numbers', () => {
		expect(addQuotesToStrings(1)).to.equal(1);
	});
	it('should add quotes to a string', () => {
		expect(addQuotesToStrings('asdf')).to.equal("'asdf'");
	});
	it('should add quotes to all strings in an array', () => {
		const withQuotes = addQuotesToStrings(['asdf', '1234', 1234]);
		expect(JSON.stringify(withQuotes, null, 0)).to.equal('["\'asdf\'","\'1234\'",1234]');
	});
});
