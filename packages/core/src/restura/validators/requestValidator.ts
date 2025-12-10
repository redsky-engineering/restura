import jsonschema, { Schema } from 'jsonschema';
import { Definition } from 'typescript-json-schema';
import { RsError } from '../RsError.js';
import { RouteData } from '../schemas/resturaSchema.js';
import type { DynamicObject, RsRequest } from '../types/customExpressTypes.js';

export interface ValidationDictionary {
	[Key: string]: Definition;
}

export default function requestValidator(
	req: RsRequest<unknown>,
	routeData: RouteData,
	customValidationSchema: ValidationDictionary,
	standardValidationSchema: ValidationDictionary
) {
	let schemaForCoercion: Schema;

	if (routeData.type === 'ONE' || routeData.type === 'ARRAY' || routeData.type === 'PAGED') {
		// Standard endpoint request
		const routeKey = `${routeData.method}:${routeData.path}`;

		schemaForCoercion = standardValidationSchema[routeKey] as Schema;
		if (!schemaForCoercion) {
			throw new RsError('BAD_REQUEST', `No schema found for standard request route: ${routeKey}.`);
		}
	} else if (
		routeData.type === 'CUSTOM_ONE' ||
		routeData.type === 'CUSTOM_ARRAY' ||
		routeData.type === 'CUSTOM_PAGED'
	) {
		// Custom endpoint request
		if (!routeData.responseType) throw new RsError('BAD_REQUEST', `No response type defined for custom request.`);
		if (!routeData.requestType && !routeData.request)
			throw new RsError('BAD_REQUEST', `No request type defined for custom request.`);

		const routeKey = `${routeData.method}:${routeData.path}`;

		const currentInterface = customValidationSchema[routeData.requestType || routeKey];
		schemaForCoercion = {
			...currentInterface,
			additionalProperties: false
		} as Schema;
	} else {
		throw new RsError('BAD_REQUEST', `Invalid route type: ${routeData.type}`);
	}

	const requestData = getRequestData(req as RsRequest<unknown>, schemaForCoercion);
	req.data = requestData;

	const validator = new jsonschema.Validator();
	const executeValidation = validator.validate(req.data, schemaForCoercion);

	if (!executeValidation.valid) {
		const errorMessages = executeValidation.errors
			.map((err) => {
				const property = err.property.replace('instance.', '');
				return `${property}: ${err.message}`;
			})
			.join(', ');

		throw new RsError('BAD_REQUEST', `Request validation failed: ${errorMessages}`);
	}
}

export function getRequestData(req: RsRequest<unknown>, schema: Schema): DynamicObject {
	let body = '';
	if (req.method === 'GET' || req.method === 'DELETE') {
		body = 'query';
	} else {
		body = 'body';
	}

	const bodyData = req[body as keyof typeof req]; // Cast once and store in a variable

	if (bodyData && body === 'query' && schema) {
		return coerceBySchema(bodyData, schema);
	}

	return bodyData;
}

function coerceBySchema(data: DynamicObject, schema: Schema): DynamicObject {
	const normalized: DynamicObject = {};
	const properties = schema.properties || {};

	for (const attr in data) {
		const cleanAttr = attr.replace(/\[\]$/, '');
		const isArrayNotation = attr.includes('[]');

		let value = data[attr];
		const propertySchema = properties[cleanAttr];

		// Convert single value to array if [] notation but not already array
		if (isArrayNotation && !Array.isArray(value)) {
			value = [value];
		}

		// No schema definition for this property - pass through as string
		if (!propertySchema) {
			normalized[cleanAttr] = value;
			continue;
		}

		// Handle arrays
		if (Array.isArray(value)) {
			const itemSchema = Array.isArray(propertySchema.items)
				? propertySchema.items[0]
				: propertySchema.items || { type: 'string' };
			normalized[cleanAttr] = value.map((item) => coerceValue(item, itemSchema as Schema));
		} else {
			normalized[cleanAttr] = coerceValue(value, propertySchema);
		}
	}

	return normalized;
}

function coerceValue(value: unknown, propertySchema: Schema): unknown {
	if (value === undefined || value === null) {
		return value;
	}

	// Determine the base type (handle both single type and nullable array)
	const targetType = Array.isArray(propertySchema.type)
		? propertySchema.type[0] // Handle nullable types like ['string', 'null']
		: propertySchema.type;

	if (value === '') {
		return targetType === 'string' ? '' : undefined;
	}

	// Coerce based on schema type
	switch (targetType) {
		case 'number':
		case 'integer':
			const num = Number(value);
			return isNaN(num) ? value : num;

		case 'boolean':
			if (value === 'true') return true;
			if (value === 'false') return false;
			if (typeof value === 'string') {
				return value === 'true' || value === '1';
			}
			return Boolean(value);

		case 'string':
			return String(value);

		case 'object':
			if (typeof value === 'string') {
				try {
					return JSON.parse(value);
				} catch {
					return value;
				}
			}
			return value;

		default:
			return value;
	}
}
