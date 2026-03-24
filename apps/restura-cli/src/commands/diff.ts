import { PsqlPool, diffDatabaseToSchema, isSchemaValid, type ResturaSchema } from '@restura/core';
import fs from 'node:fs';

export async function diffCommand(options: { schema: string; scratchSuffix: string }): Promise<void> {
	const dbUrl = process.env.RESTURA_DB_URL;
	if (!dbUrl) {
		console.error('Error: RESTURA_DB_URL environment variable is not set');
		process.exit(1);
	}

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

	const parsedUrl = new URL(dbUrl);
	const dbName = parsedUrl.pathname.replace(/^\//, '');
	if (!dbName) {
		console.error('Error: could not parse database name from RESTURA_DB_URL');
		process.exit(1);
	}

	const scratchDbName = options.scratchSuffix ? `${dbName}_scratch_${options.scratchSuffix}` : `${dbName}_scratch`;

	const pool = new PsqlPool({ connectionString: dbUrl });

	let sql: string;
	try {
		sql = await diffDatabaseToSchema(validSchema, pool, scratchDbName);
	} catch (err) {
		console.error(`Error: diff failed: ${err}`);
		process.exit(1);
	}

	if (!sql.trim()) {
		console.log('No schema differences found.');
		return;
	}

	console.log(sql);
}
