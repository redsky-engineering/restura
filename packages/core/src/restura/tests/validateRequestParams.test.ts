import { expect } from 'chai';
import { Definition } from 'ts-json-schema-generator';
import { RsError } from '../RsError.js';
import { RouteData } from '../schemas/resturaSchema.js';
import { RsRequest } from '../types/customExpressTypes.js';
import requestValidator, { ValidationDictionary } from '../validators/requestValidator.js';

/**
 * Helper to wrap a plain schema in the definitions format expected by requestValidator.
 */
function wrapSchema(key: string, schema: object): Definition {
	return {
		$schema: 'http://json-schema.org/draft-07/schema#',
		$ref: `#/definitions/${key}`,
		definitions: {
			[key]: schema
		}
	};
}

describe('validateRequestParams', () => {
	const sampleRouteDataWithRequest: RouteData = {
		type: 'ONE',
		method: 'GET',
		name: 'get users',
		description: 'Get users',
		path: '/users',
		table: 'user',
		roles: ['user', 'admin'],
		scopes: [],
		request: [
			{
				name: 'id',
				required: false,
				validator: [
					{
						type: 'TYPE_CHECK',
						value: 'number'
					}
				]
			},
			{
				name: 'name',
				required: false,
				validator: [
					{
						type: 'TYPE_CHECK',
						value: 'string'
					}
				]
			},
			{
				name: 'active',
				required: false,
				validator: [
					{
						type: 'TYPE_CHECK',
						value: 'boolean'
					}
				]
			}
		],
		joins: [],
		response: [
			{
				name: 'id',
				selector: 'user.id'
			}
		],
		assignments: [],
		where: []
	};

	const sampleRouteDataWithoutRequest: RouteData = {
		type: 'ONE',
		method: 'GET',
		name: 'get my user',
		description: 'Get my user',
		path: '/user/me',
		table: 'user',
		roles: ['user', 'admin'],
		scopes: [],
		request: [],
		joins: [],
		response: [
			{
				name: 'id',
				selector: 'user.id'
			}
		],
		assignments: [],
		where: [
			{
				tableName: 'user',
				columnName: 'id',
				operator: '=',
				value: '#userId'
			}
		]
	};

	const customRouteData: RouteData = {
		type: 'CUSTOM_ONE',
		method: 'POST',
		name: 'custom endpoint',
		description: 'Custom endpoint',
		path: '/custom',
		roles: ['user', 'admin'],
		scopes: [],
		requestType: 'FilteredUser',
		responseType: 'AuthResponse'
	};

	const customValidationSchema: ValidationDictionary = {
		FilteredUser: wrapSchema('FilteredUser', {
			type: 'object',
			properties: {
				id: { type: 'number' },
				companyId: { type: 'number' },
				firstName: { type: 'string' },
				lastName: { type: 'string' },
				email: { type: 'string' },
				role: { type: 'string' },
				phone: { type: 'string' },
				lastLoginOn: { type: 'string' }
			},
			required: ['companyId', 'email', 'firstName', 'id', 'lastLoginOn', 'lastName', 'phone', 'role'],
			additionalProperties: false
		}),
		AuthResponse: wrapSchema('AuthResponse', {
			type: 'object',
			properties: {
				token: { type: 'string' },
				tokenExp: { type: 'string' },
				refreshToken: { type: 'string' },
				refreshTokenExp: { type: 'string' }
			},
			required: ['refreshToken', 'refreshTokenExp', 'token', 'tokenExp'],
			additionalProperties: false
		})
	} as ValidationDictionary;

	const standardValidationSchema: ValidationDictionary = {
		'GET:/users': wrapSchema('GET:/users', {
			type: 'object',
			properties: {
				id: { type: 'number' },
				name: { type: 'string' },
				active: { type: 'boolean' }
			},
			required: [],
			additionalProperties: false
		}),
		'POST:/users': wrapSchema('POST:/users', {
			type: 'object',
			properties: {
				firstName: { type: 'string' },
				lastName: { type: 'string' },
				email: { type: 'string' },
				age: { type: 'number' }
			},
			required: ['firstName', 'email'],
			additionalProperties: false
		})
	} as ValidationDictionary;

	describe('Standard endpoint validation', () => {
		it('should fail if unknown params are passed', () => {
			try {
				requestValidator(
					{
						query: { invalidValue: '123' },
						method: 'GET'
					} as unknown as RsRequest<unknown>,
					sampleRouteDataWithRequest,
					customValidationSchema,
					standardValidationSchema
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
					expect(error.msg).to.include('invalidValue');
				}
			}
		});

		it('should pass if valid params are provided', () => {
			const req = {
				query: { id: '123', name: 'test' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, sampleRouteDataWithRequest, customValidationSchema, standardValidationSchema);

			expect((req.data as { id: number; name: string }).id).to.equal(123);
			expect((req.data as { id: number; name: string }).name).to.equal('test');
		});

		it('should coerce string numbers to numbers for GET requests', () => {
			const req = {
				query: { id: '456' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, sampleRouteDataWithRequest, customValidationSchema, standardValidationSchema);

			expect((req.data as { id: number }).id).to.equal(456);
			expect(typeof (req.data as { id: number }).id).to.equal('number');
		});

		it('should coerce boolean strings to booleans for GET requests', () => {
			const req = {
				query: { active: 'true' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, sampleRouteDataWithRequest, customValidationSchema, standardValidationSchema);

			expect((req.data as { active: boolean }).active).to.equal(true);
			expect(typeof (req.data as { active: boolean }).active).to.equal('boolean');
		});

		it('should fail if schema is not found for standard request', () => {
			const routeDataWithoutSchema: RouteData = {
				...sampleRouteDataWithRequest,
				path: '/nonexistent'
			};

			try {
				requestValidator(
					{
						query: { id: '123' },
						method: 'GET'
					} as unknown as RsRequest<unknown>,
					routeDataWithoutSchema,
					customValidationSchema,
					standardValidationSchema
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('No schema found for standard request');
				}
			}
		});
	});

	describe('Custom endpoint validation', () => {
		it('should validate custom endpoint request with valid data', () => {
			const req = {
				body: {
					id: 1,
					companyId: 2,
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@example.com',
					role: 'admin',
					phone: '1234567890',
					lastLoginOn: '2024-01-01'
				},
				method: 'POST'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, customRouteData, customValidationSchema, standardValidationSchema);

			expect((req.data as { id: number; email: string }).id).to.equal(1);
			expect((req.data as { id: number; email: string }).email).to.equal('john@example.com');
		});

		it('should fail if required fields are missing in custom endpoint', () => {
			try {
				requestValidator(
					{
						body: {
							id: 1,
							firstName: 'John'
						},
						method: 'POST'
					} as unknown as RsRequest<unknown>,
					customRouteData,
					customValidationSchema,
					standardValidationSchema
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
					expect(error.msg).to.include('companyId');
				}
			}
		});

		it('should fail if unknown params are passed to custom endpoint', () => {
			try {
				requestValidator(
					{
						body: {
							id: 1,
							companyId: 2,
							firstName: 'John',
							lastName: 'Doe',
							email: 'john@example.com',
							role: 'admin',
							phone: '1234567890',
							lastLoginOn: '2024-01-01',
							unknownField: 'value'
						},
						method: 'POST'
					} as unknown as RsRequest<unknown>,
					customRouteData,
					customValidationSchema,
					standardValidationSchema
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
					expect(error.msg).to.include('unknownField');
				}
			}
		});

		it('should fail if requestType is missing for custom endpoint', () => {
			const routeDataWithoutRequestType = {
				...customRouteData
			};
			delete (routeDataWithoutRequestType as { requestType?: string }).requestType;

			try {
				requestValidator(
					{
						body: {},
						method: 'POST'
					} as unknown as RsRequest<unknown>,
					routeDataWithoutRequestType,
					customValidationSchema,
					standardValidationSchema
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.equal('No request type defined for custom request.');
				}
			}
		});
	});

	describe('Type coercion', () => {
		it('should coerce string "true" to boolean true', () => {
			const req = {
				query: { active: 'true' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, sampleRouteDataWithRequest, customValidationSchema, standardValidationSchema);

			expect((req.data as { active: boolean }).active).to.equal(true);
		});

		it('should coerce string "false" to boolean false', () => {
			const req = {
				query: { active: 'false' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, sampleRouteDataWithRequest, customValidationSchema, standardValidationSchema);

			expect((req.data as { active: boolean }).active).to.equal(false);
		});

		it('should coerce numeric strings to numbers', () => {
			const req = {
				query: { id: '789' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, sampleRouteDataWithRequest, customValidationSchema, standardValidationSchema);

			expect((req.data as { id: number }).id).to.equal(789);
			expect(typeof (req.data as { id: number }).id).to.equal('number');
		});

		it('should handle array notation in query params', () => {
			const routeDataWithArray: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'ids',
						required: false,
						validator: [{ type: 'TYPE_CHECK', value: 'number[]' }]
					}
				]
			};

			const standardSchemaWithArray: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { ids: { type: 'array', items: { type: 'number' } } },
					required: [],
					additionalProperties: false
				})
			};

			const req = {
				query: { 'ids[]': ['1', '2', '3'] },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithArray, customValidationSchema, standardSchemaWithArray);

			const data = req.data as { ids: number[] };
			expect(data.ids).to.be.an('array');
			expect(data.ids[0]).to.equal(1);
			expect(data.ids[1]).to.equal(2);
			expect(data.ids[2]).to.equal(3);
		});
	});

	describe('POST request validation', () => {
		it('should validate POST request body with required fields', () => {
			const postRouteData: RouteData = {
				type: 'ONE',
				method: 'POST',
				name: 'create user',
				description: 'Create user',
				path: '/users',
				table: 'user',
				roles: ['admin'],
				scopes: [],
				request: [
					{
						name: 'firstName',
						required: true,
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'string'
							}
						]
					},
					{
						name: 'email',
						required: true,
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'string'
							}
						]
					},
					{
						name: 'age',
						required: false,
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'number'
							}
						]
					}
				],
				joins: [],
				response: [],
				assignments: [],
				where: []
			};

			const req = {
				body: {
					firstName: 'Jane',
					email: 'jane@example.com',
					age: 25
				},
				method: 'POST'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, postRouteData, customValidationSchema, standardValidationSchema);

			const data = req.data as { firstName: string; email: string; age: number };
			expect(data.firstName).to.equal('Jane');
			expect(data.email).to.equal('jane@example.com');
			expect(data.age).to.equal(25);
		});

		it('should fail POST request if required fields are missing', () => {
			const postRouteData: RouteData = {
				type: 'ONE',
				method: 'POST',
				name: 'create user',
				description: 'Create user',
				path: '/users',
				table: 'user',
				roles: ['admin'],
				scopes: [],
				request: [
					{
						name: 'firstName',
						required: true,
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'string'
							}
						]
					},
					{
						name: 'email',
						required: true,
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'string'
							}
						]
					}
				],
				joins: [],
				response: [],
				assignments: [],
				where: []
			};

			try {
				requestValidator(
					{
						body: {
							firstName: 'Jane'
						},
						method: 'POST'
					} as unknown as RsRequest<unknown>,
					postRouteData,
					customValidationSchema,
					standardValidationSchema
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
					expect(error.msg).to.include('email');
				}
			}
		});
	});

	describe('Edge cases', () => {
		it('should handle empty query params for GET request', () => {
			const req = {
				query: {},
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, sampleRouteDataWithRequest, customValidationSchema, standardValidationSchema);

			expect(req.data).to.be.an('object');
		});

		it('should handle nullable string type with empty string', () => {
			const routeDataWithNullable: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'description',
						required: false,
						isNullable: true,
						validator: [{ type: 'TYPE_CHECK', value: 'string' }]
					}
				]
			};

			const standardSchemaWithNullable: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { description: { type: ['string', 'null'] } },
					required: [],
					additionalProperties: false
				})
			};

			const req = {
				query: { description: '' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithNullable, customValidationSchema, standardSchemaWithNullable);

			expect((req.data as { description: string }).description).to.equal('');
		});

		it('should fail if standard route schema is not in dictionary', () => {
			try {
				requestValidator(
					{
						query: {},
						method: 'GET'
					} as unknown as RsRequest<unknown>,
					sampleRouteDataWithoutRequest,
					customValidationSchema,
					standardValidationSchema
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('No schema found for standard request');
				}
			}
		});
	});

	describe('Enum validation (ONE_OF)', () => {
		it('should pass with valid enum value', () => {
			const routeDataWithEnum: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'status',
						required: true,
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'string'
							},
							{
								type: 'ONE_OF',
								value: ['active', 'inactive', 'pending']
							}
						]
					}
				]
			};

			const standardSchemaWithEnum: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { status: { type: 'string', enum: ['active', 'inactive', 'pending'] } },
					required: ['status'],
					additionalProperties: false
				})
			};

			const req = {
				query: { status: 'active' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithEnum, customValidationSchema, standardSchemaWithEnum);

			expect((req.data as { status: string }).status).to.equal('active');
		});

		it('should fail with invalid enum value', () => {
			const routeDataWithEnum: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'status',
						required: true,
						validator: [
							{ type: 'TYPE_CHECK', value: 'string' },
							{ type: 'ONE_OF', value: ['active', 'inactive', 'pending'] }
						]
					}
				]
			};

			const standardSchemaWithEnum: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { status: { type: 'string', enum: ['active', 'inactive', 'pending'] } },
					required: ['status'],
					additionalProperties: false
				})
			};

			try {
				requestValidator(
					{
						query: { status: 'invalid' },
						method: 'GET'
					} as unknown as RsRequest<unknown>,
					routeDataWithEnum,
					customValidationSchema,
					standardSchemaWithEnum
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
				}
			}
		});

		it('should pass with valid numeric enum value', () => {
			const routeDataWithNumericEnum: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'priority',
						required: true,
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'number'
							},
							{
								type: 'ONE_OF',
								value: [1, 2, 3]
							}
						]
					}
				]
			};

			const standardSchemaWithNumericEnum: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { priority: { type: 'number', enum: [1, 2, 3] } },
					required: ['priority'],
					additionalProperties: false
				})
			};

			const req = {
				query: { priority: '2' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithNumericEnum, customValidationSchema, standardSchemaWithNumericEnum);

			expect((req.data as { priority: number }).priority).to.equal(2);
		});
	});

	describe('Min/Max validation', () => {
		it('should pass with number within min/max range', () => {
			const routeDataWithMinMax: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'age',
						required: true,
						validator: [
							{ type: 'TYPE_CHECK', value: 'number' },
							{ type: 'MIN', value: 18 },
							{ type: 'MAX', value: 100 }
						]
					}
				]
			};

			const standardSchemaWithMinMax: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { age: { type: 'number', minimum: 18, maximum: 100 } },
					required: ['age'],
					additionalProperties: false
				})
			};

			const req = {
				query: { age: '25' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithMinMax, customValidationSchema, standardSchemaWithMinMax);

			expect((req.data as { age: number }).age).to.equal(25);
		});

		it('should fail with number below minimum', () => {
			const routeDataWithMin: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'age',
						required: true,
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'number'
							},
							{
								type: 'MIN',
								value: 18
							}
						]
					}
				]
			};

			const standardSchemaWithMin: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { age: { type: 'number', minimum: 18 } },
					required: ['age'],
					additionalProperties: false
				})
			};

			try {
				requestValidator(
					{ query: { age: '10' }, method: 'GET' } as unknown as RsRequest<unknown>,
					routeDataWithMin,
					customValidationSchema,
					standardSchemaWithMin
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
				}
			}
		});

		it('should fail with number above maximum', () => {
			const routeDataWithMax: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'age',
						required: true,
						validator: [
							{ type: 'TYPE_CHECK', value: 'number' },
							{ type: 'MAX', value: 100 }
						]
					}
				]
			};

			const standardSchemaWithMax: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { age: { type: 'number', maximum: 100 } },
					required: ['age'],
					additionalProperties: false
				})
			};

			try {
				requestValidator(
					{ query: { age: '150' }, method: 'GET' } as unknown as RsRequest<unknown>,
					routeDataWithMax,
					customValidationSchema,
					standardSchemaWithMax
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
				}
			}
		});

		it('should pass with string within minLength/maxLength', () => {
			const routeDataWithStringLength: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'username',
						required: true,
						validator: [
							{ type: 'TYPE_CHECK', value: 'string' },
							{ type: 'MIN', value: 3 },
							{ type: 'MAX', value: 20 }
						]
					}
				]
			};

			const standardSchemaWithStringLength: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { username: { type: 'string', minLength: 3, maxLength: 20 } },
					required: ['username'],
					additionalProperties: false
				})
			};

			const req = {
				query: { username: 'johndoe' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithStringLength, customValidationSchema, standardSchemaWithStringLength);

			expect((req.data as { username: string }).username).to.equal('johndoe');
		});

		it('should fail with string shorter than minLength', () => {
			const routeDataWithMinLength: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'username',
						required: true,
						validator: [
							{ type: 'TYPE_CHECK', value: 'string' },
							{ type: 'MIN', value: 3 }
						]
					}
				]
			};

			const standardSchemaWithMinLength: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { username: { type: 'string', minLength: 3 } },
					required: ['username'],
					additionalProperties: false
				})
			};

			try {
				requestValidator(
					{
						query: { username: 'ab' },
						method: 'GET'
					} as unknown as RsRequest<unknown>,
					routeDataWithMinLength,
					customValidationSchema,
					standardSchemaWithMinLength
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
				}
			}
		});

		it('should fail with string longer than maxLength', () => {
			const routeDataWithMaxLength: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'username',
						required: true,
						validator: [
							{ type: 'TYPE_CHECK', value: 'string' },
							{ type: 'MAX', value: 10 }
						]
					}
				]
			};

			const standardSchemaWithMaxLength: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { username: { type: 'string', maxLength: 10 } },
					required: ['username'],
					additionalProperties: false
				})
			};

			try {
				requestValidator(
					{ query: { username: 'verylongusername' }, method: 'GET' } as unknown as RsRequest<unknown>,
					routeDataWithMaxLength,
					customValidationSchema,
					standardSchemaWithMaxLength
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
				}
			}
		});

		it('should pass with array within minItems/maxItems', () => {
			const routeDataWithArrayLength: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'tags',
						required: true,
						validator: [
							{ type: 'TYPE_CHECK', value: 'string[]' },
							{ type: 'MIN', value: 2 },
							{ type: 'MAX', value: 5 }
						]
					}
				]
			};

			const standardSchemaWithArrayLength: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { tags: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 } },
					required: ['tags'],
					additionalProperties: false
				})
			};

			const req = {
				query: { 'tags[]': ['tag1', 'tag2', 'tag3'] },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithArrayLength, customValidationSchema, standardSchemaWithArrayLength);

			expect((req.data as { tags: string[] }).tags).to.have.lengthOf(3);
		});

		it('should fail with array fewer than minItems', () => {
			const routeDataWithMinItems: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'tags',
						required: true,
						validator: [
							{ type: 'TYPE_CHECK', value: 'string[]' },
							{ type: 'MIN', value: 2 }
						]
					}
				]
			};

			const standardSchemaWithMinItems: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { tags: { type: 'array', items: { type: 'string' }, minItems: 2 } },
					required: ['tags'],
					additionalProperties: false
				})
			};

			try {
				requestValidator(
					{
						query: { 'tags[]': ['tag1'] },
						method: 'GET'
					} as unknown as RsRequest<unknown>,
					routeDataWithMinItems,
					customValidationSchema,
					standardSchemaWithMinItems
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
				}
			}
		});

		it('should fail with array more than maxItems', () => {
			const routeDataWithMaxItems: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'tags',
						required: true,
						validator: [
							{ type: 'TYPE_CHECK', value: 'string[]' },
							{ type: 'MAX', value: 3 }
						]
					}
				]
			};

			const standardSchemaWithMaxItems: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { tags: { type: 'array', items: { type: 'string' }, maxItems: 3 } },
					required: ['tags'],
					additionalProperties: false
				})
			};

			try {
				requestValidator(
					{
						query: { 'tags[]': ['tag1', 'tag2', 'tag3', 'tag4'] },
						method: 'GET'
					} as unknown as RsRequest<unknown>,
					routeDataWithMaxItems,
					customValidationSchema,
					standardSchemaWithMaxItems
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
				}
			}
		});
	});

	describe('Array coercion edge cases', () => {
		it('should convert single value with [] notation to array', () => {
			const routeDataWithArray: RouteData = {
				...sampleRouteDataWithRequest,
				request: [{ name: 'ids', required: false, validator: [{ type: 'TYPE_CHECK', value: 'number[]' }] }]
			};

			const standardSchemaWithArray: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { ids: { type: 'array', items: { type: 'number' } } },
					required: [],
					additionalProperties: false
				})
			};

			const req = { query: { 'ids[]': '123' }, method: 'GET' } as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithArray, customValidationSchema, standardSchemaWithArray);

			const data = req.data as { ids: number[] };
			expect(data.ids).to.be.an('array');
			expect(data.ids).to.have.lengthOf(1);
			expect(data.ids[0]).to.equal(123);
		});

		it('should handle empty array', () => {
			const routeDataWithArray: RouteData = {
				...sampleRouteDataWithRequest,
				request: [{ name: 'ids', required: false, validator: [{ type: 'TYPE_CHECK', value: 'number[]' }] }]
			};

			const standardSchemaWithArray: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { ids: { type: 'array', items: { type: 'number' } } },
					required: [],
					additionalProperties: false
				})
			};

			const req = { query: { 'ids[]': [] }, method: 'GET' } as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithArray, customValidationSchema, standardSchemaWithArray);

			const data = req.data as { ids: number[] };
			expect(data.ids).to.be.an('array');
			expect(data.ids).to.have.lengthOf(0);
		});

		it('should keep array that is already an array', () => {
			const routeDataWithArray: RouteData = {
				...sampleRouteDataWithRequest,
				request: [{ name: 'ids', required: false, validator: [{ type: 'TYPE_CHECK', value: 'number[]' }] }]
			};

			const standardSchemaWithArray: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { ids: { type: 'array', items: { type: 'number' } } },
					required: [],
					additionalProperties: false
				})
			};

			const req = {
				query: { 'ids[]': ['1', '2', '3'] },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithArray, customValidationSchema, standardSchemaWithArray);

			const data = req.data as { ids: number[] };
			expect(data.ids).to.be.an('array');
			expect(data.ids).to.have.lengthOf(3);
			expect(data.ids[0]).to.equal(1);
			expect(data.ids[1]).to.equal(2);
			expect(data.ids[2]).to.equal(3);
		});
	});

	describe('Invalid type coercion', () => {
		it('should fail with non-numeric string for number field', () => {
			const req = {
				query: { id: 'abc' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			try {
				requestValidator(req, sampleRouteDataWithRequest, customValidationSchema, standardValidationSchema);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
				}
			}
		});

		it('should fail with invalid JSON string for object field', () => {
			const routeDataWithObject: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'metadata',
						required: true,
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'object'
							}
						]
					}
				]
			};

			const standardSchemaWithObject: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { metadata: { type: 'object' } },
					required: ['metadata'],
					additionalProperties: false
				})
			};

			try {
				requestValidator(
					{ query: { metadata: '{invalid json}' }, method: 'GET' } as unknown as RsRequest<unknown>,
					routeDataWithObject,
					customValidationSchema,
					standardSchemaWithObject
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
				}
			}
		});
	});

	describe('Mixed nullable arrays', () => {
		it('should pass with null value for nullable array', () => {
			const routeDataWithNullableArray: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'tags',
						required: false,
						isNullable: true,
						validator: [{ type: 'TYPE_CHECK', value: 'string[]' }]
					}
				]
			};

			const standardSchemaWithNullableArray: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { tags: { type: ['array', 'null'], items: { type: 'string' } } },
					required: [],
					additionalProperties: false
				})
			};

			const req = { query: { tags: null }, method: 'GET' } as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithNullableArray, customValidationSchema, standardSchemaWithNullableArray);

			expect((req.data as { tags: string[] | null }).tags).to.equal(null);
		});

		it('should pass with valid array for nullable array', () => {
			const routeDataWithNullableArray: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'tags',
						required: false,
						isNullable: true,
						validator: [{ type: 'TYPE_CHECK', value: 'string[]' }]
					}
				]
			};

			const standardSchemaWithNullableArray: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { tags: { type: ['array', 'null'], items: { type: 'string' } } },
					required: [],
					additionalProperties: false
				})
			};

			const req = { query: { 'tags[]': ['tag1', 'tag2'] }, method: 'GET' } as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithNullableArray, customValidationSchema, standardSchemaWithNullableArray);

			const data = req.data as { tags: string[] | null };
			expect(data.tags).to.be.an('array');
			expect(data.tags).to.have.lengthOf(2);
		});
	});

	describe('Parameters without TYPE_CHECK validator', () => {
		it('should pass through parameter without TYPE_CHECK validator', () => {
			const routeDataWithoutTypeCheck: RouteData = {
				...sampleRouteDataWithRequest,
				request: [
					{
						name: 'freeform',
						required: false,
						validator: []
					}
				]
			};

			const standardSchemaWithoutTypeCheck: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { freeform: {} },
					required: [],
					additionalProperties: false
				})
			};

			const req = { query: { freeform: 'anything' }, method: 'GET' } as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithoutTypeCheck, customValidationSchema, standardSchemaWithoutTypeCheck);

			expect((req.data as { freeform: string }).freeform).to.equal('anything');
		});
	});

	describe('Custom endpoint configuration edge cases', () => {
		it('should fail if custom endpoint has neither request array nor requestType', () => {
			const customRouteWithoutRequestType: RouteData = {
				type: 'CUSTOM_ONE',
				method: 'POST',
				name: 'custom endpoint',
				description: 'Custom endpoint',
				path: '/custom',
				roles: ['user', 'admin'],
				scopes: [],
				responseType: 'AuthResponse'
			};

			try {
				requestValidator(
					{
						body: { id: 1 },
						method: 'POST'
					} as unknown as RsRequest<unknown>,
					customRouteWithoutRequestType,
					customValidationSchema,
					standardValidationSchema
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.equal('No request type defined for custom request.');
				}
			}
		});
	});

	describe('HTTP method edge cases', () => {
		it('should validate PATCH request with query params', () => {
			const patchRouteData: RouteData = {
				type: 'ONE',
				method: 'PATCH',
				name: 'patch user',
				description: 'Patch user',
				path: '/users',
				table: 'user',
				roles: ['admin'],
				scopes: [],
				request: [
					{
						name: 'id',
						required: true,
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'number'
							}
						]
					}
				],
				joins: [],
				response: [],
				assignments: [],
				where: []
			};

			const patchSchema: ValidationDictionary = {
				'PATCH:/users': wrapSchema('PATCH:/users', {
					type: 'object',
					properties: { id: { type: 'number' } },
					required: ['id'],
					additionalProperties: false
				})
			};

			const req = { body: { id: 456 }, method: 'PATCH' } as unknown as RsRequest<unknown>;

			requestValidator(req, patchRouteData, customValidationSchema, patchSchema);

			expect((req.data as { id: number }).id).to.equal(456);
		});

		it('should validate PUT request', () => {
			const putRouteData: RouteData = {
				type: 'ONE',
				method: 'PUT',
				name: 'update user',
				description: 'Update user',
				path: '/users',
				table: 'user',
				roles: ['admin'],
				scopes: [],
				request: [
					{ name: 'id', required: true, validator: [{ type: 'TYPE_CHECK', value: 'number' }] },
					{ name: 'name', required: true, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }
				],
				joins: [],
				response: [],
				assignments: [],
				where: []
			};

			const putSchema: ValidationDictionary = {
				'PUT:/users': wrapSchema('PUT:/users', {
					type: 'object',
					properties: { id: { type: 'number' }, name: { type: 'string' } },
					required: ['id', 'name'],
					additionalProperties: false
				})
			};

			const req = {
				body: { id: 789, name: 'John' },
				method: 'PUT'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, putRouteData, customValidationSchema, putSchema);

			const data = req.data as { id: number; name: string };
			expect(data.id).to.equal(789);
			expect(data.name).to.equal('John');
		});

		it('should validate DELETE request with query params', () => {
			const deleteRouteData: RouteData = {
				type: 'ONE',
				method: 'DELETE',
				name: 'delete user',
				description: 'Delete user',
				path: '/users',
				table: 'user',
				roles: ['admin'],
				scopes: [],
				request: [
					{
						name: 'id',
						required: true,
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'number'
							}
						]
					}
				],
				joins: [],
				response: [],
				assignments: [],
				where: []
			};

			const deleteSchema: ValidationDictionary = {
				'DELETE:/users': wrapSchema('DELETE:/users', {
					type: 'object',
					properties: { id: { type: 'number' } },
					required: ['id'],
					additionalProperties: false
				})
			};

			const req = { query: { id: '999' }, method: 'DELETE' } as unknown as RsRequest<unknown>;

			requestValidator(req, deleteRouteData, customValidationSchema, deleteSchema);

			expect((req.data as { id: number }).id).to.equal(999);
			expect(typeof (req.data as { id: number }).id).to.equal('number');
		});
	});

	describe('Schema with nested objects', () => {
		it('should validate nested object structure', () => {
			const routeDataWithNestedObject: RouteData = {
				...sampleRouteDataWithRequest,
				request: [{ name: 'address', required: true, validator: [{ type: 'TYPE_CHECK', value: 'object' }] }]
			};

			const standardSchemaWithNestedObject: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: {
						address: {
							type: 'object',
							properties: {
								street: { type: 'string' },
								city: { type: 'string' },
								zipCode: { type: 'string' }
							},
							required: ['street', 'city']
						}
					},
					required: ['address'],
					additionalProperties: false
				})
			};

			const req = {
				query: { address: JSON.stringify({ street: '123 Main St', city: 'Springfield', zipCode: '12345' }) },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithNestedObject, customValidationSchema, standardSchemaWithNestedObject);

			const data = req.data as { address: { street: string; city: string; zipCode: string } };
			expect(data.address).to.be.an('object');
			expect(data.address.street).to.equal('123 Main St');
			expect(data.address.city).to.equal('Springfield');
			expect(data.address.zipCode).to.equal('12345');
		});

		it('should fail if nested object is missing required properties', () => {
			const routeDataWithNestedObject: RouteData = {
				...sampleRouteDataWithRequest,
				request: [{ name: 'address', required: true, validator: [{ type: 'TYPE_CHECK', value: 'object' }] }]
			};

			const standardSchemaWithNestedObject: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: {
						address: {
							type: 'object',
							properties: { street: { type: 'string' }, city: { type: 'string' } },
							required: ['street', 'city']
						}
					},
					required: ['address'],
					additionalProperties: false
				})
			};

			try {
				requestValidator(
					{
						query: { address: JSON.stringify({ street: '123 Main St' }) },
						method: 'GET'
					} as unknown as RsRequest<unknown>,
					routeDataWithNestedObject,
					customValidationSchema,
					standardSchemaWithNestedObject
				);
				throw new Error('Should have thrown an error');
			} catch (error: unknown) {
				expect(error).to.be.instanceOf(RsError);
				if (error instanceof RsError) {
					expect(error.err).to.equal('BAD_REQUEST');
					expect(error.msg).to.include('Request validation failed');
				}
			}
		});
	});

	describe('Special characters in parameter names', () => {
		it('should handle parameter names with underscores', () => {
			const routeDataWithUnderscore: RouteData = {
				...sampleRouteDataWithRequest,
				request: [{ name: 'user_id', required: true, validator: [{ type: 'TYPE_CHECK', value: 'number' }] }]
			};

			const standardSchemaWithUnderscore: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { user_id: { type: 'number' } },
					required: ['user_id'],
					additionalProperties: false
				})
			};

			const req = { query: { user_id: '123' }, method: 'GET' } as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithUnderscore, customValidationSchema, standardSchemaWithUnderscore);

			expect((req.data as { user_id: number }).user_id).to.equal(123);
		});

		it('should handle parameter names with dashes', () => {
			const routeDataWithDash: RouteData = {
				...sampleRouteDataWithRequest,
				request: [{ name: 'user-id', required: true, validator: [{ type: 'TYPE_CHECK', value: 'number' }] }]
			};

			const standardSchemaWithDash: ValidationDictionary = {
				'GET:/users': wrapSchema('GET:/users', {
					type: 'object',
					properties: { 'user-id': { type: 'number' } },
					required: ['user-id'],
					additionalProperties: false
				})
			};

			const req = { query: { 'user-id': '456' }, method: 'GET' } as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithDash, customValidationSchema, standardSchemaWithDash);

			expect((req.data as { 'user-id': number })['user-id']).to.equal(456);
		});
	});

	describe('GET order/summary (ManualOrderSummaryRequest)', () => {
		const orderSummaryRouteData: RouteData = {
			type: 'CUSTOM_ONE',
			method: 'GET',
			name: 'order summary',
			description: 'Get manual order summary',
			path: '/order/summary',
			roles: ['admin'],
			scopes: [],
			requestType: 'ManualOrderSummaryRequest',
			responseType: 'ManualOrderSummaryResponse',
			request: []
		};

		const orderSummaryValidationSchema: ValidationDictionary = {
			ManualOrderSummaryRequest: {
				$schema: 'http://json-schema.org/draft-07/schema#',
				$ref: '#/definitions/ManualOrderSummaryRequest',
				definitions: {
					CreateManualOrderItemRequest: {
						type: 'object',
						properties: {
							productId: { type: 'number' },
							quantity: { type: 'number' },
							variantId: { type: 'number' },
							subscriptionPlanId: { type: 'number' },
							subscriptionIntervalCount: { type: 'number' },
							subscriptionIntervalUnit: { type: 'string', enum: ['DAY', 'WEEK', 'MONTH', 'YEAR'] }
						},
						required: ['productId', 'quantity'],
						additionalProperties: false
					},
					ShippingMethodInput: {
						oneOf: [
							{
								type: 'object',
								properties: {
									type: { type: 'string', enum: ['CUSTOM'] },
									name: { type: 'string' },
									price: { type: 'string' }
								},
								required: ['type', 'name', 'price'],
								additionalProperties: false
							},
							{
								type: 'object',
								properties: {
									type: { type: 'string', enum: ['ID'] },
									shippingMethodId: { type: 'number' }
								},
								required: ['type', 'shippingMethodId'],
								additionalProperties: false
							}
						]
					},
					ManualOrderSummaryRequest: {
						type: 'object',
						properties: {
							items: {
								type: 'array',
								items: { $ref: '#/definitions/CreateManualOrderItemRequest' }
							},
							shippingAddress: {
								type: 'object',
								properties: {
									city: { type: 'string' },
									countryCode: { type: 'string' },
									stateProvince: { type: 'string' },
									postalCode: { type: 'string' }
								},
								required: ['city', 'countryCode', 'postalCode'],
								additionalProperties: false
							},
							shippingMethod: { $ref: '#/definitions/ShippingMethodInput' },
							customerUserId: { type: 'number' }
						},
						required: ['items', 'shippingAddress'],
						additionalProperties: false
					}
				}
			} as Definition
		};

		it('should validate GET order/summary with items[], shippingAddress, shippingMethod, customerUserId query params', () => {
			// Query params as the server receives them (URL-decoded keys, string values)
			// items[]=%7B%22productId%22%3A8%2C%22quantity%22%3A1%2C%22subscriptionIntervalUnit%22%3A%22MONTH%22%7D
			// shippingAddress=%7B%22city%22%3A%22Spanish%20Fork%22%2C%22countryCode%22%3A%22US%22%2C%22stateProvince%22%3A%22UT%22%2C%22postalCode%22%3A%2284660%22%7D
			// shippingMethod=%7B%22type%22%3A%22ID%22%2C%22shippingMethodId%22%3A1%7D
			// customerUserId=31
			const req = {
				method: 'GET',
				query: {
					'items[]': '{"productId":8,"quantity":1,"subscriptionIntervalUnit":"MONTH"}',
					shippingAddress:
						'{"city":"Spanish Fork","countryCode":"US","stateProvince":"UT","postalCode":"84660"}',
					shippingMethod: '{"type":"ID","shippingMethodId":1}',
					customerUserId: '31'
				}
			} as unknown as RsRequest<unknown>;

			requestValidator(req, orderSummaryRouteData, orderSummaryValidationSchema, standardValidationSchema);

			const data = req.data as {
				items: Array<{ productId: number; quantity: number; subscriptionIntervalUnit?: string }>;
				shippingAddress: { city: string; countryCode: string; stateProvince?: string; postalCode: string };
				shippingMethod: { type: string; shippingMethodId: number };
				customerUserId: number;
			};

			expect(data.items).to.be.an('array').with.lengthOf(1);
			expect(data.items[0].productId).to.equal(8);
			expect(data.items[0].quantity).to.equal(1);
			expect(data.items[0].subscriptionIntervalUnit).to.equal('MONTH');

			expect(data.shippingAddress).to.deep.equal({
				city: 'Spanish Fork',
				countryCode: 'US',
				stateProvince: 'UT',
				postalCode: '84660'
			});

			expect(data.shippingMethod).to.deep.equal({ type: 'ID', shippingMethodId: 1 });

			expect(data.customerUserId).to.equal(31);
		});
	});
});
