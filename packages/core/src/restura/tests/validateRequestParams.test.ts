import { expect } from 'chai';
import { RsError } from '../RsError.js';
import { RouteData } from '../schemas/resturaSchema.js';
import { RsRequest } from '../types/customExpressTypes.js';
import requestValidator, { ValidationDictionary } from '../validators/requestValidator.js';

describe.only('validateRequestParams', () => {
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
		FilteredUser: {
			type: 'object',
			properties: {
				id: {
					type: 'number'
				},
				companyId: {
					type: 'number'
				},
				firstName: {
					type: 'string'
				},
				lastName: {
					type: 'string'
				},
				email: {
					type: 'string'
				},
				role: {
					type: 'string'
				},
				phone: {
					type: 'string'
				},
				lastLoginOn: {
					type: 'string'
				}
			},
			required: ['companyId', 'email', 'firstName', 'id', 'lastLoginOn', 'lastName', 'phone', 'role'],
			$schema: 'http://json-schema.org/draft-07/schema#'
		},
		AuthResponse: {
			type: 'object',
			properties: {
				token: {
					type: 'string'
				},
				tokenExp: {
					type: 'string'
				},
				refreshToken: {
					type: 'string'
				},
				refreshTokenExp: {
					type: 'string'
				}
			},
			required: ['refreshToken', 'refreshTokenExp', 'token', 'tokenExp'],
			$schema: 'http://json-schema.org/draft-07/schema#'
		}
	} as ValidationDictionary;

	const standardValidationSchema: ValidationDictionary = {
		'GET:/users': {
			type: 'object',
			properties: {
				id: {
					type: 'number'
				},
				name: {
					type: 'string'
				},
				active: {
					type: 'boolean'
				}
			},
			required: [],
			additionalProperties: false
		},
		'POST:/users': {
			type: 'object',
			properties: {
				firstName: {
					type: 'string'
				},
				lastName: {
					type: 'string'
				},
				email: {
					type: 'string'
				},
				age: {
					type: 'number'
				}
			},
			required: ['firstName', 'email'],
			additionalProperties: false
		}
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
					expect(error.msg).to.equal('No schema found for standard request.');
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
					expect(error.msg).to.include('required');
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
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'number[]'
							}
						]
					}
				]
			};

			const standardSchemaWithArray: ValidationDictionary = {
				'GET:/users': {
					type: 'object',
					properties: {
						ids: {
							type: 'array',
							items: {
								type: 'number'
							}
						}
					},
					required: [],
					additionalProperties: false
				}
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
						validator: [
							{
								type: 'TYPE_CHECK',
								value: 'string'
							}
						]
					}
				]
			};

			const standardSchemaWithNullable: ValidationDictionary = {
				'GET:/users': {
					type: 'object',
					properties: {
						description: {
							type: ['string', 'null']
						}
					},
					required: [],
					additionalProperties: false
				}
			};

			const req = {
				query: { description: '' },
				method: 'GET'
			} as unknown as RsRequest<unknown>;

			requestValidator(req, routeDataWithNullable, customValidationSchema, standardSchemaWithNullable);

			expect((req.data as { description: string }).description).to.equal('');
		});

		it('should fail if standard route has no request but request is undefined', () => {
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
					expect(error.msg).to.equal('No request parameters provided for standard request.');
				}
			}
		});
	});
});
