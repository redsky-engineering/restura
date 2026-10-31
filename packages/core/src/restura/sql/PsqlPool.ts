import pg, { QueryResult, QueryResultRow } from 'pg';
// See this github issue for why we need to do this https://github.com/brianc/node-postgres/issues/2819
import type { ClientConfig, PoolConfig, Pool as PoolType, QueryConfigValues } from 'pg';
import { setTimeout as sleep } from 'timers/promises';
import { logger } from '../../logger/logger.js';
import { RequesterDetails } from '../types/customExpressTypes.js';
import { PsqlConnection } from './PsqlConnection.js';
const { Pool } = pg;

export interface PsqlPoolOptions {
	/** Attempts for the startup connectivity check before the process exits. Default 5. */
	connectAttempts?: number;
	/** Delay before the first retry; doubles on each later retry. Default 1000. */
	connectRetryDelayMs?: number;
}

const systemUser: RequesterDetails = {
	isSystemUser: true,
	role: '',
	host: 'localhost',
	ipAddress: '',
	scopes: []
};

/** Connection settings for a dedicated client that must reach the same server the pool does. */
export function connectionConfigFrom(poolConfig: PoolConfig): ClientConfig {
	return {
		host: poolConfig.host,
		port: poolConfig.port,
		user: poolConfig.user,
		password: poolConfig.password,
		database: poolConfig.database,
		connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
		ssl: poolConfig.ssl,
		keepAlive: poolConfig.keepAlive,
		keepAliveInitialDelayMillis: poolConfig.keepAliveInitialDelayMillis
	};
}

export class PsqlPool extends PsqlConnection {
	public pool: PoolType;
	/** Resolves once the startup connectivity check passes; rejects after the last failed attempt. */
	public readonly ready: Promise<void>;

	constructor(
		public poolConfig: PoolConfig,
		options: PsqlPoolOptions = {}
	) {
		super();
		if (poolConfig.connectionString) {
			let url: URL;
			try {
				url = new URL(poolConfig.connectionString as string);
			} catch {
				throw new Error(`Invalid connectionString: ${poolConfig.connectionString}`);
			}
			poolConfig.host = url.hostname;
			poolConfig.port = url.port ? parseInt(url.port) : 5432;
			poolConfig.user = url.username;
			poolConfig.password = url.password;
			poolConfig.database = url.pathname.replace(/^\//, '');
		}
		poolConfig.keepAlive ??= true;
		this.pool = new Pool(poolConfig);
		// pg-pool already discards the broken idle client; without a listener this event would crash the process
		this.pool.on('error', (error) => {
			logger.error(`Idle PostgreSQL connection lost: ${error.message}`);
		});

		this.ready = this.checkConnection(options.connectAttempts ?? 5, options.connectRetryDelayMs ?? 1000);
		this.ready.catch((error) => {
			if (this.pool.ending) return;
			logger.error('Error connecting to database', error);
			process.exit(1);
		});
	}

	private async checkConnection(attempts: number, retryDelayMs: number): Promise<void> {
		for (let attempt = 1; ; attempt++) {
			try {
				await this.queryOne('SELECT NOW();', [], systemUser);
				logger.info('Connected to PostgreSQL database');
				return;
			} catch (error) {
				if (this.pool.ending || attempt >= attempts) throw error;
				logger.warn(`Database connection attempt ${attempt} of ${attempts} failed, retrying`, error);
				await sleep(retryDelayMs * 2 ** (attempt - 1));
			}
		}
	}

	protected async query<R extends QueryResultRow = QueryResultRow, T extends Array<unknown> = unknown[]>(
		query: string,
		values?: QueryConfigValues<T>
	): Promise<QueryResult<R>> {
		return this.pool.query(query, values) as Promise<QueryResult<R>>;
	}
}
