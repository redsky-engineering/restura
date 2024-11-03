import { ObjectUtils } from '@redskytech/core-utils';
import getDiff from '@wmfs/pg-diff-sync';
import pgInfo from '@wmfs/pg-info';
import pg from 'pg';
import type { Client as ClientType } from 'pg';
import { RsError } from '../errors';
import {
	CustomRouteData,
	JoinData,
	ResponseData,
	ResturaSchema,
	StandardRouteData,
	WhereData,
	type ColumnData
} from '../restura.schema.js';
import { DynamicObject, RequesterDetails, RsRequest } from '../types/customExpress.types.js';
import { PageQuery } from '../types/restura.types.js';
import { PsqlPool } from './PsqlPool.js';
import { escapeColumnName, insertObjectQuery, SQL, updateObjectQuery } from './PsqlUtils.js';
import SqlEngine from './SqlEngine';
import { SqlUtils } from './SqlUtils';
import filterPsqlParser from './filterPsqlParser.js';
import eventManager, { MutationType, TriggerResult } from '../eventManager.js';
import { boundMethod } from 'autobind-decorator';
import { psqlParser } from './psqlParser.js';
const { Client } = pg;

const systemUser: RequesterDetails = {
	role: '',
	host: '',
	ipAddress: '',
	isSystemUser: true
};

export class PsqlEngine extends SqlEngine {
	setupTriggerListeners: Promise<void> | undefined;
	private triggerClient: ClientType | undefined;
	constructor(
		private psqlConnectionPool: PsqlPool,
		shouldListenForDbTriggers: boolean = false
	) {
		super();
		if (shouldListenForDbTriggers) {
			this.setupTriggerListeners = this.listenForDbTriggers();
		}
	}
	async close() {
		if (this.triggerClient) {
			await this.triggerClient.end();
		}
	}

	private async listenForDbTriggers() {
		this.triggerClient = new Client({
			user: this.psqlConnectionPool.poolConfig.user,
			host: this.psqlConnectionPool.poolConfig.host,
			database: this.psqlConnectionPool.poolConfig.database,
			password: this.psqlConnectionPool.poolConfig.password,
			port: this.psqlConnectionPool.poolConfig.port,
			connectionTimeoutMillis: 2000
		});

		await this.triggerClient.connect();

		const promises = [];
		promises.push(this.triggerClient.query('LISTEN insert'));
		promises.push(this.triggerClient.query('LISTEN update'));
		promises.push(this.triggerClient.query('LISTEN delete'));
		await Promise.all(promises);
		// Handle notifications
		this.triggerClient.on('notification', async (msg) => {
			if (msg.channel === 'insert' || msg.channel === 'update' || msg.channel === 'delete') {
				const payload: TriggerResult = ObjectUtils.safeParse(msg.payload) as TriggerResult;
				await this.handleTrigger(payload, msg.channel.toUpperCase() as MutationType);
			}
		});
	}

	@boundMethod
	private async handleTrigger(payload: TriggerResult, mutationType: MutationType) {
		const findRequesterDetailsRegex = /^--QUERY_METADATA\(\{.*\}\)/; //only looking at the beginning of the query
		let requesterDetails = {} as RequesterDetails;
		const match = payload.query.match(findRequesterDetailsRegex);
		if (match) {
			const jsonString = match[0].slice(match[0].indexOf('{'), match[0].lastIndexOf('}') + 1);
			requesterDetails = ObjectUtils.safeParse<RequesterDetails>(jsonString) as RequesterDetails;
			await eventManager.fireActionFromDbTrigger({ requesterDetails, mutationType }, payload);
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
			triggers.push(this.createInsertTriggers(table.name));
			triggers.push(this.createUpdateTrigger(table.name));
			triggers.push(this.createDeleteTrigger(table.name));
			let sql = `CREATE TABLE "${table.name}"
					   ( `;
			const tableColumns = [];
			for (const column of table.columns) {
				let columnSql = '';

				columnSql += `\t"${column.name}" ${schemaToPsqlType(column)}`;
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

	private async getScratchPool(): Promise<PsqlPool> {
		const scratchDbExists = await this.psqlConnectionPool.runQuery<DynamicObject>(
			`SELECT *
             FROM pg_database
             WHERE datname = '${this.psqlConnectionPool.poolConfig.database}_scratch';`,
			[],
			systemUser
		);
		if (scratchDbExists.length === 0) {
			await this.psqlConnectionPool.runQuery(
				`CREATE DATABASE ${this.psqlConnectionPool.poolConfig.database}_scratch;`,
				[],
				systemUser
			);
		}

		const scratchPool = new PsqlPool({
			host: this.psqlConnectionPool.poolConfig.host,
			port: this.psqlConnectionPool.poolConfig.port,
			user: this.psqlConnectionPool.poolConfig.user,
			database: this.psqlConnectionPool.poolConfig.database + '_scratch',
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
			`SELECT pg_description.description
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
		const scratchPool = await this.getScratchPool();
		await this.createDatabaseFromSchema(schema, scratchPool);

		const originalClient = new Client({
			database: this.psqlConnectionPool.poolConfig.database,
			user: this.psqlConnectionPool.poolConfig.user,
			password: this.psqlConnectionPool.poolConfig.password,
			host: this.psqlConnectionPool.poolConfig.host,
			port: this.psqlConnectionPool.poolConfig.port
		});
		const scratchClient = new Client({
			database: this.psqlConnectionPool.poolConfig.database + '_scratch',
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
		userRole: string | undefined,
		sqlParams: string[]
	): string {
		if (!item.subquery) return '';
		if (
			!ObjectUtils.isArrayWithData(
				item.subquery.properties.filter((nestedItem) => {
					return this.doesRoleHavePermissionToColumn(req.requesterDetails.role, schema, nestedItem, [
						...routeData.joins,
						...item.subquery!.joins
					]);
				})
			)
		) {
			return "'[]'";
		}

		return `COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT(
			${item.subquery.properties
				.map((nestedItem) => {
					if (
						!this.doesRoleHavePermissionToColumn(req.requesterDetails.role, schema, nestedItem, [
							...routeData.joins,
							...item.subquery!.joins
						])
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
							userRole,
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
							${this.generateJoinStatements(req, item.subquery.joins, item.subquery.table, routeData, schema, userRole, sqlParams)}
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

	protected executeGetRequestRawSql(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): { select: string; sql: string; groupBy: string; orderBy: string; limit: string; sqlParams: string[] } {
		const DEFAULT_PAGED_PAGE_NUMBER = 0;
		const DEFAULT_PAGED_PER_PAGE_NUMBER = 25;
		const sqlParams: string[] = [];

		const userRole = req.requesterDetails.role;
		let sqlStatement = '';

		const selectColumns: ResponseData[] = [];
		routeData.response.forEach((item) => {
			// For a subquery, we will check the permission when generating the subquery statement, so pass it through
			if (item.subquery || this.doesRoleHavePermissionToColumn(userRole, schema, item, routeData.joins))
				selectColumns.push(item);
		});
		if (!selectColumns.length) throw new RsError('UNAUTHORIZED', `You do not have permission to access this data.`);
		let selectStatement = 'SELECT \n';
		selectStatement += `\t${selectColumns
			.map((item) => {
				if (item.subquery) {
					return `${this.createNestedSelect(req, schema, item, routeData, userRole, sqlParams)} AS ${escapeColumnName(
						item.name
					)}`;
				}
				return `${escapeColumnName(item.selector)} AS ${escapeColumnName(item.name)}`;
			})
			.join(',\n\t')}\n`;
		sqlStatement += `FROM "${routeData.table}"\n`;
		sqlStatement += this.generateJoinStatements(
			req,
			routeData.joins,
			routeData.table,
			routeData,
			schema,
			userRole,
			sqlParams
		);

		sqlStatement += this.generateWhereClause(req, routeData.where, routeData, sqlParams);

		const groupBy = this.generateGroupBy(routeData);
		const orderBy = this.generateOrderBy(req, routeData);
		let limit = '';
		if (routeData.type === 'PAGED') {
			const data = req.data as PageQuery;
			limit = SQL`LIMIT ${data.perPage || DEFAULT_PAGED_PER_PAGE_NUMBER} OFFSET ${(data.page - 1) * data.perPage || DEFAULT_PAGED_PAGE_NUMBER};`;
		}
		return { select: selectStatement, sql: sqlStatement, groupBy, orderBy, limit, sqlParams };
	}
	protected async executeGetRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
		// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	): Promise<DynamicObject | any[]> {
		const { select, sql, groupBy, orderBy, sqlParams, limit } = this.executeGetRequestRawSql(
			req,
			routeData,
			schema
		);
		const query = `${select} ${sql} ${groupBy} ${orderBy} ${limit};`;
		if (routeData.type === 'ONE') {
			return this.psqlConnectionPool.queryOne(query, sqlParams, req.requesterDetails);
		} else if (routeData.type === 'ARRAY') {
			return this.psqlConnectionPool.runQuery(query, sqlParams, req.requesterDetails);
		} else if (routeData.type === 'PAGED') {
			// The COUNT() does not work with group by and order by, so we need to catch that case and act accordingly
			const pagePromise = this.psqlConnectionPool.runQuery(query, sqlParams, req.requesterDetails);
			const totalSelect = `SELECT COUNT(${
				routeData.groupBy ? `DISTINCT ${routeData.groupBy.tableName}.${routeData.groupBy.columnName}` : '*'
			}) AS total`;
			const totalQuery = psqlParser.toTotalQuery(query, totalSelect);
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

	protected async executeUpdateRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<DynamicObject> {
		const sqlParams: string[] = [];
		// eslint-disable-next-line
		const { id, ...bodyNoId } = req.body;

		// Find the database table
		const table = schema.database.find((item) => {
			return item.name === routeData.table;
		});
		if (!table) throw new RsError('UNKNOWN_ERROR', 'Unknown table.');
		if (table.columns.find((column) => column.name === 'modifiedOn')) {
			bodyNoId.modifiedOn = new Date().toISOString();
		}

		// In order remove ambiguity, we need to add the table name to the column names when the table is joined
		// for (let i in bodyNoId) {
		// 	if (i.includes('.')) continue;
		// 	bodyNoId[escapeColumnName(`${routeData.table}.${i}`)] = bodyNoId[i];
		// 	delete bodyNoId[i];
		// }

		for (const assignment of routeData.assignments) {
			const column = table.columns.find((column) => column.name === assignment.name);
			if (!column) continue;

			const assignmentWithPrefix = escapeColumnName(`${routeData.table}.${assignment.name}`);

			if (SqlUtils.convertDatabaseTypeToTypescript(column.type!) === 'number')
				bodyNoId[assignmentWithPrefix] = Number(assignment.value);
			else bodyNoId[assignmentWithPrefix] = assignment.value;
		}

		// let joinStatement = this.generateJoinStatements(
		// 	req,
		// 	routeData.joins!,
		// 	routeData.table!,
		// 	routeData!,
		// 	schema,
		// 	req.requesterDetails.role,
		// 	sqlParams
		// );
		const whereClause = this.generateWhereClause(req, routeData.where, routeData, sqlParams);
		const query = updateObjectQuery(routeData.table, bodyNoId, whereClause);
		await this.psqlConnectionPool.queryOne(query, [...sqlParams], req.requesterDetails);
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
			req.requesterDetails.role,
			sqlParams
		);
		const whereClause = this.generateWhereClause(req, routeData.where, routeData, sqlParams);
		if (whereClause.replace(/\s/g, '') === '') {
			throw new RsError('DELETE_FORBIDDEN', 'Deletes need a where clause');
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
		userRole: string | undefined,
		sqlParams: string[]
	): string {
		let joinStatements = '';
		joins.forEach((item) => {
			if (!this.doesRoleHavePermissionToTable(userRole, schema, item.table))
				throw new RsError('UNAUTHORIZED', 'You do not have permission to access this table');
			if (item.custom) {
				const customReplaced = this.replaceParamKeywords(item.custom, routeData, req, sqlParams);
				joinStatements += `\t${item.type} JOIN ${escapeColumnName(item.table)} ON ${customReplaced}\n`;
			} else {
				joinStatements += `\t${item.type} JOIN ${escapeColumnName(item.table)}${
					item.alias ? `AS "${item.alias}"` : ''
				} ON "${baseTable}"."${item.localColumnName}" = ${escapeColumnName(item.alias ? item.alias : item.table)}.${escapeColumnName(
					item.foreignColumnName
				)}\n`;
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
				whereClause += this.replaceParamKeywords(item.custom, routeData, req, sqlParams);
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
			if (operator === 'LIKE') {
				item.value = `'%${item.value}%'`;
			} else if (operator === 'STARTS WITH') {
				operator = 'LIKE';
				item.value = `'${item.value}%'`;
			} else if (operator === 'ENDS WITH') {
				operator = 'LIKE';
				item.value = `'%${item.value}'`;
			}

			const replacedValue = this.replaceParamKeywords(item.value, routeData, req, sqlParams);
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
	@boundMethod
	private createUpdateTrigger(tableName: string) {
		return ` 
CREATE OR REPLACE FUNCTION notify_${tableName}_update()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('update', JSON_BUILD_OBJECT('table', '${tableName}', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER ${tableName}_update
    AFTER UPDATE ON "${tableName}"
    FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_update();
		`;
	}
	@boundMethod
	private createDeleteTrigger(tableName: string) {
		return `
CREATE OR REPLACE FUNCTION notify_${tableName}_delete()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('delete', JSON_BUILD_OBJECT('table', '${tableName}', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "${tableName}_delete"
    AFTER DELETE ON "${tableName}"
    FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_delete();
		`;
	}
	@boundMethod
	private createInsertTriggers(tableName: string) {
		return `
CREATE OR REPLACE FUNCTION notify_${tableName}_insert()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('insert', JSON_BUILD_OBJECT('table', '${tableName}', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "${tableName}_insert"
    AFTER INSERT ON "${tableName}"
    FOR EACH ROW
EXECUTE FUNCTION notify_${tableName}_insert();
		`;
	}
}

function schemaToPsqlType(column: ColumnData) {
	if (column.hasAutoIncrement) return 'BIGSERIAL';
	if (column.type === 'ENUM') return `TEXT`;
	if (column.type === 'DATETIME') return 'TIMESTAMPTZ';
	if (column.type === 'MEDIUMINT') return 'INT';
	return column.type;
}
