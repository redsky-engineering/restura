import fs from 'fs';
import path, { resolve } from 'path';
import tmp from 'tmp';
import { createGenerator, type Config } from 'ts-json-schema-generator';
import { restura } from '../restura.js';
import { ResturaSchema } from '../schemas/resturaSchema.js';
import type { ValidationDictionary } from '../validators/requestValidator.js';
import { buildRouteSchema } from './schemaGeneratorUtils.js';

/**
 * This function generates a temporary file with the custom types and then uses typescript-json-schema to generate a JSON schema for each custom type.
 * @param currentSchema - The current schema to generate the validation dictionary for.
 * @returns A dictionary of custom type names and their corresponding JSON schemas.
 */
export default function customTypeValidationGenerator(
	currentSchema: ResturaSchema,
	ignoreGeneratedTypes: boolean = false
): ValidationDictionary {
	const schemaObject: ValidationDictionary = {};
	const customInterfaceNames = currentSchema.customTypes
		.map((customType) => {
			const matches = customType.match(/(?<=interface\s)(\w+)|(?<=type\s)(\w+)/g);
			if (matches && matches.length > 0) return matches[0];
			return '';
		})
		.filter(Boolean);
	if (!customInterfaceNames) return {};

	const temporaryFile = tmp.fileSync({ mode: 0o644, prefix: 'prefix-', postfix: '.ts' });

	// Include the additional type files as imports if needed
	const additionalImports = ignoreGeneratedTypes
		? ''
		: [
				`/// <reference path="${path.join(restura.resturaConfig.generatedTypesPath, 'restura.d.ts')}" />`,
				`/// <reference path="${path.join(restura.resturaConfig.generatedTypesPath, 'models.d.ts')}" />`,
				`/// <reference path="${path.join(restura.resturaConfig.generatedTypesPath, 'api.d.ts')}" />`
			].join('\n') + '\n';

	fs.writeFileSync(temporaryFile.name, additionalImports + currentSchema.customTypes.join('\n'));

	customInterfaceNames.forEach((item) => {
		const config: Config = {
			path: resolve(temporaryFile.name),
			tsconfig: path.join(process.cwd(), 'tsconfig.json'),
			type: item,
			skipTypeCheck: true
		};
		const generator = createGenerator(config);
		const ddlSchema = generator.createSchema(item);
		schemaObject[item] = ddlSchema || {};
	});

	temporaryFile.removeCallback();

	// Handle custom routes that use standard request array instead of requestType interface
	for (const endpoint of currentSchema.endpoints) {
		for (const route of endpoint.routes) {
			if (route.type !== 'CUSTOM_ONE' && route.type !== 'CUSTOM_ARRAY' && route.type !== 'CUSTOM_PAGED') continue;

			if (!route.request || !Array.isArray(route.request)) continue;

			const routeKey = `${route.method}:${route.path}`;
			schemaObject[routeKey] = buildRouteSchema(route.request);
		}
	}

	return schemaObject;
}
