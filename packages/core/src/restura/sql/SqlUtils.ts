import { ValidatorString } from '../types/restura.types';

class SqlUtils {
	static convertDatabaseTypeToTypescript(type: string): ValidatorString | string;
	static convertDatabaseTypeToTypescript(type: string, value?: string): ValidatorString | string;
	static convertDatabaseTypeToTypescript(type: string, value?: string): ValidatorString | string {
		type = type.toLocaleLowerCase();
		if (type.startsWith('tinyint') || type.startsWith('boolean')) return 'boolean';
		if (
			type.indexOf('int') > -1 ||
			type.startsWith('decimal') ||
			type.startsWith('double') ||
			type.startsWith('float')
		)
			return 'number';
		if (type === 'json') {
			if (!value) return 'object';
			// Split the value by comma and remove any single or double quote characters, and then join with " | "
			return value
				.split(',')
				.map((val) => {
					return val.replace(/['"]/g, '');
				})
				.join(' | ');
		}
		if (
			type.startsWith('varchar') ||
			type.indexOf('text') > -1 ||
			type.startsWith('char') ||
			type.indexOf('blob') > -1 ||
			type.startsWith('binary')
		)
			return 'string';
		if (type.startsWith('date') || type.startsWith('time')) return 'string';
		if (type.startsWith('enum')) return SqlUtils.convertDatabaseEnumToStringUnion(value || type);
		return 'any';
	}

	static convertDatabaseEnumToStringUnion(type: string): string {
		return type
			.replace(/^enum\(|\)/g, '')
			.split(',')
			.map((value) => {
				return `'${value.replace(/'/g, '')}'`;
			})
			.join(' | ');
	}
}

export { SqlUtils };
