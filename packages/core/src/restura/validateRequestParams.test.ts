import validateRequestParams, { ValidationDictionary } from './validateRequestParams';
import { DynamicObject, RsRequest } from './types/expressCustom';
import { RouteData } from './restura.schema';
//https://github.com/redsky-engineering/core-utils/blob/master/tests/NumberUtils.spec.ts
test('validateRequestParams', () => {
	const sampleRouteData: RouteData = {
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
			{
				name: 'id',
				selector: 'user.id'
			},
			{
				name: 'firstName',
				selector: 'user.firstName'
			},
			{
				name: 'lastName',
				selector: 'user.lastName'
			},
			{
				name: 'email',
				selector: 'user.email'
			},
			{
				name: 'modifiedOn',
				selector: 'user.modifiedOn'
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
	const sampleValidationSchema: ValidationDictionary = {
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
		},
		WeatherResponse: {
			type: 'object',
			properties: {
				currentTemperatureF: {
					type: 'number'
				},
				sunrise: {
					type: 'string'
				},
				sunset: {
					type: 'string'
				},
				pressure: {
					type: 'number'
				},
				humidityPercent: {
					type: 'number'
				},
				windSpeedMph: {
					type: 'number'
				},
				windDirection: {
					type: 'string'
				},
				tomorrowHighF: {
					type: 'number'
				},
				tomorrowLowF: {
					type: 'number'
				}
			},
			required: [
				'currentTemperatureF',
				'humidityPercent',
				'pressure',
				'sunrise',
				'sunset',
				'tomorrowHighF',
				'tomorrowLowF',
				'windDirection',
				'windSpeedMph'
			],
			$schema: 'http://json-schema.org/draft-07/schema#'
		}
	} as ValidationDictionary;
	try {
		validateRequestParams(
			{
				query: { a: '123' },
				method: 'GET'
			} as unknown as RsRequest<DynamicObject>,
			sampleRouteData,
			sampleValidationSchema
		);
	} catch (e: { err: string; msg: string }) {
		expect(e.err).toBe('BAD_REQUEST');
		expect(e.msg).toBe('Request param (a) is not allowed');
	}

	// test('0 null undefined', () => {
	//
	// })
});
