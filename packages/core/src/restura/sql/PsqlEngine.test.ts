import PsqlEngine from './PsqlEngine.js';
import { types } from 'pg';
import { DynamicObject, RsRequest } from '../types/expressCustom.js';
import { ResturaSchema, RouteData, WhereData } from '../restura.schema.js';
import { PsqlPool } from './PsqlPool.js';
import { expect } from 'chai';

const sampleSchema: ResturaSchema = {
	database: [
		{
			name: 'company',
			columns: [
				{
					name: 'id',
					hasAutoIncrement: true,
					isNullable: false,
					roles: [],
					type: 'BIGINT'
				},
				{
					name: 'createdOn',
					isNullable: false,
					default: 'now()',
					roles: [],
					type: 'DATETIME'
				},
				{ name: 'modifiedOn', isNullable: false, default: 'now()', roles: [], type: 'DATETIME' },
				{
					roles: [],
					name: 'name',
					type: 'VARCHAR',
					length: 255,
					isNullable: true
				}
			],
			checkConstraints: [],
			foreignKeys: [],
			indexes: [{ name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimaryKey: true, order: 'ASC' }],
			roles: []
		},
		{
			name: 'user',
			columns: [
				{
					name: 'id',
					hasAutoIncrement: true,
					isNullable: false,
					roles: [],
					type: 'BIGINT'
				},
				{
					name: 'createdOn',
					isNullable: false,
					default: 'now()',
					roles: [],
					type: 'DATETIME'
				},
				{ name: 'modifiedOn', isNullable: false, default: 'now()', roles: [], type: 'DATETIME' },
				{
					roles: [],
					name: 'firstName',
					type: 'VARCHAR',
					length: 30,
					isNullable: false
				},
				{ roles: [], name: 'lastName', type: 'VARCHAR', length: 30, isNullable: false },
				{
					roles: [],
					name: 'companyId',
					type: 'BIGINT',
					isNullable: false,
					comment: 'Foreign key to company(id)'
				},
				{ roles: [], name: 'password', type: 'VARCHAR', length: 70, isNullable: false },
				{
					roles: [],
					name: 'email',
					type: 'VARCHAR',
					length: 100,
					isNullable: false
				},
				{ roles: [], name: 'role', type: 'ENUM', isNullable: false, value: "'admin','user'" },
				{
					roles: [],
					name: 'permissionLogin',
					type: 'BOOLEAN',
					isNullable: false,
					default: '1'
				},
				{ roles: [], name: 'lastLoginOn', type: 'DATETIME', isNullable: true },
				{
					roles: [],
					name: 'phone',
					type: 'VARCHAR',
					length: 30,
					isNullable: true
				},
				{
					roles: [],
					name: 'loginDisabledOn',
					type: 'DATETIME',
					isNullable: true,
					comment: 'When user was disabled'
				},
				{ roles: [], name: 'passwordResetGuid', type: 'VARCHAR', length: 100, isNullable: true },
				{
					roles: [],
					name: 'verifyEmailPin',
					type: 'MEDIUMINT',
					isNullable: true
				},
				{ roles: [], name: 'verifyEmailPinExpiresOn', type: 'DATETIME', isNullable: true },
				{
					roles: [],
					name: 'accountStatus',
					type: 'ENUM',
					isNullable: false,
					value: "'banned','view_only','active'",
					default: 'view_only'
				},
				{
					roles: [],
					name: 'passwordResetExpiresOn',
					type: 'DATETIME',
					isNullable: true,
					comment: 'When guid is no longer valid'
				},
				{
					roles: [],
					name: 'onboardingStatus',
					type: 'ENUM',
					isNullable: false,
					value: "'verify_email','complete'",
					default: 'verify_email'
				},
				{
					roles: [],
					name: 'pendingEmail',
					type: 'VARCHAR',
					length: 100,
					isNullable: true
				}
			],
			checkConstraints: [],
			foreignKeys: [
				{
					name: 'user_companyId_company_id_fk',
					onDelete: 'NO ACTION',
					onUpdate: 'NO ACTION',
					column: 'companyId',
					refTable: 'company',
					refColumn: 'id'
				}
			],
			indexes: [
				{
					name: 'PRIMARY',
					columns: ['id'],
					isUnique: true,
					isPrimaryKey: true,
					order: 'ASC'
				},
				{
					columns: ['companyId'],
					isUnique: false,
					isPrimaryKey: false,
					order: 'ASC',
					name: 'user_companyId_index'
				},
				{
					name: 'user_email_unique_index',
					columns: ['email'],
					order: 'ASC',
					isPrimaryKey: false,
					isUnique: true
				},
				{
					name: 'user_passwordResetGuid_index',
					isUnique: false,
					order: 'ASC',
					columns: ['passwordResetGuid'],
					isPrimaryKey: false
				}
			],
			roles: []
		}
	],
	endpoints: [
		{
			name: 'V1',
			description: 'V1 Endpoints',
			baseUrl: '/api/v1',
			routes: [
				{
					type: 'ONE',
					method: 'GET',
					name: 'get my user',
					description: 'Get my user',
					path: '/user/me',
					table: 'user',
					roles: ['user', 'admin'],
					request: [],
					joins: [],
					response: [
						{ name: 'id', selector: 'user.id' },
						{
							name: 'firstName',
							selector: 'user.firstName'
						},
						{ name: 'lastName', selector: 'user.lastName' },
						{ name: 'email', selector: 'user.email' }
					],
					assignments: [],
					where: [{ tableName: 'user', columnName: 'id', operator: '=', value: '#userId' }]
				},
				{
					type: 'CUSTOM_ONE',
					method: 'POST',
					name: 'Login',
					description: 'User login endpoint',
					path: '/user/login',
					roles: [],
					request: [
						{
							name: 'username',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{ name: 'password', required: true, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }
					],
					responseType: 'AuthResponse'
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'AuthResponse',
					request: [],
					method: 'POST',
					name: 'Refreshes a Token',
					description: 'Refresh an old, possibly expired token and returns a new token.',
					path: '/user/refresh-token',
					roles: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{ name: 'newEmail', required: true, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }
					],
					method: 'POST',
					name: 'Change Email Request',
					description: 'Request to change email. Sends a verification email with pin',
					path: '/user/change-email',
					roles: ['admin', 'user']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [{ name: 'pin', required: true, validator: [{ type: 'TYPE_CHECK', value: 'number' }] }],
					method: 'PATCH',
					name: 'Commit Email Change',
					description: 'Commits an email change with a pin',
					path: '/user/change-email/commit',
					roles: ['admin', 'user']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'FilteredUser',
					request: [
						{
							name: 'firstName',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'lastName',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{ name: 'email', required: true, validator: [{ type: 'TYPE_CHECK', value: 'string' }] },
						{
							name: 'role',
							required: true,
							validator: [{ type: 'ONE_OF', value: ['admin', 'user'] }]
						},
						{
							name: 'password',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{ name: 'phone', required: false, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }
					],
					method: 'POST',
					name: 'Create User',
					description: 'Creates a user',
					path: '/user',
					roles: ['admin']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'FilteredUser',
					request: [
						{
							name: 'id',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'number' }]
						},
						{
							name: 'firstName',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'lastName',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{ name: 'email', required: false, validator: [{ type: 'TYPE_CHECK', value: 'string' }] },
						{
							name: 'role',
							required: false,
							validator: [{ type: 'ONE_OF', value: ['admin', 'user'] }]
						},
						{ name: 'password', required: false, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }
					],
					method: 'PATCH',
					name: 'Update User',
					description: 'Update an existing user.',
					path: '/user',
					roles: ['admin']
				},
				{
					type: 'CUSTOM_ONE',
					method: 'POST',
					name: 'Logout',
					description: 'User logout endpoint',
					path: '/user/logout',
					roles: ['admin', 'user'],
					request: [],
					responseType: 'boolean'
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'username',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{ name: 'email', required: false, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }
					],
					method: 'POST',
					name: 'Check Available',
					description: 'Checks if a given username or email or both are available or not',
					path: '/user/check-available',
					roles: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{ name: 'password', required: true, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }
					],
					method: 'POST',
					name: 'Verify User Password',
					description: 'Verifies a user password to get past security checkpoints',
					path: '/user/verify-password',
					roles: ['admin', 'athlete', 'fan', 'recruiter']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [],
					method: 'POST',
					name: 'Resend Verify Email Pin',
					description: 'Resend the email that sends out the verify email pin',
					path: '/user/resend-verify-email',
					roles: ['admin', 'athlete', 'fan', 'recruiter']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [{ name: 'email', required: true, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }],
					method: 'POST',
					name: 'Forgot Password',
					description: 'Sends a forgot password request',
					path: '/user/forgot-password',
					roles: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'oldPassword',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{ name: 'newPassword', required: true, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }
					],
					method: 'POST',
					name: 'Change Password',
					description: 'Changes a password of the user',
					path: '/user/change-password',
					roles: ['admin', 'user']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'guid',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{ name: 'newPassword', required: true, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }
					],
					method: 'POST',
					name: 'Reset Password',
					description: 'Resets a password using a reset password guid',
					path: '/user/reset-password',
					roles: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [{ name: 'pin', required: true, validator: [{ type: 'TYPE_CHECK', value: 'number' }] }],
					method: 'POST',
					name: 'Verify Email',
					description: 'Verifies an email given a pin',
					path: '/user/verify-email',
					roles: ['admin', 'user']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{ name: 'password', required: true, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }
					],
					method: 'POST',
					name: 'Delete Me',
					description: "Deletes the user that calls this. This is a post so we don't show password on url.",
					path: '/user/delete/me',
					roles: ['admin', 'user']
				},
				{
					type: 'ONE',
					method: 'PATCH',
					name: 'Update my user',
					description: 'Update my user',
					path: '/user/me',
					table: 'user',
					roles: ['user', 'admin'],
					request: [
						{
							name: 'firstName',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'lastName',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{ name: 'email', required: false, validator: [{ type: 'TYPE_CHECK', value: 'string' }] },
						{
							name: 'phone',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{ name: 'password', required: false, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }
					],
					joins: [],
					response: [
						{ name: 'id', selector: 'user.id' },
						{
							name: 'firstName',
							selector: 'user.firstName'
						},
						{ name: 'lastName', selector: 'user.lastName' },
						{ name: 'email', selector: 'user.email' }
					],
					assignments: [],
					where: [{ tableName: 'user', columnName: 'id', operator: '=', value: '#userId' }]
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'WeatherResponse',
					request: [
						{
							name: 'token',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'latitude',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'number' }]
						},
						{ name: 'longitude', required: true, validator: [{ type: 'TYPE_CHECK', value: 'number' }] }
					],
					method: 'GET',
					name: 'Get Weather Data',
					description: 'Gets the weather data from openweather.org',
					path: '/weather',
					roles: ['user', 'admin']
				}
			]
		}
	],
	globalParams: ['companyId', 'userId'],
	roles: ['admin', 'user', 'anonymous'],
	customTypes:
		'export interface FilteredUser {    id: number;	companyId: number;	firstName: string;	lastName: string;	email: string;	role: string;	phone: string;	lastLoginOn: string;}export interface AuthResponse {    token: string;    tokenExp: string;    refreshToken: string;    refreshTokenExp: string;}export interface WeatherResponse {    currentTemperatureF: number;    sunrise: string;    sunset: string;    pressure: number;    humidityPercent: number;    windSpeedMph: number;    windDirection: string;    tomorrowHighF: number;    tomorrowLowF: number;}'
};

const patchUserRouteData: RouteData = {
	type: 'ONE',
	method: 'PATCH',
	name: 'Update my user',
	description: 'Update my user',
	path: '/user/me',
	table: 'user',
	roles: ['user', 'admin'],
	orderBy: {
		columnName: 'lastName',
		order: 'DESC',
		tableName: 'user'
	},
	request: [
		{
			name: 'firstName',
			required: false,
			validator: [{ type: 'TYPE_CHECK', value: 'string' }]
		},
		{
			name: 'lastName',
			required: false,
			validator: [{ type: 'TYPE_CHECK', value: 'string' }]
		},
		{
			name: 'email',
			required: false,
			validator: [{ type: 'TYPE_CHECK', value: 'string' }]
		},
		{
			name: 'phone',
			required: false,
			validator: [{ type: 'TYPE_CHECK', value: 'string' }]
		},
		{
			name: 'password',
			required: false,
			validator: [{ type: 'TYPE_CHECK', value: 'string' }]
		}
	],
	joins: [],
	response: [
		{ name: 'id', selector: 'user.id' },
		{ name: 'firstName', selector: 'user.firstName' },
		{ name: 'lastName', selector: 'user.lastName' },
		{ name: 'email', selector: 'user.email' }
	],
	assignments: [],
	where: [{ tableName: 'user', columnName: 'id', operator: '=', value: '#userId' }]
};
const basicRequest: RsRequest = {
	requesterDetails: {
		role: 'admin',
		host: 'google.com',
		ipAddress: '1.1.1.1',
		userId: 1
	},
	data: { id: 1 }
} as unknown as RsRequest;

const setupPgReturnTypes = () => {
	// OID for timestamptz in Postgres
	const TIMESTAMPTZ_OID = 1184;
	// Set a custom parser for timestamptz to return an ISO string
	types.setTypeParser(TIMESTAMPTZ_OID, (val) => {
		return val === null ? null : new Date(val).toISOString();
	});
	const BIGINT_OID = 20;
	// Set a custom parser for BIGINT to return a JavaScript Number
	types.setTypeParser(BIGINT_OID, (val) => {
		return val === null ? null : Number(val);
	});
};

const getTestConnectionPool = () => {
	const psqlPool = new PsqlPool({
		host: 'localhost',
		port: 5488,
		user: 'postgres',
		database: 'postgres',
		password: 'postgres',
		max: 20,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 2000
	});
	setupPgReturnTypes();
	return psqlPool;
};

describe('PsqlEngine executeGetRequest', () => {
	const psqlEngine = new PsqlEngine(getTestConnectionPool());
	it('should executeGetRequest', async () => {
		const response = (await psqlEngine['executeGetRequest'](
			basicRequest,
			patchUserRouteData,
			sampleSchema
		)) as DynamicObject;
		expect(response?.id).to.equal(1);
		expect(response?.firstName).to.equal('Tanner');
		expect(response?.lastName).to.equal('Burton');
		expect(response?.email).to.equal('tanner@plvr.com');
	});
});
describe('PsqlEngine executeUpdateRequest', () => {
	const psqlEngine = new PsqlEngine(getTestConnectionPool());
	it('should executeUpdateRequest', async () => {
		const updateRequest: RsRequest = {
			requesterDetails: {
				role: 'admin',
				host: 'google.com',
				ipAddress: '1.1.1.1',
				userId: 1
			},
			body: { id: 1, firstName: 'Billy' }
		} as unknown as RsRequest;
		const response = await psqlEngine['executeUpdateRequest'](updateRequest, patchUserRouteData, sampleSchema);
		expect(response?.id).to.equal(1);
		expect(response?.firstName).to.equal('Billy');
		expect(response?.lastName).to.equal('Burton');
		expect(response?.email).to.equal('tanner@plvr.com');
		const resetUserRequest = { ...updateRequest, body: { id: 1, firstName: 'Tanner' } } as unknown as RsRequest;
		await psqlEngine['executeUpdateRequest'](resetUserRequest, patchUserRouteData, sampleSchema);
	});
});
describe('PsqlEngine executeCreateRequest', () => {
	const psqlEngine = new PsqlEngine(getTestConnectionPool());
	it('should executeCreateRequest', async () => {
		const email = `${Date.now()}@plvr.com`;
		const createRequest: RsRequest = {
			requesterDetails: {
				role: 'admin',
				host: 'google.com',
				ipAddress: '1.1.1.1',
				userId: 1
			},
			data: { firstName: 'Billy', lastName: 'Bob', companyId: 1, password: 'asdfa', email, role: 'user' }
		} as unknown as RsRequest;
		const response = await psqlEngine['executeCreateRequest'](createRequest, patchUserRouteData, sampleSchema);
		expect(response?.firstName).to.equal('Billy');
		expect(response?.lastName).to.equal('Bob');
		expect(response?.email).to.equal(email);
		console.log(response.id);
		// const deleteRequest: RsRequest = {
		// 	requesterDetails: {
		// 		role: 'admin',
		// 		host: 'google.com',
		// 		ipAddress: '1.1.1.1',
		// 		userId:1,
		// 	},
		// 	query: {userId:response.id}
		// } as unknown as RsRequest;
		// const deleteResponse = await psqlEngine['executeDeleteRequest'](deleteRequest, patchUserRouteData, sampleSchema);
		// console.log(deleteResponse.id);
	});
	it('should fail executeCreateRequest for duplicates', async () => {
		const email = `${Date.now()}@plvr.com`;
		const createRequest: RsRequest = {
			requesterDetails: {
				role: 'admin',
				host: 'google.com',
				ipAddress: '1.1.1.1',
				userId: 1
			},
			data: { firstName: 'Billy', lastName: 'Bob', companyId: 1, password: 'asdfa', email, role: 'user' }
		} as unknown as RsRequest;
		await psqlEngine['executeCreateRequest'](
			{ ...createRequest } as unknown as RsRequest,
			patchUserRouteData,
			sampleSchema
		);
		try {
			await psqlEngine['executeCreateRequest'](
				{ ...createRequest } as unknown as RsRequest,
				patchUserRouteData,
				sampleSchema
			);
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		} catch (e: any) {
			expect(e.err).to.equal('DUPLICATE');
		}
	});
});
describe('PsqlEngine generateGroupBy', () => {
	const psqlEngine = new PsqlEngine({} as PsqlPool);
	it('should format the GROUP BY', () => {
		const routeData = JSON.parse(JSON.stringify(patchUserRouteData));
		routeData.groupBy = {
			tableName: 'user',
			columnName: 'firstName'
		};
		routeData.type = 'PAGED';
		const response = psqlEngine['generateGroupBy'](routeData);
		expect(trimRedundantWhitespace(response)).to.equal(`GROUP BY "user"."firstName"`);
	});
	it('should format the GROUP BY and prevent sqlInjection', () => {
		const routeData = JSON.parse(JSON.stringify(patchUserRouteData));
		routeData.groupBy = {
			tableName: 'user',
			columnName: '; DROP some DB;'
		};
		routeData.type = 'PAGED';
		const response = psqlEngine['generateGroupBy'](routeData);
		expect(trimRedundantWhitespace(response)).to.equal(`GROUP BY "user"."; DROP some DB;"`);
	});
});

describe('PsqlEngine generateOrderBy', () => {
	const psqlEngine = new PsqlEngine({} as PsqlPool);
	it('should format the ORDER BY', () => {
		const orderBy = psqlEngine['generateOrderBy'](basicRequest, patchUserRouteData);
		expect(trimRedundantWhitespace(orderBy)).to.equal(`ORDER BY "user"."lastName" DESC`);
	});
	it('should format the ORDER BY when it is passed by the client in (req.data.sortBy)', () => {
		const routeData = JSON.parse(JSON.stringify(patchUserRouteData));
		const req = JSON.parse(JSON.stringify(basicRequest));
		routeData.type = 'PAGED';
		req.data.sortBy = '"user"."firstName"';
		const orderBy = psqlEngine['generateOrderBy'](req, routeData);
		expect(trimRedundantWhitespace(orderBy)).to.equal(`ORDER BY "user"."firstName" ASC`);
	});
	it('should prevent sortOrder sql injection', () => {
		const routeData = JSON.parse(JSON.stringify(patchUserRouteData));
		const req = JSON.parse(JSON.stringify(basicRequest));
		routeData.type = 'PAGED';
		req.data.sortBy = '"user"."firstName"';
		req.data.sortOrder = '; DROP SOME DB;';
		const orderBy = psqlEngine['generateOrderBy'](req, routeData);
		expect(trimRedundantWhitespace(orderBy)).to.equal(`ORDER BY "user"."firstName" ASC`);
	});
	it('should prevent sortBy sql injection', () => {
		const routeData = JSON.parse(JSON.stringify(patchUserRouteData));
		const req = JSON.parse(JSON.stringify(basicRequest));
		routeData.type = 'PAGED';
		req.data.sortBy = '; DROP SOME DB;';
		req.data.sortOrder = 'DESC';
		const orderBy = psqlEngine['generateOrderBy'](req, routeData);
		expect(trimRedundantWhitespace(orderBy)).to.equal(`ORDER BY "; DROP SOME DB;" DESC`);
	});
});

describe('PsqlEngine generateWhereClause', () => {
	const psqlEngine = new PsqlEngine({} as PsqlPool);

	xit('should format the where clause for STARTS WITH', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'firstName',
				operator: 'STARTS WITH', // I don't think this was ever working. the % is being removed
				value: 'T'
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."firstName" ILIKE 'T%'`);
	});
	xit('should format the where clause for ENDS WITH', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'firstName',
				operator: 'ENDS WITH', // I don't think this was ever working. the % is being removed
				value: 'T'
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."firstName" ILIKE '%T'`);
	});
	xit('should format the where clause for LIKE', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'firstName',
				operator: 'LIKE', // I don't think this was ever working. the % is being removed
				value: 'T'
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."firstName" ILIKE '%T%'`);
	});
	it('should format the where clause for =', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'firstName',
				operator: '=',
				value: 'Tanner'
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."firstName" = 'Tanner'`);
	});
	it('should format the where clause for >', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'id',
				operator: '>',
				value: 0
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" > 0`);
	});
	it('should format the where clause for <', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'id',
				operator: '<',
				value: 0
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" < 0`);
	});
	it('should format the where clause for >', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'id',
				operator: '>',
				value: 0
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" > 0`);
	});
	it('should format the where clause for >=', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'id',
				operator: '>=',
				value: 0
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" >= 0`);
	});
	it('should format the where clause for <=', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'id',
				operator: '<=',
				value: 0
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" <= 0`);
	});
	it('should format the where clause for !=', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'id',
				operator: '!=',
				value: 0
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" != 0`);
	});
	xit('should format the where clause for IN numbers', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'id',
				operator: 'IN',
				value: [1, 2, 3] as unknown as string // type needs to be updated to support arrays but this is technically working
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" IN (1,2,3)`);
	});
	it('should format the where clause for IN strings', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'id',
				operator: 'IN',
				value: ['a', 'b', 'c'] as unknown as string // type needs to be updated to support arrays but this is technically working
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" IN ('a','b','c')`);
	});
	it('should format the where clause for NOT IN strings', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'id',
				operator: 'NOT IN',
				value: ['a', 'b', 'c'] as unknown as string // type needs to be updated to support arrays but this is technically working
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" NOT IN ('a','b','c')`);
	});
	it('should format the where clause and prevent sql injection', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'id',
				operator: '=',
				value: "';DROP DB;"
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" = ''';DROP DB;'`);
	});
	it('should test optional conjunction (AND OR)', () => {
		const whereData: WhereData[] = [
			{
				tableName: 'user',
				columnName: 'id',
				operator: '!=',
				value: 0
			},
			{
				tableName: 'user',
				columnName: 'id',
				operator: '=',
				value: 0,
				conjunction: 'OR'
			}
		];
		// use array notation ['generateWhereClause'] to access private methods for unit testing
		const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
		expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" != 0 OR "user"."id" = 0`);
	});
});

const trimRedundantWhitespace = (str: string) => str.replace(/\s+/g, ' ').trim();
