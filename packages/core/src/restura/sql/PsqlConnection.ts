import crypto, { UUID } from 'crypto';
import { QueryConfigValues, QueryResult, QueryResultRow } from 'pg';
import format from 'pg-format';
import { logger } from '../../logger/logger.js';
import { RsError } from '../RsError.js';
import { QueryMetadata } from '../eventManager.js';
import { RequesterDetails } from '../types/customExpressTypes.js';
import { questionMarksToOrderedParams } from './PsqlUtils.js';

export abstract class PsqlConnection {
	readonly instanceId: UUID;
	protected constructor(instanceId?: UUID) {
		this.instanceId = instanceId || crypto.randomUUID();
	}

	protected abstract query<R extends QueryResultRow = QueryResultRow, T extends Array<unknown> = unknown[]>(
		query: string,
		values?: QueryConfigValues<T>
	): Promise<QueryResult<R>>;

	// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	async queryOne<T>(query: string, options: any[], requesterDetails: RequesterDetails): Promise<T> {
		const formattedQuery = questionMarksToOrderedParams(query);
		const meta: QueryMetadata = { connectionInstanceId: this.instanceId, ...requesterDetails };
		this.logSqlStatement(formattedQuery, options, meta);
		const queryMetadata = `--QUERY_METADATA(${JSON.stringify(meta)})\n`;

		try {
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
			const response = await this.query(queryMetadata + formattedQuery, options as QueryConfigValues<any>);
			// There should be one and only one row returned
			if (response.rows.length === 0) throw new RsError('NOT_FOUND', 'No results found');
			else if (response.rows.length > 1) throw new RsError('DUPLICATE', 'More than one result found');

			return response.rows[0] as T;
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		} catch (error: any) {
			if (RsError.isRsError(error)) throw error;

			if (error?.routine === '_bt_check_unique') {
				throw new RsError('DUPLICATE', error.message);
			}
			throw new RsError('DATABASE_ERROR', `${error.message}`);
		}
	}

	// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	async runQuery<T>(query: string, options: any[], requesterDetails: RequesterDetails): Promise<T[]> {
		const formattedQuery = questionMarksToOrderedParams(query);
		const meta: QueryMetadata = { connectionInstanceId: this.instanceId, ...requesterDetails };
		this.logSqlStatement(formattedQuery, options, meta);
		const queryMetadata = `--QUERY_METADATA(${JSON.stringify(meta)})\n`;
		try {
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
			const response = await this.query(queryMetadata + formattedQuery, options as QueryConfigValues<any>);
			return response.rows as T[];
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		} catch (error: any) {
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
		queryMetadata: QueryMetadata,
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
		if ('userId' in queryMetadata && queryMetadata.userId)
			initiator = `User Id (${queryMetadata.userId.toString()})`;
		if ('isSystemUser' in queryMetadata && queryMetadata.isSystemUser) initiator = 'SYSTEM';

		logger.silly(`${prefix}query by ${initiator}, Query ->\n ${sqlStatement}`);
	}
}
