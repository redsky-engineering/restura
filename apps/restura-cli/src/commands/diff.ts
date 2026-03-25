import { PsqlPool, introspectDatabase, diffSchemaToDatabase, isSchemaValid, type ResturaSchema } from '@restura/core';
import fs from 'node:fs';

export async function diffCommand(options: { schema: string }): Promise<void> {
	const dbUrl = process.env.RESTURA_DB_URL;
	if (!dbUrl) {
		console.error('Error: RESTURA_DB_URL is not set. Add it to a .env file or export it in your shell.');
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
	const pool = new PsqlPool({ connectionString: dbUrl });

	try {
		const snapshot = await introspectDatabase(pool);
		const statements = diffSchemaToDatabase(validSchema, snapshot);

		if (statements.length === 0) {
			console.log('No schema differences found.');
		} else {
			console.log(statements.join('\n'));
		}
	} catch (err) {
		console.error(`Error: diff failed: ${err}`);
		process.exitCode = 1;
	} finally {
		await pool.pool.end();
	}
}
