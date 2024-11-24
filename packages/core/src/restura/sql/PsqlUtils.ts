import format from 'pg-format';
import { DynamicObject } from '../types/customExpressTypes.js';

/**
 * This method does a couple of things:
 * 1. It escapes the column name to prevent SQL injection by removing any double quotes.
 * 2. It wraps the column name in double quotes to prevent any issues with reserved words or casing.
 * 3. It replaces any periods in the column name with a period wrapped in double quotes to prevent any issues with schema names.
 * NOTE: I looked into using pg-format ident() method but that will strip the double quotes when not needed.
 * @param columnName
 * @returns
 */
export function escapeColumnName(columnName: string | undefined): string {
	if (columnName === undefined) return '';
	return `"${columnName.replace(/"/g, '')}"`.replace('.', '"."');
}

/**
 * Converts a query with question marks to a query with numbered parameters,
 * however it ignores question marks inside single or double quotes.
 * @param query PostgreSQL query with question marks
 * @returns A string with numbered parameters such as $1, $2 in replacement of question marks
 */
export function questionMarksToOrderedParams(query: string) {
	let count = 1;
	let inSingleQuote = false;
	let inDoubleQuote = false;

	return query.replace(/('|"|\?)/g, (char) => {
		if (char === "'") {
			inSingleQuote = !inSingleQuote && !inDoubleQuote;
			return char;
		}
		if (char === '"') {
			inDoubleQuote = !inDoubleQuote && !inSingleQuote;
			return char;
		}
		if (char === '?' && !inSingleQuote && !inDoubleQuote) {
			return `$${count++}`;
		}
		return char; // Return ? unchanged if inside quotes
	});
}

/**
 * Creates a query to insert an object into a table.
 * @param table Table name to insert the object into
 * @param obj  Data to insert into the table
 * @returns the query to insert the object into the table
 */
export function insertObjectQuery(table: string, obj: DynamicObject): string {
	const keys = Object.keys(obj);
	const params = Object.values(obj);

	const columns = keys.map((column) => escapeColumnName(column)).join(', ');
	const values = params.map((value) => SQL`${value}`).join(', ');

	const query = `
INSERT INTO "${table}" (${columns})
                 VALUES (${values})
                 RETURNING *`;
	return query;
}

/**
 * Creates a query to update an object in a table.
 * @param table Table name to update the object in
 * @param obj Data to update in the table
 * @param whereStatement Where clause to determine which rows to update
 * @returns the query to update the object in the table
 */
export function updateObjectQuery(table: string, obj: DynamicObject, whereStatement: string): string {
	const setArray = [];
	for (const i in obj) {
		setArray.push(`${escapeColumnName(i)} = ` + SQL`${obj[i]}`);
	}

	return `
UPDATE ${escapeColumnName(table)}
                 SET ${setArray.join(', ')} ${whereStatement}
                 RETURNING *`;
}

// Todo: Move this method into @redsky/core-utils package under NumberUtils
export function isValueNumber(value: unknown): value is number {
	return !isNaN(Number(value));
}

/**
 * This method is used to format a query and escape user input.
 * Use this with the SQL tag to escape user input. For example:
 * SQL`UPDATE "USER" SET "firstName" = ${firstName}, "isActive" = ${isActive} WHERE "id" = ${id} RETURNING *`
 * @param strings template strings array
 * @param values values to escape
 * @returns An escaped query with user input
 */
export function SQL(strings: TemplateStringsArray, ...values: unknown[]) {
	let query = strings[0];
	values.forEach((value: unknown, index: number) => {
		if (typeof value === 'boolean') {
			query += value;
		} else if (typeof value === 'number') {
			query += value;
		} else if (Array.isArray(value)) {
			// JSON arrays in the pg-format are stripped of their array brackets and used for grouped list conversions.
			// This is a workaround to fix this issue. Where we are expecting JSON arrays as the root element of the object.
			query += format.literal(JSON.stringify(value)) + '::jsonb';
		} else {
			query += format.literal(value as string); // escape input
		}
		query += strings[index + 1];
	});

	return query;
}
