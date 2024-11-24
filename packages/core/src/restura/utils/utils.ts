import type { DynamicObject } from '../types/customExpressTypes.js';

type QuotedValue = string | QuotedValue[] | Exclude<unknown, string | unknown[]>;

export function addQuotesToStrings(variable: unknown): QuotedValue {
	if (typeof variable === 'string') {
		return `'${variable}'`;
	} else if (Array.isArray(variable)) {
		const arrayWithQuotes = variable.map(addQuotesToStrings);
		return arrayWithQuotes;
	} else {
		return variable;
	}
}

export function sortObjectKeysAlphabetically<T>(obj: T): T {
	if (Array.isArray(obj)) {
		// If the value is an array, recurse for each element
		return obj.map(sortObjectKeysAlphabetically) as T;
	} else if (obj !== null && typeof obj === 'object') {
		// If the value is an object, sort its keys
		return Object.keys(obj)
			.sort()
			.reduce((sorted: DynamicObject, key: string) => {
				sorted[key] = sortObjectKeysAlphabetically((obj as Record<string, T>)[key]);
				return sorted;
			}, {}) as T;
	}
	// If the value is a primitive, return it as-is
	return obj;
}
