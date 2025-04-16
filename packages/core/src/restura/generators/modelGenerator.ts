import { StringUtils } from '@redskytech/core-utils';
import prettier from 'prettier';
import type { ResturaSchema, TableData } from '../schemas/resturaSchema.js';
import { SqlUtils } from '../sql/SqlUtils';

export default function modelGenerator(schema: ResturaSchema): Promise<string> {
	let modelString = `/** Auto generated file. DO NOT MODIFY **/\n\n`;
	modelString += `declare namespace Model {\n`;
	for (const table of schema.database) {
		modelString += convertTable(table);
	}
	modelString += `}`;
	return prettier.format(modelString, {
		parser: 'typescript',
		...{
			trailingComma: 'none',
			tabWidth: 4,
			useTabs: true,
			endOfLine: 'lf',
			printWidth: 120,
			singleQuote: true
		}
	});
}

function convertTable(table: TableData): string {
	let modelString = `\texport interface ${StringUtils.capitalizeFirst(table.name)} {\n`;
	for (const column of table.columns) {
		modelString += `\t\t${column.name}: ${SqlUtils.convertDatabaseTypeToTypescript(column.type, column.value)}${column.isNullable ? ' | null' : ''};\n`;
	}
	modelString += `\t}\n`;
	return modelString;
}
