import {
	apiGenerator,
	isSchemaValid,
	modelGenerator,
	resturaGlobalTypesGenerator,
	type ResturaSchema
} from '@restura/core';
import fs from 'node:fs';
import path from 'node:path';

export async function generateTypesCommand(options: { schema: string; output: string }): Promise<void> {
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

	fs.mkdirSync(options.output, { recursive: true });

	fs.writeFileSync(path.join(options.output, 'api.d.ts'), await apiGenerator(validSchema));
	fs.writeFileSync(path.join(options.output, 'models.d.ts'), await modelGenerator(validSchema));
	fs.writeFileSync(path.join(options.output, 'restura.d.ts'), resturaGlobalTypesGenerator());

	console.log(`Types written to ${options.output}`);
}
