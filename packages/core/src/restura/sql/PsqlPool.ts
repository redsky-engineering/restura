import pg from 'pg';
// See this github issue for why we need to do this https://github.com/brianc/node-postgres/issues/2819
import { PoolConfig, Pool as PoolType, QueryConfigValues } from 'pg';
import { RsError } from '../errors.js';
import { questionMarksToOrderedParams } from './PsqlUtils.js';
import { logger } from '../../logger/logger.js';
const { Pool } = pg;

export class PsqlPool {
	public pool: PoolType;
	constructor(public poolConfig: PoolConfig) {
		this.pool = new Pool(poolConfig);
		// Run a test query to ensure the connection is working
		this.queryOne('SELECT NOW()', [])
			.then(() => {
				logger.info('Connected to PostgreSQL database');
			})
			.catch((error) => {
				logger.error('Error connecting to database', error);
				process.exit(1);
			});
	}

	// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	async queryOne(query: string, options: Array<any>) {
		const formattedQuery = questionMarksToOrderedParams(query);
		try {
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
			const response = await this.pool.query(formattedQuery, options as QueryConfigValues<any>);
			return response.rows[0];
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		} catch (error: any) {
			console.error(error, query, options);
			if (error?.routine === '_bt_check_unique') {
				throw new RsError('DUPLICATE', error.message);
			}
			throw new RsError('DATABASE_ERROR', `${error.message}`);
		}
	}

	// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	async runQuery(query: string, options: any[]) {
		const formattedQuery = questionMarksToOrderedParams(query);
		const queryUpdated = query.replace(/[\t\n]/g, ' ');
		console.log(queryUpdated, options);
		try {
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
			const response = await this.pool.query(formattedQuery, options as QueryConfigValues<any>);
			return response.rows;
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		} catch (error: any) {
			console.error(error, query, options);
			if (error?.routine === '_bt_check_unique') {
				throw new RsError('DUPLICATE', error.message);
			}
			throw new RsError('DATABASE_ERROR', `${error.message}`);
		}
	}
}
