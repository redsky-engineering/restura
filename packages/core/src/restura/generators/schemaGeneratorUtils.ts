import type { Definition } from 'ts-json-schema-generator';
import { RequestData } from '../schemas/resturaSchema.js';

export function buildRouteSchema(requestParams: RequestData[]): Definition {
	const properties: { [name: string]: Definition } = {};
	const required: string[] = [];

	for (const param of requestParams) {
		if (param.required) {
			required.push(param.name);
		}

		const propertySchema = buildPropertySchemaFromRequest(param);
		properties[param.name] = propertySchema;
	}

	return {
		type: 'object',
		properties,
		...(required.length > 0 && { required }), // Only include if not empty
		additionalProperties: false
	};
}

function buildPropertySchemaFromRequest(param: RequestData): Definition {
	const propertySchema: Definition = {};

	const typeCheckValidator = param.validator.find((v) => v.type === 'TYPE_CHECK');

	// Apply enum first (for cases like 'role' with only ONE_OF)
	const oneOfValidator = param.validator.find((v) => v.type === 'ONE_OF');
	if (oneOfValidator && Array.isArray(oneOfValidator.value)) {
		propertySchema.enum = oneOfValidator.value;
		// If no TYPE_CHECK but has enum, infer type from enum values
		if (!typeCheckValidator && oneOfValidator.value.length > 0) {
			const firstValue = oneOfValidator.value[0];
			propertySchema.type = typeof firstValue === 'number' ? 'number' : 'string';
			return propertySchema;
		}
	}

	// If no TYPE_CHECK validator and no enum, allow anything through
	if (!typeCheckValidator) {
		return propertySchema;
	}

	const typeValue = typeCheckValidator.value;

	// Handle array types FIRST, before setting propertySchema.type
	if (typeof typeValue === 'string' && typeValue.endsWith('[]')) {
		const itemType = typeValue.replace('[]', '');

		if (param.isNullable) {
			propertySchema.type = ['array', 'null'];
		} else {
			propertySchema.type = 'array';
		}

		propertySchema.items = {
			type: mapTypeToJsonSchemaType(itemType)
		} as Definition;

		applyArrayValidators(propertySchema, param);
	} else {
		// Handle non-array types
		if (param.isNullable) {
			propertySchema.type = [mapTypeToJsonSchemaType(typeValue), 'null'];
		} else {
			propertySchema.type = mapTypeToJsonSchemaType(typeValue);
		}

		const type = propertySchema.type as string | string[] | undefined;
		const isNumericType =
			type === 'number' ||
			type === 'integer' ||
			(Array.isArray(type) && (type.includes('number') || type.includes('integer')));
		const isStringType = type === 'string' || (Array.isArray(type) && type.includes('string'));

		if (isNumericType) {
			applyNumericValidators(propertySchema, param);
		} else if (isStringType) {
			applyStringValidators(propertySchema, param);
		}
	}

	return propertySchema;
}

function mapTypeToJsonSchemaType(
	type: string | string[] | number | number[]
): 'string' | 'number' | 'boolean' | 'object' {
	if (typeof type !== 'string') {
		throw new Error(`Invalid type for JSON Schema mapping: ${type}`);
	}

	switch (type) {
		case 'number':
			return 'number';
		case 'string':
			return 'string';
		case 'boolean':
			return 'boolean';
		case 'object':
			return 'object';
		default:
			throw new Error(`Unknown type: ${type}`);
	}
}

function applyNumericValidators(propertySchema: Definition, param: RequestData): void {
	for (const validator of param.validator) {
		if (validator.type === 'MIN' && typeof validator.value === 'number') {
			propertySchema.minimum = validator.value;
		}
		if (validator.type === 'MAX' && typeof validator.value === 'number') {
			propertySchema.maximum = validator.value;
		}
	}
}

function applyStringValidators(propertySchema: Definition, param: RequestData): void {
	for (const validator of param.validator) {
		if (validator.type === 'MIN' && typeof validator.value === 'number') {
			propertySchema.minLength = validator.value;
		}
		if (validator.type === 'MAX' && typeof validator.value === 'number') {
			propertySchema.maxLength = validator.value;
		}
	}
}

function applyArrayValidators(propertySchema: Definition, param: RequestData): void {
	for (const validator of param.validator) {
		if (validator.type === 'MIN' && typeof validator.value === 'number') {
			propertySchema.minItems = validator.value;
		}
		if (validator.type === 'MAX' && typeof validator.value === 'number') {
			propertySchema.maxItems = validator.value;
		}
	}
}
