import { expect } from 'chai';
import { RsError } from '../RsError.js';
import type { StandardRouteData } from '../schemas/resturaSchema.js';
import filterPsqlParser from '../sql/filterPsqlParser.js';
import { buildPagedColumnAccess } from '../sql/pagedColumnAccess.js';
import { PsqlEngine } from '../sql/PsqlEngine.js';
import { PsqlPool } from '../sql/PsqlPool.js';
import type { RsRequest } from '../types/customExpressTypes.js';
import { sampleSchema } from './PsqlEngine.resource.js';

const pagedRoute: StandardRouteData = {
	type: 'PAGED',
	method: 'GET',
	name: 'get orders',
	description: 'Paged orders with the creating user',
	path: '/order/paged',
	roles: [],
	scopes: [],
	table: 'order',
	joins: [
		{
			table: 'user',
			localColumnName: 'userId',
			foreignColumnName: 'id',
			type: 'INNER',
			alias: 'creator'
		}
	],
	assignments: [],
	where: [],
	request: [],
	response: [
		{ name: 'id', selector: 'order.id' },
		{ name: 'amountCents', selector: 'order.amountCents' },
		{ name: 'creatorFirstName', selector: 'creator.firstName' },
		{ name: 'creatorPassword', selector: 'creator.password' },
		{ name: 'label', selector: `CONCAT('#', "order"."id")`, type: 'string' }
	]
};

function pagedRequest(data: Record<string, unknown>): RsRequest<unknown> {
	return {
		requesterDetails: { role: 'admin', scopes: [], host: 'localhost', ipAddress: '127.0.0.1', userId: 1 },
		data: { page: 1, perPage: 25, ...data }
	} as unknown as RsRequest<unknown>;
}

function expectBadRequest(action: () => unknown, messagePattern: RegExp): void {
	let caught: unknown;
	try {
		action();
	} catch (error) {
		caught = error;
	}
	expect(caught).to.be.instanceOf(RsError);
	expect((caught as RsError).err).to.equal('BAD_REQUEST');
	expect((caught as RsError).status).to.equal(400);
	expect((caught as RsError).message).to.match(messagePattern);
}

describe('PAGED filter and sort column allow-list', function () {
	let psqlPool: PsqlPool;
	let psqlEngine: PsqlEngine;

	before(() => {
		psqlPool = new PsqlPool({
			host: 'localhost',
			port: 5488,
			user: 'postgres',
			database: 'postgres',
			password: 'postgres',
			max: 1
		});
		psqlEngine = new PsqlEngine(psqlPool);
	});

	after(async () => {
		await psqlPool.pool.end();
	});

	function whereFor(filter: string, route: StandardRouteData = pagedRoute): string {
		return psqlEngine['generateWhereClause'](pagedRequest({ filter }), route.where, route, []);
	}

	function orderByFor(sortBy: string, route: StandardRouteData = pagedRoute): string {
		return psqlEngine['generateOrderBy'](pagedRequest({ sortBy, sortOrder: 'DESC' }), route);
	}

	describe('filter', () => {
		it('should produce the same SQL as before for filters on returned columns', () => {
			const filters = [
				'(order.id,gt,5)',
				'(creator.firstName,sw,Ann)',
				'!((order.amountCents,lt,100) or (creator.firstName,has,bo))',
				'(order.id,in,1|2|3)',
				'(column:order.amountCents,value:100)',
				'(amountCents,null)'
			];
			for (const filter of filters) {
				expect(whereFor(filter)).to.equal(`WHERE ${filterPsqlParser.parse(filter).sql}\n`);
			}
		});

		it('should reject a sensitive column on a joined table even when the route returns it', () => {
			expectBadRequest(() => whereFor('(creator.password,sw,$2b$1)'), /"creator\.password" is not allowed/);
		});

		it('should reject a column the route does not return', () => {
			expectBadRequest(() => whereFor('(creator.email,sw,a)'), /"creator\.email" is not allowed/);
		});

		it('should reject a column reached through a JSON path', () => {
			expectBadRequest(
				() => whereFor('(creator.permissionLogin.role,admin)'),
				/"creator\.permissionLogin\.role"/
			);
		});

		it('should reject a disallowed column inside a negated group', () => {
			expectBadRequest(
				() => whereFor('!((creator.firstName,sw,a) or (creator.passwordResetGuid,sw,b))'),
				/"creator\.passwordResetGuid" is not allowed/
			);
		});

		it('should reject a disallowed column used with an in list', () => {
			expectBadRequest(() => whereFor('(creator.id,in,1|2)'), /"creator\.id" is not allowed/);
		});

		it('should reject a disallowed column in the legacy filter syntax', () => {
			expectBadRequest(() => whereFor('(column:creator.password,value:x)'), /"creator\.password" is not allowed/);
		});

		it('should reject an unqualified column that no returned column matches', () => {
			expectBadRequest(() => whereFor('(email,sw,a)'), /"email" is not allowed/);
		});

		it('should list the allowed columns without the sensitive ones', () => {
			expectBadRequest(
				() => whereFor('(creator.email,sw,a)'),
				/Allowed columns: creator\.firstName, order\.amountCents, order\.id$/
			);
		});

		it('should allow a column listed in filterableColumns', () => {
			const route = { ...pagedRoute, filterableColumns: ['creator.email'] };
			expect(whereFor('(creator.email,sw,a)', route)).to.equal(`WHERE ("creator"."email" ILIKE 'a%')\n`);
		});

		it('should still reject a sensitive column listed in filterableColumns without the ! opt-in', () => {
			const route = { ...pagedRoute, filterableColumns: ['creator.passwordResetGuid'] };
			expectBadRequest(() => whereFor('(creator.passwordResetGuid,sw,a)', route), /not allowed/);
		});

		it('should allow a sensitive column only when listed with the ! opt-in', () => {
			const route = { ...pagedRoute, filterableColumns: ['!creator.passwordResetGuid'] };
			expect(whereFor('(creator.passwordResetGuid,null)', route)).to.equal(
				`WHERE ("creator"."passwordResetGuid" IS NULL)\n`
			);
		});

		it('should only allow columns the requester can read', () => {
			const readable = pagedRoute.response.filter((item) => item.name !== 'creatorFirstName');
			const access = buildPagedColumnAccess(pagedRoute, readable);
			expectBadRequest(
				() =>
					psqlEngine['generateWhereClause'](
						pagedRequest({ filter: '(creator.firstName,sw,a)' }),
						[],
						pagedRoute,
						[],
						access
					),
				/"creator\.firstName" is not allowed/
			);
		});
	});

	describe('sortBy', () => {
		it('should allow a returned column and a response property name', () => {
			expect(orderByFor('"creator"."firstName"')).to.equal(`ORDER BY "creator"."firstName" DESC\n`);
			expect(orderByFor('creatorFirstName')).to.equal(`ORDER BY "creatorFirstName" DESC\n`);
			expect(orderByFor('label')).to.equal(`ORDER BY "label" DESC\n`);
		});

		it('should reject a sensitive column', () => {
			expectBadRequest(() => orderByFor('creator.password'), /Sorting by "creator\.password" is not allowed/);
			expectBadRequest(() => orderByFor('creatorPassword'), /Sorting by "creatorPassword" is not allowed/);
		});

		it('should reject an unknown column', () => {
			expectBadRequest(() => orderByFor('creator.email'), /Sorting by "creator\.email" is not allowed/);
		});

		it('should allow a column listed in sortableColumns', () => {
			const route = { ...pagedRoute, sortableColumns: ['creator.email'] };
			expect(orderByFor('creator.email', route)).to.equal(`ORDER BY "creator"."email" DESC\n`);
		});
	});

	describe('PAGED writes', () => {
		const adminOnlyAmountSchema = {
			...sampleSchema,
			database: sampleSchema.database.map((table) =>
				table.name !== 'order'
					? table
					: {
							...table,
							columns: table.columns.map((column) =>
								column.name === 'amountCents' ? { ...column, roles: ['admin'] } : column
							)
						}
			)
		};

		function engineRecordingQueries(): { engine: PsqlEngine; queries: string[] } {
			const queries: string[] = [];
			const engine = Object.create(PsqlEngine.prototype) as PsqlEngine;
			const recordQuery = async (query: string): Promise<unknown> => {
				queries.push(query);
				return [];
			};
			Object.assign(engine, { psqlConnectionPool: { queryOne: recordQuery, runQuery: recordQuery } });
			return { engine, queries };
		}

		function writeRequest(role: string, data: Record<string, unknown>): RsRequest<unknown> {
			const request = pagedRequest(data) as unknown as {
				requesterDetails: { role: string };
				body: Record<string, unknown>;
			};
			request.requesterDetails.role = role;
			request.body = { amountCents: 1 };
			return request as unknown as RsRequest<unknown>;
		}

		async function rejectionOf(write: Promise<unknown>): Promise<RsError | undefined> {
			try {
				await write;
			} catch (error) {
				return error as RsError;
			}
			return undefined;
		}

		it('should reject a disallowed sortBy on an update before writing', async () => {
			const { engine, queries } = engineRecordingQueries();
			const error = await rejectionOf(
				engine['executeUpdateRequest'](
					writeRequest('admin', { sortBy: 'creator.email' }),
					{ ...pagedRoute, method: 'PATCH' },
					sampleSchema
				)
			);
			expect(error).to.be.instanceOf(RsError);
			expect(error!.err).to.equal('BAD_REQUEST');
			expect(queries).to.deep.equal([]);
		});

		it('should reject an update filter on a column the requester cannot read', async () => {
			const { engine, queries } = engineRecordingQueries();
			const error = await rejectionOf(
				engine['executeUpdateRequest'](
					writeRequest('user', { filter: '(order.amountCents,gt,0)' }),
					{ ...pagedRoute, method: 'PATCH' },
					adminOnlyAmountSchema
				)
			);
			expect(error).to.be.instanceOf(RsError);
			expect(error!.message).to.match(/"order\.amountCents" is not allowed/);
			expect(queries).to.deep.equal([]);
		});

		it('should reject a delete filter on a column the requester cannot read', async () => {
			const { engine, queries } = engineRecordingQueries();
			const error = await rejectionOf(
				engine['executeDeleteRequest'](
					writeRequest('user', { filter: '(order.amountCents,gt,0)' }),
					{
						...pagedRoute,
						method: 'DELETE',
						where: [{ tableName: 'order', columnName: 'id', operator: '>', value: '0' }]
					},
					adminOnlyAmountSchema
				)
			);
			expect(error).to.be.instanceOf(RsError);
			expect(error!.message).to.match(/"order\.amountCents" is not allowed/);
			expect(queries).to.deep.equal([]);
		});
	});

	describe('executeGetRequest', () => {
		const ordersWithCreator: StandardRouteData = {
			...pagedRoute,
			response: pagedRoute.response.filter((item) => item.name !== 'creatorPassword')
		};

		async function runPaged(data: Record<string, unknown>): Promise<unknown> {
			return psqlEngine['executeGetRequest'](pagedRequest(data), ordersWithCreator, sampleSchema);
		}

		async function expectRejected(data: Record<string, unknown>, messagePattern: RegExp): Promise<void> {
			let caught: unknown;
			try {
				await runPaged(data);
			} catch (error) {
				caught = error;
			}
			expect(caught).to.be.instanceOf(RsError);
			expect((caught as RsError).err).to.equal('BAD_REQUEST');
			expect((caught as RsError).message).to.match(messagePattern);
		}

		it('should run a filter and sort on returned columns', async () => {
			const response = (await runPaged({
				filter: '(creator.firstName,notnull)',
				sortBy: 'creatorFirstName'
			})) as { data: unknown[]; total: number };
			expect(response.data.length).to.be.greaterThan(0);
			expect(response.total).to.equal(response.data.length);
		});

		it('should reject a filter on a joined sensitive column before querying', async () => {
			await expectRejected({ filter: '(creator.password,sw,$)' }, /"creator\.password" is not allowed/);
		});

		it('should reject a sort on a joined column the route does not return', async () => {
			await expectRejected({ sortBy: 'creator.email' }, /Sorting by "creator\.email" is not allowed/);
		});
	});
});
