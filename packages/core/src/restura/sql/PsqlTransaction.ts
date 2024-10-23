import type { ClientConfig, Client as ClientType, QueryConfigValues, QueryResult, QueryResultRow } from 'pg';
import pg from 'pg';
import PsqlConnection from './PsqlConnection.js';

const { Client } = pg;

export default class PsqlTransaction extends PsqlConnection {
	public client: ClientType;
	private beginTransactionPromise: Promise<QueryResult<QueryResultRow>>;

	constructor(public clientConfig: ClientConfig) {
		super();
		this.client = new Client(clientConfig);
		this.beginTransactionPromise = this.beginTransaction();
	}

	private async beginTransaction() {
		return this.query('BEGIN');
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
		await this.client.connect();
		await this.beginTransactionPromise;
		return this.client.query(query, values);
	}
}
