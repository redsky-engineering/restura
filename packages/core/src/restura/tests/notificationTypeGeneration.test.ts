import { expect } from 'chai';
import apiGenerator from '../generators/apiGenerator.js';
import type { ResturaSchema } from '../schemas/resturaSchema.js';

function schemaWithNotify(notify: unknown): ResturaSchema {
	return {
		database: [
			{
				name: 'user',
				notify,
				columns: [
					{ name: 'id', type: 'BIGINT', isNullable: false },
					{ name: 'email', type: 'VARCHAR', isNullable: false },
					{ name: 'password', type: 'VARCHAR', isNullable: false },
					{ name: 'passwordChangedOn', type: 'DATETIME', isNullable: true }
				]
			}
		],
		endpoints: [],
		globalParams: [],
		roles: [],
		scopes: [],
		customTypes: []
	} as unknown as ResturaSchema;
}

describe('NotificationTypes generation', () => {
	it('should strip the ! prefix so a force-included column appears in the generated type', async () => {
		const api = await apiGenerator(schemaWithNotify(['email', '!passwordChangedOn']));
		expect(api).to.contain(`'passwordChangedOn'`);
		expect(api).to.not.contain(`'!passwordChangedOn'`);
	});

	it('should exclude sensitive columns when expanding ALL, matching the trigger payload', async () => {
		const api = await apiGenerator(schemaWithNotify('ALL'));
		expect(api).to.contain(`'email'`);
		expect(api).to.not.contain(`'password'`);
	});

	it('should throw when a sensitive column is listed without a ! prefix', async () => {
		try {
			await apiGenerator(schemaWithNotify(['email', 'password']));
			expect.fail('expected apiGenerator to throw');
		} catch (error) {
			expect((error as Error).message).to.match(/sensitive column/);
		}
	});
});
