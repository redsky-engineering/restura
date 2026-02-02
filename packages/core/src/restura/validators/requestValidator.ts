import jsonschema, { Schema } from 'jsonschema';
import { Definition } from 'ts-json-schema-generator';
import { RsError } from '../RsError.js';
import { RouteData } from '../schemas/resturaSchema.js';
import type { DynamicObject, RsRequest } from '../types/customExpressTypes.js';

export interface ValidationDictionary {
	[Key: string]: Definition;
}

/**
 * Deeply resolves all $ref references in a JSON schema, inlining them recursively.
 * This ensures nested refs (e.g., a property that refs another type) are fully resolved.
 * Uses a seen set to prevent infinite loops from circular references.
 */
function deepResolveSchemaRefs(
	schema: Schema,
	definitions: { [key: string]: Schema } | undefined,
	seen: Set<string> = new Set()
): Schema {
	if (!schema || typeof schema !== 'object') {
		return schema;
	}

	// Handle $ref at current level
	if ('$ref' in schema && typeof schema.$ref === 'string') {
		const refPath = schema.$ref;
		if (refPath.startsWith('#/definitions/') && definitions) {
			const defName = refPath.substring('#/definitions/'.length);

			// Prevent infinite loops from circular references
			if (seen.has(defName)) {
				return { type: 'object', properties: {} } as Schema;
			}

			const resolved = definitions[defName];
			if (resolved) {
				seen.add(defName);
				return deepResolveSchemaRefs(resolved as Schema, definitions, seen);
			}
		}
		return schema;
	}

	// Deep clone and recursively resolve nested schemas
	const result: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(schema)) {
		if (key === 'definitions') {
			// Skip definitions - they're just a lookup table
			continue;
		}

		if (value && typeof value === 'object') {
			if (Array.isArray(value)) {
				// Handle arrays (e.g., items, allOf, anyOf, oneOf)
				result[key] = value.map((item) =>
					typeof item === 'object' ? deepResolveSchemaRefs(item as Schema, definitions, new Set(seen)) : item
				);
			} else {
				// Handle nested objects (e.g., properties, additionalProperties)
				result[key] = deepResolveSchemaRefs(value as Schema, definitions, new Set(seen));
			}
		} else {
			result[key] = value;
		}
	}

	return result as Schema;
}

/**
 * Resolves a $ref reference in a JSON schema to its actual definition.
 * Handles recursive refs (a ref pointing to another ref).
 */
function resolveSchemaRef(schema: Schema, definitions: { [key: string]: Schema } | undefined): Schema {
	return deepResolveSchemaRefs(schema, definitions);
}

/** Summarize a subSchema (e.g. oneOf item) for a friendlier error message. */
function summarizeSubSchema(sub: Schema): string {
	if (!sub || typeof sub !== 'object') return 'unknown';
	if (sub.type === 'object' && sub.properties && typeof sub.properties === 'object') {
		const props = sub.properties as Record<string, Schema>;
		const parts: string[] = [];
		if (props.type && (props.type as { enum?: unknown }).enum) {
			const enumVal = (props.type as { enum: unknown[] }).enum[0];
			parts.push(`type: '${String(enumVal)}'`);
		}
		for (const key of Object.keys(props)) {
			if (key === 'type') continue;
			parts.push(key);
		}
		return parts.length ? `{ ${parts.join(', ')} }` : 'object';
	}
	return 'object';
}

/** Format validation error message; replace generic oneOf/anyOf "subschema" text with a clearer description. */
function formatValidationErrorMessage(message: string, errSchema: unknown): string {
	const schema = errSchema as { oneOf?: Schema[]; anyOf?: Schema[] } | null;
	const options = schema?.oneOf ?? schema?.anyOf;
	if (
		options &&
		Array.isArray(options) &&
		(message.includes('subschema') || message.includes('any of') || message.includes('exactly one from'))
	) {
		const summaries = options.map((sub, i) => `(${i + 1}) ${summarizeSubSchema(sub)}`);
		return `must be one of: ${summaries.join(' or ')}`;
	}
	return message;
}

export default function requestValidator(
	req: RsRequest<unknown>,
	routeData: RouteData,
	customValidationSchema: ValidationDictionary,
	standardValidationSchema: ValidationDictionary
) {
	const routeKey = `${routeData.method}:${routeData.path}`;
	const isCustom =
		routeData.type === 'CUSTOM_ONE' || routeData.type === 'CUSTOM_ARRAY' || routeData.type === 'CUSTOM_PAGED';
	const isStandard = routeData.type === 'ONE' || routeData.type === 'ARRAY' || routeData.type === 'PAGED';

	if (!isStandard && !isCustom) {
		throw new RsError('BAD_REQUEST', `Invalid route type: ${routeData.type}`);
	}

	if (isCustom) {
		if (!routeData.responseType) throw new RsError('BAD_REQUEST', `No response type defined for custom request.`);
		if (!routeData.requestType && !routeData.request)
			throw new RsError('BAD_REQUEST', `No request type defined for custom request.`);
	}

	const schemaKey = isCustom ? routeData.requestType || routeKey : routeKey;
	if (!schemaKey) throw new RsError('BAD_REQUEST', `No schema key defined for request: ${routeKey}.`);

	const schemaDictionary = isCustom ? customValidationSchema : standardValidationSchema;
	const schemaRoot = schemaDictionary[schemaKey];

	if (!schemaRoot) {
		const requestType = isCustom ? 'custom' : 'standard';
		throw new RsError('BAD_REQUEST', `No schema found for ${requestType} request: ${schemaKey}.`);
	}

	const schemaForValidation = schemaRoot as Schema;
	const schemaDefinitions = schemaRoot.definitions as { [key: string]: Schema } | undefined;
	const rawInterface = schemaRoot.definitions![schemaKey] as Schema;
	const schemaForCoercion = isCustom ? resolveSchemaRef(rawInterface, schemaDefinitions) : rawInterface;
	const requestData = getRequestData(req as RsRequest<unknown>, schemaForCoercion);
	req.data = requestData;

	const validator = new jsonschema.Validator();

	// Add all definitions to the validator so $ref can be resolved
	if (schemaDefinitions) {
		for (const [defName, defSchema] of Object.entries(schemaDefinitions)) {
			validator.addSchema(defSchema as Schema, `/definitions/${defName}`);
		}
	}

	// Resolve the $ref to get the actual schema to validate against
	const resolvedSchema = resolveSchemaRef(schemaForValidation as Schema, schemaDefinitions);
	const executeValidation = validator.validate(req.data, resolvedSchema);

	if (!executeValidation.valid) {
		const errorMessages = executeValidation.errors
			.map((err) => {
				const property = err.property.replace('instance.', '');
				const message = formatValidationErrorMessage(err.message, err.schema);
				return `${property}: ${message}`;
			})
			.join(', ');

		throw new RsError('BAD_REQUEST', `Request validation failed: ${errorMessages}`);
	}
}

export function getRequestData(req: RsRequest<unknown>, schema: Schema): DynamicObject {
	const body = req.method === 'GET' || req.method === 'DELETE' ? 'query' : 'body';
	const bodyData = req[body as keyof typeof req];

	if (bodyData && schema) {
		return coerceBySchema(bodyData as DynamicObject, schema);
	}

	return bodyData as DynamicObject;
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
			// $ref / oneOf / anyOf have no top-level type; parse only JSON-looking payloads so scalar strings (e.g. "true", "1") are preserved for string unions
			if (typeof value === 'string') {
				const trimmed = value.trim();
				if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
					try {
						return JSON.parse(value);
					} catch {
						return value;
					}
				}
			}
			return value;
	}
}
