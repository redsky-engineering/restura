import fs from 'fs';
import path, { resolve } from 'path';
import tmp from 'tmp';
import * as TJS from 'typescript-json-schema';
import { restura } from '../restura.js';
import { ResturaSchema } from '../schemas/resturaSchema.js';
import type { ValidationDictionary } from '../validators/requestValidator.js';

export default function customTypeValidationGenerator(currentSchema: ResturaSchema): ValidationDictionary {
	const schemaObject: ValidationDictionary = {};
	const customInterfaceNames = currentSchema.customTypes.match(/(?<=interface\s)(\w+)|(?<=type\s)(\w+)/g);
	if (!customInterfaceNames) return {};

	const temporaryFile = tmp.fileSync({ mode: 0o644, prefix: 'prefix-', postfix: '.ts' });
	fs.writeFileSync(temporaryFile.name, currentSchema.customTypes);

	const compilerOptions: TJS.CompilerOptions = {
		strictNullChecks: true,
		skipLibCheck: true // Needed if we are processing ES modules
	};

	const program = TJS.getProgramFromFiles(
		[
			resolve(temporaryFile.name),
			path.join(restura.resturaConfig.generatedTypesPath, 'restura.d.ts'),
			path.join(restura.resturaConfig.generatedTypesPath, 'models.d.ts'),
			path.join(restura.resturaConfig.generatedTypesPath, 'api.d.ts')
		],
		compilerOptions
	);
	customInterfaceNames.forEach((item) => {
		const ddlSchema = TJS.generateSchema(program, item, {
			required: true
		});
		schemaObject[item] = ddlSchema || {};
	});

	temporaryFile.removeCallback();

	return schemaObject;
}
