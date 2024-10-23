import pg, { QueryResult, QueryResultRow } from 'pg';
// See this github issue for why we need to do this https://github.com/brianc/node-postgres/issues/2819
import type { PoolConfig, Pool as PoolType, QueryConfigValues } from 'pg';
import { logger } from '../../logger/logger.js';
import PsqlConnection from './PsqlConnection.js';
const { Pool } = pg;

export class PsqlPool extends PsqlConnection {
	public pool: PoolType;
	constructor(public poolConfig: PoolConfig) {
		super();
		this.pool = new Pool(poolConfig);
		// Run a test query to ensure the connection is working
		this.queryOne('SELECT NOW();', [], { isSystemUser: true, role: '', host: 'localhost', ipAddress: '' })
			.then(() => {
				logger.info('Connected to PostgreSQL database');
			})
			.catch((error) => {
				logger.error('Error connecting to database', error);
				process.exit(1);
			});
	}

	protected async query<R extends QueryResultRow = QueryResultRow, T extends Array<unknown> = unknown[]>(
		query: string,
		values?: QueryConfigValues<T>
	): Promise<QueryResult<R>> {
		return this.pool.query(query, values) as Promise<QueryResult<R>>;
	}
}
