import pg from 'pg';
import format from 'pg-format';
// See this github issue for why we need to do this https://github.com/brianc/node-postgres/issues/2819
import { PoolConfig, Pool as PoolType, QueryConfigValues } from 'pg';
import { logger } from '../../logger/logger.js';
import { RsError } from '../errors.js';
import { questionMarksToOrderedParams } from './PsqlUtils.js';
const { Pool } = pg;

export class PsqlPool {
	public pool: PoolType;
	constructor(public poolConfig: PoolConfig) {
		this.pool = new Pool(poolConfig);
		// Run a test query to ensure the connection is working
		this.queryOne('SELECT NOW();', [], 0, true)
			.then(() => {
				logger.info('Connected to PostgreSQL database');
			})
			.catch((error) => {
				logger.error('Error connecting to database', error);
				process.exit(1);
			});
	}

	// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	async queryOne(query: string, options: any[], initiatorId: number | undefined, isSystemUser: boolean = false) {
		const formattedQuery = questionMarksToOrderedParams(query);
		this.logSqlStatement(formattedQuery, options, initiatorId, isSystemUser);

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
	async runQuery(query: string, options: any[], initiatorId: number | undefined, isSystemUser: boolean = false) {
		const formattedQuery = questionMarksToOrderedParams(query);
		this.logSqlStatement(formattedQuery, options, initiatorId, isSystemUser);

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

	private logSqlStatement(
		query: string,
		// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		options: any[],
		initiatorId?: number,
		isSystemUser?: boolean,
		prefix: string = ''
	) {
		if (logger.level !== 'silly') return;

		let sqlStatement = '';
		if (options.length === 0) {
			sqlStatement = query;
		} else {
			// The string will contain $1, $2, etc for each parameter, so we need to replace them with the actual values
			let stringIndex = 0;
			sqlStatement = query.replace(/\$\d+/g, () => {
				const value = options[stringIndex++];
				return format.literal(value);
			});
		}

		let initiator = initiatorId ? `Initiator Id (${initiatorId.toString()})` : 'Anonymous';
		initiator = isSystemUser ? 'SYSTEM' : initiator;
		logger.silly(`${prefix}query by ${initiator}, Query ->\n ${sqlStatement}`);
	}
}
