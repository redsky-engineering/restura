import type { ResturaSchema, StandardRouteData } from '../schemas/resturaSchema.js';
import type { RsRequest } from '../types/customExpressTypes.js';

export const sampleSchema: ResturaSchema = {
	database: [
		{
			name: 'company',
			columns: [
				{
					name: 'id',
					hasAutoIncrement: true,
					isNullable: false,
					roles: [],
					scopes: [],
					isPrimary: true,
					type: 'BIGINT'
				},
				{
					name: 'createdOn',
					isNullable: false,
					default: 'now()',
					roles: [],
					scopes: [],
					type: 'DATETIME'
				},
				{ name: 'modifiedOn', isNullable: false, default: 'now()', roles: [], scopes: [], type: 'DATETIME' },
				{
					roles: [],
					name: 'name',
					type: 'VARCHAR',
					length: 255,
					isNullable: true,
					scopes: []
				}
			],
			checkConstraints: [],
			foreignKeys: [],
			indexes: [{ name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimaryKey: true, order: 'ASC' }],
			roles: [],
			scopes: []
		},
		{
			name: 'order',
			columns: [
				{
					name: 'id',
					hasAutoIncrement: true,
					isNullable: false,
					roles: ['admin', 'user'],
					scopes: [],
					isPrimary: true,
					type: 'BIGINT'
				},
				{
					name: 'amountCents',
					isNullable: false,
					roles: ['admin', 'user'],
					scopes: [],
					type: 'BIGINT'
				},
				{
					roles: ['admin', 'user'],
					name: 'userId',
					type: 'BIGINT',
					isNullable: false,
					scopes: []
				}
			],
			checkConstraints: [],
			foreignKeys: [],
			indexes: [{ name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimaryKey: true, order: 'ASC' }],
			roles: [],
			scopes: [],
			notify: 'ALL'
		},
		{
			name: 'item',
			columns: [
				{
					name: 'id',
					hasAutoIncrement: true,
					isNullable: false,
					roles: ['admin', 'user'],
					scopes: [],
					isPrimary: true,
					type: 'BIGINT'
				},
				{
					name: 'orderId',
					isNullable: false,
					roles: ['admin', 'user'],
					scopes: [],
					type: 'BIGINT'
				}
			],
			checkConstraints: [],
			foreignKeys: [],
			indexes: [{ name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimaryKey: true, order: 'ASC' }],
			roles: [],
			scopes: []
		},
		{
			name: 'user',
			columns: [
				{
					name: 'id',
					hasAutoIncrement: true,
					isNullable: false,
					roles: [],
					scopes: [],
					type: 'BIGINT'
				},
				{
					name: 'createdOn',
					isNullable: false,
					default: 'now()',
					roles: [],
					scopes: [],
					type: 'DATETIME'
				},
				{ name: 'modifiedOn', isNullable: false, default: 'now()', roles: [], scopes: [], type: 'DATETIME' },
				{
					roles: [],
					name: 'firstName',
					type: 'VARCHAR',
					length: 30,
					isNullable: false,
					scopes: []
				},
				{ roles: [], name: 'lastName', type: 'VARCHAR', length: 30, isNullable: false, scopes: [] },
				{
					roles: [],
					name: 'companyId',
					type: 'BIGINT',
					isNullable: false,
					comment: 'Foreign key to company(id)',
					scopes: []
				},
				{ roles: [], name: 'password', type: 'VARCHAR', length: 70, isNullable: false, scopes: [] },
				{
					roles: [],
					name: 'email',
					type: 'VARCHAR',
					length: 100,
					isNullable: false,
					scopes: []
				},
				{
					roles: [],
					name: 'role',
					type: 'ENUM',
					isNullable: false,
					value: "'admin','user'",
					default: "'user'",
					scopes: []
				},
				{
					roles: [],
					name: 'permissionLogin',
					type: 'BOOLEAN',
					isNullable: false,
					default: 'true',
					scopes: []
				},
				{ roles: [], name: 'lastLoginOn', type: 'DATETIME', isNullable: true, scopes: [] },
				{
					roles: [],
					name: 'phone',
					type: 'VARCHAR',
					length: 30,
					isNullable: true,
					scopes: []
				},
				{
					roles: [],
					name: 'loginDisabledOn',
					type: 'DATETIME',
					isNullable: true,
					comment: 'When user was disabled',
					scopes: []
				},
				{ roles: [], name: 'passwordResetGuid', type: 'VARCHAR', length: 100, isNullable: true, scopes: [] },
				{
					roles: [],
					name: 'verifyEmailPin',
					type: 'MEDIUMINT',
					isNullable: true,
					scopes: []
				},
				{ roles: [], name: 'verifyEmailPinExpiresOn', type: 'DATETIME', isNullable: true, scopes: [] },
				{
					roles: [],
					name: 'accountStatus',
					type: 'ENUM',
					isNullable: false,
					value: "'banned','view_only','active'",
					default: "'view_only'",
					scopes: []
				},
				{
					roles: [],
					name: 'passwordResetExpiresOn',
					type: 'DATETIME',
					isNullable: true,
					comment: 'When guid is no longer valid',
					scopes: []
				},
				{
					roles: [],
					name: 'onboardingStatus',
					type: 'ENUM',
					isNullable: false,
					value: "'verify_email','complete'",
					default: "'verify_email'",
					scopes: []
				},
				{
					roles: [],
					name: 'pendingEmail',
					type: 'VARCHAR',
					length: 100,
					isNullable: true,
					scopes: []
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
			roles: [],
			scopes: [],
			notify: ['firstName', 'lastName', 'email', 'role', 'phone', 'accountStatus', 'onboardingStatus']
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
					scopes: [],
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
					scopes: [],
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
					scopes: [],
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
					roles: [],
					scopes: []
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
					roles: ['admin', 'user'],
					scopes: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [{ name: 'pin', required: true, validator: [{ type: 'TYPE_CHECK', value: 'number' }] }],
					method: 'PATCH',
					name: 'Commit Email Change',
					description: 'Commits an email change with a pin',
					path: '/user/change-email/commit',
					roles: ['admin', 'user'],
					scopes: []
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
					roles: ['admin'],
					scopes: []
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
					roles: ['admin'],
					scopes: []
				},
				{
					type: 'CUSTOM_ONE',
					method: 'POST',
					name: 'Logout',
					description: 'User logout endpoint',
					path: '/user/logout',
					roles: ['admin', 'user'],
					scopes: [],
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
					roles: [],
					scopes: []
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
					roles: ['admin', 'athlete', 'fan', 'recruiter'],
					scopes: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [],
					method: 'POST',
					name: 'Resend Verify Email Pin',
					description: 'Resend the email that sends out the verify email pin',
					path: '/user/resend-verify-email',
					roles: ['admin', 'athlete', 'fan', 'recruiter'],
					scopes: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [{ name: 'email', required: true, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }],
					method: 'POST',
					name: 'Forgot Password',
					description: 'Sends a forgot password request',
					path: '/user/forgot-password',
					roles: [],
					scopes: []
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
					roles: ['admin', 'user'],
					scopes: []
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
					description: 'Resets a password with a guid',
					path: '/user/reset-password',
					roles: [],
					scopes: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [{ name: 'pin', required: true, validator: [{ type: 'TYPE_CHECK', value: 'number' }] }],
					method: 'POST',
					name: 'Verify Email',
					description: 'Verifies an email given a pin',
					path: '/user/verify-email',
					roles: ['admin', 'user'],
					scopes: []
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
					roles: ['admin', 'user'],
					scopes: []
				},
				{
					type: 'ONE',
					method: 'PATCH',
					name: 'Update my user',
					description: 'Update my user',
					path: '/user/me',
					table: 'user',
					roles: ['user', 'admin'],
					scopes: [],
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
					roles: ['user', 'admin'],
					scopes: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'id',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					method: 'GET',
					name: 'Delete User',
					description: 'Deletes a user',
					path: '/user',
					roles: ['admin'],
					scopes: []
				},
				{
					type: 'ONE',
					method: 'PATCH',
					name: 'Update User',
					description: 'Update an existing user.',
					path: '/user',
					table: 'user',
					roles: ['admin'],
					scopes: [],
					orderBy: {
						tableName: 'user',
						columnName: 'id',
						order: 'DESC'
					},
					request: [],
					joins: [],
					response: [
						{
							name: 'id',
							type: 'user',
							selector: 'user.id'
						}
					],
					assignments: [
						{
							name: 'id',
							value: 'id'
						}
					],
					where: [
						{
							tableName: 'user',
							columnName: 'id',
							operator: '=',
							value: 'id'
						}
					]
				}
			]
		}
	],
	globalParams: ['companyId', 'userId'],
	roles: ['admin', 'user', 'anonymous'],
	scopes: [],
	customTypes: [
		'export interface FilteredUser {    id: number;\tcompanyId: number;\tfirstName: string;\tlastName: string;\temail: string;\trole: string;\tphone: string;\tlastLoginOn: string;}export interface AuthResponse {    token: string;    tokenExp: string;    refreshToken: string;    refreshTokenExp: string;}export interface WeatherResponse {    currentTemperatureF: number;    sunrise: string;    sunset: string;    pressure: number;    humidityPercent: number;    windSpeedMph: number;    windDirection: string;    tomorrowHighF: number;    tomorrowLowF: number;}'
	]
};

export const patchUserClearGuidRouteData: StandardRouteData = {
	type: 'ONE',
	method: 'PATCH',
	name: 'Clears a users password reset guid',
	description: 'Clears a users password reset guid',
	path: '/user/clear-password-reset-guid',
	table: 'user',
	roles: ['user', 'admin'],
	scopes: [],
	orderBy: {
		columnName: 'lastName',
		order: 'DESC',
		tableName: 'user'
	},
	request: [],
	joins: [],
	response: [
		{ name: 'id', selector: 'user.id' },
		{ name: 'firstName', selector: 'user.firstName' },
		{ name: 'lastName', selector: 'user.lastName' },
		{ name: 'passwordResetGuid', selector: 'user.passwordResetGuid' }
	],
	assignments: [{ name: 'passwordResetGuid', value: '' }],
	where: [{ tableName: 'user', columnName: 'id', operator: '=', value: '#userId' }]
};

export const patchUserRouteData: StandardRouteData = {
	type: 'ONE',
	method: 'PATCH',
	name: 'Update my user',
	description: 'Update my user',
	path: '/user/me',
	table: 'user',
	roles: ['user', 'admin'],
	scopes: [],
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

export const deleteUserRouteData: StandardRouteData = {
	type: 'ONE',
	method: 'DELETE',
	name: 'Delete user',
	description: 'Delete user',
	path: '/user/me',
	table: 'user',
	roles: ['user', 'admin'],
	scopes: [],
	request: [
		{
			name: 'id',
			required: true,
			validator: [{ type: 'TYPE_CHECK', value: 'number' }]
		}
	],
	joins: [],
	response: [
		{ name: 'id', selector: 'user.id' },
		{ name: 'firstName', selector: 'user.firstName' },
		{ name: 'lastName', selector: 'user.lastName' }
	],
	where: [{ tableName: 'user', columnName: 'id', operator: '=', value: '$id' }],
	assignments: []
};

export const createOrderRouteData: StandardRouteData = {
	type: 'ONE',
	method: 'POST',
	name: 'Create order',
	description: 'Create order',
	path: '/order',
	table: 'order',
	roles: ['user', 'admin'],
	scopes: [],
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

export const deleteOrderRouteData: StandardRouteData = {
	type: 'PAGED',
	method: 'DELETE',
	name: 'Delete order',
	description: 'Delete order',
	path: '/order',
	table: 'order',
	roles: ['user', 'admin'],
	scopes: [],
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

export const getAllOrdersWithMultiJoinsRouteData: StandardRouteData = {
	type: 'PAGED',
	method: 'GET',
	name: 'get all orders with multi joins',
	description: 'Get all orders with multi joins',
	path: '/order/all',
	table: 'order',
	roles: ['admin'],
	scopes: [],
	request: [],
	joins: [
		{
			type: 'INNER',
			table: 'user',
			localColumnName: 'userId',
			foreignColumnName: 'id',
			alias: 'userId_user'
		},
		{
			type: 'INNER',
			table: 'company',
			localTable: 'user',
			localColumnName: 'companyId',
			foreignColumnName: 'id',
			alias: 'companyId_company'
		}
	],
	response: [
		{ name: 'orderId', selector: 'order.id' },
		{
			name: 'firstName',
			selector: 'userId_user.firstName'
		},
		{ name: 'lastName', selector: 'userId_user.lastName' },
		{ name: 'companyName', selector: 'companyId_company.name' }
	],
	assignments: [],
	where: []
};

export const getAllUsersRoleAdminRouteData: StandardRouteData = {
	type: 'PAGED',
	method: 'GET',
	name: 'get all users',
	description: 'Get all users',
	path: '/user/all',
	table: 'user',
	roles: ['admin'],
	scopes: [],
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

export const getUserLikeFirstNameRouteData: StandardRouteData = {
	type: 'ARRAY',
	method: 'GET',
	name: 'get all users like first name',
	description: 'Get all users like first name',
	path: '/user/like/firstName',
	table: 'user',
	roles: ['admin'],
	scopes: [],
	request: [
		{
			name: 'search',
			required: true,
			validator: [{ type: 'TYPE_CHECK', value: 'string' }]
		}
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
	where: [{ tableName: 'user', columnName: 'firstName', operator: 'LIKE', value: '$search' }]
};

export const getAllUsersScopeTestRouteData: StandardRouteData = {
	type: 'PAGED',
	method: 'GET',
	name: 'get all users',
	description: 'Get all users',
	path: '/user/all',
	table: 'user',
	roles: [],
	scopes: ['read:user'],
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

// Used in testing custom joins
export const getAllUsersBeforeDateRouteData: StandardRouteData = {
	type: 'ARRAY',
	method: 'GET',
	name: 'Get users before date',
	description: 'Get users created before specified date',
	path: '/user/before',
	table: 'user',
	roles: ['user', 'admin'],
	scopes: [],
	orderBy: {
		columnName: 'lastName',
		order: 'DESC',
		tableName: 'user'
	},
	request: [
		{
			name: 'date',
			required: true,
			validator: [{ type: 'TYPE_CHECK', value: 'string' }]
		}
	],
	joins: [
		{
			table: 'company',
			alias: 'company_newer',
			type: 'LEFT',
			custom: '"user"."companyId" = "company_newer"."id" AND "user"."createdOn" < $date'
		}
	],
	response: [
		{ name: 'id', selector: 'user.id' },
		{ name: 'firstName', selector: 'user.firstName' },
		{ name: 'lastName', selector: 'user.lastName' },
		{ name: 'email', selector: 'user.email' },
		{ name: 'companyName', selector: 'company_newer.name' }
	],
	assignments: [],
	where: []
};

export const basicAdminRequest: RsRequest = {
	requesterDetails: {
		role: 'admin',
		scopes: [],
		host: 'google.com',
		ipAddress: '1.1.1.1',
		userId: 1
	},
	data: { id: 1 }
} as unknown as RsRequest;

export const permissionCheckScopeOnlyRequest: RsRequest = {
	requesterDetails: {
		role: '',
		scopes: ['read:user'],
		host: 'google.com',
		ipAddress: '1.1.1.1',
		userId: 1
	},
	data: { id: 1 }
} as unknown as RsRequest;
