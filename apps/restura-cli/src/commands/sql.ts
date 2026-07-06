import {
	createDeleteTriggerSql,
	createInsertTriggerSql,
	createOutboxTableSql,
	createUpdateTriggerSql,
	generateDatabaseSchemaFromSchema,
	isSchemaValid,
	type ResturaSchema,
	type SchemaGenerationOptions,
	type TriggerSqlOptions
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

	if (options.triggersOnly) {
		const statements: string[] = [];
		if (options.eventDelivery === 'outbox') statements.push(createOutboxTableSql());
		for (const table of validSchema.database) {
			if (!table.notify) continue;
			const triggerOptions: TriggerSqlOptions = {
				delivery: options.eventDelivery,
				channel: options.outboxChannel,
				tableColumns: table.columns.map((column) => column.name)
			};
			statements.push(createInsertTriggerSql(table.name, table.notify, triggerOptions));
			statements.push(createUpdateTriggerSql(table.name, table.notify, triggerOptions));
			statements.push(createDeleteTriggerSql(table.name, table.notify, triggerOptions));
		}
		console.log(statements.join('\n'));
		return;
	}

	const sql = generateDatabaseSchemaFromSchema(validSchema, generationOptions);
	console.log(sql);
}
