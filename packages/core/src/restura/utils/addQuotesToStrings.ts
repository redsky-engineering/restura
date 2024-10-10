// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export default function addQuotesToStrings(variable: any): any {
	if (typeof variable === 'string') {
		return `'${variable}'`; // Add quotes around strings
	} else if (Array.isArray(variable)) {
		// For arrays, iterate through each element and handle accordingly
		const arrayWithQuotes = variable.map(addQuotesToStrings);
		return arrayWithQuotes;
		// return `[${arrayWithQuotes.join(', ')}]`;
	} else {
		return variable; // Print other types as is
	}
}
