import format from 'pg-format';

export type AnyObject = { [key: string]: any };

export function escapeColumnName(columnName: string | undefined): string {
	// consider using an existing library
	if (columnName === undefined) return '';
	return `"${columnName.replace(/"/g, '')}"`.replace('.', '"."');
}

export function questionMarksToOrderedParams(query: string) {
	let count = 1;

	return query.replace(/'\?'/g, () => `$${count++}`);
}

export function insertObjectQuery(table: string, obj: AnyObject): string {
	const keys = Object.keys(obj);
	const params = Object.values(obj);

	const columns = keys.map((column) => escapeColumnName(column)).join(', ');
	const values = params.map((value) => SQL`${value}`).join(', ');

	const query = `INSERT INTO "${table}" (${columns})
                 VALUES (${values})
                 RETURNING *`;
	return query;
}

export function updateObjectQuery(table: string, obj: AnyObject, whereStatement: string): string {
	// Map the keys into column assignments: 'column1 = $1, column2 = $2, ...'
	// const setClause = keys.map((key, i) => `${escapeColumnName(key)} = $${i + 1}`).join(', ');
	const setArray = [];
	for (const i in obj) {
		setArray.push(`${escapeColumnName(i)} = ` + SQL`${obj[i]}`);
	}

	// Build the SQL query
	const query = `UPDATE ${escapeColumnName(table)}
                 SET ${setArray.join(', ')} ${whereStatement}
                 RETURNING *`;
	return query;
}

function isValueNumber(value: unknown): value is number {
	return !isNaN(Number(value));
}

export function SQL(strings: any, ...values: any) {
	let query = strings[0];
	values.forEach((value: any, index: number) => {
		if (isValueNumber(value)) {
			query += value;
		} else {
			query += format.literal(value); // escape input
		}
		query += strings[index + 1];
	});

	return query;
}
