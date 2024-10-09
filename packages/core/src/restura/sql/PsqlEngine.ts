import SqlEngine from './SqlEngine';
import { Pool, QueryConfigValues } from 'pg';
import { RsRequest } from '../types/expressCustom';
import {
	CustomRouteData,
	JoinData,
	ResponseData,
	ResturaSchema,
	StandardRouteData,
	TableData,
	WhereData
} from '../restura.schema';
import { RsError } from '../errors';
import filterSqlParser from './filterSqlParser';
import { ObjectUtils } from '@redskytech/core-utils';
import { SqlUtils } from './SqlUtils';
import {
	AnyObject,
	escapeColumnName,
	insertObjectQuery,
	questionMarksToOrderedParams,
	SQL,
	updateObjectQuery
} from './PsqlUtils';

export default class PsqlEngine extends SqlEngine {
	constructor(private psqlConnectionPool: Pool) {
		super();
	}

	async diffDatabaseToSchema(schema: ResturaSchema): Promise<string> {
		console.log(schema);
		return Promise.resolve('');
	}

	generateDatabaseSchemaFromSchema(schema: ResturaSchema): string {
		console.log(schema);
		return '';
	}

	protected createNestedSelect(
		req: RsRequest<any>,
		schema: ResturaSchema,
		item: ResponseData,
		routeData: StandardRouteData,
		userRole: string | undefined,
		sqlParams: string[]
	): string {
		console.log(req, schema, item, routeData, userRole, sqlParams);
		return '';
	}

	protected async executeCreateRequest(
		req: RsRequest<any>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<any> {
		const sqlParams: string[] = [];
		const parameterObj: AnyObject = {};
		(routeData.assignments || []).forEach((assignment) => {
			parameterObj[assignment.name] = this.replaceParamKeywords(assignment.value, routeData, req, sqlParams);
		});

		const query = insertObjectQuery(routeData.table, { ...req.data, ...parameterObj });
		const createdItem = await this.queryOne(query, sqlParams);
		const insertId = createdItem?.id;
		const whereData: WhereData[] = [
			{
				tableName: routeData.table,
				value: insertId,
				columnName: 'id',
				operator: '='
			}
		];
		req.data = { id: insertId };
		return this.executeGetRequest(req, { ...routeData, where: whereData }, schema);
	}

	protected async executeGetRequest(
		req: RsRequest<any>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<any> {
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
					return `${this.createNestedSelect(req, schema, item, routeData, userRole, sqlParams)} AS ${
						item.name
					}`;
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
		let groupByOrderByStatement = this.generateGroupBy(routeData);
		groupByOrderByStatement += this.generateOrderBy(req, routeData);
		if (routeData.type === 'ONE') {
			return this.queryOne(`${selectStatement}${sqlStatement}${groupByOrderByStatement};`, sqlParams);
		} else if (routeData.type === 'ARRAY') {
			// Array
			return this.runQuery(`${selectStatement}${sqlStatement}${groupByOrderByStatement};`, sqlParams);
		} else if (routeData.type === 'PAGED') {
			// The COUNT() does not work with group by and order by, so we need to catch that case and act accordingly
			const pageResults = await this.runQuery(
				`${selectStatement}${sqlStatement}${groupByOrderByStatement} LIMIT ? OFFSET ?;SELECT COUNT(${
					routeData.groupBy ? `DISTINCT ${routeData.groupBy.tableName}.${routeData.groupBy.columnName}` : '*'
				}) AS total\n${sqlStatement};`,
				[
					...sqlParams,
					req.data.perPage || DEFAULT_PAGED_PER_PAGE_NUMBER,
					(req.data.page - 1) * req.data.perPage || DEFAULT_PAGED_PAGE_NUMBER,
					...sqlParams
				]
			);
			let total = 0;
			if (ObjectUtils.isArrayWithData(pageResults)) {
				total = pageResults[1][0].total;
			}
			return { data: pageResults[0], total };
		} else {
			throw new RsError('UNKNOWN_ERROR', 'Unknown route type.');
		}
	}

	async queryOne(query: string, options: object | Array<any>) {
		const formattedQuery = questionMarksToOrderedParams(query);
		try {
			const response = await this.psqlConnectionPool.query(formattedQuery, options as QueryConfigValues<any>);
			return response.rows[0];
		} catch (e: unknown) {
			const error = e as any;
			console.error(error, query, options);
			if (error?.routine === '_bt_check_unique') {
				throw new RsError('DUPLICATE', error.message);
			}
			throw new RsError('DATABASE_ERROR', `${error.message}`);
		}
	}

	async runQuery(query: string, options: object | Array<any>) {
		const formattedQuery = questionMarksToOrderedParams(query);
		const queryUpdated = query.replace(/[\t\n]/g, ' ');
		console.log(queryUpdated, options);
		try {
			const response = await this.psqlConnectionPool.query(formattedQuery, options as QueryConfigValues<any>);
			return response.rows;
		} catch (e: unknown) {
			const error = e as any;
			console.error(error, query, options);
			if (error?.routine === '_bt_check_unique') {
				throw new RsError('DUPLICATE', error.message);
			}
			throw new RsError('DATABASE_ERROR', `${error.message}`);
		}
	}

	protected async executeUpdateRequest(
		req: RsRequest<any>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<any> {
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

			if (SqlUtils.convertDatabaseTypeToTypescript(column.type!) === 'boolean')
				bodyNoId[assignmentWithPrefix] = assignment.value.toLowerCase() === 'false' ? 0 : 1;
			else if (SqlUtils.convertDatabaseTypeToTypescript(column.type!) === 'number')
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
		await this.runQuery(query, [...sqlParams]);
		return this.executeGetRequest(req, routeData, schema);
	}

	protected async executeDeleteRequest(
		req: RsRequest<any>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<any> {
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

		let deleteStatement = `DELETE
                           FROM "${routeData.table}" ${joinStatement}`;
		deleteStatement += this.generateWhereClause(req, routeData.where, routeData, sqlParams);
		deleteStatement += ';';
		await this.runQuery(deleteStatement, sqlParams);
		return true;
	}

	protected doesRoleHavePermissionToColumn(
		role: string | undefined,
		schema: ResturaSchema,
		item: ResponseData,
		joins: JoinData[]
	): boolean {
		console.log(role, schema, item, joins);
		return true;
	}

	protected doesRoleHavePermissionToTable(
		userRole: string | undefined,
		schema: ResturaSchema,
		tableName: string
	): boolean {
		console.log(userRole, schema, tableName);
		return false;
	}

	protected generateJoinStatements(
		req: RsRequest<any>,
		joins: JoinData[],
		baseTable: string,
		routeData: StandardRouteData | CustomRouteData,
		schema: ResturaSchema,
		userRole: string | undefined,
		sqlParams: string[]
	): string {
		console.log(req, joins, baseTable, routeData, schema, userRole, sqlParams);
		return '';
	}

	protected getTableSchema(schema: ResturaSchema, tableName: string): TableData {
		console.log(schema, tableName);
		return {} as TableData;
	}

	protected generateGroupBy(routeData: StandardRouteData): string {
		let groupBy = '';
		if (routeData.groupBy) {
			groupBy = `GROUP BY ${escapeColumnName(routeData.groupBy.tableName)}.${escapeColumnName(routeData.groupBy.columnName)}\n`;
		}
		return groupBy;
	}

	protected generateOrderBy(req: RsRequest<any>, routeData: StandardRouteData): string {
		let orderBy = '';
		const orderOptions: { [key: string]: string } = {
			ASC: 'ASC',
			DESC: 'DESC'
		};
		if (routeData.type === 'PAGED' && 'sortBy' in req.data) {
			const sortOrder = orderOptions[req.data.sortOrder] || 'ASC';
			orderBy = `ORDER BY ${escapeColumnName(req.data.sortBy)} ${sortOrder}\n`;
		} else if (routeData.orderBy) {
			const sortOrder = orderOptions[routeData.orderBy.order] || 'ASC';
			orderBy = `ORDER BY ${escapeColumnName(routeData.orderBy.tableName)}.${escapeColumnName(routeData.orderBy.columnName)} ${sortOrder}\n`;
		}
		return orderBy;
	}

	protected generateWhereClause(
		req: RsRequest<any>,
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
				sqlParams[sqlParams.length - 1] = `%${sqlParams[sqlParams.length - 1]}%`;
			} else if (operator === 'STARTS WITH') {
				operator = 'LIKE';
				sqlParams[sqlParams.length - 1] = `${sqlParams[sqlParams.length - 1]}%`;
			} else if (operator === 'ENDS WITH') {
				operator = 'LIKE';
				sqlParams[sqlParams.length - 1] = `%${sqlParams[sqlParams.length - 1]}`;
			}
			//todo: find item.type to know if single quotes should be added or not.
			const replacedValue = this.replaceParamKeywords(item.value, routeData, req, sqlParams);
			const escapedValue = SQL`${replacedValue}`;
			whereClause += `\t${item.conjunction || ''} "${item.tableName}"."${item.columnName}" ${operator} ${
				['IN', 'NOT IN'].includes(operator) ? `(${escapedValue})` : escapedValue
			}\n`;
		});
		if (routeData.type === 'PAGED' && !!req.data.filter) {
			let statement = req.data.filter.replace(/\$[a-zA-Z][a-zA-Z0-9_]+/g, (value: string) => {
				const requestParam = routeData.request!.find((item) => {
					return item.name === value.replace('$', '');
				});
				if (!requestParam)
					throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
				return req.data[requestParam.name];
			});

			statement = statement.replace(/#[a-zA-Z][a-zA-Z0-9_]+/g, (value: string) => {
				const requestParam = routeData.request!.find((item) => {
					return item.name === value.replace('#', '');
				});
				if (!requestParam)
					throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
				return req.data[requestParam.name];
			});

			statement = filterSqlParser.parse(statement);
			if (whereClause.startsWith('WHERE')) {
				whereClause += ` AND (${statement})\n`;
			} else {
				whereClause += `WHERE ${statement}\n`;
			}
		}

		return whereClause;
	}
}
