import { expect } from 'chai';
import { buildRouteSchema } from '../generators/schemaGeneratorUtils.js';
import type { RequestData } from '../schemas/resturaSchema.js';

describe('schemaGeneratorUtils', () => {
	describe('buildRouteSchema', () => {
		it('should return schema in ts-json-schema-generator format', () => {
			const requestParams: RequestData[] = [
				{
					name: 'username',
					required: true,
					validator: [{ type: 'TYPE_CHECK', value: 'string' }]
				},
				{
					name: 'password',
					required: true,
					validator: [{ type: 'TYPE_CHECK', value: 'string' }]
				}
			];

			const result = buildRouteSchema('POST:/user/login', requestParams);

			expect(result).to.have.property('$schema', 'http://json-schema.org/draft-07/schema#');
			expect(result).to.have.property('$ref', '#/definitions/POST:/user/login');
			expect(result).to.have.property('definitions');
			expect(result.definitions).to.have.property('POST:/user/login');

			const definition = result.definitions!['POST:/user/login'] as Record<string, unknown>;
			expect(definition).to.have.property('type', 'object');
			expect(definition).to.have.property('additionalProperties', false);
			expect(definition.properties).to.deep.equal({
				username: { type: 'string' },
				password: { type: 'string' }
			});
			expect(definition.required).to.deep.equal(['username', 'password']);
		});

		it('should handle empty request params', () => {
			const result = buildRouteSchema('GET:/health', []);

			expect(result).to.have.property('$schema', 'http://json-schema.org/draft-07/schema#');
			expect(result).to.have.property('$ref', '#/definitions/GET:/health');
			expect(result.definitions).to.have.property('GET:/health');

			const definition = result.definitions!['GET:/health'] as Record<string, unknown>;
			expect(definition).to.deep.equal({
				type: 'object',
				properties: {},
				additionalProperties: false
			});
		});

		it('should handle optional parameters without required array', () => {
			const requestParams: RequestData[] = [
				{
					name: 'page',
					required: false,
					validator: [{ type: 'TYPE_CHECK', value: 'number' }]
				}
			];

			const result = buildRouteSchema('GET:/items', requestParams);

			const definition = result.definitions!['GET:/items'] as Record<string, unknown>;
			expect(definition).to.not.have.property('required');
			expect(definition.properties).to.deep.equal({
				page: { type: 'number' }
			});
		});

		it('should handle nullable types', () => {
			const requestParams: RequestData[] = [
				{
					name: 'middleName',
					required: false,
					isNullable: true,
					validator: [{ type: 'TYPE_CHECK', value: 'string' }]
				}
			];

			const result = buildRouteSchema('PATCH:/user', requestParams);

			const definition = result.definitions!['PATCH:/user'] as Record<string, unknown>;
			const properties = definition.properties as Record<string, unknown>;
			expect(properties.middleName).to.deep.equal({ type: ['string', 'null'] });
		});

		it('should handle array types', () => {
			const requestParams: RequestData[] = [
				{
					name: 'tags',
					required: true,
					validator: [{ type: 'TYPE_CHECK', value: 'string[]' }]
				}
			];

			const result = buildRouteSchema('POST:/item', requestParams);

			const definition = result.definitions!['POST:/item'] as Record<string, unknown>;
			const properties = definition.properties as Record<string, { type: string; items: { type: string } }>;
			expect(properties.tags).to.deep.equal({
				type: 'array',
				items: { type: 'string' }
			});
		});

		it('should handle enum validators', () => {
			const requestParams: RequestData[] = [
				{
					name: 'role',
					required: true,
					validator: [
						{ type: 'TYPE_CHECK', value: 'string' },
						{ type: 'ONE_OF', value: ['admin', 'user', 'guest'] }
					]
				}
			];

			const result = buildRouteSchema('POST:/user', requestParams);

			const definition = result.definitions!['POST:/user'] as Record<string, unknown>;
			const properties = definition.properties as Record<string, { type: string; enum: string[] }>;
			expect(properties.role).to.deep.equal({
				type: 'string',
				enum: ['admin', 'user', 'guest']
			});
		});

		it('should handle min/max validators for numbers', () => {
			const requestParams: RequestData[] = [
				{
					name: 'age',
					required: true,
					validator: [
						{ type: 'TYPE_CHECK', value: 'number' },
						{ type: 'MIN', value: 0 },
						{ type: 'MAX', value: 120 }
					]
				}
			];

			const result = buildRouteSchema('POST:/user', requestParams);

			const definition = result.definitions!['POST:/user'] as Record<string, unknown>;
			const properties = definition.properties as Record<
				string,
				{ type: string; minimum: number; maximum: number }
			>;
			expect(properties.age).to.deep.equal({
				type: 'number',
				minimum: 0,
				maximum: 120
			});
		});

		it('should handle min/max validators for strings as length constraints', () => {
			const requestParams: RequestData[] = [
				{
					name: 'password',
					required: true,
					validator: [
						{ type: 'TYPE_CHECK', value: 'string' },
						{ type: 'MIN', value: 8 },
						{ type: 'MAX', value: 100 }
					]
				}
			];

			const result = buildRouteSchema('POST:/auth/register', requestParams);

			const definition = result.definitions!['POST:/auth/register'] as Record<string, unknown>;
			const properties = definition.properties as Record<
				string,
				{ type: string; minLength: number; maxLength: number }
			>;
			expect(properties.password).to.deep.equal({
				type: 'string',
				minLength: 8,
				maxLength: 100
			});
		});

		it('should handle min/max validators for arrays as item constraints', () => {
			const requestParams: RequestData[] = [
				{
					name: 'items',
					required: true,
					validator: [
						{ type: 'TYPE_CHECK', value: 'number[]' },
						{ type: 'MIN', value: 1 },
						{ type: 'MAX', value: 10 }
					]
				}
			];

			const result = buildRouteSchema('POST:/order', requestParams);

			const definition = result.definitions!['POST:/order'] as Record<string, unknown>;
			const properties = definition.properties as Record<
				string,
				{ type: string; items: object; minItems: number; maxItems: number }
			>;
			expect(properties.items).to.deep.equal({
				type: 'array',
				items: { type: 'number' },
				minItems: 1,
				maxItems: 10
			});
		});

		it('should infer type from enum when no TYPE_CHECK is present', () => {
			const requestParams: RequestData[] = [
				{
					name: 'status',
					required: true,
					validator: [{ type: 'ONE_OF', value: ['pending', 'approved', 'rejected'] }]
				}
			];

			const result = buildRouteSchema('PATCH:/order', requestParams);

			const definition = result.definitions!['PATCH:/order'] as Record<string, unknown>;
			const properties = definition.properties as Record<string, { type: string; enum: string[] }>;
			expect(properties.status).to.deep.equal({
				enum: ['pending', 'approved', 'rejected'],
				type: 'string'
			});
		});

		it('should handle complex route with multiple parameters', () => {
			const requestParams: RequestData[] = [
				{
					name: 'id',
					required: true,
					validator: [{ type: 'TYPE_CHECK', value: 'number' }]
				},
				{
					name: 'name',
					required: true,
					validator: [
						{ type: 'TYPE_CHECK', value: 'string' },
						{ type: 'MIN', value: 1 },
						{ type: 'MAX', value: 255 }
					]
				},
				{
					name: 'isActive',
					required: false,
					validator: [{ type: 'TYPE_CHECK', value: 'boolean' }]
				}
			];

			const result = buildRouteSchema('PUT:/resource', requestParams);

			expect(result.$schema).to.equal('http://json-schema.org/draft-07/schema#');
			expect(result.$ref).to.equal('#/definitions/PUT:/resource');

			const definition = result.definitions!['PUT:/resource'] as Record<string, unknown>;
			expect(definition.type).to.equal('object');
			expect(definition.required).to.deep.equal(['id', 'name']);
			expect(definition.additionalProperties).to.equal(false);

			const properties = definition.properties as Record<string, unknown>;
			expect(properties.id).to.deep.equal({ type: 'number' });
			expect(properties.name).to.deep.equal({ type: 'string', minLength: 1, maxLength: 255 });
			expect(properties.isActive).to.deep.equal({ type: 'boolean' });
		});
	});
});
