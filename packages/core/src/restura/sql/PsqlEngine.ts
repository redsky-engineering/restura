import { ObjectUtils } from '@redskytech/core-utils';
import getDiff from '@wmfs/pg-diff-sync';
import pgInfo from '@wmfs/pg-info';
import type { Client as ClientType } from 'pg';
import pg from 'pg';
import { logger } from '../../logger/logger.js';
import { RsError } from '../RsError.js';
import eventManager, { MutationType, TriggerResult } from '../eventManager.js';
import {
	CustomRouteData,
	JoinData,
	ResponseData,
	ResturaSchema,
	StandardRouteData,
	WhereData,
	type ColumnData
} from '../schemas/resturaSchema.js';
import { DynamicObject, RequesterDetails, RsRequest } from '../types/customExpressTypes.js';
import { PageQuery } from '../types/resturaTypes.js';
import { PsqlPool } from './PsqlPool.js';
import { escapeColumnName, insertObjectQuery, SQL, updateObjectQuery } from './PsqlUtils.js';
import SqlEngine from './SqlEngine.js';
import { SqlUtils } from './SqlUtils.js';
import filterPsqlParser from './filterPsqlParser.js';
const { Client, types } = pg;

const systemUser: RequesterDetails = {
	role: '',
	scopes: [],
	host: '',
	ipAddress: '',
	isSystemUser: true
};

export class PsqlEngine extends SqlEngine {
	setupTriggerListeners: Promise<void> | undefined;
	private triggerClient: ClientType | undefined;
	private scratchDbName: string = '';
	private reconnectAttempts = 0;
	private readonly MAX_RECONNECT_ATTEMPTS = 5;
	private readonly INITIAL_RECONNECT_DELAY = 5000; // 5 seconds

	constructor(
		private psqlConnectionPool: PsqlPool,
		shouldListenForDbTriggers: boolean = false,
		scratchDatabaseSuffix: string = ''
	) {
		super();

		this.setupPgReturnTypes();
		if (shouldListenForDbTriggers) {
			this.setupTriggerListeners = this.listenForDbTriggers();
		}

		this.scratchDbName = `${psqlConnectionPool.poolConfig.database}_scratch${scratchDatabaseSuffix ? `_${scratchDatabaseSuffix}` : ''}`;
	}
	async close() {
		if (this.triggerClient) {
			await this.triggerClient.end();
		}
	}

	private setupPgReturnTypes() {
		// OID for timestamptz in Postgres
		const TIMESTAMPTZ_OID = 1184;
		// Set a custom parser for timestamptz to return an ISO string
		types.setTypeParser(TIMESTAMPTZ_OID, (val) => {
			return val === null ? null : new Date(val).toISOString();
		});
		const BIGINT_OID = 20;
		// Set a custom parser for BIGINT to return a JavaScript Number
		types.setTypeParser(BIGINT_OID, (val) => {
			return val === null ? null : Number(val);
		});
	}

	private async reconnectTriggerClient() {
		if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
			logger.error('Max reconnection attempts reached for trigger client. Stopping reconnection attempts.');
			return;
		}

		if (this.triggerClient) {
			try {
				await this.triggerClient.end();
			} catch (error) {
				logger.error(`Error closing trigger client: ${error}`);
			}
		}

		// Exponential backoff: 5s, 10s, 20s, 40s, 80s
		const delay = this.INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
		logger.info(
			`Attempting to reconnect trigger client in ${delay / 1000} seconds... (Attempt ${this.reconnectAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`
		);

		await new Promise((resolve) => setTimeout(resolve, delay));

		this.reconnectAttempts++;

		try {
			await this.listenForDbTriggers();
			// Reset reconnect attempts on successful connection
			this.reconnectAttempts = 0;
		} catch (error) {
			logger.error(`Reconnection attempt ${this.reconnectAttempts} failed: ${error}`);
			if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
				await this.reconnectTriggerClient();
			}
		}
	}

	private async listenForDbTriggers() {
		this.triggerClient = new Client({
			user: this.psqlConnectionPool.poolConfig.user,
			host: this.psqlConnectionPool.poolConfig.host,
			database: this.psqlConnectionPool.poolConfig.database,
			password: this.psqlConnectionPool.poolConfig.password,
			port: this.psqlConnectionPool.poolConfig.port,
			connectionTimeoutMillis: this.psqlConnectionPool.poolConfig.connectionTimeoutMillis
		});

		try {
			await this.triggerClient.connect();

			const promises = [];
			promises.push(this.triggerClient.query('LISTEN insert'));
			promises.push(this.triggerClient.query('LISTEN update'));
			promises.push(this.triggerClient.query('LISTEN delete'));
			await Promise.all(promises);

			// Add error handling for the connection
			this.triggerClient.on('error', async (error) => {
				logger.error(`Trigger client error: ${error}`);
				// Attempt to reconnect
				await this.reconnectTriggerClient();
			});

			// Handle notifications
			this.triggerClient.on('notification', async (msg) => {
				if (msg.channel === 'insert' || msg.channel === 'update' || msg.channel === 'delete') {
					const payload: TriggerResult = ObjectUtils.safeParse(msg.payload) as TriggerResult;
					await this.handleTrigger(payload, msg.channel.toUpperCase() as MutationType);
				}
			});

			logger.info('Successfully connected to database triggers');
		} catch (error) {
			logger.error(`Failed to setup trigger listeners: ${error}`);
			// Attempt to reconnect
			await this.reconnectTriggerClient();
		}
	}

	private async handleTrigger(payload: TriggerResult, mutationType: MutationType) {
		if (
			payload.queryMetadata &&
			payload.queryMetadata.connectionInstanceId === this.psqlConnectionPool.instanceId
		) {
			await eventManager.fireActionFromDbTrigger({ queryMetadata: payload.queryMetadata, mutationType }, payload);
		}
	}

	async createDatabaseFromSchema(schema: ResturaSchema, connection: PsqlPool): Promise<string> {
		const sqlFullStatement = this.generateDatabaseSchemaFromSchema(schema);
		await connection.runQuery(sqlFullStatement, [], systemUser);
		return sqlFullStatement;
	}

	generateDatabaseSchemaFromSchema(schema: ResturaSchema): string {
		const sqlStatements = [];
		const indexes = [];
		const triggers = [];

		for (const table of schema.database) {
			if (table.notify) {
				triggers.push(this.createInsertTriggers(table.name, table.notify));
				triggers.push(this.createUpdateTrigger(table.name, table.notify));
				triggers.push(this.createDeleteTrigger(table.name, table.notify));
			}

			let sql = `CREATE TABLE "${table.name}"
					   ( `;
			const tableColumns = [];
			for (const column of table.columns) {
				let columnSql = '';

				columnSql += `\t"${column.name}" ${this.schemaToPsqlType(column)}`;
				let value = column.value;
				// JSON's value is used only for typescript not for the database
				if (column.type === 'JSON') value = '';
				if (column.type === 'JSONB') value = '';
				if (column.type === 'DECIMAL' && value) {
					// replace the character '-' with comma since we use it to separate the values in restura for decimals
					// also remove single and double quotes
					value = value.replace('-', ',').replace(/['"]/g, '');
				}
				if (value && column.type !== 'ENUM') {
					columnSql += `(${value})`;
				} else if (column.length) columnSql += `(${column.length})`;
				if (column.isPrimary) {
					columnSql += ' PRIMARY KEY ';
				}
				if (column.isUnique) {
					columnSql += ` CONSTRAINT "${table.name}_${column.name}_unique_index" UNIQUE `;
				}
				if (column.isNullable) columnSql += ' NULL';
				else columnSql += ' NOT NULL';
				if (column.default) columnSql += ` DEFAULT ${column.default}`;
				if (value && column.type === 'ENUM') {
					columnSql += ` CHECK ("${column.name}" IN (${value}))`;
				}
				tableColumns.push(columnSql);
			}
			sql += tableColumns.join(', \n');
			for (const index of table.indexes) {
				if (!index.isPrimaryKey) {
					let unique = ' ';
					if (index.isUnique) unique = 'UNIQUE ';

					indexes.push(
						`\tCREATE ${unique}INDEX "${index.name}" ON "${table.name}" (${index.columns
							.map((item) => {
								return `"${item}" ${index.order}`;
							})
							.join(', ')});`
					);
				}
			}
			sql += '\n);';
			sqlStatements.push(sql);
		}

		// Now setup foreign keys
		for (const table of schema.database) {
			if (!table.foreignKeys.length) continue;
			const sql = `ALTER TABLE "${table.name}" `;
			const constraints: string[] = [];
			for (const foreignKey of table.foreignKeys) {
				let constraint = `\t ADD CONSTRAINT "${foreignKey.name}"
        FOREIGN KEY ("${foreignKey.column}") REFERENCES "${foreignKey.refTable}" ("${foreignKey.refColumn}")`;
				constraint += ` ON DELETE ${foreignKey.onDelete}`;
				constraint += ` ON UPDATE ${foreignKey.onUpdate}`;
				constraints.push(constraint);
			}
			sqlStatements.push(sql + constraints.join(',\n') + ';');
		}

		// Now setup check constraints
		for (const table of schema.database) {
			if (!table.checkConstraints.length) continue;
			const sql = `ALTER TABLE "${table.name}" `;
			const constraints: string[] = [];
			for (const check of table.checkConstraints) {
				const constraint = `ADD CONSTRAINT "${check.name}" CHECK (${check.check})`;
				constraints.push(constraint);
			}
			sqlStatements.push(sql + constraints.join(',\n') + ';');
		}

		sqlStatements.push(indexes.join('\n'));
		sqlStatements.push(triggers.join('\n'));

		return sqlStatements.join('\n\n');
	}

	private async getNewPublicSchemaAndScratchPool(): Promise<PsqlPool> {
		const scratchDbExists = await this.psqlConnectionPool.runQuery<DynamicObject>(
			`SELECT *
             FROM pg_database
             WHERE datname = '${this.scratchDbName}';`,
			[],
			systemUser
		);
		if (scratchDbExists.length === 0) {
			await this.psqlConnectionPool.runQuery(`CREATE DATABASE ${this.scratchDbName};`, [], systemUser);
		}

		const scratchPool = new PsqlPool({
			host: this.psqlConnectionPool.poolConfig.host,
			port: this.psqlConnectionPool.poolConfig.port,
			user: this.psqlConnectionPool.poolConfig.user,
			database: this.scratchDbName,
			password: this.psqlConnectionPool.poolConfig.password,
			max: this.psqlConnectionPool.poolConfig.max,
			idleTimeoutMillis: this.psqlConnectionPool.poolConfig.idleTimeoutMillis,
			connectionTimeoutMillis: this.psqlConnectionPool.poolConfig.connectionTimeoutMillis
		});
		await scratchPool.runQuery(`DROP SCHEMA public CASCADE;`, [], systemUser);
		await scratchPool.runQuery(
			`CREATE SCHEMA public AUTHORIZATION ${this.psqlConnectionPool.poolConfig.user};`,
			[],
			systemUser
		);
		const schemaComment = await this.psqlConnectionPool.runQuery<{ description: string }>(
			`
			SELECT pg_description.description
			FROM pg_description
			JOIN pg_namespace ON pg_namespace.oid = pg_description.objoid
			WHERE pg_namespace.nspname = 'public';`,
			[],
			systemUser
		);
		if (schemaComment[0]?.description) {
			await scratchPool.runQuery(
				`COMMENT ON SCHEMA public IS '${schemaComment[0]?.description}';`,
				[],
				systemUser
			);
		}
		return scratchPool;
	}

	async diffDatabaseToSchema(schema: ResturaSchema): Promise<string> {
		const scratchPool = await this.getNewPublicSchemaAndScratchPool();
		await this.createDatabaseFromSchema(schema, scratchPool);

		const originalClient = new Client({
			database: this.psqlConnectionPool.poolConfig.database,
			user: this.psqlConnectionPool.poolConfig.user,
			password: this.psqlConnectionPool.poolConfig.password,
			host: this.psqlConnectionPool.poolConfig.host,
			port: this.psqlConnectionPool.poolConfig.port
		});
		const scratchClient = new Client({
			database: this.scratchDbName,
			user: this.psqlConnectionPool.poolConfig.user,
			password: this.psqlConnectionPool.poolConfig.password,
			host: this.psqlConnectionPool.poolConfig.host,
			port: this.psqlConnectionPool.poolConfig.port
		});
		const promises = [originalClient.connect(), scratchClient.connect()];
		await Promise.all(promises);

		const infoPromises = [pgInfo({ client: originalClient }), pgInfo({ client: scratchClient })];
		const [info1, info2] = await Promise.all(infoPromises);

		const diff = getDiff(info1, info2);
		const endPromises = [originalClient.end(), scratchClient.end()];
		await Promise.all(endPromises);
		return diff.join('\n');
	}

	protected createNestedSelect(
		req: RsRequest<unknown>,
		schema: ResturaSchema,
		item: ResponseData,
		routeData: StandardRouteData,
		sqlParams: string[]
	): string {
		if (!item.subquery) return '';
		if (
			!ObjectUtils.isArrayWithData(
				item.subquery.properties.filter((nestedItem) => {
					return this.canRequesterAccessColumn(
						req.requesterDetails.role,
						req.requesterDetails.scopes,
						schema,
						nestedItem,
						[...routeData.joins, ...item.subquery!.joins]
					);
				})
			)
		) {
			return "'[]'";
		}

		return `COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT(
			${item.subquery.properties
				.map((nestedItem) => {
					if (
						!this.canRequesterAccessColumn(
							req.requesterDetails.role,
							req.requesterDetails.scopes,
							schema,
							nestedItem,
							[...routeData.joins, ...item.subquery!.joins]
						)
					) {
						return;
					}
					if (nestedItem.subquery) {
						return `'${nestedItem.name}', ${this.createNestedSelect(
							// recursion
							req,
							schema,
							nestedItem,
							routeData,
							sqlParams
						)}`;
					}
					return `'${nestedItem.name}', ${escapeColumnName(nestedItem.selector)}`;
				})
				.filter(Boolean)
				.join(', ')}
						)) 
						FROM
							"${item.subquery.table}"
							${this.generateJoinStatements(req, item.subquery.joins, item.subquery.table, routeData, schema, sqlParams)}
							${this.generateWhereClause(req, item.subquery.where, routeData, sqlParams)}
					), '[]')`;
	}

	protected async executeCreateRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<DynamicObject> {
		const sqlParams: string[] = [];
		const parameterObj: DynamicObject = {};
		(routeData.assignments || []).forEach((assignment) => {
			parameterObj[assignment.name] = this.replaceParamKeywords(assignment.value, routeData, req, sqlParams);
		});

		const query = insertObjectQuery(routeData.table, { ...(req.data as DynamicObject), ...parameterObj });
		const createdItem = await this.psqlConnectionPool.queryOne<DynamicObject & { id: number }>(
			query,
			sqlParams,
			req.requesterDetails
		);
		const insertId = createdItem.id;
		const whereId: WhereData = {
			tableName: routeData.table,
			value: insertId,
			columnName: 'id',
			operator: '='
		};
		const whereData: WhereData[] = [whereId];
		req.data = { id: insertId };
		return this.executeGetRequest(req, { ...routeData, where: whereData }, schema) as Promise<DynamicObject>;
	}

	protected async executeGetRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
		// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	): Promise<DynamicObject | any[]> {
		const DEFAULT_PAGED_PAGE_NUMBER = 0;
		const DEFAULT_PAGED_PER_PAGE_NUMBER = 25;
		const sqlParams: string[] = [];

		let sqlStatement = '';

		const selectColumns: ResponseData[] = [];
		routeData.response.forEach((item) => {
			// For a subquery, we will check the permission when generating the subquery statement, so pass it through
			if (
				item.subquery ||
				this.canRequesterAccessColumn(
					req.requesterDetails.role,
					req.requesterDetails.scopes,
					schema,
					item,
					routeData.joins
				)
			)
				selectColumns.push(item);
		});
		if (!selectColumns.length) throw new RsError('FORBIDDEN', `You do not have permission to access this data.`);
		let selectStatement = 'SELECT \n';
		selectStatement += `\t${selectColumns
			.map((item) => {
				if (item.subquery) {
					return `${this.createNestedSelect(req, schema, item, routeData, sqlParams)} AS ${escapeColumnName(
						item.name
					)}`;
				}
				if (item.type) {
					const selectorWithReplacedKeywords = this.replaceParamKeywords(
						item.selector!,
						routeData,
						req,
						sqlParams
					);
					return `${selectorWithReplacedKeywords} AS ${escapeColumnName(item.name)}`;
				} else {
					return `${escapeColumnName(item.selector)} AS ${escapeColumnName(item.name)}`;
				}
			})
			.join(',\n\t')}\n`;
		sqlStatement += `FROM "${routeData.table}"\n`;
		sqlStatement += this.generateJoinStatements(
			req,
			routeData.joins,
			routeData.table,
			routeData,
			schema,
			sqlParams
		);

		sqlStatement += this.generateWhereClause(req, routeData.where, routeData, sqlParams);

		let groupByOrderByStatement = this.generateGroupBy(routeData);
		groupByOrderByStatement += this.generateOrderBy(req, routeData);

		if (routeData.type === 'ONE') {
			return this.psqlConnectionPool.queryOne(
				`${selectStatement}${sqlStatement}${groupByOrderByStatement};`,
				sqlParams,
				req.requesterDetails
			);
		} else if (routeData.type === 'ARRAY') {
			// Array
			return this.psqlConnectionPool.runQuery(
				`${selectStatement}${sqlStatement}${groupByOrderByStatement};`,
				sqlParams,
				req.requesterDetails
			);
		} else if (routeData.type === 'PAGED') {
			const data = req.data as PageQuery;
			// The COUNT() does not work with group by and order by, so we need to catch that case and act accordingly
			const pagePromise = this.psqlConnectionPool.runQuery(
				`${selectStatement}${sqlStatement}${groupByOrderByStatement}` +
					SQL`LIMIT ${data.perPage || DEFAULT_PAGED_PER_PAGE_NUMBER} OFFSET ${(data.page - 1) * data.perPage || DEFAULT_PAGED_PAGE_NUMBER};`,
				sqlParams,
				req.requesterDetails
			);
			const totalQuery = `SELECT COUNT(${
				routeData.groupBy ? `DISTINCT ${routeData.groupBy.tableName}.${routeData.groupBy.columnName}` : '*'
			}) AS total\n ${sqlStatement};`;
			const totalPromise = this.psqlConnectionPool.runQuery<{ total: number }>(
				totalQuery,
				sqlParams,
				req.requesterDetails
			);

			const [pageResults, totalResponse] = await Promise.all([pagePromise, totalPromise]);

			let total = 0;
			if (ObjectUtils.isArrayWithData(totalResponse)) {
				total = totalResponse[0].total;
			}
			return { data: pageResults, total };
		} else {
			throw new RsError('UNKNOWN_ERROR', 'Unknown route type.');
		}
	}

	/**
	 * Executes an update request. The request will pull out the id and baseSyncVersion from the request body.
	 * (If Present) The baseSyncVersion is used to check if the record has been modified since the last sync.
	 * If the update fails because the baseSyncVersion has changed, a conflict error will be thrown.
	 * IDs can not be updated using this method.
	 * @param req - The request object.
	 * @param routeData - The route data object.
	 * @param schema - The schema object.
	 * @returns The response object.
	 */
	protected async executeUpdateRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<DynamicObject> {
		const sqlParams: string[] = [];
		// eslint-disable-next-line
		const { id, baseSyncVersion, ...bodyNoId } = req.body;

		// Find the database table
		const table = schema.database.find((item) => {
			return item.name === routeData.table;
		});
		if (!table) throw new RsError('UNKNOWN_ERROR', 'Unknown table.');
		if (table.columns.find((column) => column.name === 'modifiedOn')) {
			bodyNoId.modifiedOn = new Date().toISOString();
		}
		// Auto-increment syncVersion on update
		let incrementSyncVersion = false;
		if (table.columns.find((column) => column.name === 'syncVersion')) incrementSyncVersion = true;

		for (const assignment of routeData.assignments) {
			const column = table.columns.find((column) => column.name === assignment.name);
			if (!column) continue;

			const assignmentEscaped = escapeColumnName(assignment.name);

			if (SqlUtils.convertDatabaseTypeToTypescript(column.type!) === 'number')
				bodyNoId[assignmentEscaped] = Number(assignment.value);
			else bodyNoId[assignmentEscaped] = assignment.value;
		}

		// Todo: Add joins back in on the update. They are useful for the where clause but in very rare cases.
		// let joinStatement = this.generateJoinStatements(
		// 	req,
		// 	routeData.joins!,
		// 	routeData.table!,
		// 	routeData!,
		// 	schema,
		// 	req.requesterDetails.role,
		// 	sqlParams
		// );
		let whereClause = this.generateWhereClause(req, routeData.where, routeData, sqlParams);
		const originalWhereClause = whereClause;
		const originalSqlParams = [...sqlParams];
		if (baseSyncVersion) {
			const syncVersionCheck = whereClause ? `${whereClause} AND "syncVersion" = ?` : `"syncVersion" = ?`;
			sqlParams.push(baseSyncVersion.toString());
			whereClause = syncVersionCheck;
		}

		const query = updateObjectQuery(routeData.table, bodyNoId, whereClause, incrementSyncVersion);
		try {
			await this.psqlConnectionPool.queryOne(query, [...sqlParams], req.requesterDetails);
		} catch (error) {
			if (!baseSyncVersion || !(error instanceof RsError) || error.err !== 'NOT_FOUND') throw error;

			// Check if record exists with just the original where clause.
			// If it does, throw a conflict error since the modifiedOn value has changed.
			let isConflict = false;
			try {
				await this.psqlConnectionPool.queryOne(
					`SELECT 1 FROM "${routeData.table}" ${originalWhereClause};`,
					originalSqlParams,
					req.requesterDetails
				);
				isConflict = true;
			} catch {}
			if (isConflict)
				throw new RsError(
					'CONFLICT',
					'The record has been modified since the baseSyncVersion value was provided.'
				);
			throw error;
		}
		return this.executeGetRequest(req, routeData, schema) as unknown as DynamicObject;
	}

	protected async executeDeleteRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<boolean> {
		const sqlParams: string[] = [];

		const joinStatement = this.generateJoinStatements(
			req,
			routeData.joins,
			routeData.table,
			routeData,
			schema,
			sqlParams
		);
		const whereClause = this.generateWhereClause(req, routeData.where, routeData, sqlParams);
		if (whereClause.replace(/\s/g, '') === '') {
			throw new RsError('FORBIDDEN', 'Deletes need a where clause');
		}

		const deleteStatement = `
DELETE FROM "${routeData.table}" ${joinStatement} ${whereClause}`;
		await this.psqlConnectionPool.runQuery(deleteStatement, sqlParams, req.requesterDetails);
		return true;
	}

	protected generateJoinStatements(
		req: RsRequest<unknown>,
		joins: JoinData[],
		baseTable: string,
		routeData: StandardRouteData | CustomRouteData,
		schema: ResturaSchema,
		sqlParams: string[]
	): string {
		let joinStatements = '';
		joins.forEach((item) => {
			if (
				!this.canRequesterAccessTable(
					req.requesterDetails.role,
					req.requesterDetails.scopes,
					schema,
					item.table
				)
			)
				throw new RsError('FORBIDDEN', 'You do not have permission to access this table');
			if (item.custom) {
				const customReplaced = this.replaceParamKeywords(item.custom, routeData, req, sqlParams);
				joinStatements += `\t${item.type} JOIN ${escapeColumnName(item.table)} AS ${escapeColumnName(item.alias)} ON ${customReplaced}\n`;
			} else {
				joinStatements += `\t${item.type} JOIN ${escapeColumnName(item.table)}`;
				joinStatements += ` AS ${escapeColumnName(item.alias)}`;

				if (item.localTable) {
					joinStatements += ` ON ${escapeColumnName(item.localTableAlias)}.${escapeColumnName(item.localColumnName)} = ${escapeColumnName(item.alias)}.${escapeColumnName(
						item.foreignColumnName
					)}\n`;
				} else {
					joinStatements += ` ON ${escapeColumnName(baseTable)}.${escapeColumnName(item.localColumnName)} = ${escapeColumnName(item.alias)}.${escapeColumnName(
						item.foreignColumnName
					)}\n`;
				}
			}
		});
		return joinStatements;
	}

	protected generateGroupBy(routeData: StandardRouteData): string {
		let groupBy = '';
		if (routeData.groupBy) {
			groupBy = `GROUP BY ${escapeColumnName(routeData.groupBy.tableName)}.${escapeColumnName(routeData.groupBy.columnName)}\n`;
		}
		return groupBy;
	}

	protected generateOrderBy(req: RsRequest<unknown>, routeData: StandardRouteData): string {
		let orderBy = '';
		const orderOptions: { [key: string]: string } = {
			ASC: 'ASC',
			DESC: 'DESC'
		};
		const data = req.data as PageQuery;
		if (routeData.type === 'PAGED' && 'sortBy' in data) {
			const sortOrder = orderOptions[data.sortOrder] || 'ASC';
			orderBy = `ORDER BY ${escapeColumnName(data.sortBy)} ${sortOrder}\n`;
		} else if (routeData.orderBy) {
			const sortOrder = orderOptions[routeData.orderBy.order] || 'ASC';
			orderBy = `ORDER BY ${escapeColumnName(routeData.orderBy.tableName)}.${escapeColumnName(routeData.orderBy.columnName)} ${sortOrder}\n`;
		}
		return orderBy;
	}

	protected generateWhereClause(
		req: RsRequest<unknown>,
		where: WhereData[],
		routeData: StandardRouteData | CustomRouteData,
		sqlParams: string[]
	): string {
		let whereClause = '';
		where.forEach((item, index) => {
			if (index === 0) whereClause = 'WHERE ';
			if (item.custom) {
				const customReplaced = this.replaceParamKeywords(item.custom, routeData, req, sqlParams);
				whereClause += `\t${item.conjunction || ''} ${customReplaced}\n`;
				return;
			}

			if (
				item.operator === undefined ||
				item.value === undefined ||
				item.columnName === undefined ||
				item.tableName === undefined
			)
				throw new RsError(
					'SCHEMA_ERROR',
					`Invalid where clause in route ${routeData.name}, missing required fields if not custom`
				);

			let operator = item.operator;
			let value = item.value;

			if (operator === 'LIKE') {
				value = `'%' || ${value} || '%'`;
			} else if (operator === 'NOT LIKE') {
				value = `'%' || ${value} || '%'`;
			} else if (operator === 'STARTS WITH') {
				operator = 'LIKE';
				value = `${value} || '%'`;
			} else if (operator === 'ENDS WITH') {
				operator = 'LIKE';
				value = `'%' || ${value}`;
			}

			const replacedValue = this.replaceParamKeywords(value, routeData, req, sqlParams);
			whereClause += `\t${item.conjunction || ''} "${item.tableName}"."${item.columnName}" ${operator.replace('LIKE', 'ILIKE')} ${
				['IN', 'NOT IN'].includes(operator) ? `(${replacedValue})` : replacedValue
			}\n`;
		});

		const data = req.data as PageQuery;
		if (routeData.type === 'PAGED' && !!data?.filter) {
			let statement = data.filter.replace(/\$[a-zA-Z][a-zA-Z0-9_]+/g, (value: string) => {
				const requestParam = routeData.request!.find((item) => {
					return item.name === value.replace('$', '');
				});
				if (!requestParam)
					throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
				return data[requestParam.name]?.toString() || '';
			});

			statement = statement.replace(/#[a-zA-Z][a-zA-Z0-9_]+/g, (value: string) => {
				const requestParam = routeData.request!.find((item) => {
					return item.name === value.replace('#', '');
				});
				if (!requestParam)
					throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
				return data[requestParam.name]?.toString() || '';
			});

			statement = filterPsqlParser.parse(statement);
			if (whereClause.startsWith('WHERE')) {
				whereClause += ` AND (${statement})\n`;
			} else {
				whereClause += `WHERE ${statement}\n`;
			}
		}

		return whereClause;
	}

	private createUpdateTrigger(tableName: string, notify: ResturaSchema['database'][0]['notify']): string {
		if (!notify) return '';
		if (notify === 'ALL') {
			return `
CREATE OR REPLACE FUNCTION notify_${tableName}_update()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;
BEGIN
	SELECT INTO query_metadata
				(regexp_match(
						current_query(),
						'^--QUERY_METADATA\\(({.*})', 'n'
				))[1]::json;

	PERFORM pg_notify(
		'update',
		json_build_object(
						'table', '${tableName}',
						'queryMetadata', query_metadata,
						'changedId', NEW.id,
						'record', NEW,
						'previousRecord', OLD
		)::text
		);
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER ${tableName}_update
	AFTER UPDATE ON "${tableName}"
	FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_update();
`;
		}

		const notifyColumnNewBuildString = notify.map((column) => `'${column}', NEW."${column}"`).join(',\n');
		const notifyColumnOldBuildString = notify.map((column) => `'${column}', OLD."${column}"`).join(',\n');

		return `
CREATE OR REPLACE FUNCTION notify_${tableName}_update()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;
BEGIN
	SELECT INTO query_metadata
				(regexp_match(
						current_query(),
						'^--QUERY_METADATA\\(({.*})', 'n'
				))[1]::json;

	PERFORM pg_notify(
		'update',
		json_build_object(
						'table', '${tableName}',
						'queryMetadata', query_metadata,
						'changedId', NEW.id,
						'record', json_build_object(
							${notifyColumnNewBuildString}
						),
						'previousRecord', json_build_object(
							${notifyColumnOldBuildString}
						)
		)::text
		);
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER ${tableName}_update
	AFTER UPDATE ON "${tableName}"
	FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_update();
		`;
	}

	private createDeleteTrigger(tableName: string, notify: ResturaSchema['database'][0]['notify']): string {
		if (!notify) return '';
		if (notify === 'ALL') {
			return `
CREATE OR REPLACE FUNCTION notify_${tableName}_delete()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;
BEGIN
	SELECT INTO query_metadata
			(regexp_match(
					current_query(),
					'^--QUERY_METADATA\\(({.*})', 'n'
			))[1]::json;

	PERFORM pg_notify(
		'delete',
		json_build_object(
						'table', '${tableName}',
						'queryMetadata', query_metadata,
						'deletedId', OLD.id,
						'previousRecord', OLD
		)::text
		);
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "${tableName}_delete"
	AFTER DELETE ON "${tableName}"
	FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_delete();
`;
		}

		const notifyColumnOldBuildString = notify.map((column) => `'${column}', OLD."${column}"`).join(',\n');

		return `
CREATE OR REPLACE FUNCTION notify_${tableName}_delete()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;
BEGIN
	SELECT INTO query_metadata
			(regexp_match(
					current_query(),
					'^--QUERY_METADATA\\(({.*})', 'n'
			))[1]::json;

	PERFORM pg_notify(
		'delete',
		json_build_object(
						'table', '${tableName}',
						'queryMetadata', query_metadata,
						'deletedId', OLD.id,
						'previousRecord', json_build_object(
							${notifyColumnOldBuildString}
						)
		)::text
		);
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "${tableName}_delete"
	AFTER DELETE ON "${tableName}"
	FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_delete();
		`;
	}

	private createInsertTriggers(tableName: string, notify: ResturaSchema['database'][0]['notify']): string {
		if (!notify) return '';
		if (notify === 'ALL') {
			return `
CREATE OR REPLACE FUNCTION notify_${tableName}_insert()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;
BEGIN
	SELECT INTO query_metadata
			(regexp_match(
					current_query(),
					'^--QUERY_METADATA\\(({.*})', 'n'
			))[1]::json;

	PERFORM pg_notify(
		'insert',
		json_build_object(
						'table', '${tableName}',
						'queryMetadata', query_metadata,
						'insertedId', NEW.id,
						'record', NEW
		)::text
		);

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "${tableName}_insert"
	AFTER INSERT ON "${tableName}"
	FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_insert();
`;
		}

		const notifyColumnNewBuildString = notify.map((column) => `'${column}', NEW."${column}"`).join(',\n');

		return `
CREATE OR REPLACE FUNCTION notify_${tableName}_insert()
	RETURNS TRIGGER AS $$
DECLARE
	query_metadata JSON;
BEGIN
	SELECT INTO query_metadata
			(regexp_match(
					current_query(),
					'^--QUERY_METADATA\\(({.*})', 'n'
			))[1]::json;

	PERFORM pg_notify(
		'insert',
		json_build_object(
						'table', '${tableName}',
						'queryMetadata', query_metadata,
						'insertedId', NEW.id,
						'record', json_build_object(
							${notifyColumnNewBuildString}
						)
		)::text
		);

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "${tableName}_insert"
	AFTER INSERT ON "${tableName}"
	FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_insert();
`;
	}

	private schemaToPsqlType(column: ColumnData) {
		if (column.hasAutoIncrement) return 'BIGSERIAL';
		if (column.type === 'ENUM') return `TEXT`;
		if (column.type === 'DATETIME') return 'TIMESTAMPTZ';
		if (column.type === 'MEDIUMINT') return 'INT';
		return column.type;
	}
}
