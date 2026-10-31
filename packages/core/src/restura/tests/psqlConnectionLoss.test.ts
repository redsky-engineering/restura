import { expect } from 'chai';
import pg from 'pg';
import { setTimeout as sleep } from 'timers/promises';
import { connectionConfigFrom, PsqlPool } from '../sql/PsqlPool.js';
import { PsqlTransaction } from '../sql/PsqlTransaction.js';
import { RequesterDetails } from '../types/customExpressTypes.js';

const serverConfig = {
	host: 'localhost',
	port: 5488,
	user: 'postgres',
	database: 'postgres',
	password: 'postgres',
	connectionTimeoutMillis: 10000
};

const systemUser: RequesterDetails = { isSystemUser: true, role: '', host: '', ipAddress: '', scopes: [] };

async function terminateBackends(applicationName: string): Promise<number> {
	const admin = new pg.Client(serverConfig);
	await admin.connect();
	try {
		const result = await admin.query(
			'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name = $1 AND pid <> pg_backend_pid();',
			[applicationName]
		);
		return result.rowCount ?? 0;
	} finally {
		await admin.end();
	}
}

describe('Postgres connection loss', function () {
	this.timeout(20000);

	it('should keep the process alive and reconnect when an idle pooled connection is terminated', async () => {
		const applicationName = 'restura-test-idle-pool';
		const pool = new PsqlPool({ ...serverConfig, application_name: applicationName, max: 2 });
		try {
			await pool.ready;
			await pool.runQuery('SELECT 1;', [], systemUser);

			expect(await terminateBackends(applicationName)).to.be.greaterThan(0);
			await sleep(200);

			const rows = await pool.runQuery<{ value: number }>('SELECT 1 AS "value";', [], systemUser);
			expect(rows[0].value).to.equal(1);
		} finally {
			await pool.pool.end();
		}
	});

	it('should reject the transaction instead of crashing when its connection is terminated', async () => {
		const applicationName = 'restura-test-transaction';
		const transaction = new PsqlTransaction({ ...serverConfig, application_name: applicationName });
		try {
			await transaction.runQuery('SELECT 1;', [], systemUser);

			expect(await terminateBackends(applicationName)).to.equal(1);
			await sleep(200);

			let error: unknown;
			try {
				await transaction.runQuery('SELECT 1;', [], systemUser);
			} catch (caught) {
				error = caught;
			}
			expect(error).to.not.equal(undefined);
		} finally {
			await transaction.close().catch(() => undefined);
		}
	});

	it('should not leak an unhandled rejection when a transaction fails to connect', async () => {
		const unhandled: unknown[] = [];
		const onUnhandled = (reason: unknown) => unhandled.push(reason);
		process.on('unhandledRejection', onUnhandled);
		try {
			const transaction = new PsqlTransaction({ ...serverConfig, port: 1 });
			let error: unknown;
			try {
				await transaction.runQuery('SELECT 1;', [], systemUser);
			} catch (caught) {
				error = caught;
			}
			expect(error).to.not.equal(undefined);
			await sleep(50);
			expect(unhandled).to.have.length(0);
		} finally {
			process.off('unhandledRejection', onUnhandled);
		}
	});

	it('should retry the startup check and skip the exit once the pool has been ended', async () => {
		const originalExit = process.exit;
		const exitCodes: unknown[] = [];
		process.exit = ((code?: number) => {
			exitCodes.push(code);
		}) as typeof process.exit;
		try {
			const pool = new PsqlPool({ ...serverConfig, port: 1 }, { connectAttempts: 3, connectRetryDelayMs: 50 });
			await sleep(20);
			await pool.pool.end();

			let error: unknown;
			try {
				await pool.ready;
			} catch (caught) {
				error = caught;
			}
			expect(error).to.not.equal(undefined);
			await sleep(20);
			expect(exitCodes).to.have.length(0);
		} finally {
			process.exit = originalExit;
		}
	});

	it('should exit after the last failed startup attempt', async () => {
		const originalExit = process.exit;
		const exitCodes: unknown[] = [];
		process.exit = ((code?: number) => {
			exitCodes.push(code);
		}) as typeof process.exit;
		try {
			const pool = new PsqlPool({ ...serverConfig, port: 1 }, { connectAttempts: 2, connectRetryDelayMs: 10 });
			let error: unknown;
			try {
				await pool.ready;
			} catch (caught) {
				error = caught;
			}
			expect(error).to.not.equal(undefined);
			await sleep(20);
			expect(exitCodes).to.deep.equal([1]);
		} finally {
			process.exit = originalExit;
		}
	});

	it('should default keepAlive on and pass it to dedicated clients', () => {
		const pool = new PsqlPool({ ...serverConfig });
		try {
			expect(pool.poolConfig.keepAlive).to.equal(true);
			expect(connectionConfigFrom(pool.poolConfig)).to.include({ keepAlive: true, database: 'postgres' });
		} finally {
			void pool.pool.end();
		}
	});
});
