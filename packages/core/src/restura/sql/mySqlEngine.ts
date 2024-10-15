import { ObjectUtils } from '@redskytech/core-utils';
import { RsError } from '../errors';
import { JoinData, ResponseData, ResturaSchema, StandardRouteData, TableData, WhereData } from '../restura.schema.js';
import { DynamicObject, RsRequest } from '../types/customExpress.types.js';
import SqlEngine from './SqlEngine';
import { SqlUtils } from './SqlUtils';

function dbNow() {
	return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

class MySqlEngine extends SqlEngine {
	async createDatabaseFromSchema(schema: ResturaSchema, connection: CustomPool): Promise<string> {
		const sqlFullStatement = this.generateDatabaseSchemaFromSchema(schema);
		await connection.runQuery(sqlFullStatement, []);
		return sqlFullStatement;
	}

	generateDatabaseSchemaFromSchema(schema: ResturaSchema): string {
		const sqlStatements = [];
		// Setup tables and indexes first
		for (const table of schema.database) {
			let sql = `CREATE TABLE \`${table.name}\`
                       (  `;
			for (const column of table.columns) {
				sql += `\t\`${column.name}\` ${column.type}`;
				let value = column.value;
				// JSON's value is used only for typescript not for the database
				if (column.type === 'JSON') value = '';
				if (column.type === 'DECIMAL' && value) {
					// replace the character '-' with comma since we use it to separate the values in restura for decimals
					// also remove single and double quotes
					value = value.replace('-', ',').replace(/['"]/g, '');
				}
				if (value) sql += `(${value})`;
				else if (column.length) sql += `(${column.length})`;
				if (column.isPrimary) sql += ' PRIMARY KEY';
				if (column.isUnique) sql += ' UNIQUE';
				if (column.isNullable) sql += ' NULL';
				else sql += ' NOT NULL';
				if (column.hasAutoIncrement) sql += ' AUTO_INCREMENT';
				if (column.default) sql += ` DEFAULT ${column.default}`;
				sql += ', \n';
			}
			for (const index of table.indexes) {
				if (index.isPrimaryKey) {
					sql += `\tPRIMARY KEY (\`${index.columns.join('`, `')}\`)`;
				} else {
					if (index.isUnique) sql += ' UNIQUE';
					sql += `\tINDEX \`${index.name}\` (${index.columns
						.map((item) => {
							return `\`${item}\` ${index.order}`;
						})
						.join(', ')})`;
				}
				sql += ', \n';
			}
			sql = sql.slice(0, -3);
			sql += '\n);';
			sqlStatements.push(sql);
		}

		// Now setup foreign keys
		for (const table of schema.database) {
			if (!table.foreignKeys.length) continue;
			const sql = `ALTER TABLE \`${table.name}\`  `;
			const constraints: string[] = [];
			for (const foreignKey of table.foreignKeys) {
				let constraint = `\tADD CONSTRAINT \`${foreignKey.name}\` FOREIGN KEY (\`${foreignKey.column}\`) REFERENCES \`${foreignKey.refTable}\`(\`${foreignKey.refColumn}\`)`;
				constraint += ` ON DELETE ${foreignKey.onDelete}`;
				constraint += ` ON UPDATE ${foreignKey.onUpdate}`;
				constraints.push(constraint);
			}
			sqlStatements.push(sql + constraints.join(',\n') + ';');
		}

		// Now setup check constraints
		for (const table of schema.database) {
			if (!table.checkConstraints.length) continue;
			const sql = `ALTER TABLE \`${table.name}\`  `;
			const constraints: string[] = [];
			for (const check of table.checkConstraints) {
				const constraint = `ADD CONSTRAINT \`${check.name}\` CHECK (${check.check})`;
				constraints.push(constraint);
			}
			sqlStatements.push(sql + constraints.join(',\n') + ';');
		}

		return sqlStatements.join('\n\n');
	}

	// async diffDatabaseToSchema(schema: ResturaSchema): Promise<string> {
	// 	let dbConfig: IMysqlDatabase = config.database[0];
	//
	// 	let scratchConnection: CustomPool = createCustomPool([
	// 		{
	// 			host: dbConfig.host,
	// 			user: dbConfig.user,
	// 			password: dbConfig.password,
	// 			port: dbConfig.port
	// 		}
	// 	]);
	// 	await scratchConnection.runQuery(
	// 		`DROP DATABASE IF EXISTS ${config.database[0].database}_scratch;
	// 									 CREATE DATABASE ${config.database[0].database}_scratch;
	// 									 USE ${config.database[0].database}_scratch;`,
	// 		[],
	// 		systemUserRequesterDetails
	// 	);
	//
	// 	scratchConnection.end();
	// 	scratchConnection = createCustomPool([
	// 		{
	// 			host: dbConfig.host,
	// 			user: dbConfig.user,
	// 			password: dbConfig.password,
	// 			port: dbConfig.port,
	// 			database: `${config.database[0].database}_scratch`
	// 		}
	// 	]);
	//
	// 	await this.createDatabaseFromSchema(schema, scratchConnection);
	// 	const diff = new DbDiff.DbDiff();
	// 	const conn1 = `mysql://${dbConfig.user}:${encodeURIComponent(dbConfig.password)}@${dbConfig.host}:${
	// 		dbConfig.port
	// 	}/${dbConfig.database}`;
	// 	const conn2 = `mysql://${dbConfig.user}:${encodeURIComponent(dbConfig.password)}@${dbConfig.host}:${
	// 		dbConfig.port
	// 	}/${dbConfig.database}_scratch`;
	// 	await diff.compare(conn1, conn2);
	// 	return diff.commands('');
	// }

	private createNestedSelect(
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

		return `IFNULL((
						SELECT JSON_ARRAYAGG(
							JSON_OBJECT(
								${item.subquery.properties
									.map((nestedItem) => {
										if (
											!this.doesRoleHavePermissionToColumn(
												req.requesterDetails.role,
												schema,
												nestedItem,
												[...routeData.joins, ...item.subquery!.joins]
											)
										) {
											return;
										}
										if (nestedItem.subquery) {
											return `"${nestedItem.name}", ${this.createNestedSelect(
												req,
												schema,
												nestedItem,
												routeData,
												userRole,
												sqlParams
											)}`;
										}
										return `"${nestedItem.name}", ${nestedItem.selector}`;
									})
									.filter(Boolean)
									.join(',')}
							)
						) 
						FROM
							${item.subquery.table}
							${this.generateJoinStatements(req, item.subquery.joins, item.subquery.table, routeData, schema, userRole, sqlParams)}
							${this.generateWhereClause(req, item.subquery.where, routeData, sqlParams)}
					), '[]')`;
	}

	private async executeCreateRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<DynamicObject> {
		const sqlParams: string[] = [];
		let parameterString = '';
		parameterString = (routeData.assignments || [])
			.map((assignment) => {
				return `${assignment.name} = ${this.replaceParamKeywords(assignment.value, routeData, req, sqlParams)}`;
			})
			.join(', ');
		const createdItem = await mainConnection.runQuery(
			`INSERT INTO \`${routeData.table}\`
             SET ? ${parameterString ? `, ${parameterString}` : ''};`,
			[{ ...req.data }, ...sqlParams],
			req.requesterDetails
		);
		const insertId = createdItem.insertId;
		const whereData: Restura.WhereData[] = [
			...routeData.where,
			{
				...(routeData.where.length ? { conjunction: 'AND' } : {}),
				tableName: routeData.table,
				value: `${insertId}`,
				columnName: 'id',
				operator: '='
			}
		];
		req.data = { id: insertId };
		return this.executeGetRequest(req, { ...routeData, where: whereData }, schema);
	}

	private async executeGetRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<DynamicObject> {
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
				return `${item.selector} AS ${item.name}`;
			})
			.join(',\n\t')}\n`;
		sqlStatement += `FROM \`${routeData.table}\`\n`;
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
			return await mainConnection.queryOne(
				`${selectStatement}${sqlStatement}${groupByOrderByStatement};`,
				sqlParams,
				req.requesterDetails
			);
		} else if (routeData.type === 'ARRAY') {
			// Array
			return await mainConnection.runQuery(
				`${selectStatement}${sqlStatement}${groupByOrderByStatement};`,
				sqlParams,
				req.requesterDetails
			);
		} else if (routeData.type === 'PAGED') {
			// The COUNT() does not work with group by and order by, so we need to catch that case and act accordingly
			const pageResults = await mainConnection.runQuery(
				`${selectStatement}${sqlStatement}${groupByOrderByStatement} LIMIT ? OFFSET ?;SELECT COUNT(${
					routeData.groupBy ? `DISTINCT ${routeData.groupBy.tableName}.${routeData.groupBy.columnName}` : '*'
				}) AS total\n${sqlStatement};`,
				[
					...sqlParams,
					req.data.perPage || DEFAULT_PAGED_PER_PAGE_NUMBER,
					(req.data.page - 1) * req.data.perPage || DEFAULT_PAGED_PAGE_NUMBER,
					...sqlParams
				],
				req.requesterDetails
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

	private async executeUpdateRequest(
		req: RsRequest<unknown>,
		routeData: StandardRouteData,
		schema: ResturaSchema
	): Promise<DynamicObject> {
		const sqlParams: string[] = [];
		// eslint-disable-next-line
		const { id, ...bodyNoId } = req.body;

		// See if table has a modifiedOn column, if so set it to now
		// Find the database table
		const table = schema.database.find((item) => {
			return item.name === routeData.table;
		});
		if (!table) throw new RsError('UNKNOWN_ERROR', 'Unknown table.');
		if (table.columns.find((column) => column.name === 'modifiedOn')) {
			bodyNoId.modifiedOn = dbNow();
		}

		// In order remove ambiguity, we need to add the table name to the column names when the table is joined
		for (const i in bodyNoId) {
			if (i.includes('.')) continue;
			bodyNoId[`${routeData.table}.${i}`] = bodyNoId[i];
			delete bodyNoId[i];
		}

		for (const assignment of routeData.assignments) {
			const column = table.columns.find((column) => column.name === assignment.name);
			if (!column) continue;

			const assignmentWithPrefix = `${routeData.table}.${assignment.name}`;

			if (SqlUtils.convertDatabaseTypeToTypescript(column.type) === 'boolean')
				bodyNoId[assignmentWithPrefix] = assignment.value.toLowerCase() === 'false' ? 0 : 1;
			else if (SqlUtils.convertDatabaseTypeToTypescript(column.type) === 'number')
				bodyNoId[assignmentWithPrefix] = Number(assignment.value);
			else bodyNoId[assignmentWithPrefix] = assignment.value;
		}

		const joinStatement = this.generateJoinStatements(
			req,
			routeData.joins,
			routeData.table,
			routeData,
			schema,
			req.requesterDetails.role,
			sqlParams
		);
		let sqlStatement = `UPDATE \`${routeData.table}\` ${joinStatement}
                            SET ? `;
		sqlStatement += this.generateWhereClause(req, routeData.where, routeData, sqlParams);
		sqlStatement += ';';
		await mainConnection.runQuery(sqlStatement, [bodyNoId, ...sqlParams], req.requesterDetails);
		return this.executeGetRequest(req, routeData, schema);
	}

	private async executeDeleteRequest(
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

		let deleteStatement = `DELETE FROM
        ${routeData.table}
        ${joinStatement}`;
		deleteStatement += this.generateWhereClause(req, routeData.where, routeData, sqlParams);
		deleteStatement += ';';
		await mainConnection.runQuery(deleteStatement, sqlParams, req.requesterDetails);
		return true;
	}

	private generateJoinStatements(
		req: RsRequest<unknown>,
		joins: JoinData[],
		baseTable: string,
		routeData: StandardRouteData,
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
				joinStatements += `\t${item.type} JOIN \`${item.table}\` ON ${customReplaced}\n`;
			} else {
				joinStatements += `\t${item.type} JOIN \`${item.table}\`${
					item.alias ? `AS ${item.alias}` : ''
				} ON \`${baseTable}\`.\`${item.localColumnName}\` = \`${item.alias ? item.alias : item.table}\`.\`${
					item.foreignColumnName
				}\`\n`;
			}
		});
		return joinStatements;
	}

	private getTableSchema(schema: ResturaSchema, tableName: string): TableData {
		const tableSchema = schema.database.find((item) => item.name === tableName);
		if (!tableSchema) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
		return tableSchema;
	}

	protected generateGroupBy(routeData: StandardRouteData): string {
		console.log(routeData);
		return '';
	}

	protected abstract generateOrderBy(req: RsRequest<unknown>, routeData: StandardRouteData): string {
		console.log(req, routeData);
		return '';
	}

	protected abstract generateWhereClause(
		req: RsRequest<unknown>,
		where: WhereData[],
		routeData: StandardRouteData,
		sqlParams: string[]
	): string {
		console.log(req, where, routeData, sqlParams);
		return '';
	}
}

const mySqlEngine = new MySqlEngine();
export default mySqlEngine;
