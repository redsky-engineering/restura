import type { ClientConfig, Client as ClientType, QueryConfigValues, QueryResult, QueryResultRow } from 'pg';
import pg from 'pg';
import { PsqlConnection } from './PsqlConnection.js';

const { Client } = pg;

export class PsqlTransaction extends PsqlConnection {
	public client: ClientType;
	private beginTransactionPromise: Promise<QueryResult<QueryResultRow>>;
	private connectPromise: Promise<void>;

	constructor(public clientConfig: ClientConfig) {
		super();
		this.client = new Client(clientConfig);
		this.connectPromise = this.client.connect();
		this.beginTransactionPromise = this.beginTransaction();
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
