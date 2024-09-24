declare namespace Restura {
	export type MariaDbColumnNumericTypes =
		| 'BOOLEAN' //	1-byte	A synonym for "TINYINT(1)". Supported from version 1.2.0 onwards.
		| 'TINYINT' //	1-byte	A very small integer. Numeric value with scale 0. Signed: -126 to +127. Unsigned: 0 to 253.
		| 'SMALLINT' //	2-bytes	A small integer. Signed: -32,766 to 32,767. Unsigned: 0 to 65,533.
		| 'MEDIUMINT' //	3-bytes	A medium integer. Signed: -8388608 to 8388607. Unsigned: 0 to 16777215. Supported starting with MariaDB ColumnStore 1.4.2.
		| 'INTEGER' //	4-bytes	A normal-size integer. Numeric value with scale 0. Signed: -2,147,483,646 to 2,147,483,647. Unsigned: 0 to 4,294,967,293
		| 'BIGINT' //	8-bytes	A large integer. Numeric value with scale 0. Signed: -9,223,372,036,854,775,806 to+9,223,372,036,854,775,807 Unsigned: 0 to +18,446,744,073,709,551,613
		| 'DECIMAL' //	2, 4, or 8 bytes	A packed fixed-point number that can have a specific total number of digits and with a set number of digits after a decimal. The maximum precision (total number of digits) that can be specified is 18.
		| 'FLOAT' //	4 bytes	Stored in 32-bit IEEE-754 floating point format. As such, the number of significant digits is about 6and the range of values is approximately +/- 1e38.The MySQL extension to specify precision and scale is not supported.
		| 'DOUBLE'; //	8 bytes	Stored in 64-bit IEEE-754 floating point format. As such, the number of significant digits is about 15 and the range of values is approximately +/-1e308. The MySQL extension to specify precision and scale is not supported. “REAL” is a synonym for “DOUBLE”.

	export type MariaDbColumnStringTypes =
		| 'CHAR' //	1, 2, 4, or 8 bytes	Holds letters and special characters of fixed length. Max length is 255. Default and minimum size is 1 byte.
		| 'VARCHAR' //	1, 2, 4, or 8 bytes or 8-byte token	Holds letters, numbers, and special characters of variable length. Max length = 8000 bytes or characters and minimum length = 1 byte or character.
		| 'TINYTEXT' //	255 bytes	Holds a small amount of letters, numbers, and special characters of variable length. Supported from version 1.1.0 onwards.
		| 'TINYBLOB' //	255 bytes	Holds a small amount of binary data of variable length. Supported from version 1.1.0 onwards.
		| 'TEXT' //	64 KB	Holds letters, numbers, and special characters of variable length. Supported from version 1.1.0 onwards.
		| 'BLOB' //	64 KB	Holds binary data of variable length. Supported from version 1.1.0 onwards.
		| 'MEDIUMTEXT' //	16 MB	Holds a medium amount of letters, numbers, and special characters of variable length. Supported from version 1.1.0 onwards.
		| 'MEDIUMBLOB' //	16 MB	Holds a medium amount of binary data of variable length. Supported from version 1.1.0 onwards.
		| 'LONGTEXT' //	1.96 GB	Holds a large amount of letters, numbers, and special characters of variable length. Supported from version 1.1.0 onwards.
		| 'JSON' //	Alias for LONGTEXT, creates a CONSTRAINT for JSON_VALID, holds a JSON-formatted string of plain text.
		| 'LONGBLOB' // 1.96 GB	Holds a large amount of binary data of variable length. Supported from version 1.1.0 onwards.
		| 'ENUM';

	export type MariaDbColumnDateTypes =
		| 'DATE' //	4-bytes	Date has year, month, and day. The internal representation of a date is a string of 4 bytes. The first 2 bytes represent the year, .5 bytes the month, and .75 bytes the day in the following format: YYYY-MM-DD. Supported range is 1000-01-01 to 9999-12-31.
		| 'DATETIME' //	8-bytes	A date and time combination. Supported range is 1000-01-01 00:00:00 to 9999-12-31 23:59:59. From version 1.2.0 microseconds are also supported.
		| 'TIME' //	8-bytes	Holds hour, minute, second and optionally microseconds for time. Supported range is '-838:59:59.999999' to '838:59:59.999999'. Supported from version 1.2.0 onwards.
		| 'TIMESTAMP'; //	4-bytes	Values are stored as the number of seconds since 1970-01-01 00:00:00 UTC, and optionally microseconds. The max value is currently 2038-01-19 03:14:07 UTC. Supported starting with MariaDB ColumnStore 1.4.2.

	export type ForeignKeyActions = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';

	export interface IndexData {
		name: string; // name = ${table}_${columnName0}_${columnName1}_..._${columnNameN}_(unique)_index (unique is optional)
		columns: string[];
		isUnique: boolean;
		order: 'ASC' | 'DESC';
		isPrimaryKey: boolean;
	}

	export interface ForeignKeyData {
		name: string; // name = ${table}_${refTable}_${refColumn}_fk
		column: string;
		refTable: string;
		refColumn: string;
		onDelete: ForeignKeyActions;
		onUpdate: ForeignKeyActions;
	}

	export interface ColumnData {
		name: string;
		type: MariaDbColumnNumericTypes | MariaDbColumnStringTypes | MariaDbColumnDateTypes;
		isNullable: boolean;
		roles: string[];
		comment?: string;
		default?: string;
		value?: string;
		isPrimary?: boolean;
		isUnique?: boolean;
		hasAutoIncrement?: boolean;
		length?: number;
	}

	export interface CheckConstraintData {
		name: string;
		check: string;
	}

	export interface TableData {
		name: string;
		columns: ColumnData[];
		indexes: IndexData[];
		foreignKeys: ForeignKeyData[];
		checkConstraints: CheckConstraintData[];
		roles: string[];
	}

	export interface ValidatorData {
		type: 'TYPE_CHECK' | 'MIN' | 'MAX' | 'ONE_OF';
		value: number[] | string[] | string | number;
	}

	export interface RequestData {
		name: string;
		required: boolean;
		validator: ValidatorData[];
	}

	export interface JoinData {
		table: string;
		localColumnName?: string;
		foreignColumnName?: string;
		custom?: string;
		type: 'INNER' | 'LEFT';
		alias?: string; // Alias should follow format "localColumnName_table". This allows us to properly look up the types
	}

	export interface ResponseData {
		name: string;
		selector?: string;
		subquery?: {
			table: string;
			joins: JoinData[];
			where: WhereData[];
			properties: ResponseData[];
			groupBy?: GroupByData;
			orderBy?: OrderByData;
		};
	}

	export interface WhereData {
		tableName?: string;
		columnName?: string;
		operator?: '=' | '<' | '>' | '<=' | '>=' | '!=' | 'LIKE' | 'IN' | 'NOT IN' | 'STARTS WITH' | 'ENDS WITH';
		value?: string;
		custom?: string;
		conjunction?: 'AND' | 'OR';
	}

	export interface OrderByData {
		tableName: string;
		columnName: string;
		order: 'ASC' | 'DESC';
	}

	export interface GroupByData {
		tableName: string;
		columnName: string;
	}

	export interface RouteDataBase {
		method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
		name: string;
		description: string;
		path: string;
		roles: string[];
	}

	export interface AssignData {
		name: string;
		value: string;
	}

	export interface StandardRouteData extends RouteDataBase {
		type: 'ONE' | 'ARRAY' | 'PAGED';
		table: string;
		joins: JoinData[];
		assignments: AssignData[];
		where: WhereData[];
		request: RequestData[];
		response: ResponseData[];
		groupBy?: GroupByData;
		orderBy?: OrderByData;
	}

	export interface CustomRouteData extends RouteDataBase {
		type: 'CUSTOM_ONE' | 'CUSTOM_ARRAY' | 'CUSTOM_PAGED';
		responseType: string | 'number' | 'string' | 'boolean';
		requestType?: string;
		request?: RequestData[];
		fileUploadType?: 'SINGLE' | 'MULTIPLE';
	}

	export type RouteData = CustomRouteData | StandardRouteData;

	export interface EndpointData {
		name: string;
		description: string;
		baseUrl: string;
		routes: RouteData[];
	}

	export interface Schema {
		database: TableData[];
		endpoints: EndpointData[];
		globalParams: string[];
		roles: string[];
		customTypes: string;
	}

	export interface SchemaChangeValue {
		name: string;
		changeType: 'NEW' | 'MODIFIED' | 'DELETED';
	}

	export interface SchemaPreview {
		commands: string;
		endPoints: SchemaChangeValue[];
		globalParams: SchemaChangeValue[];
		roles: SchemaChangeValue[];
		customTypes: boolean;
	}

	export interface LoginDetails {
		token: string;
		refreshToken: string;
		expiresOn: string;
		user: {
			firstName: string;
			lastName: string;
			email: string;
		};
	}

	// The `string` type is to handle for enums
	type ValidatorString = 'boolean' | 'string' | 'number' | 'object' | 'any';

	interface ResponseType {
		isOptional?: boolean;
		isArray?: boolean;
		validator: ValidatorString | ResponseTypeMap | string[];
	}

	export interface ResponseTypeMap {
		[property: string]: ResponseType;
	}
}
