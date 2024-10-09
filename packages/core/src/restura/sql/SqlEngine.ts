import { RsError } from '../errors';
import {
	CustomRouteData,
	JoinData,
	ResponseData,
	ResturaSchema,
	RouteData,
	StandardRouteData,
	TableData,
	WhereData
} from '../restura.schema';
import { RsRequest } from '../types/expressCustom';
import { ObjectUtils } from '@redskytech/core-utils';

export default abstract class SqlEngine {
	async runQueryForRoute(
		req: RsRequest<any>,
		routeData: StandardRouteData | CustomRouteData,
		schema: ResturaSchema
	): Promise<any> {
		console.log(req, routeData, schema);
	}

	abstract generateDatabaseSchemaFromSchema(schema: ResturaSchema): string;
	abstract diffDatabaseToSchema(schema: ResturaSchema): Promise<string>;

	protected abstract createNestedSelect(
		req: RsRequest<any>,
		schema: ResturaSchema,
		item: ResponseData,
		routeData: StandardRouteData,
		userRole: string | undefined,
		sqlParams: string[]
	): string;

	protected abstract executeCreateRequest(
		req: RsRequest<any>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<any>;

	protected abstract executeGetRequest(
		req: RsRequest<any>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<any>;
	protected abstract executeUpdateRequest(
		req: RsRequest<any>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<any>;

	protected abstract executeDeleteRequest(
		req: RsRequest<any>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<any>;

	protected doesRoleHavePermissionToColumn(
		role: string | undefined,
		schema: ResturaSchema,
		item: ResponseData,
		joins: JoinData[]
	): boolean {
		if (item.selector) {
			let tableName = item.selector.split('.')[0];
			const columnName = item.selector.split('.')[1];
			let tableSchema = schema.database.find((item) => item.name === tableName);
			if (!tableSchema) {
				// check to see if this is an alias join table
				const join = joins.find((join) => join.alias === tableName);
				if (!join) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
				tableName = join.table;
				tableSchema = schema.database.find((item) => item.name === tableName);
			}
			if (!tableSchema) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
			const columnSchema = tableSchema.columns.find((item) => item.name === columnName);
			if (!columnSchema)
				throw new RsError('SCHEMA_ERROR', `Column ${columnName} not found in table ${tableName}`);

			const doesColumnHaveRoles = ObjectUtils.isArrayWithData(columnSchema.roles);
			if (!doesColumnHaveRoles) return true; // Public column, any role can access

			if (!role) return false; // Column has roles, but no role provided (no access)

			return columnSchema.roles.includes(role!);
		}
		if (item.subquery) {
			return ObjectUtils.isArrayWithData(
				item.subquery.properties.filter((nestedItem) => {
					return this.doesRoleHavePermissionToColumn(role, schema, nestedItem, joins);
				})
			);
		}
		return false;
	}

	protected doesRoleHavePermissionToTable(
		userRole: string | undefined,
		schema: ResturaSchema,
		tableName: string
	): boolean {
		const tableSchema = this.getTableSchema(schema, tableName);
		const doesTableHaveRoles = ObjectUtils.isArrayWithData(tableSchema.roles);
		if (!doesTableHaveRoles) return true; // Public table, any role can access

		if (!userRole) return false; // Table has roles, but no role provided (no access)

		return tableSchema.roles.includes(userRole);
	}

	protected abstract generateJoinStatements(
		req: RsRequest<any>,
		joins: JoinData[],
		baseTable: string,
		routeData: StandardRouteData,
		schema: ResturaSchema,
		userRole: string | undefined,
		sqlParams: string[]
	): string;

	protected getTableSchema(schema: ResturaSchema, tableName: string): TableData {
		const tableSchema = schema.database.find((item) => item.name === tableName);
		if (!tableSchema) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
		return tableSchema;
	}

	protected abstract generateGroupBy(routeData: StandardRouteData): string;

	protected abstract generateOrderBy(req: RsRequest<any>, routeData: StandardRouteData): string;

	protected abstract generateWhereClause(
		req: RsRequest<any>,
		where: WhereData[],
		routeData: StandardRouteData,
		sqlParams: string[]
	): string;

	protected replaceParamKeywords(
		value: string | number,
		routeData: RouteData,
		req: RsRequest<any>,
		sqlParams: string[]
	): string | number {
		let returnValue = value;
		returnValue = this.replaceLocalParamKeywords(returnValue, routeData, req, sqlParams);
		returnValue = this.replaceGlobalParamKeywords(returnValue, routeData, req, sqlParams);
		return returnValue;
	}

	protected replaceLocalParamKeywords(
		value: string | number,
		routeData: RouteData,
		req: RsRequest<any>,
		sqlParams: string[]
	): string | number {
		if (!routeData.request) return value;

		if (typeof value === 'string') {
			// Match any value that starts with a $
			value.match(/\$[a-zA-Z][a-zA-Z0-9_]+/g)?.forEach((param) => {
				const requestParam = routeData.request!.find((item) => {
					return item.name === param.replace('$', '');
				});
				if (!requestParam)
					throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
				sqlParams.push(req.data[requestParam.name]); // pass by reference
			});
			return value.replace(new RegExp(/\$[a-zA-Z][a-zA-Z0-9_]+/g), '?');
		}
		return value;
	}

	protected replaceGlobalParamKeywords(
		value: string | number,
		routeData: RouteData,
		req: RsRequest<any>,
		sqlParams: string[]
	): string | number {
		if (typeof value === 'string') {
			// Match any value that starts with a #
			value.match(/#[a-zA-Z][a-zA-Z0-9_]+/g)?.forEach((param) => {
				param = param.replace('#', '');
				const globalParamValue = (req.requesterDetails as any)[param];
				if (!globalParamValue)
					throw new RsError('SCHEMA_ERROR', `Invalid global keyword clause in route ${routeData.name}`);
				sqlParams.push(globalParamValue); // pass by reference
			});
			return value.replace(new RegExp(/#[a-zA-Z][a-zA-Z0-9_]+/g), '?');
		}
		return value;
	}
}
