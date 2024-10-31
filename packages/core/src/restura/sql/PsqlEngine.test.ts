import { expect } from 'chai';
import { types } from 'pg';
import {
	CustomRouteData,
	JoinData,
	ResponseData,
	ResturaSchema,
	RouteData,
	StandardRouteData,
	WhereData
} from '../restura.schema.js';
import { DynamicObject, RequesterDetails, RsRequest } from '../types/customExpress.types.js';
import { PsqlEngine } from './PsqlEngine.js';
import { PsqlPool } from './PsqlPool.js';
import eventManager from '../eventManager.js';
import cloneDeep from 'lodash.clonedeep';
import { PsqlTransaction } from './PsqlTransaction.js';

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
					isPrimary: true,
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
			name: 'order',
			columns: [
				{
					name: 'id',
					hasAutoIncrement: true,
					isNullable: false,
					roles: ['admin', 'user'],
					isPrimary: true,
					type: 'BIGINT'
				},
				{
					name: 'amountCents',
					isNullable: false,
					roles: ['admin', 'user'],
					type: 'BIGINT'
				},
				{
					roles: ['admin', 'user'],
					name: 'userId',
					type: 'BIGINT',
					isNullable: false
				}
			],
			checkConstraints: [],
			foreignKeys: [],
			indexes: [{ name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimaryKey: true, order: 'ASC' }],
			roles: []
		},
		{
			name: 'item',
			columns: [
				{
					name: 'id',
					hasAutoIncrement: true,
					isNullable: false,
					roles: ['admin', 'user'],
					isPrimary: true,
					type: 'BIGINT'
				},
				{
					name: 'orderId',
					isNullable: false,
					roles: ['admin', 'user'],
					type: 'BIGINT'
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
				{
					roles: [],
					name: 'role',
					type: 'ENUM',
					isNullable: false,
					value: "'admin','user'",
					default: "'user'"
				},
				{
					roles: [],
					name: 'permissionLogin',
					type: 'BOOLEAN',
					isNullable: false,
					default: 'true'
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
					default: "'view_only'"
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
					default: "'verify_email'"
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
					type: 'PAGED',
					method: 'GET',
					name: 'get all users',
					description: 'Get all users',
					path: '/user/all',
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
					where: []
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
						{ name: 'email', selector: 'user.email' },
						{ name: 'permissionLogin', selector: 'user.permissionLogin' }
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
		},
		{
			name: 'permissionLogin',
			required: false,
			validator: [{ type: 'TYPE_CHECK', value: 'boolean' }]
		}
	],
	joins: [],
	response: [
		{ name: 'id', selector: 'user.id' },
		{ name: 'firstName', selector: 'user.firstName' },
		{ name: 'lastName', selector: 'user.lastName' },
		{ name: 'email', selector: 'user.email' },
		{ name: 'permissionLogin', selector: 'user.permissionLogin' }
	],
	assignments: [],
	where: [{ tableName: 'user', columnName: 'id', operator: '=', value: '#userId' }]
};

const createOrderRouteData: RouteData = {
	type: 'ONE',
	method: 'POST',
	name: 'Create order',
	description: 'Create order',
	path: '/order',
	table: 'order',
	roles: ['user', 'admin'],
	orderBy: {
		columnName: 'id',
		order: 'DESC',
		tableName: 'order'
	},
	request: [
		{
			name: 'userId',
			required: true,
			validator: [{ type: 'TYPE_CHECK', value: 'number' }]
		},
		{
			name: 'amountCents',
			required: true,
			validator: [{ type: 'TYPE_CHECK', value: 'number' }]
		}
	],
	joins: [],
	response: [
		{ name: 'id', selector: 'order.id' },
		{ name: 'userId', selector: 'order.userId' },
		{ name: 'amountCents', selector: 'order.amountCents' }
	],
	assignments: [],
	// where: [{ tableName: 'order', columnName: 'id', operator: '=', value: '#userId' }]
	where: []
};
const deleteOrderRouteData: RouteData = {
	type: 'PAGED',
	method: 'DELETE',
	name: 'Delete order',
	description: 'Delete order',
	path: '/order',
	table: 'order',
	roles: ['user', 'admin'],
	orderBy: {
		columnName: 'id',
		order: 'DESC',
		tableName: 'order'
	},
	request: [
		{
			name: 'userId',
			required: true,
			validator: [{ type: 'TYPE_CHECK', value: 'number' }]
		},
		{
			name: 'amountCents',
			required: true,
			validator: [{ type: 'TYPE_CHECK', value: 'number' }]
		}
	],
	joins: [],
	response: [
		{ name: 'id', selector: 'order.id' },
		{ name: 'userId', selector: 'order.userId' },
		{ name: 'amountCents', selector: 'order.amountCents' }
	],
	assignments: [],
	// where: [{ tableName: 'order', columnName: 'id', operator: '=', value: '#userId' }]
	where: []
};
const getAllRouteData: RouteData = {
	type: 'PAGED',
	method: 'GET',
	name: 'get all users',
	description: 'Get all users',
	path: '/user/all',
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
	where: []
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

const clientConfig = {
	host: 'localhost',
	port: 5488,
	user: 'postgres',
	database: 'postgres',
	password: 'postgres',
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 10000
};

const psqlPool = new PsqlPool(clientConfig);
setupPgReturnTypes();

const trimRedundantWhitespace = (str: string) => str.replace(/\s+/g, ' ').trim();
let eventPsqlEngine: PsqlEngine;
let enginePool: PsqlPool;
const getEventPsqlEngine = () => {
	if (eventPsqlEngine) return eventPsqlEngine;
	enginePool = new PsqlPool(clientConfig);
	eventPsqlEngine = new PsqlEngine(enginePool, true);
	return eventPsqlEngine;
};

describe('PsqlEngine', function () {
	after(async function () {
		if (psqlPool) psqlPool.pool.end();
		await getEventPsqlEngine().close();
		if (enginePool) enginePool.pool.end();
	});

	describe('db transaction', () => {
		it('db transaction', async () => {
			const psqlTransaction = new PsqlTransaction(clientConfig);
			const user = await psqlTransaction.queryOne(
				`SELECT * FROM "user" WHERE id = 1;`,
				[],
				{} as RequesterDetails
			);
			expect(user.id).to.equal(1);
			await psqlTransaction.close();
		});
	});
	describe('db diff', () => {
		it('should create the database DDL from ResturaSchema', async () => {
			const psqlEngine = new PsqlEngine(psqlPool);
			// await psqlEngine.diffDatabaseToSchema(sampleSchema);
			const ddl = psqlEngine.generateDatabaseSchemaFromSchema(sampleSchema);
			const ddlNoSpace = trimRedundantWhitespace(ddl);
			expect(ddlNoSpace).to.equal(
				trimRedundantWhitespace(`CREATE TABLE "company"
	   ( 	"id" BIGSERIAL PRIMARY KEY  NOT NULL, 
	"createdOn" TIMESTAMPTZ NOT NULL DEFAULT now(), 
	"modifiedOn" TIMESTAMPTZ NOT NULL DEFAULT now(), 
	"name" VARCHAR(255) NULL
);

CREATE TABLE "order"
	   ( 	"id" BIGSERIAL PRIMARY KEY  NOT NULL, 
	"amountCents" BIGINT NOT NULL, 
	"userId" BIGINT NOT NULL
);

CREATE TABLE "item"
( "id" BIGSERIAL PRIMARY KEY NOT NULL,
  "orderId" BIGINT NOT NULL 
);

CREATE TABLE "user"
(  "id" BIGSERIAL NOT NULL, 
	"createdOn" TIMESTAMPTZ NOT NULL DEFAULT now(), 
	"modifiedOn" TIMESTAMPTZ NOT NULL DEFAULT now(), 
	"firstName" VARCHAR(30) NOT NULL, 
	"lastName" VARCHAR(30) NOT NULL, 
	"companyId" BIGINT NOT NULL, 
	"password" VARCHAR(70) NOT NULL, 
	"email" VARCHAR(100) NOT NULL, 
	"role" TEXT NOT NULL DEFAULT 'user' CHECK ("role" IN ('admin','user')), 
	"permissionLogin" BOOLEAN NOT NULL DEFAULT true, 
	"lastLoginOn" TIMESTAMPTZ NULL, 
	"phone" VARCHAR(30) NULL, 
	"loginDisabledOn" TIMESTAMPTZ NULL, 
	"passwordResetGuid" VARCHAR(100) NULL, 
	"verifyEmailPin" INT NULL, 
	"verifyEmailPinExpiresOn" TIMESTAMPTZ NULL, 
	"accountStatus" TEXT NOT NULL DEFAULT 'view_only' CHECK ("accountStatus" IN ('banned','view_only','active')), 
	"passwordResetExpiresOn" TIMESTAMPTZ NULL, 
	"onboardingStatus" TEXT NOT NULL DEFAULT 'verify_email' CHECK ("onboardingStatus" IN ('verify_email','complete')), 
	"pendingEmail" VARCHAR(100) NULL
);

ALTER TABLE "user" 	 ADD CONSTRAINT "user_companyId_company_id_fk"
        FOREIGN KEY ("companyId") REFERENCES "company" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

	CREATE  INDEX "user_companyId_index" ON "user" ("companyId" ASC);
	CREATE UNIQUE INDEX "user_email_unique_index" ON "user" ("email" ASC);
	CREATE  INDEX "user_passwordResetGuid_index" ON "user" ("passwordResetGuid" ASC);


CREATE OR REPLACE FUNCTION notify_company_insert()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('insert', JSON_BUILD_OBJECT('table', 'company', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "company_insert"
    AFTER INSERT ON "company"
    FOR EACH ROW
EXECUTE FUNCTION notify_company_insert();
 
CREATE OR REPLACE FUNCTION notify_company_update()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('update', JSON_BUILD_OBJECT('table', 'company', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER company_update
    AFTER UPDATE ON "company"
    FOR EACH ROW
EXECUTE FUNCTION notify_company_update();

CREATE OR REPLACE FUNCTION notify_company_delete()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('delete', JSON_BUILD_OBJECT('table', 'company', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "company_delete"
    AFTER DELETE ON "company"
    FOR EACH ROW
EXECUTE FUNCTION notify_company_delete();

CREATE OR REPLACE FUNCTION notify_order_insert()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('insert', JSON_BUILD_OBJECT('table', 'order', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "order_insert"
    AFTER INSERT ON "order"
    FOR EACH ROW
EXECUTE FUNCTION notify_order_insert();
 
CREATE OR REPLACE FUNCTION notify_order_update()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('update', JSON_BUILD_OBJECT('table', 'order', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER order_update
    AFTER UPDATE ON "order"
    FOR EACH ROW
EXECUTE FUNCTION notify_order_update();

CREATE OR REPLACE FUNCTION notify_order_delete()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('delete', JSON_BUILD_OBJECT('table', 'order', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "order_delete"
    AFTER DELETE ON "order"
    FOR EACH ROW
EXECUTE FUNCTION notify_order_delete();


CREATE OR REPLACE FUNCTION notify_item_insert()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('insert', JSON_BUILD_OBJECT('table', 'item', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "item_insert"
    AFTER INSERT ON "item"
    FOR EACH ROW
EXECUTE FUNCTION notify_item_insert();

 
CREATE OR REPLACE FUNCTION notify_item_update()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('update', JSON_BUILD_OBJECT('table', 'item', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER item_update
    AFTER UPDATE ON "item"
    FOR EACH ROW
EXECUTE FUNCTION notify_item_update();


CREATE OR REPLACE FUNCTION notify_item_delete()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('delete', JSON_BUILD_OBJECT('table', 'item', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "item_delete"
    AFTER DELETE ON "item"
    FOR EACH ROW
EXECUTE FUNCTION notify_item_delete();


CREATE OR REPLACE FUNCTION notify_user_insert()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('insert', JSON_BUILD_OBJECT('table', 'user', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "user_insert"
    AFTER INSERT ON "user"
    FOR EACH ROW
EXECUTE FUNCTION notify_user_insert();
 
CREATE OR REPLACE FUNCTION notify_user_update()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('update', JSON_BUILD_OBJECT('table', 'user', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER user_update
    AFTER UPDATE ON "user"
    FOR EACH ROW
EXECUTE FUNCTION notify_user_update();

CREATE OR REPLACE FUNCTION notify_user_delete()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('delete', JSON_BUILD_OBJECT('table', 'user', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "user_delete"
    AFTER DELETE ON "user"
    FOR EACH ROW
EXECUTE FUNCTION notify_user_delete();			
`)
			);
		});
	});
	describe('PsqlEngine createNestedSelect', () => {
		xit('should call createNestedSelect', () => {
			// const psqlEngine = new PsqlEngine({} as PsqlPool);
			// const responseData:ResponseData = {
			// 	name: 'name',
			// 	selector: 'company',
			// 	subquery: {
			// 		  table: 'company'
			// 	}
			// }
			// psqlEngine['createNestedSelect'](basicRequest, sampleSchema, item, patchUserRouteData, 'admin', []);
		});
	});

	describe('PsqlEngine executeGetRequest', () => {
		const psqlEngine = new PsqlEngine(psqlPool);
		it('should executeGetRequest that will return many', async () => {
			const allRequest: RsRequest = {
				requesterDetails: {
					role: 'admin',
					host: 'google.com',
					ipAddress: '1.1.1.1',
					userId: 1
				},
				data: { page: 2 }
			} as unknown as RsRequest;
			const response = (await psqlEngine['executeGetRequest'](
				allRequest,
				getAllRouteData,
				sampleSchema
			)) as DynamicObject;
			expect(response?.data.length).to.greaterThan(1);
			expect(response?.total).to.greaterThan(1);
		});
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
	describe('PsqlEngine events', () => {
		it('should receive notification of user row being inserted', function (done) {
			const email = `${Date.now()}@plvr.com`;
			let doneCalled = false;
			eventManager.addRowInsertHandler(
				async function (data) {
					if (doneCalled) return;
					try {
						expect(data.queryMetadata.role).to.equal('admin');
						expect(data.queryMetadata.host).to.equal('google.com');
						expect(data.queryMetadata.ipAddress).to.equal('1.1.1.1');
						expect(data.queryMetadata.userId).to.equal(1);
						expect(data.insertObject.email).to.equal(email);
						expect(data.tableName).to.equal('user');
					} catch (e) {
						console.log(e);
						doneCalled = true;
						return done(e);
					}
					doneCalled = true;
					done();
				},
				{ tableName: 'user' }
			);

			const getData = () => {
				return { firstName: 'Billy', lastName: 'Bob', companyId: 1, password: 'asdfa', email, role: 'user' };
			};
			const requesterDetails: RequesterDetails = {
				role: 'admin',
				host: 'google.com',
				ipAddress: '1.1.1.1',
				userId: 1
			};
			const createRequest: RsRequest = {
				requesterDetails,
				data: getData()
			} as unknown as RsRequest;
			getEventPsqlEngine().setupTriggerListeners.then(() => {
				getEventPsqlEngine()['executeCreateRequest'](
					cloneDeep(createRequest),
					patchUserRouteData,
					sampleSchema
				);
			});
		});
		it('should receive notification of user row being updated', function (done) {
			(async () => {
				let calledHandler = false;
				await eventManager.addColumnChangeHandler(
					async function (data) {
						if (calledHandler) return;
						calledHandler = true;
						try {
							expect(data.queryMetadata.role).to.equal('admin');
							expect(data.queryMetadata.host).to.equal('google.com');
							expect(data.queryMetadata.ipAddress).to.equal('1.1.1.1');
							expect(data.queryMetadata.userId).to.equal(1);
							expect(data.tableName).to.equal('user');
							expect(data.newData.firstName).to.equal('Billy');
						} catch (e) {
							console.log(e);
							return done(e);
						}
						done();
					},
					{ tableName: 'user', columns: ['firstName'] }
				);

				const updateRequest: RsRequest = {
					requesterDetails: {
						role: 'admin',
						host: 'google.com',
						ipAddress: '1.1.1.1',
						userId: 1
					},
					body: { id: 1, firstName: 'Billy', permissionLogin: false }
				} as unknown as RsRequest;
				await getEventPsqlEngine().setupTriggerListeners;
				const response = await getEventPsqlEngine()['executeUpdateRequest'](
					updateRequest,
					patchUserRouteData,
					sampleSchema
				);
				expect(response?.id).to.equal(1);
				expect(response?.firstName).to.equal('Billy');
				expect(response?.lastName).to.equal('Burton');
				expect(response?.permissionLogin).to.equal(false);
				expect(response?.email).to.equal('tanner@plvr.com');
				const resetUserRequest = {
					...updateRequest,
					body: { id: 1, firstName: 'Tanner', permissionLogin: true }
				} as unknown as RsRequest;
				await psqlEngine['executeUpdateRequest'](resetUserRequest, patchUserRouteData, sampleSchema);
			})();
		});
	});
	describe('PsqlEngine executeUpdateRequest', () => {
		const psqlEngine = new PsqlEngine(psqlPool);
		it('should executeUpdateRequest', async () => {
			const updateRequest: RsRequest = {
				requesterDetails: {
					role: 'admin',
					host: 'google.com',
					ipAddress: '1.1.1.1',
					userId: 1
				},
				body: { id: 1, firstName: 'Billy', permissionLogin: false }
			} as unknown as RsRequest;
			const response = await psqlEngine['executeUpdateRequest'](updateRequest, patchUserRouteData, sampleSchema);
			expect(response?.id).to.equal(1);
			expect(response?.firstName).to.equal('Billy');
			expect(response?.lastName).to.equal('Burton');
			expect(response?.permissionLogin).to.equal(false);
			expect(response?.email).to.equal('tanner@plvr.com');
			const resetUserRequest = {
				...updateRequest,
				body: { id: 1, firstName: 'Tanner', permissionLogin: true }
			} as unknown as RsRequest;
			await psqlEngine['executeUpdateRequest'](resetUserRequest, patchUserRouteData, sampleSchema);
		});
	});
	describe('PsqlEngine executeCreateRequest', () => {
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
			const response = await getEventPsqlEngine()['executeCreateRequest'](
				createRequest,
				patchUserRouteData,
				sampleSchema
			);
			expect(response?.firstName).to.equal('Billy');
			expect(response?.lastName).to.equal('Bob');
			expect(response?.email).to.equal(email);
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

		it('should executeDelete and listen for events', function (done) {
			(async () => {
				let doneCalled = false;
				eventManager.addRowDeleteHandler(
					async function (data) {
						if (doneCalled) return;
						try {
							expect(data.queryMetadata.role).to.equal('admin');
							expect(data.queryMetadata.host).to.equal('google.com');
							expect(data.queryMetadata.ipAddress).to.equal('1.1.1.1');
							expect(data.queryMetadata.userId).to.equal(1);
							expect(data.deletedRow.amountCents).to.equal(100);
							expect(data.deletedRow.userId).to.equal(1);
							expect(data.tableName).to.equal('order');
						} catch (e) {
							console.log(e);
							doneCalled = true;
							return done(e);
						}
						doneCalled = true;
						done();
					},
					{ tableName: 'order' }
				);
				const createRequest: RsRequest = {
					requesterDetails: {
						role: 'admin',
						host: 'google.com',
						ipAddress: '1.1.1.1',
						userId: 1
					},
					data: { userId: 1, amountCents: 100 }
				} as unknown as RsRequest;
				await getEventPsqlEngine().setupTriggerListeners;
				const response = await getEventPsqlEngine()['executeCreateRequest'](
					createRequest,
					createOrderRouteData,
					sampleSchema
				);
				expect(response?.userId).to.equal(1);
				expect(response?.amountCents).to.equal(100);
				const deleteRequest: RsRequest = {
					requesterDetails: {
						role: 'admin',
						host: 'google.com',
						ipAddress: '1.1.1.1',
						userId: 1
					},
					query: {},
					data: { filter: `(column:id,value:${response.id})` }
				} as unknown as RsRequest;
				await getEventPsqlEngine()['executeDeleteRequest'](deleteRequest, deleteOrderRouteData, sampleSchema);
			})();
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
			await getEventPsqlEngine()['executeCreateRequest'](
				{ ...createRequest } as unknown as RsRequest,
				patchUserRouteData,
				sampleSchema
			);
			try {
				await getEventPsqlEngine()['executeCreateRequest'](
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

	describe('PsqlEngine createNestedSelect', () => {
		it('should call createNestedSelect twice to test recursion', () => {
			const psqlEngine = new PsqlEngine({} as PsqlPool);
			const responseData: ResponseData = {
				name: 'firstName',
				selector: 'user.firstName',
				subquery: {
					table: 'order',
					properties: [
						{
							name: 'id',
							selector: 'order.id'
						},
						{
							name: 'amountCents',
							selector: 'order.amountCents'
						},
						{
							name: 'items',
							subquery: {
								table: 'item',
								properties: [
									{
										name: 'id',
										selector: 'item.id'
									},
									{
										name: 'orderId',
										selector: 'item.orderId'
									}
								],
								joins: [],
								where: []
							}
						}
					],
					joins: [],
					where: []
				}
			};
			const response = psqlEngine['createNestedSelect'](
				basicRequest,
				sampleSchema,
				responseData,
				patchUserRouteData,
				'admin',
				[]
			);
			const expected = `COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT( 'id', "order"."id", 'amountCents', "order"."amountCents", 'items',
                                                 COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT( 'id', "item"."id", 'orderId', "item"."orderId" ))
                                                          FROM "item" ), '[]') ))
                FROM "order" ), '[]')`;
			expect(trimRedundantWhitespace(response)).to.equal(trimRedundantWhitespace(expected));
		});
		it('should call createNestedSelect twice to test recursion with a where clause', () => {
			const psqlEngine = new PsqlEngine({} as PsqlPool);
			const responseData: ResponseData = {
				name: 'firstName',
				selector: 'user.firstName',
				subquery: {
					table: 'order',
					properties: [
						{
							name: 'id',
							selector: 'order.id'
						},
						{
							name: 'amountCents',
							selector: 'order.amountCents'
						},
						{
							name: 'items',
							subquery: {
								table: 'item',
								properties: [
									{
										name: 'id',
										selector: 'item.id'
									},
									{
										name: 'orderId',
										selector: 'item.orderId'
									}
								],
								joins: [],
								where: [
									{
										tableName: 'item',
										columnName: 'orderId',
										operator: '=',
										value: 1
									}
								]
							}
						}
					],
					joins: [],
					where: []
				}
			};
			const response = psqlEngine['createNestedSelect'](
				basicRequest,
				sampleSchema,
				responseData,
				patchUserRouteData,
				'admin',
				[]
			);
			const expected = `COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT( 'id', "order"."id", 'amountCents', "order"."amountCents", 'items',
                                                 COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT( 'id', "item"."id", 'orderId', "item"."orderId" ))
                                                          FROM "item" WHERE "item"."orderId" = 1 ), '[]') ))
                FROM "order" ), '[]')`;
			expect(trimRedundantWhitespace(response)).to.equal(trimRedundantWhitespace(expected));
		});
		it('should call createNestedSelect', () => {
			const psqlEngine = new PsqlEngine({} as PsqlPool);
			const responseData: ResponseData = {
				name: 'firstName',
				selector: 'user.firstName',
				subquery: {
					table: 'order',
					properties: [
						{
							name: 'id',
							selector: 'order.id'
						},
						{
							name: 'amountCents',
							selector: 'order.amountCents'
						}
					],
					joins: [],
					where: []
				}
			};
			const response = psqlEngine['createNestedSelect'](
				basicRequest,
				sampleSchema,
				responseData,
				patchUserRouteData,
				'admin',
				[]
			);
			const expected = `COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT(
                                           'id', "order"."id", 'amountCents', "order"."amountCents"
                                       )) FROM "order" ), '[]')`;
			expect(trimRedundantWhitespace(response)).to.equal(trimRedundantWhitespace(expected));
		});
		it('should call createNestedSelect with a where clause', () => {
			const psqlEngine = new PsqlEngine({} as PsqlPool);
			const responseData: ResponseData = {
				name: 'firstName',
				selector: 'user.firstName',
				subquery: {
					table: 'order',
					properties: [
						{
							name: 'id',
							selector: 'order.id'
						},
						{
							name: 'amountCents',
							selector: 'order.amountCents'
						}
					],
					joins: [],
					where: [
						{
							tableName: 'order',
							columnName: 'userId',
							operator: '=',
							value: '999'
						}
					]
				}
			};
			const response = psqlEngine['createNestedSelect'](
				basicRequest,
				sampleSchema,
				responseData,
				patchUserRouteData,
				'admin',
				[]
			);
			const expected = `COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT(
                                           'id', "order"."id", 'amountCents', "order"."amountCents"
                                       )) FROM "order"  WHERE "order"."userId" = 999 ), '[]')`;
			expect(trimRedundantWhitespace(response)).to.equal(trimRedundantWhitespace(expected));
		});
		it('should call createNestedSelect with a where clause and column name', () => {
			const psqlEngine = new PsqlEngine({} as PsqlPool);
			const responseData: ResponseData = {
				name: 'firstName',
				selector: 'user.firstName',
				subquery: {
					table: 'order',
					properties: [
						{
							name: 'id',
							selector: 'order.id'
						},
						{
							name: 'amountCents',
							selector: 'order.amountCents'
						}
					],
					joins: [],
					where: [
						{
							tableName: 'order',
							columnName: 'userId',
							operator: '=',
							value: '"company"."id"'
						}
					]
				}
			};
			const response = psqlEngine['createNestedSelect'](
				basicRequest,
				sampleSchema,
				responseData,
				patchUserRouteData,
				'admin',
				[]
			);
			const expected = `COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT(
                                           'id', "order"."id", 'amountCents', "order"."amountCents"
                                       )) FROM "order"  WHERE "order"."userId" = "company"."id" ), '[]')`;
			expect(trimRedundantWhitespace(response)).to.equal(trimRedundantWhitespace(expected));
		});
	});

	describe('PsqlEngine generateJoinStatements', () => {
		const psqlEngine = new PsqlEngine({} as PsqlPool);
		it('should generateJoinStatements', () => {
			const joins: JoinData[] = [
				{
					table: 'company',
					localColumnName: 'companyId',
					foreignColumnName: 'id',
					type: 'LEFT'
				},
				{
					table: 'order',
					localColumnName: 'id',
					foreignColumnName: 'userId',
					type: 'INNER'
				}
			];
			const baseTable: string = 'user';
			const routeData: StandardRouteData | CustomRouteData = patchUserRouteData;
			const schema: ResturaSchema = sampleSchema;
			const userRole: string | undefined = 'admin';
			const response = psqlEngine['generateJoinStatements'](
				basicRequest,
				joins,
				baseTable,
				routeData,
				schema,
				userRole,
				[]
			);
			expect(trimRedundantWhitespace(response)).to.equal(
				'LEFT JOIN "company" ON "user"."companyId" = "company"."id" INNER JOIN "order" ON "user"."id" = "order"."userId"'
			);
		});
	});
	describe('PsqlEngine generateWhereClause', () => {
		const psqlEngine = new PsqlEngine({} as PsqlPool);

		it('should format the where clause for STARTS WITH', () => {
			const whereData: WhereData[] = [
				{
					tableName: 'user',
					columnName: 'firstName',
					operator: 'STARTS WITH',
					value: 'T'
				}
			];
			// use array notation ['generateWhereClause'] to access private methods for unit testing
			const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
			expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."firstName" ILIKE 'T%'`);
		});
		it('should format the where clause for ENDS WITH', () => {
			const whereData: WhereData[] = [
				{
					tableName: 'user',
					columnName: 'firstName',
					operator: 'ENDS WITH',
					value: 'T'
				}
			];
			// use array notation ['generateWhereClause'] to access private methods for unit testing
			const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
			expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."firstName" ILIKE '%T'`);
		});
		it('should format the where clause for LIKE', () => {
			const whereData: WhereData[] = [
				{
					tableName: 'user',
					columnName: 'firstName',
					operator: 'LIKE',
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
					value: "'Tanner'"
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
					value: "'a', 'b', 'c'"
				}
			];
			// use array notation ['generateWhereClause'] to access private methods for unit testing
			const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
			expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" IN ('a', 'b', 'c')`);
		});
		it('should format the where clause for NOT IN strings', () => {
			const whereData: WhereData[] = [
				{
					tableName: 'user',
					columnName: 'id',
					operator: 'NOT IN',
					value: "'a', 'b', 'c'"
				}
			];
			// use array notation ['generateWhereClause'] to access private methods for unit testing
			const response = psqlEngine['generateWhereClause'](basicRequest, whereData, patchUserRouteData, []);
			expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" NOT IN ('a', 'b', 'c')`);
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
});
