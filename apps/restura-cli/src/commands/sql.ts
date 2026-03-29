import { generateDatabaseSchemaFromSchema, isSchemaValid, type ResturaSchema } from '@restura/core';
import fs from 'node:fs';

export async function sqlCommand(options: { schema: string }): Promise<void> {
	let raw: string;
	try {
		raw = fs.readFileSync(options.schema, 'utf8');
	} catch {
		console.error(`Error: could not read schema file: ${options.schema}`);
		process.exit(1);
	}

	let schema: unknown;
	try {
		schema = JSON.parse(raw);
	} catch {
		console.error(`Error: schema file contains invalid JSON: ${options.schema}`);
		process.exit(1);
	}

	const valid = await isSchemaValid(schema);
	if (!valid) {
		console.error('Error: schema failed Restura validation');
		process.exit(1);
	}

	const validSchema = schema as ResturaSchema;
	const sql = generateDatabaseSchemaFromSchema(validSchema);
	console.log(sql);
}
