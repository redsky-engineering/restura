import pg from 'pg';
import format from 'pg-format';
// See this github issue for why we need to do this https://github.com/brianc/node-postgres/issues/2819
import type { PoolConfig, Pool as PoolType, QueryConfigValues } from 'pg';
import { logger } from '../../logger/logger.js';
import { RsError } from '../errors.js';
import type { RequesterDetails } from '../types/customExpress.types.js';
import { questionMarksToOrderedParams } from './PsqlUtils.js';
const { Pool } = pg;

export class PsqlPool {
	public pool: PoolType;
	constructor(public poolConfig: PoolConfig) {
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

	// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	async queryOne(query: string, options: any[], requesterDetails: RequesterDetails) {
		const formattedQuery = questionMarksToOrderedParams(query);
		this.logSqlStatement(formattedQuery, options, requesterDetails);

		try {
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
			const response = await this.pool.query(formattedQuery, options as QueryConfigValues<any>);
			// There should be one and only one row returned
			if (response.rows.length === 0) throw new RsError('NOT_FOUND', 'No results found');
			else if (response.rows.length > 1) throw new RsError('DUPLICATE', 'More than one result found');

			return response.rows[0];
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		} catch (error: any) {
			console.error(error, query, options);
			if (RsError.isRsError(error)) throw error;

			if (error?.routine === '_bt_check_unique') {
				throw new RsError('DUPLICATE', error.message);
			}
			throw new RsError('DATABASE_ERROR', `${error.message}`);
		}
	}

	// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	async runQuery(query: string, options: any[], requesterDetails: RequesterDetails) {
		const formattedQuery = questionMarksToOrderedParams(query);
		this.logSqlStatement(formattedQuery, options, requesterDetails);

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
		requesterDetails: RequesterDetails,
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
				if (typeof value === 'number') return value.toString();
				return format.literal(value);
			});
		}

		let initiator = 'Anonymous';
		if ('userId' in requesterDetails && requesterDetails.userId)
			initiator = `User Id (${requesterDetails.userId.toString()})`;
		if ('isSystemUser' in requesterDetails && requesterDetails.isSystemUser) initiator = 'SYSTEM';

		logger.silly(`${prefix}query by ${initiator}, Query ->\n ${sqlStatement}`);
	}
}
