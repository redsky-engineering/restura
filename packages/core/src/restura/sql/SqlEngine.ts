import { ObjectUtils } from '@redskytech/core-utils';
import { RsError } from '../RsError.js';
import {
	JoinData,
	ResponseData,
	ResturaSchema,
	RouteData,
	StandardRouteData,
	TableData,
	WhereData
} from '../schemas/resturaSchema.js';
import { DynamicObject, RsRequest } from '../types/customExpressTypes.js';

export default abstract class SqlEngine {
	async runQueryForRoute(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
		// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	): Promise<DynamicObject | any[] | boolean> {
		if (
			!this.canRequesterAccessTable(
				req.requesterDetails.role,
				req.requesterDetails.scopes,
				schema,
				routeData.table
			)
		)
			throw new RsError('FORBIDDEN', 'You do not have permission to access this table');

		switch (routeData.method) {
			case 'POST':
				return this.executeCreateRequest(req, routeData, schema);
			case 'GET':
				return this.executeGetRequest(req, routeData, schema);
			case 'PUT':
			case 'PATCH':
				return this.executeUpdateRequest(req, routeData, schema);
			case 'DELETE':
				return this.executeDeleteRequest(req, routeData, schema);
		}
	}
	protected getTableSchema(schema: ResturaSchema, tableName: string): TableData {
		const tableSchema = schema.database.find((item) => item.name === tableName);
		if (!tableSchema) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
		return tableSchema;
	}

	protected canRequesterAccessColumn(
		requesterRole: string | undefined | null,
		requesterScopes: string[] | undefined | null,
		schema: ResturaSchema,
		item: ResponseData,
		joins: JoinData[]
	): boolean {
		if (item.type) return true;
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

			if (ObjectUtils.isArrayWithData(columnSchema.roles)) {
				if (!requesterRole) return false;
				return columnSchema.roles.includes(requesterRole);
			}
			if (ObjectUtils.isArrayWithData(columnSchema.scopes)) {
				if (!requesterScopes) return false;
				return columnSchema.scopes.every((scope) => requesterScopes.includes(scope));
			}
			return true; // Public column, any role can access
		}
		if (item.subquery) {
			return ObjectUtils.isArrayWithData(
				item.subquery.properties.filter((nestedItem) => {
					return this.canRequesterAccessColumn(requesterRole, requesterScopes, schema, nestedItem, joins);
				})
			);
		}
		return false;
	}

	protected canRequesterAccessTable(
		requesterRole: string | undefined,
		requesterScopes: string[] | undefined,
		schema: ResturaSchema,
		tableName: string
	): boolean {
		const tableSchema = this.getTableSchema(schema, tableName);
		if (ObjectUtils.isArrayWithData(tableSchema.roles)) {
			if (!requesterRole) return false; // Table has roles, but no role provided (no access)
			return tableSchema.roles.includes(requesterRole);
		}
		if (ObjectUtils.isArrayWithData(tableSchema.scopes)) {
			if (!requesterScopes) return false;
			return tableSchema.scopes.some((scope) => requesterScopes.includes(scope));
		}
		return true; // Public table, any role can access
	}

	protected abstract generateJoinStatements(
		req: RsRequest<unknown>,
		joins: JoinData[],
		baseTable: string,
		routeData: StandardRouteData,
		schema: ResturaSchema,
		sqlParams: string[]
	): string;

	protected abstract generateGroupBy(routeData: StandardRouteData): string;

	protected abstract generateOrderBy(req: RsRequest<unknown>, routeData: StandardRouteData): string;

	protected abstract generateWhereClause(
		req: RsRequest<unknown>,
		where: WhereData[],
		routeData: StandardRouteData,
		sqlParams: string[]
	): string;

	protected replaceParamKeywords(
		value: string | number,
		routeData: RouteData,
		req: RsRequest<unknown>,
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
		req: RsRequest<unknown>,
		sqlParams: string[]
	): string | number {
		if (!routeData.request) return value;
		// eslint-disable-next-line  @typescript-eslint/no-explicit-any
		const data = req.data as DynamicObject<any>;
		if (typeof value === 'string') {
			// Match any value that starts with a $
			value.match(/\$[a-zA-Z][a-zA-Z0-9_]+/g)?.forEach((param) => {
				const requestParam = routeData.request!.find((item) => {
					return item.name === param.replace('$', '');
				});
				if (!requestParam)
					throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
				sqlParams.push(data[requestParam.name]); // pass by reference
			});
			return value.replace(new RegExp(/\$[a-zA-Z][a-zA-Z0-9_]+/g), '?');
		}
		return value;
	}

	protected replaceGlobalParamKeywords(
		value: string | number,
		routeData: RouteData,
		req: RsRequest<unknown>,
		sqlParams: string[]
	): string | number {
		if (typeof value === 'string') {
			// Match any value that starts with a #
			value.match(/#[a-zA-Z][a-zA-Z0-9_]+/g)?.forEach((param) => {
				param = param.replace('#', '');
				// eslint-disable-next-line  @typescript-eslint/no-explicit-any
				const globalParamValue = (req.requesterDetails as any)[param];
				if (!globalParamValue)
					throw new RsError(
						'SCHEMA_ERROR',
						`Invalid global keyword clause in route (${routeData.path}) when looking for (#${param})`
					);
				sqlParams.push(globalParamValue); // pass by reference
			});
			return value.replace(new RegExp(/#[a-zA-Z][a-zA-Z0-9_]+/g), '?');
		}
		return value;
	}

	abstract generateDatabaseSchemaFromSchema(schema: ResturaSchema): string;
	abstract diffDatabaseToSchema(schema: ResturaSchema): Promise<string>;

	protected abstract createNestedSelect(
		req: RsRequest<unknown>,
		schema: ResturaSchema,
		item: ResponseData,
		routeData: StandardRouteData,
		sqlParams: string[]
	): string;

	protected abstract executeCreateRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<DynamicObject>;

	protected abstract executeGetRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema // eslint-disable-next-line  @typescript-eslint/no-explicit-any
	): Promise<DynamicObject | any[]>;
	protected abstract executeUpdateRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<DynamicObject>;

	protected abstract executeDeleteRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<boolean>;
}
