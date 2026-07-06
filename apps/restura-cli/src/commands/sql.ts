import {
	generateDatabaseSchemaFromSchema,
	generateNotifyTriggersSql,
	isSchemaValid,
	type ResturaSchema,
	type SchemaGenerationOptions
} from '@restura/core';
import fs from 'node:fs';

export async function sqlCommand(options: {
	schema: string;
	eventDelivery: 'direct' | 'outbox';
	outboxChannel?: string;
	triggersOnly?: boolean;
}): Promise<void> {
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
	const generationOptions: SchemaGenerationOptions = {
		eventDelivery: options.eventDelivery,
		outboxChannel: options.outboxChannel
	};

	try {
		const sql = options.triggersOnly
			? generateNotifyTriggersSql(validSchema, generationOptions).join('\n')
			: generateDatabaseSchemaFromSchema(validSchema, generationOptions);
		console.log(sql);
	} catch (err) {
		console.error(`Error: SQL generation failed: ${err instanceof Error ? err.message : err}`);
		process.exit(1);
	}
}
