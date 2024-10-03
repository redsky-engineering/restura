import fs from 'fs';
import * as TJS from 'typescript-json-schema';
import path, { resolve } from 'path';
import { Definition } from 'typescript-json-schema';
import tmp from 'tmp';
import * as process from 'process';
import { ResturaSchema } from './restura.schema';

export interface ValidationDictionary {
	[Key: string]: Definition;
}

export default function customTypeValidationGenerator(currentSchema: ResturaSchema): ValidationDictionary {
	const schemaObject: ValidationDictionary = {};
	const customInterfaceNames = currentSchema.customTypes.match(/(?<=interface\s)(\w+)|(?<=type\s)(\w+)/g);
	if (!customInterfaceNames) return {};

	const temporaryFile = tmp.fileSync({ mode: 0o644, prefix: 'prefix-', postfix: '.ts' });
	fs.writeFileSync(temporaryFile.name, currentSchema.customTypes);

	// optionally pass ts compiler options
	const compilerOptions: TJS.CompilerOptions = {
		strictNullChecks: true,
		skipLibCheck: true
	};

	const program = TJS.getProgramFromFiles(
		[
			resolve(temporaryFile.name), // find a way to remove
			path.join(process.cwd(), 'src/@types/models.d.ts'),
			path.join(process.cwd(), 'src/@types/api.d.ts')
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
