import { Service } from '../Service';
import globalState, { getRecoilExternalValue, setRecoilExternalValue } from '../../state/globalState';
import http from '../../utils/http.js';
import cloneDeep from 'lodash.clonedeep';
import { rsToastify } from '@redskytech/framework/ui';

export type SelectedRoute = { baseUrl: string; path: string; method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' };

export default class SchemaService extends Service {
	private lastSchema: Restura.Schema | undefined = undefined;

	constructor() {
		super();
	}

	async getCurrentSchema(): Promise<Restura.Schema> {
		let res = await http.get<RedSky.RsResponseData<Restura.Schema>, void>('/schema');
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, res.data.data);
		this.lastSchema = res.data.data;
		return this.lastSchema;
	}

	async getSchemaPreview(schema: Restura.Schema): Promise<Restura.SchemaPreview> {
		let res = await http.post<RedSky.RsResponseData<Restura.SchemaPreview>, Restura.Schema>(
			'/schema/preview',
			schema
		);
		return res.data.data;
	}

	async updateSchema(schema: Restura.Schema) {
		await http.put<RedSky.RsResponseData<string>, Restura.Schema>('/schema', schema);
		await this.getCurrentSchema();
	}

	isSchemaChanged(currentSchema: Restura.Schema | undefined): boolean {
		return JSON.stringify(currentSchema) !== JSON.stringify(this.lastSchema);
	}

	getSelectedRouteData(): Restura.RouteData | undefined {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		return schema.endpoints[indices.endpointIndex].routes[indices.routeIndex];
	}

	updateRouteData(routeData: Restura.RouteData) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] = routeData;
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	updateRequestParam(paramIndex: number, requestData: Restura.RequestData) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex].request === undefined) return;
		updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex].request![paramIndex] = requestData;
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	updateAssignmentParam(index: number, assignData: Restura.AssignData) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		const route = updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex];
		if (SchemaService.isCustomRouteData(route)) return;
		route.assignments[index] = assignData;
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	addDefaultAssignments() {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		const route = updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex];
		if (SchemaService.isCustomRouteData(route) || route.assignments !== undefined) return;
		route.assignments = [];
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	updateJoinData(joinIndex: number, joinData: Restura.JoinData) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (SchemaService.isCustomRouteData(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex]))
			return;
		(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData).joins[
			joinIndex
		] = joinData;
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	updateWhereData(whereIndex: number, whereData: Restura.WhereData) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (SchemaService.isCustomRouteData(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex]))
			return;
		(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData).where[
			whereIndex
		] = whereData;
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	updateValidator(paramIndex: number, validatorIndex: number, validatorData: Restura.ValidatorData) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex].request === undefined) return;
		updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex].request![paramIndex].validator[
			validatorIndex
		] = validatorData;
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	addJoin(joinData: Restura.JoinData) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (SchemaService.isCustomRouteData(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex]))
			return;
		(
			updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData
		).joins.push(joinData);
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	removeJoin(joinIndex: number) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (SchemaService.isCustomRouteData(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex]))
			return;
		(
			updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData
		).joins.splice(joinIndex, 1);
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	getResponseParameter(rootPath: string, parameterIndex: number): Restura.ResponseData | undefined {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (SchemaService.isCustomRouteData(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex]))
			return;
		let updatedResponseData = (
			updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData
		).response;
		let path = rootPath.split('.');
		let currentResponseData: Restura.ResponseData[] | undefined = updatedResponseData;
		for (let i = 1; i < path.length; i++) {
			if (currentResponseData === undefined) return;
			let subqueryData = currentResponseData.find((item) => {
				return item.name === path[i] && !!item.subquery;
			}) as Restura.ResponseData | undefined;
			if (subqueryData === undefined) return;
			currentResponseData = subqueryData.subquery?.properties;
		}
		if (!currentResponseData) return;
		return currentResponseData[parameterIndex];
	}

	addResponseParameter(rootPath: string, responseData: Restura.ResponseData) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (SchemaService.isCustomRouteData(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex]))
			return;
		let updatedResponseData = (
			updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData
		).response;
		let path = rootPath.split('.');
		let currentResponseData: Restura.ResponseData[] | undefined = updatedResponseData;
		for (let i = 1; i < path.length; i++) {
			if (currentResponseData === undefined) return;
			let subqueryData = currentResponseData.find((item) => {
				return item.name === path[i] && !!item.subquery;
			}) as Restura.ResponseData | undefined;
			if (subqueryData === undefined) return;
			currentResponseData = subqueryData.subquery?.properties;
		}
		if (currentResponseData === undefined) return;
		// Check for duplicate name
		if (currentResponseData.findIndex((item) => item.name === responseData.name) !== -1)
			responseData.name += '_' + Math.random().toString(36).substring(2, 6).toUpperCase();
		currentResponseData.push(responseData);
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	removeResponseParameter(rootPath: string, parameterIndex: number) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (SchemaService.isCustomRouteData(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex]))
			return;
		let updatedResponseData = (
			updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData
		).response;
		let path = rootPath.split('.');
		let currentResponseData: Restura.ResponseData[] | undefined = updatedResponseData;
		for (let i = 1; i < path.length; i++) {
			if (currentResponseData === undefined) return;
			let subqueryData = currentResponseData.find((item) => {
				return item.name === path[i] && !!item.subquery;
			}) as Restura.ResponseData | undefined;
			if (subqueryData === undefined) return;
			currentResponseData = subqueryData.subquery?.properties;
		}
		if (currentResponseData === undefined) return;
		currentResponseData.splice(parameterIndex, 1);
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	updateResponseParameter(rootPath: string, parameterIndex: number, responseData: Restura.ResponseData) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (SchemaService.isCustomRouteData(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex]))
			return;
		let updatedResponseData = (
			updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData
		).response;
		let path = rootPath.split('.');
		let currentResponseData: Restura.ResponseData[] | undefined = updatedResponseData;
		for (let i = 1; i < path.length; i++) {
			if (currentResponseData === undefined) return;
			let subqueryData = currentResponseData.find((item) => {
				return item.name === path[i] && !!item.subquery;
			}) as Restura.ResponseData | undefined;
			if (subqueryData === undefined) return;
			currentResponseData = subqueryData.subquery?.properties;
		}
		if (currentResponseData === undefined) return;

		// Check for duplicate name
		if (
			currentResponseData.findIndex(
				(item, index) => item.name === responseData.name && parameterIndex !== index
			) !== -1
		) {
			rsToastify.error('Can not update with a duplicate name.', 'Duplicate name');
			return;
		}

		currentResponseData[parameterIndex] = responseData;
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	addValidator(requestParamIndex: number) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex].request === undefined) return;
		(
			updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData
		).request[requestParamIndex].validator.push({
			type: 'MIN',
			value: 0
		});
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	removeValidator(requestParamIndex: number, validatorIndex: number) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (!('request' in updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex])) return;
		updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex].request![
			requestParamIndex
		].validator.splice(validatorIndex, 1);
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	addWhereClause(whereData: Restura.WhereData) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (SchemaService.isCustomRouteData(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex]))
			return;
		(
			updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData
		).where.push(whereData);
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	removeWhereClause(whereIndex: number) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (SchemaService.isCustomRouteData(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex]))
			return;
		(
			updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData
		).where.splice(whereIndex, 1);
		if (
			(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData)
				.where.length > 0 &&
			(updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData)
				.where[0].conjunction
		)
			delete (
				updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] as Restura.StandardRouteData
			).where[0].conjunction;
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	removeRequestParam(requestParamIndex: number) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (!('request' in updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex])) return;
		updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex].request!.splice(requestParamIndex, 1);
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	removeAssignment(index: number) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToSelectedRoute(schema);
		if (!('request' in updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex])) return;
		const route = updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex];
		if (SchemaService.isCustomRouteData(route)) return;
		route.assignments.splice(index, 1);
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	getForeignKey(baseTableName: string, foreignTableName: string): Restura.ForeignKeyData | undefined {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let baseTable = schema.database.find((table) => table.name === baseTableName);
		if (!baseTable) return;
		return baseTable.foreignKeys.find((key) => key.refTable === foreignTableName);
	}

	static getIndexesToSelectedRoute(schema: Restura.Schema): { endpointIndex: number; routeIndex: number } {
		let selectedRoute = getRecoilExternalValue<SelectedRoute | undefined>(globalState.selectedRoute);
		let indices = {
			endpointIndex: -1,
			routeIndex: -1
		};
		if (!selectedRoute) return indices;
		indices.endpointIndex = schema.endpoints.findIndex((r) => r.baseUrl === selectedRoute!.baseUrl);
		if (indices.endpointIndex === -1) throw new Error('Endpoint not found');
		indices.routeIndex = schema.endpoints[indices.endpointIndex].routes.findIndex((r) => {
			return r.path === selectedRoute!.path && r.method === selectedRoute!.method;
		});
		if (indices.routeIndex === -1) throw new Error('Route not found');
		return indices;
	}

	static generateForeignKeyName(tableName: string, column: string, refTableName: string, refColumn: string) {
		return `${tableName}_${column}_${refTableName}_${refColumn}_fk`;
	}

	static generateIndexName(tableName: string, columns: string[], isUnique: boolean) {
		return `${tableName}_${columns.join('_')}${isUnique ? '_unique' : ''}_index`;
	}

	static getTableData(schemaData: Restura.Schema, tableName: string): Restura.TableData {
		return schemaData.database.find((item) => item.name === tableName)!;
	}

	static getColumnData(schemaData: Restura.Schema, tableName: string, columnName: string): Restura.ColumnData {
		return schemaData.database
			.find((item) => item.name === tableName)!
			.columns.find((item) => item.name === columnName)!;
	}

	static validateDatabaseSchema(schema: Restura.Schema): string[] {
		// Check for duplicate table names
		const tableNames = schema.database.map((table) => table.name);
		const duplicateTableNames = tableNames.filter((item, index) => tableNames.indexOf(item) !== index);
		let errors: string[] = [];
		if (duplicateTableNames.length > 0) {
			errors.push(`Duplicate table names: ${duplicateTableNames.join(', ')}`);
		}

		// Check for a primary key per table
		const tablesWithoutPrimaryKey = schema.database.filter(
			(table) => !table.indexes.find((index) => index.isPrimaryKey)
		);
		if (tablesWithoutPrimaryKey.length > 0) {
			errors.push(`Tables without primary key: ${tablesWithoutPrimaryKey.map((table) => table.name).join(', ')}`);
		}

		// TODO: Look for any indexes that have MISSING! in their name

		// TODO: Look for any foreign keys that have MISSING! in their name

		return errors;
	}

	static isCustomRouteData(data: Restura.RouteData | undefined): data is Restura.CustomRouteData {
		if (!data) return false;
		return data.type === 'CUSTOM_ONE' || data.type === 'CUSTOM_ARRAY' || data.type === 'CUSTOM_PAGED';
	}

	static isStandardRouteData(data: Restura.RouteData | undefined): data is Restura.StandardRouteData {
		if (!data) return false;
		return data.type !== 'CUSTOM_ONE' && data.type !== 'CUSTOM_ARRAY' && data.type !== 'CUSTOM_PAGED';
	}

	static convertSqlTypeToTypescriptType(sqlType: string, value?: string): string {
		switch (sqlType.toLowerCase()) {
			case 'smallint':
			case 'mediumint':
			case 'int':
			case 'bigint':
			case 'decimal':
			case 'integer':
			case 'float':
			case 'double':
				return 'number';
			case 'varchar':
				return 'string';
			case 'date':
				return 'Date';
			case 'datetime':
				return 'Date';
			case 'tinyint':
			case 'boolean':
				return 'boolean';
			case 'enum':
				return 'enum';
			case 'json':
				if (value) {
					return value
						.split(',')
						.map((val) => {
							return val.replace(/['"]/g, '');
						})
						.join(' | ');
				}
				return 'object';
			default:
				return 'any';
		}
	}

	static getInterfaceFromCustomTypes(interfaceName: string, customTypes: string): string {
		// Change the code below to find the index using a regex
		const regex = new RegExp(`\\b(interface|type)\\s+${interfaceName}\\b`);
		const match = regex.exec(customTypes);
		if (!match) return 'not found';
		const start = match.index;

		let index = customTypes.indexOf('{', start) + 1;
		let depth = 1;
		while (customTypes[index] !== undefined && depth > 0) {
			if (customTypes[index] === '{') {
				depth++;
			} else if (customTypes[index] === '}') {
				depth--;
			}
			index++;
		}
		if (start !== -1 && depth === 0) {
			return customTypes.substring(start, index + 1);
		}
		return 'not found';
	}

	static getTypeForResponseProperty(selector: string): string {
		const schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return 'unknown';
		let tableName = selector.split('.')[0];
		let columnName = selector.split('.')[1];

		let table = schema.database.find((item) => item.name === tableName);
		if (!table && tableName.includes('_')) {
			// Look to see if this has a join
			const tableAliasSplit = tableName.split('_');
			tableName = tableAliasSplit[1];
			table = schema.database.find((item) => item.name === tableName);
		}
		if (!table) return 'unknown';

		let column = table.columns.find((item) => item.name === columnName);
		if (!column) return 'unknown';

		return `${column.isNullable ? '(?)' : ''} ${SchemaService.convertSqlTypeToTypescriptType(
			column.type,
			column.value
		)}`;
	}
}
