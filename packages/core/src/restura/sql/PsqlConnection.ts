import crypto, { UUID } from 'crypto';
import { QueryConfigValues, QueryResult, QueryResultRow } from 'pg';
import format from 'pg-format';
import { format as sqlFormat } from 'sql-formatter';
import { z } from 'zod';
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

	async queryOne<T>(query: string, options: unknown[], requesterDetails: RequesterDetails): Promise<T> {
		const formattedQuery = questionMarksToOrderedParams(query);
		const meta: QueryMetadata = { connectionInstanceId: this.instanceId, ...requesterDetails };
		this.logSqlStatement(formattedQuery, options, meta);
		const queryMetadata = `--QUERY_METADATA(${JSON.stringify(meta)})\n`;

		const startTime = process.hrtime();
		try {
			const response = await this.query(queryMetadata + formattedQuery, options as QueryConfigValues<unknown>);

			this.logQueryDuration(startTime);

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

	async queryOneSchema<T>(
		query: string,
		params: unknown[],
		requesterDetails: RequesterDetails,
		zodSchema: z.ZodSchema<T>
	): Promise<T> {
		const result = await this.queryOne(query, params, requesterDetails);
		try {
			return zodSchema.parse(result);
		} catch (error) {
			if (error instanceof z.ZodError) {
				logger.error('Invalid data returned from database:');
				logger.silly('\n' + JSON.stringify(result, null, 2));
				logger.error('\n' + z.prettifyError(error));
			} else {
				logger.error(error);
			}
			throw new RsError('DATABASE_ERROR', `Invalid data returned from database`);
		}
	}

	async runQuery<T>(query: string, options: unknown[], requesterDetails: RequesterDetails): Promise<T[]> {
		const formattedQuery = questionMarksToOrderedParams(query);
		const meta: QueryMetadata = { connectionInstanceId: this.instanceId, ...requesterDetails };
		this.logSqlStatement(formattedQuery, options, meta);
		const queryMetadata = `--QUERY_METADATA(${JSON.stringify(meta)})\n`;
		const startTime = process.hrtime();
		try {
			const response = await this.query(queryMetadata + formattedQuery, options as QueryConfigValues<unknown>);

			this.logQueryDuration(startTime);

			return response.rows as T[];
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		} catch (error: any) {
			if (error?.routine === '_bt_check_unique') {
				throw new RsError('DUPLICATE', error.message);
			}
			throw new RsError('DATABASE_ERROR', `${error.message}`);
		}
	}

	async runQuerySchema<T>(
		query: string,
		params: unknown[],
		requesterDetails: RequesterDetails,
		zodSchema: z.ZodSchema<T>
	): Promise<T[]> {
		const result = await this.runQuery(query, params, requesterDetails);
		try {
			return z.array(zodSchema).parse(result);
		} catch (error) {
			if (error instanceof z.ZodError) {
				logger.error('Invalid data returned from database:');
				logger.silly('\n' + JSON.stringify(result, null, 2));
				logger.error('\n' + z.prettifyError(error));
			} else {
				logger.error(error);
			}
			throw new RsError('DATABASE_ERROR', `Invalid data returned from database`);
		}
	}

	private logQueryDuration(startTime: [number, number]): void {
		if (logger.level === 'trace') {
			const [seconds, nanoseconds] = process.hrtime(startTime);
			const duration = seconds * 1000 + nanoseconds / 1000000;
			logger.silly(`Query duration: ${duration.toFixed(2)}ms`);
		}
	}

	private logSqlStatement(query: string, options: unknown[], queryMetadata: QueryMetadata, prefix: string = '') {
		if (logger.level !== 'trace') return;

		let sqlStatement = '';
		if (options.length === 0) {
			sqlStatement = query;
		} else {
			sqlStatement = query.replace(/\$\d+/g, (match) => {
				const paramIndex = parseInt(match.substring(1)) - 1; // Extract number from $1, $2, etc.
				if (paramIndex < 0 || paramIndex >= options.length) {
					return 'INVALID_PARAM_INDEX';
				}
				const value = options[paramIndex];
				if (typeof value === 'number') return value.toString();
				if (typeof value === 'boolean') return value.toString();
				return format.literal(value as string | object | Date | null | undefined);
			});
		}

		const formattedSql = sqlFormat(sqlStatement, {
			language: 'postgresql',
			linesBetweenQueries: 2,
			indentStyle: 'standard',
			keywordCase: 'upper',
			useTabs: true,
			tabWidth: 4
		});

		let initiator = 'Anonymous';
		if ('userId' in queryMetadata && queryMetadata.userId)
			initiator = `User Id (${queryMetadata.userId.toString()})`;
		if ('isSystemUser' in queryMetadata && queryMetadata.isSystemUser) initiator = 'SYSTEM';

		logger.silly(`${prefix}query by ${initiator}, Query ->\n${formattedSql}`);
	}
}
