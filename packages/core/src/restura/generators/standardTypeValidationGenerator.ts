import { type ResturaSchema } from '../schemas/resturaSchema.js';
import type { ValidationDictionary } from '../validators/requestValidator.js';
import { buildRouteSchema } from './schemaGeneratorUtils.js';

export default function standardTypeValidationGenerator(currentSchema: ResturaSchema): ValidationDictionary {
	const schemaObject: ValidationDictionary = {};

	for (const endpoint of currentSchema.endpoints) {
		for (const route of endpoint.routes) {
			if (route.type !== 'ONE' && route.type !== 'ARRAY' && route.type !== 'PAGED') continue;
			const routeKey = `${route.method}:${route.path}`;
			if (!route.request || route.request.length === 0) {
				schemaObject[routeKey] = {
					$schema: 'http://json-schema.org/draft-07/schema#',
					$ref: `#/definitions/${routeKey}`,
					definitions: {
						[routeKey]: {
							type: 'object',
							properties: {},
							additionalProperties: false
						}
					}
				};
			} else {
				schemaObject[routeKey] = buildRouteSchema(routeKey, route.request);
			}
		}
	}

	return schemaObject;
}
