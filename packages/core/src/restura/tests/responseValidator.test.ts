import { expect } from 'chai';
import ResponseValidator from '../validators/ResponseValidator.js';
import { ColumnData, ResponseData, ResturaSchema, RouteData } from '../schemas/resturaSchema.js';

const BASE_URL = '/api/v1';
const ROUTE: RouteData = { method: 'GET', path: '/test' } as RouteData;

/**
 * Build a minimal schema with a single table `myTable` (containing `column`) and a single
 * GET/ARRAY route at `/test` that returns the given response fields.
 */
function buildSchema(column: ColumnData, response: ResponseData[]): ResturaSchema {
	return {
		database: [
			{
				name: 'myTable',
				columns: [column],
				indexes: [],
				foreignKeys: [],
				checkConstraints: [],
				roles: [],
				scopes: []
			}
		],
		endpoints: [
			{
				name: 'Test Endpoint',
				description: '',
				baseUrl: BASE_URL,
				routes: [
					{
						method: 'GET',
						name: 'Test',
						description: '',
						path: '/test',
						type: 'ARRAY',
						table: 'myTable',
						roles: [],
						scopes: [],
						joins: [],
						assignments: [],
						request: [],
						response,
						where: []
					}
				]
			}
		],
		globalParams: [],
		roles: [],
		scopes: [],
		customTypes: []
	} as ResturaSchema;
}

function enumColumn(value: string, isNullable = false): ColumnData {
	return {
		name: 'dynamicBehavior',
		type: 'ENUM',
		value,
		roles: [],
		scopes: [],
		isNullable
	};
}

const SELECTOR_RESPONSE: ResponseData[] = [{ name: 'dynamicBehavior', selector: 'myTable.dynamicBehavior' }];

describe('ResponseValidator', () => {
	describe('single-value ENUM columns (issue #147)', () => {
		it('accepts a set single-value enum value', () => {
			const validator = new ResponseValidator(
				buildSchema(enumColumn("'COMMISSION_HANDLE_AVAILABILITY'"), SELECTOR_RESPONSE)
			);
			expect(() =>
				validator.validateResponseParams(
					[{ dynamicBehavior: 'COMMISSION_HANDLE_AVAILABILITY' }],
					BASE_URL,
					ROUTE
				)
			).to.not.throw();
		});

		it('does not throw the legacy "wrong type (string)" error for a set single-value enum', () => {
			const validator = new ResponseValidator(
				buildSchema(enumColumn("'COMMISSION_HANDLE_AVAILABILITY'"), SELECTOR_RESPONSE)
			);
			expect(() =>
				validator.validateResponseParams(
					[{ dynamicBehavior: 'COMMISSION_HANDLE_AVAILABILITY' }],
					BASE_URL,
					ROUTE
				)
			).to.not.throw(/is of the wrong type/);
		});

		it('accepts NULL for a nullable single-value enum', () => {
			const validator = new ResponseValidator(
				buildSchema(enumColumn("'COMMISSION_HANDLE_AVAILABILITY'", true), SELECTOR_RESPONSE)
			);
			expect(() => validator.validateResponseParams([{ dynamicBehavior: null }], BASE_URL, ROUTE)).to.not.throw();
		});

		it('rejects a value not in the single-value enum option set', () => {
			const validator = new ResponseValidator(
				buildSchema(enumColumn("'COMMISSION_HANDLE_AVAILABILITY'"), SELECTOR_RESPONSE)
			);
			expect(() =>
				validator.validateResponseParams([{ dynamicBehavior: 'NOT_A_REAL_OPTION' }], BASE_URL, ROUTE)
			).to.throw(/is not one of the enum options/);
		});
	});

	describe('multi-value ENUM columns (regression)', () => {
		it('accepts a value from a multi-value enum', () => {
			const validator = new ResponseValidator(buildSchema(enumColumn("'ORDER','ORDER_ITEM'"), SELECTOR_RESPONSE));
			expect(() =>
				validator.validateResponseParams([{ dynamicBehavior: 'ORDER_ITEM' }], BASE_URL, ROUTE)
			).to.not.throw();
		});

		it('rejects a value not in a multi-value enum', () => {
			const validator = new ResponseValidator(buildSchema(enumColumn("'ORDER','ORDER_ITEM'"), SELECTOR_RESPONSE));
			expect(() => validator.validateResponseParams([{ dynamicBehavior: 'NOPE' }], BASE_URL, ROUTE)).to.throw(
				/is not one of the enum options/
			);
		});
	});

	describe('explicit response param type with single literal + null', () => {
		const typeResponse: ResponseData[] = [{ name: 'dynamicBehavior', type: "'FOO' | null" }];

		it('accepts the literal value', () => {
			const validator = new ResponseValidator(buildSchema(enumColumn("'FOO'", true), typeResponse));
			expect(() =>
				validator.validateResponseParams([{ dynamicBehavior: 'FOO' }], BASE_URL, ROUTE)
			).to.not.throw();
		});

		it('accepts null', () => {
			const validator = new ResponseValidator(buildSchema(enumColumn("'FOO'", true), typeResponse));
			expect(() => validator.validateResponseParams([{ dynamicBehavior: null }], BASE_URL, ROUTE)).to.not.throw();
		});

		it('rejects a value outside the literal union', () => {
			const validator = new ResponseValidator(buildSchema(enumColumn("'FOO'", true), typeResponse));
			expect(() => validator.validateResponseParams([{ dynamicBehavior: 'BAR' }], BASE_URL, ROUTE)).to.throw(
				/is not one of the enum options/
			);
		});
	});
});
