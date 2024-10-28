import format from 'pg-format';
import { DynamicObject } from '../types/customExpress.types.js';

export function escapeColumnName(columnName: string | undefined): string {
	// consider using an existing library
	if (columnName === undefined) return '';
	return `"${columnName.replace(/"/g, '')}"`.replace('.', '"."');
}

export function questionMarksToOrderedParams(query: string) {
	let count = 1;

	return query.replace(/'\?'|\?/g, () => `$${count++}`);
}

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

export function isValueNumber(value: unknown): value is number {
	return !isNaN(Number(value));
}
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export function SQL(strings: any, ...values: any) {
	let query = strings[0];
	// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	values.forEach((value: any, index: number) => {
		if (typeof value === 'boolean') {
			query += value;
		} else if (typeof value === 'number') {
			query += value;
		} else {
			query += format.literal(value); // escape input
		}
		query += strings[index + 1];
	});

	return query;
}
