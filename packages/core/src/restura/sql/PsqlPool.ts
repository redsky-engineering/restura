import { Pool, PoolConfig, QueryConfigValues } from 'pg';
import { questionMarksToOrderedParams } from './PsqlUtils.js';
import { RsError } from '../errors.js';

export class PsqlPool {
	public pool: Pool;
	constructor(public poolConfig: PoolConfig) {
		this.pool = new Pool(poolConfig);
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
