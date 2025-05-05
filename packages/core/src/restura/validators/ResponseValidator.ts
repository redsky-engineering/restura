import { RsError } from '../RsError.js';

import {
	CustomRouteData,
	ResponseData,
	ResturaSchema,
	RouteData,
	StandardRouteData,
	TableData
} from '../schemas/resturaSchema.js';
import { SqlUtils } from '../sql/SqlUtils.js';

// The `string` type is to handle for enums
export type ValidatorString = 'boolean' | 'string' | 'number' | 'object' | 'any';

interface ResponseType {
	isOptional?: boolean;
	isArray?: boolean;
	validator: ValidatorString | ResponseTypeMap | string[];
}

interface ResponseTypeMap {
	[property: string]: ResponseType;
}

export default class ResponseValidator {
	private readonly rootMap: ResponseTypeMap;
	private readonly database: ReadonlyArray<TableData>;

	constructor(schema: ResturaSchema) {
		this.database = schema.database;
		this.rootMap = {};
		for (const endpoint of schema.endpoints) {
			const endpointMap: ResponseTypeMap = {};
			for (const route of endpoint.routes) {
				if (ResponseValidator.isCustomRoute(route)) {
					endpointMap[`${route.method}:${route.path}`] = { validator: 'any' };
					continue;
				}
				endpointMap[`${route.method}:${route.path}`] = this.getRouteResponseType(route);
			}
			const endpointUrl = endpoint.baseUrl.endsWith('/') ? endpoint.baseUrl.slice(0, -1) : endpoint.baseUrl;
			this.rootMap[endpointUrl] = { validator: endpointMap };
		}
	}

	public validateResponseParams(data: unknown, endpointUrl: string, routeData: RouteData): void {
		if (!this.rootMap) {
			throw new RsError('BAD_REQUEST', 'Cannot validate response without type maps');
		}

		const routeMap = (this.rootMap[endpointUrl].validator as ResponseTypeMap)[
			`${routeData.method}:${routeData.path}`
		];
		data = this.validateAndCoerceMap('_base', data, routeMap);
	}

	private getRouteResponseType(route: StandardRouteData): ResponseType {
		const map: ResponseTypeMap = {};
		for (const field of route.response) {
			map[field.name] = this.getFieldResponseType(field, route.table);
		}

		if (route.type === 'PAGED') {
			return {
				validator: {
					data: { validator: map, isArray: true },
					total: { validator: 'number' }
				}
			};
		}

		if (route.method === 'DELETE') {
			return {
				validator: 'boolean'
			};
		}

		return { validator: map, isArray: route.type === 'ARRAY' };
	}

	private getFieldResponseType(field: ResponseData, tableName: string): ResponseType {
		if (field.type) {
			if (ResponseValidator.validatorIsValidString(field.type)) {
				return { validator: field.type };
			}
			if (field.type.includes('|')) {
				return { validator: this.parseValidationEnum(field.type) };
			}
			return { validator: 'object' };
		} else if (field.selector) {
			return this.getTypeFromTable(field.selector, tableName);
		} else if (field.subquery) {
			const table = this.database.find((t) => t.name == tableName);
			if (!table) return { isArray: true, validator: 'any' };
			const isOptional = table.roles.length > 0;
			const validator: ResponseTypeMap = {};
			for (const prop of field.subquery.properties) {
				validator[prop.name] = this.getFieldResponseType(prop, field.subquery.table);
			}
			return {
				isArray: true,
				isOptional,
				validator
			};
		}
		return { validator: 'any' };
	}

	private getTypeFromTable(selector: string, name: string): ResponseType {
		const path = selector.split('.');
		if (path.length === 0 || path.length > 2 || path[0] === '') return { validator: 'any', isOptional: false };

		const tableName = path.length == 2 ? path[0] : name,
			columnName = path.length == 2 ? path[1] : path[0];
		const table = this.database.find((t) => t.name == tableName);
		const column = table?.columns.find((c) => c.name == columnName);
		if (!table || !column) return { validator: 'any', isOptional: false };

		let validator: ValidatorString | string | string[] = SqlUtils.convertDatabaseTypeToTypescript(
			column.type,
			column.value
		);
		if (!ResponseValidator.validatorIsValidString(validator)) validator = this.parseValidationEnum(validator);

		return {
			validator,
			isOptional: column.roles.length > 0 || column.isNullable
		};
	}

	private parseValidationEnum(validator: string): string[] {
		let terms = validator.split('|');
		terms = terms.map((v) => v.replace(/'/g, '').trim());
		return terms;
	}

	private validateAndCoerceMap(
		name: string,
		value: unknown,
		{ isOptional, isArray, validator }: ResponseTypeMap[string]
	): unknown {
		if (validator === 'any') return value;
		const valueType = typeof value;
		if (value == null) {
			if (isOptional) return value;
			throw new RsError('DATABASE_ERROR', `Response param (${name}) is required`);
		}
		if (isArray) {
			if (!Array.isArray(value)) {
				throw new RsError(
					'DATABASE_ERROR',
					`Response param (${name}) is a/an ${valueType} instead of an array`
				);
			}
			value.forEach((v, i) => this.validateAndCoerceMap(`${name}[${i}]`, v, { validator }));
			return value;
		}
		if (typeof validator === 'string') {
			// Nested objects do not coerce boolean values or dates properly. Fix that here if needed.
			// Database returns number but schema expects boolean
			if (validator === 'boolean' && valueType === 'number') {
				if (value !== 0 && value !== 1)
					throw new RsError('DATABASE_ERROR', `Response param (${name}) is of the wrong type (${valueType})`);
				return value === 1;
			} else if (validator === 'string' && valueType === 'string') {
				// Check if the string is a SQL datetime, date, time, timestamp format
				if (
					typeof value === 'string' &&
					value.match(
						/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.?\d*$|\d{2}:\d{2}:\d{2}.?\d*$|^\d{4}-\d{2}-\d{2}$/
					)
				) {
					const date = new Date(value);
					if (date.toISOString() === '1970-01-01T00:00:00.000Z') return null;
					const timezoneOffset = date.getTimezoneOffset() * 60000;
					return new Date(date.getTime() - timezoneOffset * 2).toISOString();
				}
				return value;
			} else if (valueType === validator) {
				return value;
			} else if (valueType === 'object') {
				return value;
			}
			throw new RsError('DATABASE_ERROR', `Response param (${name}) is of the wrong type (${valueType})`);
		}
		if (Array.isArray(validator) && typeof value === 'string') {
			if (validator.includes(value)) return value;
			throw new RsError('DATABASE_ERROR', `Response param (${name}) is not one of the enum options (${value})`);
		}
		if (valueType !== 'object') {
			throw new RsError('DATABASE_ERROR', `Response param (${name}) is of the wrong type (${valueType})`);
		}
		for (const prop in value) {
			// @ts-expect-error - not sure types but we will be changing to zod soon
			if (!validator[prop])
				throw new RsError('DATABASE_ERROR', `Response param (${name}.${prop}) is not allowed`);
		}
		for (const prop in validator) {
			// @ts-expect-error - not sure types but we will be changing to zod soon
			value[prop] = this.validateAndCoerceMap(`${name}.${prop}`, value[prop], validator[prop]);
		}
		return value;
	}

	static isCustomRoute(route: RouteData): route is CustomRouteData {
		return route.type === 'CUSTOM_ONE' || route.type === 'CUSTOM_ARRAY' || route.type === 'CUSTOM_PAGED';
	}

	private static validatorIsValidString(validator: string): validator is ValidatorString {
		return !validator.includes('|');
	}
}
