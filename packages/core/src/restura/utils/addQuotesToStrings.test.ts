import addQuotesToStrings from './addQuotesToStrings';

describe('addQuotesToStrings', () => {
	it('should not add quotes to numbers', () => {
		expect(addQuotesToStrings(1)).toBe(1);
	});
	it('should add quotes to a string', () => {
		expect(addQuotesToStrings('asdf')).toBe("'asdf'");
	});
	it('should add quotes to all strings in an array', () => {
		const withQuotes = addQuotesToStrings(['asdf', '1234', 1234]);
		expect(JSON.stringify(withQuotes, null, 0)).toBe('["\'asdf\'","\'1234\'",1234]');
	});
});
