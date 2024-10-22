import { QueryConfigValues, QueryResult, QueryResultRow } from 'pg';
import { RequesterDetails } from '../types/customExpress.types.js';
import { questionMarksToOrderedParams } from './PsqlUtils.js';
import { RsError } from '../errors.js';
import { logger } from '../../logger/logger.js';
import format from 'pg-format';

export default class PsqlConnection {
	constructor() {}

	protected async query<R extends QueryResultRow = any>(
		query: string,
		values?: QueryConfigValues<any>
	): Promise<QueryResult<R>> {
		return {} as unknown as QueryResult<R>;
	}

	// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	async queryOne(query: string, options: any[], requesterDetails: RequesterDetails) {
		const formattedQuery = questionMarksToOrderedParams(query);
		this.logSqlStatement(formattedQuery, options, requesterDetails);

		try {
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
			const response = await this.query(formattedQuery, options as QueryConfigValues<any>);
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

		try {
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
			const response = await this.query(formattedQuery, options as QueryConfigValues<any>);
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
