import { UUID } from 'crypto';
import type { ClientConfig, Client as ClientType, QueryConfigValues, QueryResult, QueryResultRow } from 'pg';
import pg from 'pg';
import { logger } from '../../logger/logger.js';
import { PsqlConnection } from './PsqlConnection.js';

const { Client } = pg;

export class PsqlTransaction extends PsqlConnection {
	public client: ClientType;
	private beginTransactionPromise: Promise<QueryResult<QueryResultRow>>;
	private connectPromise: Promise<ClientType>;

	constructor(
		public clientConfig: ClientConfig,
		instanceId?: UUID
	) {
		super(instanceId);
		this.client = new Client(clientConfig);
		// A dropped connection also rejects the pending query; without a listener the event would crash the process
		this.client.on('error', (error) => {
			logger.error(`PostgreSQL transaction connection lost: ${error.message}`);
		});
		this.connectPromise = this.client.connect();
		this.beginTransactionPromise = this.beginTransaction();
		// query() rethrows a failed connect or BEGIN; this keeps the same failure from also surfacing as an unhandled rejection
		this.beginTransactionPromise.catch(() => undefined);
	}
	async close() {
		if (this.client) {
			await this.client.end();
		}
	}

	private async beginTransaction() {
		await this.connectPromise;
		return this.client.query('BEGIN');
	}

	async rollback() {
		return this.query('ROLLBACK');
	}

	async commit() {
		return this.query('COMMIT');
	}

	async release() {
		return this.client.end();
	}

	protected async query<R extends QueryResultRow = QueryResultRow, T extends Array<unknown> = unknown[]>(
		query: string,
		values?: QueryConfigValues<T>
	): Promise<QueryResult<R>> {
		await this.connectPromise;
		await this.beginTransactionPromise;
		return this.client.query(query, values);
	}
}
