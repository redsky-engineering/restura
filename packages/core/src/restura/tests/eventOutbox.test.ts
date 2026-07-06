import { expect } from 'chai';
import eventManager, { ActionColumnChangeData, ActionRowInsertData, EventManager } from '../eventManager.js';
import type { ResturaSchema } from '../schemas/resturaSchema.js';
import { EventOutboxConsumer } from '../sql/eventOutbox.js';
import { PsqlPool } from '../sql/PsqlPool.js';
import {
	createDeleteTriggerSql,
	createInsertTriggerSql,
	createOutboxTableSql,
	createUpdateTriggerSql,
	isSensitiveColumnName,
	OUTBOX_TABLE_NAME
} from '../sql/psqlSchemaUtils.js';
import { RequesterDetails } from '../types/customExpressTypes.js';

const clientConfig = {
	host: 'localhost',
	port: 5488,
	user: 'postgres',
	database: 'postgres',
	password: 'postgres',
	max: 5,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 10000
};

const requesterDetails: RequesterDetails = {
	role: 'admin',
	scopes: [],
	host: 'google.com',
	ipAddress: '1.1.1.1',
	userId: 1
};

describe('sensitive column denylist', () => {
	it('should flag secret-looking column names', () => {
		for (const name of [
			'password',
			'passwordResetGuid',
			'refreshToken',
			'secretKey',
			'webhookSecret',
			'credentials',
			'apiKey'
		]) {
			expect(isSensitiveColumnName(name), name).to.equal(true);
		}
	});

	it('should not flag ordinary column names', () => {
		for (const name of ['firstName', 'email', 'status', 'keyboardLayout', 'monkeyId']) {
			expect(isSensitiveColumnName(name), name).to.equal(false);
		}
	});

	it('should throw when a sensitive column is explicitly listed in notify', () => {
		expect(() => createInsertTriggerSql('user', ['email', 'password'])).to.throw(/sensitive column/);
	});

	it('should allow a sensitive column when force-included with a ! prefix', () => {
		const sql = createInsertTriggerSql('user', ['email', '!password']);
		expect(sql).to.contain(`'password', NEW."password"`);
	});

	it('should exclude sensitive columns when expanding ALL with known table columns', () => {
		const sql = createUpdateTriggerSql('user', 'ALL', {
			tableColumns: ['id', 'email', 'password', 'passwordResetGuid']
		});
		expect(sql).to.contain(`'email', NEW."email"`);
		expect(sql).to.not.contain('password');
	});
});

describe('outbox trigger sql generation', () => {
	it('should insert into the outbox and notify only the outbox id', () => {
		const sql = createInsertTriggerSql('user', ['email'], { delivery: 'outbox', channel: 'test_channel' });
		expect(sql).to.contain(`INSERT INTO "${OUTBOX_TABLE_NAME}"`);
		expect(sql).to.contain(`PERFORM pg_notify('test_channel', outbox_id::text);`);
		expect(sql).to.not.contain(`pg_notify(\n\t\t'insert'`);
	});

	it('should include previousRecord on update and null record on delete', () => {
		const updateSql = createUpdateTriggerSql('user', ['email'], { delivery: 'outbox' });
		expect(updateSql).to.contain(`'UPDATE', NEW.id, jsonb_build_object`);
		expect(updateSql).to.contain('WHEN (OLD.* IS DISTINCT FROM NEW.*)');
		const deleteSql = createDeleteTriggerSql('user', ['email'], { delivery: 'outbox' });
		expect(deleteSql).to.contain(`'DELETE', OLD.id, NULL, jsonb_build_object`);
	});
});

describe('notify handler validation', () => {
	const fakeSchema = {
		database: [
			{ name: 'user', notify: ['email', 'status'] },
			{ name: 'company', notify: undefined }
		]
	} as unknown as ResturaSchema;

	it('should pass when handler filters match the notify config', () => {
		const manager = new EventManager();
		manager.addColumnChangeHandler(async () => {}, { tableName: 'user', columns: ['email'] });
		expect(() => manager.validateHandlersAgainstSchema(fakeSchema, 'strict')).to.not.throw();
	});

	it('should throw in strict mode for a column missing from the notify list', () => {
		const manager = new EventManager();
		manager.addColumnChangeHandler(async () => {}, { tableName: 'user', columns: ['partnerId'] });
		expect(() => manager.validateHandlersAgainstSchema(fakeSchema, 'strict')).to.throw(/partnerId/);
	});

	it('should throw in strict mode for a table without notify config', () => {
		const manager = new EventManager();
		manager.addRowInsertHandler(async () => {}, { tableName: 'company' });
		expect(() => manager.validateHandlersAgainstSchema(fakeSchema, 'strict')).to.throw(/no notify config/);
	});

	it('should only warn outside strict mode', () => {
		const manager = new EventManager();
		manager.addColumnChangeHandler(async () => {}, { tableName: 'user', columns: ['partnerId'] });
		expect(() => manager.validateHandlersAgainstSchema(fakeSchema, 'warn')).to.not.throw();
		expect(() => manager.validateHandlersAgainstSchema(fakeSchema, 'off')).to.not.throw();
	});
});

describe('EventOutboxConsumer round trip', function () {
	const pool = new PsqlPool(clientConfig);
	const TEST_TABLE = 'outboxTestWidget';

	before(async function () {
		await pool.runQuery(createOutboxTableSql(), [], requesterDetails);
		await pool.runQuery(
			`DROP TABLE IF EXISTS "${TEST_TABLE}";
			CREATE TABLE "${TEST_TABLE}" ("id" BIGSERIAL PRIMARY KEY, "name" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'new');`,
			[],
			requesterDetails
		);
		const triggerOptions = { delivery: 'outbox' as const };
		await pool.runQuery(
			createInsertTriggerSql(TEST_TABLE, ['name', 'status'], triggerOptions),
			[],
			requesterDetails
		);
		await pool.runQuery(
			createUpdateTriggerSql(TEST_TABLE, ['name', 'status'], triggerOptions),
			[],
			requesterDetails
		);
	});

	after(async function () {
		await pool.runQuery(`DROP TABLE IF EXISTS "${TEST_TABLE}";`, [], requesterDetails);
		await pool.runQuery(`DELETE FROM "${OUTBOX_TABLE_NAME}";`, [], requesterDetails);
		pool.pool.end();
	});

	it('should deliver an insert through the outbox with query metadata', async function () {
		let received: ActionRowInsertData | undefined;
		eventManager.addRowInsertHandler<{ name: string }>(
			async (data) => {
				received = data as ActionRowInsertData;
			},
			{ tableName: TEST_TABLE }
		);

		await pool.runQuery(`INSERT INTO "${TEST_TABLE}" ("name") VALUES (?);`, ['gizmo'], requesterDetails);
		const consumer = new EventOutboxConsumer(pool, { maxAttempts: 3 });
		await consumer.drain();

		expect(received, 'handler should have fired').to.not.equal(undefined);
		expect(received!.tableName).to.equal(TEST_TABLE);
		expect((received!.insertObject as { name: string }).name).to.equal('gizmo');
		expect(received!.queryMetadata.userId).to.equal(1);
		expect(received!.queryMetadata.ipAddress).to.equal('1.1.1.1');

		const pending = await pool.runQuery<{ count: number }>(
			`SELECT COUNT(*)::int AS count FROM "${OUTBOX_TABLE_NAME}" WHERE "processedOn" IS NULL;`,
			[],
			requesterDetails
		);
		expect(pending[0].count).to.equal(0);
	});

	it('should deliver an update with old and new data in order', async function () {
		const changes: ActionColumnChangeData[] = [];
		eventManager.addColumnChangeHandler<{ status: string }>(
			async (data) => {
				changes.push(data as ActionColumnChangeData);
			},
			{ tableName: TEST_TABLE, columns: ['status'] }
		);

		await pool.runQuery(
			`INSERT INTO "${TEST_TABLE}" ("name", "status") VALUES (?, ?);`,
			['widget', 'new'],
			requesterDetails
		);
		await pool.runQuery(
			`UPDATE "${TEST_TABLE}" SET "status" = ? WHERE "name" = ?;`,
			['active', 'widget'],
			requesterDetails
		);
		await pool.runQuery(
			`UPDATE "${TEST_TABLE}" SET "status" = ? WHERE "name" = ?;`,
			['done', 'widget'],
			requesterDetails
		);

		const consumer = new EventOutboxConsumer(pool, { maxAttempts: 3 });
		await consumer.drain();

		expect(changes.length).to.equal(2);
		expect((changes[0].oldData as { status: string }).status).to.equal('new');
		expect((changes[0].newData as { status: string }).status).to.equal('active');
		expect((changes[1].oldData as { status: string }).status).to.equal('active');
		expect((changes[1].newData as { status: string }).status).to.equal('done');
	});

	it('should not fire the update trigger for no-op updates', async function () {
		await pool.runQuery(`DELETE FROM "${OUTBOX_TABLE_NAME}";`, [], requesterDetails);
		await pool.runQuery(`UPDATE "${TEST_TABLE}" SET "status" = "status";`, [], requesterDetails);
		const rows = await pool.runQuery<{ count: number }>(
			`SELECT COUNT(*)::int AS count FROM "${OUTBOX_TABLE_NAME}";`,
			[],
			requesterDetails
		);
		expect(rows[0].count).to.equal(0);
	});

	it('should retry with backoff and dead-letter a poison event', async function () {
		const POISON_TABLE = 'outboxTestPoison';
		await pool.runQuery(
			`DROP TABLE IF EXISTS "${POISON_TABLE}";
			CREATE TABLE "${POISON_TABLE}" ("id" BIGSERIAL PRIMARY KEY, "name" TEXT NOT NULL);`,
			[],
			requesterDetails
		);
		await pool.runQuery(
			createInsertTriggerSql(POISON_TABLE, ['name'], { delivery: 'outbox' }),
			[],
			requesterDetails
		);
		eventManager.addRowInsertHandler(
			async () => {
				throw new Error('poison');
			},
			{ tableName: POISON_TABLE }
		);

		await pool.runQuery(`INSERT INTO "${POISON_TABLE}" ("name") VALUES (?);`, ['bad'], requesterDetails);
		const consumer = new EventOutboxConsumer(pool, { maxAttempts: 1 });
		await consumer.drain();

		const rows = await pool.runQuery<{ isDeadLetter: boolean; attempts: number }>(
			`SELECT "isDeadLetter", "attempts" FROM "${OUTBOX_TABLE_NAME}" WHERE "tableName" = ?;`,
			[POISON_TABLE],
			requesterDetails
		);
		expect(rows.length).to.equal(1);
		expect(rows[0].attempts).to.equal(1);
		expect(rows[0].isDeadLetter).to.equal(true);

		const stats = await consumer.getStats();
		expect(stats.deadLetterCount).to.equal(1);
		await pool.runQuery(`DROP TABLE IF EXISTS "${POISON_TABLE}";`, [], requesterDetails);
	});
});
