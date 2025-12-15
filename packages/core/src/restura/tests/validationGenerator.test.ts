import { expect } from 'chai';
import customTypeValidationGenerator from '../generators/customTypeValidationGenerator.js';
import standardTypeValidationGenerator from '../generators/standardTypeValidationGenerator.js';
import { ResturaSchema } from '../schemas/resturaSchema.js';
import type { DynamicObject } from '../types/customExpressTypes.js';

describe('standardTypeValidationGenerator', () => {
	it('should generate comprehensive JSON schemas from ResturaSchema with all validator types', () => {
		const testSchema: ResturaSchema = {
			database: [],
			endpoints: [
				{
					name: 'TestAPI',
					description: 'Test API',
					baseUrl: '/api/v1',
					routes: [
						{
							type: 'ONE',
							method: 'GET',
							name: 'comprehensive test',
							description: 'Test all validator types',
							path: '/test',
							table: 'test',
							roles: [],
							scopes: [],
							request: [
								// Basic string
								{
									name: 'username',
									required: true,
									validator: [
										{
											type: 'TYPE_CHECK',
											value: 'string'
										}
									]
								},
								// String with min/max length
								{
									name: 'password',
									required: true,
									validator: [
										{
											type: 'TYPE_CHECK',
											value: 'string'
										},
										{
											type: 'MIN',
											value: 8
										},
										{
											type: 'MAX',
											value: 50
										}
									]
								},
								// Basic number
								{
									name: 'age',
									required: false,
									validator: [
										{
											type: 'TYPE_CHECK',
											value: 'number'
										}
									]
								},
								// Number with min/max
								{
									name: 'score',
									required: true,
									validator: [
										{
											type: 'TYPE_CHECK',
											value: 'number'
										},
										{
											type: 'MIN',
											value: 0
										},
										{
											type: 'MAX',
											value: 100
										}
									]
								},
								// Boolean
								{
									name: 'active',
									required: false,
									validator: [
										{
											type: 'TYPE_CHECK',
											value: 'boolean'
										}
									]
								},
								// String enum
								{
									name: 'role',
									required: true,
									validator: [
										{
											type: 'TYPE_CHECK',
											value: 'string'
										},
										{
											type: 'ONE_OF',
											value: ['admin', 'user', 'guest']
										}
									]
								},
								// Number enum
								{
									name: 'priority',
									required: false,
									validator: [
										{
											type: 'TYPE_CHECK',
											value: 'number'
										},
										{
											type: 'ONE_OF',
											value: [1, 2, 3, 4, 5]
										}
									]
								},
								// Nullable string
								{
									name: 'middleName',
									required: false,
									isNullable: true,
									validator: [
										{
											type: 'TYPE_CHECK',
											value: 'string'
										}
									]
								},
								// String array
								{
									name: 'tags',
									required: false,
									validator: [
										{
											type: 'TYPE_CHECK',
											value: 'string[]'
										}
									]
								},
								// Number array with min/max items
								{
									name: 'scores',
									required: true,
									validator: [
										{
											type: 'TYPE_CHECK',
											value: 'number[]'
										},
										{
											type: 'MIN',
											value: 1
										},
										{
											type: 'MAX',
											value: 10
										}
									]
								},
								// Nullable array
								{
									name: 'optionalIds',
									required: false,
									isNullable: true,
									validator: [
										{
											type: 'TYPE_CHECK',
											value: 'number[]'
										}
									]
								},
								// Object type
								{
									name: 'metadata',
									required: false,
									validator: [
										{
											type: 'TYPE_CHECK',
											value: 'object'
										}
									]
								},
								// Enum without TYPE_CHECK (should infer type)
								{
									name: 'status',
									required: true,
									validator: [
										{
											type: 'ONE_OF',
											value: ['pending', 'approved', 'rejected']
										}
									]
								},
								// No validators (should allow anything)
								{
									name: 'freeform',
									required: false,
									validator: []
								}
							],
							joins: [],
							response: [],
							assignments: [],
							where: []
						}
					]
				}
			],
			globalParams: [],
			roles: [],
			scopes: [],
			customTypes: []
		};

		const result = standardTypeValidationGenerator(testSchema);

		const expectedSchema = {
			'GET:/test': {
				type: 'object',
				properties: {
					username: {
						type: 'string'
					},
					password: {
						type: 'string',
						minLength: 8,
						maxLength: 50
					},
					age: {
						type: 'number'
					},
					score: {
						type: 'number',
						minimum: 0,
						maximum: 100
					},
					active: {
						type: 'boolean'
					},
					role: {
						type: 'string',
						enum: ['admin', 'user', 'guest']
					},
					priority: {
						type: 'number',
						enum: [1, 2, 3, 4, 5]
					},
					middleName: {
						type: ['string', 'null']
					},
					tags: {
						type: 'array',
						items: {
							type: 'string'
						}
					},
					scores: {
						type: 'array',
						items: {
							type: 'number'
						},
						minItems: 1,
						maxItems: 10
					},
					optionalIds: {
						type: ['array', 'null'],
						items: {
							type: 'number'
						}
					},
					metadata: {
						type: 'object'
					},
					status: {
						enum: ['pending', 'approved', 'rejected'],
						type: 'string'
					},
					freeform: {}
				},
				required: ['username', 'password', 'score', 'role', 'scores', 'status'],
				additionalProperties: false
			}
		};

		expect(result).to.deep.equal(expectedSchema);
	});

	it('should handle routes without request parameters', () => {
		const testSchema: ResturaSchema = {
			database: [],
			endpoints: [
				{
					name: 'TestAPI',
					description: 'Test API',
					baseUrl: '/api/v1',
					routes: [
						{
							type: 'ONE',
							method: 'GET',
							name: 'no params',
							description: 'Route without request params',
							path: '/no-params',
							table: 'test',
							roles: [],
							scopes: [],
							request: [],
							joins: [],
							response: [],
							assignments: [],
							where: []
						}
					]
				}
			],
			globalParams: [],
			roles: [],
			scopes: [],
			customTypes: []
		};

		const result = standardTypeValidationGenerator(testSchema);

		expect(result).to.deep.equal({
			'GET:/no-params': { type: 'object', properties: {}, additionalProperties: false }
		});
	});

	it('should generate schemas for multiple routes', () => {
		const testSchema: ResturaSchema = {
			database: [],
			endpoints: [
				{
					name: 'TestAPI',
					description: 'Test API',
					baseUrl: '/api/v1',
					routes: [
						{
							type: 'ONE',
							method: 'GET',
							name: 'get user',
							description: 'Get user',
							path: '/user',
							table: 'user',
							roles: [],
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
						},
						{
							type: 'ONE',
							method: 'POST',
							name: 'create user',
							description: 'Create user',
							path: '/user',
							table: 'user',
							roles: [],
							scopes: [],
							request: [
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
						}
					]
				}
			],
			globalParams: [],
			roles: [],
			scopes: [],
			customTypes: []
		};

		const result = standardTypeValidationGenerator(testSchema);

		expect(result).to.have.property('GET:/user');
		expect(result).to.have.property('POST:/user');
		expect(result['GET:/user'].properties).to.have.property('id');
		expect(result['POST:/user'].properties).to.have.property('email');
	});
});

describe('customTypeValidationGenerator', () => {
	it('should generate JSON schemas from TypeScript interfaces with comprehensive types', () => {
		const testSchema: ResturaSchema = {
			database: [],
			endpoints: [],
			globalParams: [],
			roles: [],
			scopes: [],
			customTypes: [
				`export interface UserProfile {
					id: number;
					email: string;
					firstName: string;
					lastName: string;
					age?: number;
					isActive: boolean;
					role: 'admin' | 'user' | 'guest';
					metadata: {
						lastLogin: string;
						loginCount: number;
					};
					tags: string[];
					scores: number[];
				}`,
				`export interface AuthResponse {
					token: string;
					tokenExp: string;
					refreshToken: string;
					refreshTokenExp: string;
					user: UserProfile;
				}`,
				`export type StatusType = 'pending' | 'approved' | 'rejected';`,
				`export interface ComplexNested {
					id: number;
					status: StatusType;
					data: {
						nested: {
							deep: {
								value: string;
							};
						};
					};
					optionalField?: string;
					nullableField: string | null;
				}`
			]
		};

		const result = customTypeValidationGenerator(testSchema, true);

		// Validate UserProfile schema
		expect(result).to.have.property('UserProfile');
		expect(result.UserProfile).to.have.property('type', 'object');
		expect(result.UserProfile).to.have.property('properties');

		const userProfileProps = result.UserProfile.properties!;
		expect(userProfileProps).to.have.property('id');
		expect(userProfileProps.id).to.deep.equal({ type: 'number' });
		expect(userProfileProps).to.have.property('email');
		expect(userProfileProps.email).to.deep.equal({ type: 'string' });
		expect(userProfileProps).to.have.property('isActive');
		expect(userProfileProps.isActive).to.deep.equal({ type: 'boolean' });

		// Check enum type
		expect(userProfileProps).to.have.property('role');
		expect(userProfileProps.role).to.have.property('enum');
		expect((userProfileProps.role as DynamicObject).enum).to.include.members(['admin', 'user', 'guest']);

		// Check nested object
		expect(userProfileProps).to.have.property('metadata');
		expect(userProfileProps.metadata).to.have.property('type', 'object');
		expect(userProfileProps.metadata).to.have.property('properties');
		const metadataProps = (userProfileProps.metadata as DynamicObject).properties;
		expect(metadataProps).to.have.property('lastLogin');
		expect(metadataProps).to.have.property('loginCount');

		// Check arrays
		expect(userProfileProps).to.have.property('tags');
		expect(userProfileProps.tags).to.have.property('type', 'array');
		expect((userProfileProps.tags as DynamicObject).items).to.deep.equal({ type: 'string' });

		expect(userProfileProps).to.have.property('scores');
		expect(userProfileProps.scores).to.have.property('type', 'array');
		expect((userProfileProps.scores as DynamicObject).items).to.deep.equal({ type: 'number' });

		// Check optional field
		expect(userProfileProps).to.have.property('age');
		expect(result.UserProfile.required).to.not.include('age');

		// Check required fields
		expect(result.UserProfile.required).to.include.members([
			'id',
			'email',
			'firstName',
			'lastName',
			'isActive',
			'role',
			'metadata',
			'tags',
			'scores'
		]);

		// Validate AuthResponse schema with reference to UserProfile
		expect(result).to.have.property('AuthResponse');
		expect(result.AuthResponse).to.have.property('type', 'object');
		expect(result.AuthResponse).to.have.property('properties');

		const authResponseProps = result.AuthResponse.properties!;
		expect(authResponseProps).to.have.property('token');
		expect(authResponseProps).to.have.property('user');
		// The user property should reference UserProfile or be a nested object
		expect(authResponseProps.user).to.satisfy((prop: DynamicObject) => {
			return prop.$ref === '#/definitions/UserProfile' || prop.type === 'object';
		});

		// Validate StatusType (type alias with union)
		expect(result).to.have.property('StatusType');
		expect(result.StatusType).to.have.property('enum');
		expect((result.StatusType as DynamicObject).enum).to.include.members(['pending', 'approved', 'rejected']);

		// Validate ComplexNested with deep nesting and nullable
		expect(result).to.have.property('ComplexNested');
		expect(result.ComplexNested).to.have.property('properties');

		const complexNestedProps = result.ComplexNested.properties!;
		expect(complexNestedProps).to.have.property('data');
		expect(complexNestedProps.data).to.have.property('type', 'object');
		expect(complexNestedProps.data).to.have.property('properties');
		expect((complexNestedProps.data as DynamicObject).properties).to.have.property('nested');

		// Check optional vs nullable
		expect(result.ComplexNested.required).to.not.include('optionalField');
		expect(complexNestedProps).to.have.property('nullableField');
	});

	it('should handle empty customTypes array', () => {
		const testSchema: ResturaSchema = {
			database: [],
			endpoints: [],
			globalParams: [],
			roles: [],
			scopes: [],
			customTypes: []
		};

		const result = customTypeValidationGenerator(testSchema, true);

		expect(result).to.deep.equal({});
	});

	it('should handle single simple interface', () => {
		const testSchema: ResturaSchema = {
			database: [],
			endpoints: [],
			globalParams: [],
			roles: [],
			scopes: [],
			customTypes: [
				`export interface SimpleUser {
					id: number;
					name: string;
				}`
			]
		};

		const result = customTypeValidationGenerator(testSchema, true);

		expect(result).to.have.property('SimpleUser');
		expect(result.SimpleUser).to.have.property('type', 'object');
		expect(result.SimpleUser).to.have.property('properties');

		const simpleUserProps = result.SimpleUser.properties!;
		expect(simpleUserProps).to.have.property('id');
		expect(simpleUserProps.id).to.deep.equal({ type: 'number' });
		expect(simpleUserProps).to.have.property('name');
		expect(simpleUserProps.name).to.deep.equal({ type: 'string' });
		expect(result.SimpleUser.required).to.include.members(['id', 'name']);
	});

	it('should extract interface names correctly', () => {
		const testSchema: ResturaSchema = {
			database: [],
			endpoints: [],
			globalParams: [],
			roles: [],
			scopes: [],
			customTypes: [
				`export interface FirstInterface { id: number; }`,
				`export type SecondType = string;`,
				`interface ThirdInterface { name: string; }`
			]
		};

		const result = customTypeValidationGenerator(testSchema, true);

		expect(result).to.have.property('FirstInterface');
		expect(result).to.have.property('SecondType');
		expect(result).to.have.property('ThirdInterface');
	});

	it('should handle interface with array of objects', () => {
		const testSchema: ResturaSchema = {
			database: [],
			endpoints: [],
			globalParams: [],
			roles: [],
			scopes: [],
			customTypes: [
				`export interface Address {
					street: string;
					city: string;
					zipCode: string;
				}`,
				`export interface UserWithAddresses {
					id: number;
					addresses: Address[];
				}`
			]
		};

		const result = customTypeValidationGenerator(testSchema, true);

		expect(result).to.have.property('UserWithAddresses');
		expect(result.UserWithAddresses).to.have.property('properties');

		const userWithAddressesProps = result.UserWithAddresses.properties!;
		expect(userWithAddressesProps).to.have.property('addresses');
		expect(userWithAddressesProps.addresses).to.have.property('type', 'array');
		expect(userWithAddressesProps.addresses).to.have.property('items');
	});

	it('should handle union types', () => {
		const testSchema: ResturaSchema = {
			database: [],
			endpoints: [],
			globalParams: [],
			roles: [],
			scopes: [],
			customTypes: [
				`export interface FlexibleValue {
					id: number;
					value: string | number;
				}`
			]
		};

		const result = customTypeValidationGenerator(testSchema, true);

		expect(result).to.have.property('FlexibleValue');
		expect(result.FlexibleValue).to.have.property('properties');

		const flexibleValueProps = result.FlexibleValue.properties!;
		expect(flexibleValueProps).to.have.property('value');
		// Union types should be represented with anyOf or oneOf
		expect(flexibleValueProps.value).to.satisfy((prop: DynamicObject) => {
			return prop.anyOf || prop.oneOf || prop.type;
		});
	});
});
