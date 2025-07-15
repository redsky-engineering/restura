import { MiscUtils } from '@redskytech/core-utils';
import { expect } from 'chai';
import cloneDeep from 'lodash.clonedeep';
import { types } from 'pg';
import eventManager from '../eventManager.js';
import { RsError } from '../RsError.js';
import {
	CustomRouteData,
	JoinData,
	ResponseData,
	ResturaSchema,
	StandardRouteData,
	WhereData,
	type RequestData
} from '../schemas/resturaSchema.js';
import { PsqlEngine } from '../sql/PsqlEngine.js';
import { PsqlPool } from '../sql/PsqlPool.js';
import { PsqlTransaction } from '../sql/PsqlTransaction.js';
import { DynamicObject, RequesterDetails, RsRequest } from '../types/customExpressTypes.js';
import {
	basicAdminRequest,
	createOrderRouteData,
	deleteOrderRouteData,
	deleteUserRouteData,
	getAllOrdersWithMultiJoinsRouteData,
	getAllUsersBeforeDateRouteData,
	getAllUsersRoleAdminRouteData,
	getAllUsersScopeTestRouteData,
	getUserLikeFirstNameRouteData,
	patchUserClearGuidRouteData,
	patchUserRouteData,
	permissionCheckScopeOnlyRequest,
	sampleSchema
} from './PsqlEngine.resource.js';

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

let psqlTransaction: PsqlTransaction;
const getPsqlTransaction = () => {
	if (psqlTransaction) return psqlTransaction;
	psqlTransaction = new PsqlTransaction(clientConfig);
	return psqlTransaction;
};

describe('PsqlEngine', function () {
	after(async function () {
		// Let all pending events finish by pausing for a bit
		await MiscUtils.sleep(500);
		if (psqlPool) psqlPool.pool.end();
		await getEventPsqlEngine().close();
		if (enginePool) enginePool.pool.end();
		if (psqlTransaction) await psqlTransaction.close();
	});

	describe('db transaction', () => {
		it('db transaction', async () => {
			const psqlTransaction = getPsqlTransaction();
			const user = await psqlTransaction.queryOne<{ id: number }>(
				`SELECT * FROM "user" WHERE id = 1;`,
				[],
				{} as RequesterDetails
			);
			expect(user.id).to.equal(1);
		});
	});
	describe('Run Query', () => {
		it('should run a query', async () => {
			const psqlTransaction = getPsqlTransaction();
			const result = await psqlTransaction.runQuery(`SELECT * FROM "user" WHERE id = 1;`, [], {
				role: 'admin',
				host: 'google.com',
				ipAddress: '1.1.1.1',
				userId: 1
			} as RequesterDetails);
			expect(result.length).to.equal(1);
		});
		it('should run a query with an array parameter using ANY operator', async () => {
			const psqlTransaction = getPsqlTransaction();
			const result = await psqlTransaction.runQuery(`SELECT * FROM "user" WHERE id = ANY(?);`, [[1, 2, 3]], {
				role: 'admin',
				scopes: [],
				host: 'google.com',
				ipAddress: '1.1.1.1'
			});
			expect(result.length).to.be.greaterThan(0);
		});
	});
	describe('db diff', () => {
		it('should create the database DDL from ResturaSchema', async () => {
			const psqlEngine = new PsqlEngine(psqlPool);
			const ddl = psqlEngine.generateDatabaseSchemaFromSchema(sampleSchema);
			const ddlNoSpace = trimRedundantWhitespace(ddl);
			expect(ddlNoSpace).to.equal(
				trimRedundantWhitespace(`CREATE TABLE "company"
                                           (    "id" BIGSERIAL PRIMARY KEY  NOT NULL, 
        "createdOn" TIMESTAMPTZ NOT NULL DEFAULT now(), 
        "modifiedOn" TIMESTAMPTZ NOT NULL DEFAULT now(), 
        "name" VARCHAR(255) NULL
);

CREATE TABLE "order"
                                           (    "id" BIGSERIAL PRIMARY KEY  NOT NULL, 
        "amountCents" BIGINT NOT NULL, 
        "userId" BIGINT NOT NULL
);

CREATE TABLE "item"
                                           (    "id" BIGSERIAL PRIMARY KEY  NOT NULL, 
        "orderId" BIGINT NOT NULL
);

CREATE TABLE "user"
                                           (    "id" BIGSERIAL NOT NULL, 
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

ALTER TABLE "user"       ADD CONSTRAINT "user_companyId_company_id_fk"
        FOREIGN KEY ("companyId") REFERENCES "company" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

        CREATE  INDEX "user_companyId_index" ON "user" ("companyId" ASC);
        CREATE UNIQUE INDEX "user_email_unique_index" ON "user" ("email" ASC);
        CREATE  INDEX "user_passwordResetGuid_index" ON "user" ("passwordResetGuid" ASC);


CREATE OR REPLACE FUNCTION notify_order_insert()
        RETURNS TRIGGER AS $$
DECLARE
        query_metadata JSON;
BEGIN
        SELECT INTO query_metadata
                        (regexp_match(
                                        current_query(),
                                        '^--QUERY_METADATA\\(({.*})', 'n'
                        ))[1]::json;

        PERFORM pg_notify(
                'insert',
                json_build_object(
                                                'table', 'order',
                                                'queryMetadata', query_metadata,
                                                'insertedId', NEW.id,
                                                'record', NEW
                )::text
                );

        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "order_insert"
        AFTER INSERT ON "order"
        FOR EACH ROW
EXECUTE FUNCTION notify_order_insert();


CREATE OR REPLACE FUNCTION notify_order_update()
        RETURNS TRIGGER AS $$
DECLARE
        query_metadata JSON;
BEGIN
        SELECT INTO query_metadata
                                (regexp_match(
                                                current_query(),
                                                '^--QUERY_METADATA\\(({.*})', 'n'
                                ))[1]::json;

        PERFORM pg_notify(
                'update',
                json_build_object(
                                                'table', 'order',
                                                'queryMetadata', query_metadata,
                                                'changedId', NEW.id,
                                                'record', NEW, 
                                                'previousRecord', OLD
                )::text
                );
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER order_update
        AFTER UPDATE ON "order"
        FOR EACH ROW
EXECUTE FUNCTION notify_order_update();


CREATE OR REPLACE FUNCTION notify_order_delete()
        RETURNS TRIGGER AS $$
DECLARE
        query_metadata JSON;
BEGIN
        SELECT INTO query_metadata
                        (regexp_match(
                                        current_query(),
                                        '^--QUERY_METADATA\\(({.*})', 'n'
                        ))[1]::json;

        PERFORM pg_notify(
                'delete',
                json_build_object(
                                                'table', 'order',
                                                'queryMetadata', query_metadata,
                                                'deletedId', OLD.id,
                                                'previousRecord', OLD
                )::text
                );
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "order_delete"
        AFTER DELETE ON "order"
        FOR EACH ROW
EXECUTE FUNCTION notify_order_delete();


CREATE OR REPLACE FUNCTION notify_user_insert()
        RETURNS TRIGGER AS $$
DECLARE
        query_metadata JSON;
BEGIN
        SELECT INTO query_metadata
                        (regexp_match(
                                        current_query(),
                                        '^--QUERY_METADATA\\(({.*})', 'n'
                        ))[1]::json;

        PERFORM pg_notify(
                'insert',
                json_build_object(
                                                'table', 'user',
                                                'queryMetadata', query_metadata,
                                                'insertedId', NEW.id,
                                                'record', json_build_object(
                                                        'firstName', NEW."firstName",
'lastName', NEW."lastName",
'email', NEW."email",
'role', NEW."role",
'phone', NEW."phone",
'accountStatus', NEW."accountStatus",
'onboardingStatus', NEW."onboardingStatus"
                                                )
                )::text
                );

        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "user_insert"
        AFTER INSERT ON "user"
        FOR EACH ROW
EXECUTE FUNCTION notify_user_insert();


CREATE OR REPLACE FUNCTION notify_user_update()
        RETURNS TRIGGER AS $$
DECLARE
        query_metadata JSON;
BEGIN
        SELECT INTO query_metadata
                                (regexp_match(
                                                current_query(),
                                                '^--QUERY_METADATA\\(({.*})', 'n'
                                ))[1]::json;

        PERFORM pg_notify(
                'update',
                json_build_object(
                                                'table', 'user',
                                                'queryMetadata', query_metadata,
                                                'changedId', NEW.id,
                                                'record', json_build_object(
                                                        'firstName', NEW."firstName",
'lastName', NEW."lastName",
'email', NEW."email",
'role', NEW."role",
'phone', NEW."phone",
'accountStatus', NEW."accountStatus",
'onboardingStatus', NEW."onboardingStatus"
                                                ),
                                                'previousRecord', json_build_object(
                                                        'firstName', OLD."firstName",
'lastName', OLD."lastName",
'email', OLD."email",
'role', OLD."role",
'phone', OLD."phone",
'accountStatus', OLD."accountStatus",
'onboardingStatus', OLD."onboardingStatus"
                                                )
                )::text
                );
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER user_update
        AFTER UPDATE ON "user"
        FOR EACH ROW
EXECUTE FUNCTION notify_user_update();


CREATE OR REPLACE FUNCTION notify_user_delete()
        RETURNS TRIGGER AS $$
DECLARE
        query_metadata JSON;
BEGIN
        SELECT INTO query_metadata
                        (regexp_match(
                                        current_query(),
                                        '^--QUERY_METADATA\\(({.*})', 'n'
                        ))[1]::json;

        PERFORM pg_notify(
                'delete',
                json_build_object(
                                                'table', 'user',
                                                'queryMetadata', query_metadata,
                                                'deletedId', OLD.id,
                                                'previousRecord', json_build_object(
                                                        'firstName', OLD."firstName",
'lastName', OLD."lastName",
'email', OLD."email",
'role', OLD."role",
'phone', OLD."phone",
'accountStatus', OLD."accountStatus",
'onboardingStatus', OLD."onboardingStatus"
                                                )
                )::text
                );
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
			// const psqlEngine = new PsqlEngine(psqlPool);
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
				getAllUsersRoleAdminRouteData,
				sampleSchema
			)) as {
				data: DynamicObject[];
				total: number;
			};
			expect(response?.data.length).to.greaterThan(1);
			expect(response?.total).to.greaterThan(1);
		});
		it('should executeGetRequest with like', async () => {
			const searchRequest: RsRequest = {
				requesterDetails: {
					role: 'admin',
					host: 'google.com',
					ipAddress: '1.1.1.1',
					userId: 1
				},
				data: { search: 'Tan' }
			} as unknown as RsRequest;
			const response = (await psqlEngine['executeGetRequest'](
				searchRequest,
				getUserLikeFirstNameRouteData,
				sampleSchema
			)) as DynamicObject;
			expect(response?.length).to.be.greaterThan(0);
		});
		it('should executeGetRequest', async () => {
			const response = (await psqlEngine['executeGetRequest'](
				basicAdminRequest,
				patchUserRouteData,
				sampleSchema
			)) as DynamicObject;
			expect(response?.id).to.equal(1);
			expect(response?.firstName).to.equal('Tanner');
			expect(response?.lastName).to.equal('Burton');
			expect(response?.email).to.equal('tanner@plvr.com');
		});

		it('should handle custom selector with case statement', async () => {
			const responseData: ResponseData = {
				name: 'statusLabel',
				selector:
					"CASE WHEN \"user\".\"accountStatus\" = 'active' THEN 'Active' WHEN \"user\".\"accountStatus\" = 'banned' THEN 'Banned' ELSE 'View Only' END",
				type: 'string'
			};
			const routeData = { ...patchUserRouteData, response: [responseData] };
			const response = (await psqlEngine['executeGetRequest'](
				basicAdminRequest,
				routeData,
				sampleSchema
			)) as DynamicObject;
			expect(response?.statusLabel).to.equal('View Only');
		});

		it('should handle custom selector with string concatenation', async () => {
			const responseData: ResponseData = {
				name: 'fullName',
				selector: '"user"."firstName" || \' \' || "user"."lastName"',
				type: 'string'
			};
			const routeData = { ...patchUserRouteData, response: [responseData] };
			const response = (await psqlEngine['executeGetRequest'](
				basicAdminRequest,
				routeData,
				sampleSchema
			)) as DynamicObject;
			expect(response?.fullName).to.equal('Tanner Burton');
		});

		it('should handle custom selector with date formatting', async () => {
			const responseData: ResponseData = {
				name: 'formattedDate',
				selector: 'to_char("user"."createdOn", \'YYYY-MM-DD\')',
				type: 'string'
			};
			const routeData = { ...patchUserRouteData, response: [responseData] };
			const response = (await psqlEngine['executeGetRequest'](
				basicAdminRequest,
				routeData,
				sampleSchema
			)) as DynamicObject;
			expect(response?.formattedDate).to.match(/^\d{4}-\d{2}-\d{2}$/);
		});

		it('should handle custom selector with param keywords', async () => {
			const responseData: ResponseData = {
				name: 'isUserIdEqual',
				selector: '(CASE WHEN "user"."id" = $id THEN TRUE ELSE FALSE END)',
				type: 'boolean'
			};
			const request = [
				{
					name: 'id',
					required: true,
					validator: [{ type: 'TYPE_CHECK', value: 'number' }]
				}
			] as unknown as RequestData[];
			const routeData = { ...patchUserRouteData, response: [responseData], request };
			const response = (await psqlEngine['executeGetRequest'](
				basicAdminRequest,
				routeData,
				sampleSchema
			)) as DynamicObject;
			expect(response?.isUserIdEqual).to.equal(true);
		});

		it('should handle custom selector with param keywords that are null', async () => {
			const responseData: ResponseData = {
				name: 'isUserIdEqual',
				selector: '(CASE WHEN $id::integer IS NULL THEN TRUE ELSE FALSE END)',
				type: 'boolean'
			};
			const request = [
				{
					name: 'id',
					required: false,
					isNullable: true,
					validator: [{ type: 'TYPE_CHECK', value: 'number' }]
				}
			] as unknown as RequestData[];
			const routeData = { ...patchUserRouteData, response: [responseData], request };
			const nullRequest = { ...basicAdminRequest, data: { id: null } } as unknown as RsRequest;
			const response = (await psqlEngine['executeGetRequest'](
				nullRequest,
				routeData,
				sampleSchema
			)) as DynamicObject;
			expect(response?.isUserIdEqual).to.equal(true);
		});
	});
	describe('PsqlEngine events', () => {
		it('should receive notification of user row being inserted', function (done) {
			const email = `${Date.now()}@plvr.com`;
			let doneCalled = false;
			eventManager.addRowInsertHandler<{ email: string; metadata: undefined }>(
				async function (data) {
					if (doneCalled) return;
					try {
						expect(data.queryMetadata.role).to.equal('admin');
						expect(data.queryMetadata.host).to.equal('google.com');
						expect(data.queryMetadata.ipAddress).to.equal('1.1.1.1');
						expect(data.queryMetadata.userId).to.equal(1);
						expect(data.insertedId).to.be.greaterThan(0);
						expect(data.insertObject.email).to.equal(email);
						expect(data.insertObject.metadata).to.equal(undefined);
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
				scopes: [],
				host: 'google.com',
				ipAddress: '1.1.1.1',
				userId: 1
			};
			const createRequest: RsRequest = {
				requesterDetails,
				data: getData()
			} as unknown as RsRequest;
			getEventPsqlEngine().setupTriggerListeners!.then(() => {
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
				eventManager.addColumnChangeHandler<{ firstName: string }>(
					async function (data) {
						if (calledHandler) return;
						calledHandler = true;
						try {
							expect(data.queryMetadata.role).to.equal('admin');
							expect(data.queryMetadata.host).to.equal('google.com');
							expect(data.queryMetadata.ipAddress).to.equal('1.1.1.1');
							expect(data.changedId).to.equal(1);
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
				await MiscUtils.sleep(10); //TODO optimize - Give time for the event to be processed on slower machines
				const resetUserRequest = {
					...updateRequest,
					body: { id: 1, firstName: 'Tanner', permissionLogin: true }
				} as unknown as RsRequest;
				await getEventPsqlEngine()['executeUpdateRequest'](resetUserRequest, patchUserRouteData, sampleSchema);
			})();
		});
		it('should receive notification of user row being deleted', function (done) {
			(async () => {
				const email = `${Date.now()}@plvr.com`;
				let doneCalled = false;
				eventManager.addRowDeleteHandler<{ email: string; metadata: undefined }>(
					async function (data) {
						console.log(data);
						if (doneCalled) return;
						try {
							expect(data.queryMetadata.role).to.equal('admin');
							expect(data.queryMetadata.host).to.equal('google.com');
							expect(data.queryMetadata.ipAddress).to.equal('1.1.1.1');
							expect(data.queryMetadata.userId).to.equal(1);
							expect(data.deletedId).to.equal(createResponse.id);
							expect(data.deletedRow.email).to.equal(email);
							expect(data.deletedRow.metadata).to.equal(undefined);
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
					return {
						firstName: 'Billy',
						lastName: 'Bob',
						companyId: 1,
						password: 'asdfa',
						email,
						role: 'user'
					};
				};
				const requesterDetails: RequesterDetails = {
					role: 'admin',
					scopes: [],
					host: 'google.com',
					ipAddress: '1.1.1.1',
					userId: 1
				};
				const createRequest: RsRequest = {
					requesterDetails,
					data: getData()
				} as unknown as RsRequest;
				const createResponse = await getEventPsqlEngine()['executeCreateRequest'](
					cloneDeep(createRequest),
					patchUserRouteData,
					sampleSchema
				);
				expect(createResponse?.id).to.be.greaterThan(0);

				const deleteRequest: RsRequest = {
					requesterDetails,
					data: { id: createResponse.id }
				} as unknown as RsRequest;
				await getEventPsqlEngine().setupTriggerListeners;
				await getEventPsqlEngine()['executeDeleteRequest'](deleteRequest, deleteUserRouteData, sampleSchema);
			})();
		});
	});

	describe('PsqlEngine executeUpdateRequest', () => {
		const psqlEngine = new PsqlEngine(psqlPool);
		it('should executeUpdateRequest', async () => {
			const updateRequest: RsRequest = {
				requesterDetails: {
					role: 'admin',
					scopes: [],
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
		it('should executeUpdateRequest with an assignment', async () => {
			const updateRequest: RsRequest = {
				requesterDetails: {
					role: 'admin',
					scopes: [],
					host: 'google.com',
					ipAddress: '1.1.1.1',
					userId: 1
				},
				body: {}
			} as unknown as RsRequest;
			const response = await psqlEngine['executeUpdateRequest'](
				updateRequest,
				patchUserClearGuidRouteData,
				sampleSchema
			);
			expect(response?.id).to.equal(1);
			expect(response?.passwordResetGuid).to.equal('');
		});
	});
	describe('PsqlEngine executeCreateRequest', () => {
		it('should executeCreateRequest', async () => {
			const email = `${Date.now()}@plvr.com`;
			const createRequest: RsRequest = {
				requesterDetails: {
					role: 'admin',
					scopes: [],
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
				eventManager.addRowDeleteHandler<{ amountCents: number; userId: number }>(
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
						scopes: [],
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
						scopes: [],
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
					scopes: [],
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
		const psqlEngine = new PsqlEngine(psqlPool);
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
		const psqlEngine = new PsqlEngine(psqlPool);
		it('should format the ORDER BY', () => {
			const orderBy = psqlEngine['generateOrderBy'](basicAdminRequest, patchUserRouteData);
			expect(trimRedundantWhitespace(orderBy)).to.equal(`ORDER BY "user"."lastName" DESC`);
		});
		it('should format the ORDER BY when it is passed by the client in (req.data.sortBy)', () => {
			const routeData = JSON.parse(JSON.stringify(patchUserRouteData));
			const req = JSON.parse(JSON.stringify(basicAdminRequest));
			routeData.type = 'PAGED';
			req.data.sortBy = '"user"."firstName"';
			const orderBy = psqlEngine['generateOrderBy'](req, routeData);
			expect(trimRedundantWhitespace(orderBy)).to.equal(`ORDER BY "user"."firstName" ASC`);
		});
		it('should prevent sortOrder sql injection', () => {
			const routeData = JSON.parse(JSON.stringify(patchUserRouteData));
			const req = JSON.parse(JSON.stringify(basicAdminRequest));
			routeData.type = 'PAGED';
			req.data.sortBy = '"user"."firstName"';
			req.data.sortOrder = '; DROP SOME DB;';
			const orderBy = psqlEngine['generateOrderBy'](req, routeData);
			expect(trimRedundantWhitespace(orderBy)).to.equal(`ORDER BY "user"."firstName" ASC`);
		});
		it('should prevent sortBy sql injection', () => {
			const routeData = JSON.parse(JSON.stringify(patchUserRouteData));
			const req = JSON.parse(JSON.stringify(basicAdminRequest));
			routeData.type = 'PAGED';
			req.data.sortBy = '; DROP SOME DB;';
			req.data.sortOrder = 'DESC';
			const orderBy = psqlEngine['generateOrderBy'](req, routeData);
			expect(trimRedundantWhitespace(orderBy)).to.equal(`ORDER BY "; DROP SOME DB;" DESC`);
		});
	});

	describe('PsqlEngine createNestedSelect', () => {
		it('should call createNestedSelect twice to test recursion', () => {
			const psqlEngine = new PsqlEngine(psqlPool);
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
				basicAdminRequest,
				sampleSchema,
				responseData,
				patchUserRouteData,
				[]
			);
			const expected = `COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT( 'id', "order"."id", 'amountCents', "order"."amountCents", 'items',
                                                 COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT( 'id', "item"."id", 'orderId', "item"."orderId" ))
                                                          FROM "item" ), '[]') ))
                FROM "order" ), '[]')`;
			expect(trimRedundantWhitespace(response)).to.equal(trimRedundantWhitespace(expected));
		});
		it('should call createNestedSelect twice to test recursion with a where clause', () => {
			const psqlEngine = new PsqlEngine(psqlPool);
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
				basicAdminRequest,
				sampleSchema,
				responseData,
				patchUserRouteData,
				[]
			);
			const expected = `COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT( 'id', "order"."id", 'amountCents', "order"."amountCents", 'items',
                                                 COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT( 'id', "item"."id", 'orderId', "item"."orderId" ))
                                                          FROM "item" WHERE "item"."orderId" = 1 ), '[]') ))
                FROM "order" ), '[]')`;
			expect(trimRedundantWhitespace(response)).to.equal(trimRedundantWhitespace(expected));
		});
		it('should call createNestedSelect', () => {
			const psqlEngine = new PsqlEngine(psqlPool);
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
				basicAdminRequest,
				sampleSchema,
				responseData,
				patchUserRouteData,
				[]
			);
			const expected = `COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT(
                                           'id', "order"."id", 'amountCents', "order"."amountCents"
                                       )) FROM "order" ), '[]')`;
			expect(trimRedundantWhitespace(response)).to.equal(trimRedundantWhitespace(expected));
		});
		it('should call createNestedSelect with a where clause', () => {
			const psqlEngine = new PsqlEngine(psqlPool);
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
				basicAdminRequest,
				sampleSchema,
				responseData,
				patchUserRouteData,
				[]
			);
			const expected = `COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT(
                                           'id', "order"."id", 'amountCents', "order"."amountCents"
                                       )) FROM "order"  WHERE "order"."userId" = 999 ), '[]')`;
			expect(trimRedundantWhitespace(response)).to.equal(trimRedundantWhitespace(expected));
		});
		it('should call createNestedSelect with a where clause and column name', () => {
			const psqlEngine = new PsqlEngine(psqlPool);
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
				basicAdminRequest,
				sampleSchema,
				responseData,
				patchUserRouteData,
				[]
			);
			const expected = `COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT(
                                           'id', "order"."id", 'amountCents', "order"."amountCents"
                                       )) FROM "order"  WHERE "order"."userId" = "company"."id" ), '[]')`;
			expect(trimRedundantWhitespace(response)).to.equal(trimRedundantWhitespace(expected));
		});
	});

	describe('PsqlEngine generateJoinStatements', () => {
		const psqlEngine = new PsqlEngine(psqlPool);
		it('should generateJoinStatements', () => {
			const joins: JoinData[] = [
				{
					table: 'company',
					localColumnName: 'companyId',
					foreignColumnName: 'id',
					type: 'LEFT',
					alias: 'companyId_company'
				},
				{
					table: 'order',
					localColumnName: 'id',
					foreignColumnName: 'userId',
					type: 'INNER',
					alias: 'userId_order'
				}
			];
			const baseTable: string = 'user';
			const routeData: StandardRouteData | CustomRouteData = patchUserRouteData;
			const schema: ResturaSchema = sampleSchema;
			const response = psqlEngine['generateJoinStatements'](
				basicAdminRequest,
				joins,
				baseTable,
				routeData,
				schema,
				[]
			);
			expect(trimRedundantWhitespace(response)).to.equal(
				'LEFT JOIN "company" AS "companyId_company" ON "user"."companyId" = "companyId_company"."id" INNER JOIN "order" AS "userId_order" ON "user"."id" = "userId_order"."userId"'
			);
		});
		it('should generateJoinStatements with multi joins', () => {
			const joins: JoinData[] = [
				{
					table: 'user',
					foreignColumnName: 'id',
					localColumnName: 'userId',
					type: 'INNER',
					alias: 'userId_user'
				},
				{
					table: 'company',
					foreignColumnName: 'id',
					localTable: 'user',
					localTableAlias: 'userId_user',
					localColumnName: 'companyId',
					type: 'INNER',
					alias: 'companyId_company'
				}
			];
			const baseTable: string = 'order';
			const routeData: StandardRouteData | CustomRouteData = getAllOrdersWithMultiJoinsRouteData;
			const schema: ResturaSchema = sampleSchema;
			const response = psqlEngine['generateJoinStatements'](
				basicAdminRequest,
				joins,
				baseTable,
				routeData,
				schema,
				[]
			);
			expect(trimRedundantWhitespace(response)).to.equal(
				'INNER JOIN "user" AS "userId_user" ON "order"."userId" = "userId_user"."id" INNER JOIN "company" AS "companyId_company" ON "userId_user"."companyId" = "companyId_company"."id"'
			);
		});
		it('should generateJoinStatements with custom join condition', () => {
			const joins: JoinData[] = getAllUsersBeforeDateRouteData.joins;
			const baseTable: string = 'user';
			const routeData: StandardRouteData | CustomRouteData = getAllUsersBeforeDateRouteData;
			const schema: ResturaSchema = sampleSchema;
			const response = psqlEngine['generateJoinStatements'](
				basicAdminRequest,
				joins,
				baseTable,
				routeData,
				schema,
				[]
			);
			expect(trimRedundantWhitespace(response)).to.equal(
				'LEFT JOIN "company" AS "company_newer" ON "user"."companyId" = "company_newer"."id" AND "user"."createdOn" < ?'
			);
		});
	});
	describe('PsqlEngine generateWhereClause', () => {
		const psqlEngine = new PsqlEngine(psqlPool);

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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
			expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."firstName" ILIKE T || '%'`);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
			expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."firstName" ILIKE '%' || T`);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
			expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."firstName" ILIKE '%' || T || '%'`);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
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
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
			expect(trimRedundantWhitespace(response)).to.equal(`WHERE "user"."id" != 0 OR "user"."id" = 0`);
		});

		it('should test custom selector', () => {
			const whereData: WhereData[] = [
				{
					custom: '(CASE WHEN "user"."id" = 0 THEN TRUE ELSE FALSE END)'
				}
			];
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
			expect(trimRedundantWhitespace(response)).to.equal(
				`WHERE (CASE WHEN "user"."id" = 0 THEN TRUE ELSE FALSE END)`
			);
		});

		it('should test custom selector with replaced param keywords', () => {
			const whereData: WhereData[] = [
				{
					custom: '(CASE WHEN "user"."email" = $email AND "user"."id" = #userId THEN TRUE ELSE FALSE END)'
				}
			];
			const sqlParams: string[] = [];
			const request = { ...basicAdminRequest, data: { email: 'test@test.com' } } as unknown as RsRequest;
			const response = psqlEngine['generateWhereClause'](request, whereData, patchUserRouteData, sqlParams);
			expect(trimRedundantWhitespace(response)).to.equal(
				`WHERE (CASE WHEN "user"."email" = ? AND "user"."id" = ? THEN TRUE ELSE FALSE END)`
			);
			expect(sqlParams).to.deep.equal(['test@test.com', 1]);
		});

		it('should test conjunction with custom selector', () => {
			const whereData: WhereData[] = [
				{
					tableName: 'user',
					columnName: 'id',
					operator: '=',
					value: 0
				},
				{
					conjunction: 'AND',
					custom: '(CASE WHEN "user"."id" = 0 THEN TRUE ELSE FALSE END)'
				}
			];
			// use array notation ['generateWhereClause'] to access private methods for unit testing
			const response = psqlEngine['generateWhereClause'](basicAdminRequest, whereData, patchUserRouteData, []);
			expect(trimRedundantWhitespace(response)).to.equal(
				`WHERE "user"."id" = 0 AND (CASE WHEN "user"."id" = 0 THEN TRUE ELSE FALSE END)`
			);
		});
	});
	describe('PsqlEngine should check permissions on table and column', () => {
		it('should get removed column when role does not have permission to column', async () => {
			const modifiedSchema = cloneDeep(sampleSchema);
			// Find the user table and add a role to the firstName column
			const userTable = modifiedSchema.database.find((table) => table.name === 'user');
			if (userTable) {
				userTable.columns.find((column) => column.name === 'firstName')?.roles.push('admin');
			}
			const userRequest = Object.assign({}, basicAdminRequest);
			userRequest.requesterDetails.role = 'user';
			const psqlEngine = new PsqlEngine(psqlPool);
			const response = (await psqlEngine['executeGetRequest'](
				userRequest,
				getAllUsersScopeTestRouteData,
				modifiedSchema
			)) as {
				data: DynamicObject[];
				total: number;
			};
			// We should not have the firstName column
			expect(response.data.length).to.be.greaterThan(0);
			expect(response.data[0].firstName).to.be.eq(undefined);
		});
		it('should throw exception when role has permission to no columns', async () => {
			const modifiedSchema = cloneDeep(sampleSchema);
			// Find the user table and add a role to the firstName column
			const userTable = modifiedSchema.database.find((table) => table.name === 'user');
			if (userTable) {
				userTable.columns.forEach((column) => {
					column.roles.push('admin');
				});
			}
			const userRequest = Object.assign({}, basicAdminRequest);
			userRequest.requesterDetails.role = 'user';
			const psqlEngine = new PsqlEngine(psqlPool);
			try {
				(await psqlEngine['executeGetRequest'](userRequest, getAllUsersScopeTestRouteData, modifiedSchema)) as {
					data: DynamicObject[];
					total: number;
				};
			} catch (error) {
				expect(error).to.be.instanceOf(RsError);
				expect((error as RsError).err).to.be.eq('FORBIDDEN');
			}
		});
		it('should get removed column when scope does not have permission to column', async () => {
			const modifiedSchema = cloneDeep(sampleSchema);
			// Find the user table and add a role to the firstName column
			const userTable = modifiedSchema.database.find((table) => table.name === 'user');
			if (userTable) {
				userTable.columns.find((column) => column.name === 'firstName')?.scopes.push('read:user');
			}
			const psqlEngine = new PsqlEngine(psqlPool);
			const response = (await psqlEngine['executeGetRequest'](
				basicAdminRequest,
				getAllUsersScopeTestRouteData,
				modifiedSchema
			)) as {
				data: DynamicObject[];
				total: number;
			};
			// We should not have the firstName column
			expect(response.data.length).to.be.greaterThan(0);
			expect(response.data[0].firstName).to.be.eq(undefined);
		});
		it('should throw exception when scope has permission to no columns', async () => {
			const modifiedSchema = cloneDeep(sampleSchema);
			// Find the user table and add a role to the firstName column
			const userTable = modifiedSchema.database.find((table) => table.name === 'user');
			if (userTable) {
				userTable.columns.forEach((column) => {
					column.scopes.push('read:user');
				});
			}
			const psqlEngine = new PsqlEngine(psqlPool);
			try {
				(await psqlEngine['executeGetRequest'](
					basicAdminRequest,
					getAllUsersScopeTestRouteData,
					modifiedSchema
				)) as {
					data: DynamicObject[];
					total: number;
				};
			} catch (error) {
				expect(error).to.be.instanceOf(RsError);
				expect((error as RsError).err).to.be.eq('FORBIDDEN');
			}
		});
		it('should get all users with all columns when you have proper scopes', async () => {
			const modifiedSchema = cloneDeep(sampleSchema);
			// Find the user table and add a role to the firstName column
			const userTable = modifiedSchema.database.find((table) => table.name === 'user');
			if (userTable) {
				userTable.columns.forEach((column) => {
					column.scopes.push('read:user');
				});
			}
			const psqlEngine = new PsqlEngine(psqlPool);
			const response = (await psqlEngine['executeGetRequest'](
				permissionCheckScopeOnlyRequest,
				getAllUsersScopeTestRouteData,
				modifiedSchema
			)) as {
				data: DynamicObject[];
				total: number;
			};
			// We should have the firstName column
			expect(response.data.length).to.be.greaterThan(0);
			expect(response.data[0].firstName).to.be.not.eq(undefined);
		});
	});
});
