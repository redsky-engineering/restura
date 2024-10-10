import validateRequestParams, { performTypeCheck, ValidationDictionary } from './validateRequestParams';
import { RsRequest } from './types/expressCustom';
import { RouteData } from './restura.schema';

describe('validateRequestParams', () => {
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

	it('should fail if unknown params are passed', () => {
		try {
			validateRequestParams(
				{
					query: { a: '123' },
					method: 'GET'
				} as unknown as RsRequest<unknown>,
				sampleRouteData,
				sampleValidationSchema
			);
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		} catch (e: any) {
			expect(e?.err).toBe('BAD_REQUEST');
			expect(e?.msg).toBe('Request param (a) is not allowed');
		}
	});

	it('should pass if type is correct(number)', () => {
		const response = performTypeCheck(
			2,
			{
				type: 'TYPE_CHECK',
				value: 'number'
			},
			'id'
		);
		expect(response).toBe(undefined);
	});
	it('should pass if type is correct(string)', () => {
		const response = performTypeCheck(
			'stringasdf',
			{
				type: 'TYPE_CHECK',
				value: 'string'
			},
			'id'
		);
		expect(response).toBe(undefined);
	});
	it('should pass if type is correct(boolean)', () => {
		const response = performTypeCheck(
			true,
			{
				type: 'TYPE_CHECK',
				value: 'boolean'
			},
			'id'
		);
		expect(response).toBe(undefined);
	});

	it('should pass if type is correct(number[])', () => {
		const response = performTypeCheck(
			[2, 1],
			{
				type: 'TYPE_CHECK',
				value: 'number[]'
			},
			'id'
		);
		expect(response).toBe(undefined);
	});
	it('should pass if type is correct(string[])', () => {
		const response = performTypeCheck(
			['stringasdf', '1'],
			{
				type: 'TYPE_CHECK',
				value: 'string[]'
			},
			'id'
		);
		expect(response).toBe(undefined);
	});
	it('should fail if type is incorrect(string[])', () => {
		try {
			performTypeCheck(
				['stringasdf', '1', 1],
				{
					type: 'TYPE_CHECK',
					value: 'string[]'
				},
				'id'
			);
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		} catch (e: any) {
			expect(e.msg).toBe(`Request param (id) with value ('stringasdf','1',1) is not of type (string[])`);
		}
	});
	it('should pass if type is correct(any[])', () => {
		const response = performTypeCheck(
			['stringasdf', '1', 1],
			{
				type: 'TYPE_CHECK',
				value: 'any[]'
			},
			'id'
		);
		expect(response).toBe(undefined);
	});

	it('should fail if type is incorrect (number)', () => {
		try {
			performTypeCheck(
				'2',
				{
					type: 'TYPE_CHECK',
					value: 'number'
				},
				'id'
			);
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		} catch (e: any) {
			expect(e?.msg).toBe(`Request param (id) with value ('2') is not of type (number)`);
		}
	});

	it('should fail if type is incorrect (object)', () => {
		try {
			performTypeCheck(
				'2',
				{
					type: 'TYPE_CHECK',
					value: 'object'
				},
				'id'
			);
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		} catch (e: any) {
			expect(e?.msg).toBe(`Request param (id) with value ('2') is not of type (object)`);
		}
	});
	it('should fail if type is incorrect (boolean)', () => {
		try {
			performTypeCheck(
				2,
				{
					type: 'TYPE_CHECK',
					value: 'boolean'
				},
				'id'
			);
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		} catch (e: any) {
			expect(e?.msg).toBe('Request param (id) with value (2) is not of type (boolean)');
		}
	});

	// it('0 null undefined', () => {
	//
	// })
});
