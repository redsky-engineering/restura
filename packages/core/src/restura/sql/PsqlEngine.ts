import { ObjectUtils } from '@redskytech/core-utils';
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
	WhereData
} from '../schemas/resturaSchema.js';
import { DynamicObject, RsRequest } from '../types/customExpressTypes.js';
import { PageQuery } from '../types/resturaTypes.js';
import { PsqlPool } from './PsqlPool.js';
import { escapeColumnName, insertObjectQuery, SQL, updateObjectQuery } from './PsqlUtils.js';
import SqlEngine from './SqlEngine.js';
import { EventDeliveryConfig, EventOutboxConsumer } from './eventOutbox.js';
import filterPsqlParser from './filterPsqlParser.js';
import {
	diffDatabaseToSchema as diffDatabaseToSchemaUtil,
	generateDatabaseSchemaFromSchema as generateDatabaseSchemaFromSchemaUtil,
	SchemaGenerationOptions,
	systemUser
} from './psqlSchemaUtils.js';
const { Client, types } = pg;

export interface EventListenerHealth {
	connected: boolean;
	lastHeartbeatOn: string | null;
	reconnectAttempts: number;
}

export class PsqlEngine extends SqlEngine {
	setupTriggerListeners: Promise<void> | undefined;
	private triggerClient: ClientType | undefined;
	private scratchDbName: string = '';
	private reconnectAttempts = 0;
	private readonly INITIAL_RECONNECT_DELAY = 5000;
	private readonly MAX_RECONNECT_DELAY = 60000;
	private readonly HEARTBEAT_INTERVAL_MS = 30000;
	private eventDelivery: EventDeliveryConfig;
	private outboxConsumer: EventOutboxConsumer | undefined;
	private heartbeatTimer: NodeJS.Timeout | undefined;
	private isListenerConnected = false;
	private isReconnecting = false;
	private isClosed = false;
	private lastHeartbeatOn: string | null = null;

	constructor(
		private psqlConnectionPool: PsqlPool,
		shouldListenForDbTriggers: boolean = false,
		scratchDatabaseSuffix: string = '',
		eventDelivery?: EventDeliveryConfig
	) {
		super();

		this.eventDelivery = eventDelivery || { mode: 'direct' };
		this.setupPgReturnTypes();
		if (this.eventDelivery.mode === 'outbox') {
			this.outboxConsumer = new EventOutboxConsumer(psqlConnectionPool, this.eventDelivery.outbox);
		}
		if (shouldListenForDbTriggers) {
			this.setupTriggerListeners = this.listenForDbTriggers().catch((error) => {
				logger.error(`Failed to setup trigger listeners: ${error}`);
				void this.reconnectTriggerClient();
			});
			// The consumer's poller works even while the LISTEN connection is down
			this.outboxConsumer?.start();
		}

		this.scratchDbName = `${psqlConnectionPool.poolConfig.database}_scratch${scratchDatabaseSuffix ? `_${scratchDatabaseSuffix}` : ''}`;
	}

	async close() {
		this.isClosed = true;
		if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
		if (this.outboxConsumer) await this.outboxConsumer.stop();
		if (this.triggerClient) {
			await this.triggerClient.end();
		}
		this.isListenerConnected = false;
	}

	getEventListenerHealth(): EventListenerHealth {
		return {
			connected: this.isListenerConnected,
			lastHeartbeatOn: this.lastHeartbeatOn,
			reconnectAttempts: this.reconnectAttempts
		};
	}

	getOutboxConsumer(): EventOutboxConsumer | undefined {
		return this.outboxConsumer;
	}

	/**
	 * Setup the return types for the PostgreSQL connection.
	 * For example return DATE as a string instead of a Date object and BIGINT as a number instead of a string.
	 */
	private setupPgReturnTypes() {
		// Object Identifiers (OIDs) for the PostgreSQL types.
		const PG_TYPE_OID = {
			BIGINT: 20,
			DATE: 1082,
			TIME: 1083,
			TIMESTAMP: 1114,
			TIMESTAMPTZ: 1184,
			TIMETZ: 1266
		};

		// Return BIGINT as a JavaScript Number instead of string
		types.setTypeParser(PG_TYPE_OID.BIGINT, (val) => (val === null ? null : Number(val)));

		// Return all date/time types as strings (never as JS Date objects)
		// TIMESTAMP/TIMESTAMPTZ use toISOString() for standardized ISO 8601 format
		// This assumes servers run with TZ=UTC (enforced via environment)
		types.setTypeParser(PG_TYPE_OID.DATE, (val) => val); // YYYY-MM-DD
		types.setTypeParser(PG_TYPE_OID.TIME, (val) => val); // HH:MM:SS
		types.setTypeParser(PG_TYPE_OID.TIMETZ, (val) => val); // HH:MM:SS+TZ
		types.setTypeParser(PG_TYPE_OID.TIMESTAMP, (val) => (val === null ? null : new Date(val).toISOString()));
		types.setTypeParser(PG_TYPE_OID.TIMESTAMPTZ, (val) => (val === null ? null : new Date(val).toISOString()));
	}

	private async reconnectTriggerClient() {
		if (this.isReconnecting || this.isClosed) return;
		this.isReconnecting = true;
		this.isListenerConnected = false;
		if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

		try {
			// Keep trying forever — a dead listener must never be a permanent state
			while (!this.isClosed) {
				if (this.triggerClient) {
					try {
						await this.triggerClient.end();
					} catch (error) {
						logger.error(`Error closing trigger client: ${error}`);
					}
					this.triggerClient = undefined;
				}

				const exponentialDelay = this.INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
				const delay = Math.min(exponentialDelay, this.MAX_RECONNECT_DELAY) + Math.floor(Math.random() * 1000);
				logger.info(
					`Attempting to reconnect trigger client in ${Math.round(delay / 1000)} seconds... (attempt ${this.reconnectAttempts + 1})`
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
				if (this.isClosed) return;

				this.reconnectAttempts++;
				try {
					await this.listenForDbTriggers();
					this.reconnectAttempts = 0;
					return;
				} catch (error) {
					logger.error(`Reconnection attempt ${this.reconnectAttempts} failed: ${error}`);
				}
			}
		} finally {
			this.isReconnecting = false;
		}
	}

	private startHeartbeat() {
		if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
		this.heartbeatTimer = setInterval(async () => {
			if (!this.triggerClient || this.isClosed) return;
			try {
				await this.triggerClient.query('SELECT 1');
				this.lastHeartbeatOn = new Date().toISOString();
			} catch (error) {
				logger.error(`Trigger client heartbeat failed, reconnecting: ${error}`);
				void this.reconnectTriggerClient();
			}
		}, this.HEARTBEAT_INTERVAL_MS);
	}

	private async listenForDbTriggers() {
		const client = new Client({
			user: this.psqlConnectionPool.poolConfig.user,
			host: this.psqlConnectionPool.poolConfig.host,
			database: this.psqlConnectionPool.poolConfig.database,
			password: this.psqlConnectionPool.poolConfig.password,
			port: this.psqlConnectionPool.poolConfig.port,
			connectionTimeoutMillis: this.psqlConnectionPool.poolConfig.connectionTimeoutMillis
		});
		this.triggerClient = client;

		// Attach before connect so errors during connection setup are never unhandled
		client.on('error', (error) => {
			logger.error(`Trigger client error: ${error}`);
			void this.reconnectTriggerClient();
		});

		client.on('notification', async (msg) => {
			if (this.outboxConsumer && msg.channel === this.outboxConsumer.channel) {
				// Outbox notifications are a bare wakeup; the id is read from the table, not the payload
				await this.outboxConsumer.drain();
			} else if (msg.channel === 'insert' || msg.channel === 'update' || msg.channel === 'delete') {
				const payload: TriggerResult = ObjectUtils.safeParse(msg.payload) as TriggerResult;
				await this.handleTrigger(payload, msg.channel.toUpperCase() as MutationType);
			}
		});

		await client.connect();

		// Legacy channels stay subscribed in outbox mode so un-migrated trigger functions keep working
		const channels = ['insert', 'update', 'delete'];
		if (this.outboxConsumer) channels.push(this.outboxConsumer.channel);
		for (const channel of channels) {
			await client.query(`LISTEN ${escapeColumnName(channel)}`);
		}

		this.isListenerConnected = true;
		this.lastHeartbeatOn = new Date().toISOString();
		this.startHeartbeat();
		logger.info('Successfully connected to database triggers');
		void this.warnIfOutboxBacklogInDirectMode();
	}

	private async warnIfOutboxBacklogInDirectMode() {
		if (this.eventDelivery.mode !== 'direct') return;
		try {
			const tableExists = await this.psqlConnectionPool.runQuery<{ exists: string | null }>(
				`SELECT to_regclass('public."dbEventOutbox"') AS exists;`,
				[],
				systemUser
			);
			if (!tableExists[0]?.exists) return;
			const pending = await this.psqlConnectionPool.runQuery<{ count: number }>(
				`SELECT COUNT(*)::int AS count FROM "dbEventOutbox" WHERE "processedOn" IS NULL;`,
				[],
				systemUser
			);
			if (Number(pending[0]?.count) > 0) {
				logger.warn(
					`eventDelivery is 'direct' but "dbEventOutbox" exists with ${pending[0].count} unprocessed rows — ` +
						`the database appears to have outbox-mode triggers installed. Switch eventDelivery to 'outbox' or regenerate direct-mode triggers.`
				);
			}
		} catch (error) {
			logger.warn(`Could not check dbEventOutbox backlog: ${error}`);
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
		return generateDatabaseSchemaFromSchemaUtil(schema, this.schemaGenerationOptions());
	}

	async diffDatabaseToSchema(schema: ResturaSchema): Promise<string> {
		return diffDatabaseToSchemaUtil(
			schema,
			this.psqlConnectionPool,
			this.scratchDbName,
			this.schemaGenerationOptions()
		);
	}

	private schemaGenerationOptions(): SchemaGenerationOptions {
		return {
			eventDelivery: this.eventDelivery.mode,
			outboxChannel: this.eventDelivery.outbox?.channel
		};
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

		(routeData.assignments || []).forEach((assignment) => {
			bodyNoId[assignment.name] = this.replaceParamKeywords(assignment.value, routeData, req, sqlParams);
		});

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

			const parseResult = filterPsqlParser.parse(statement);
			if (parseResult.usedOldSyntax) {
				logger.warn(
					`Deprecated filter syntax detected in route "${routeData.name}" (${routeData.path}). Please migrate to the new filter syntax.`
				);
			}
			statement = parseResult.sql;
			if (whereClause.startsWith('WHERE')) {
				whereClause += ` AND (${statement})\n`;
			} else {
				whereClause += `WHERE ${statement}\n`;
			}
		}

		return whereClause;
	}
}
