import {
	PsqlPool,
	generateDatabaseSchemaFromSchema,
	getNewPublicSchemaAndScratchPool,
	isSchemaValid,
	systemUser,
	type ResturaSchema
} from '@restura/core';
import fs from 'node:fs';

export async function resetScratchCommand(options: { schema: string; suffix?: string }): Promise<void> {
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
	const suffix = options.suffix || process.env.RESTURA_SCRATCH_SUFFIX;
	let pool: PsqlPool | undefined;
	let scratchPool: PsqlPool | undefined;

	try {
		pool = new PsqlPool({ connectionString: dbUrl });
		const scratchDbName = `${pool.poolConfig.database}_scratch${suffix ? `_${suffix}` : ''}`;
		scratchPool = await getNewPublicSchemaAndScratchPool(pool, scratchDbName);
		const ddl = generateDatabaseSchemaFromSchema(validSchema);
		await scratchPool.runQuery(ddl, [], systemUser);
		console.log(`Scratch database "${scratchDbName}" has been reset and rebuilt from the schema.`);
	} catch (err) {
		console.error(`Error: reset-scratch failed: ${err}`);
		process.exitCode = 1;
	} finally {
		const cleanups: Promise<void>[] = [];
		if (scratchPool) cleanups.push(scratchPool.pool.end());
		if (pool) cleanups.push(pool.pool.end());
		await Promise.allSettled(cleanups);
	}
}
