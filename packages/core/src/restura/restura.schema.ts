import { z } from 'zod';
import { logger } from '../logger/logger';
import { validatorDataSchema } from './types/validation.types';

// Zod schemas with strict mode
const orderBySchema = z
	.object({
		columnName: z.string(),
		order: z.enum(['ASC', 'DESC']),
		tableName: z.string()
	})
	.strict();

export type OrderByData = z.infer<typeof orderBySchema>;

const groupBySchema = z
	.object({
		columnName: z.string(),
		tableName: z.string()
	})
	.strict();

export type GroupByData = z.infer<typeof groupBySchema>;

const whereDataSchema = z
	.object({
		tableName: z.string().optional(),
		columnName: z.string().optional(),
		operator: z
			.enum(['=', '<', '>', '<=', '>=', '!=', 'LIKE', 'IN', 'NOT IN', 'STARTS WITH', 'ENDS WITH'])
			.optional(),
		value: z.string().or(z.number()).optional(),
		custom: z.string().optional(),
		conjunction: z.enum(['AND', 'OR']).optional()
	})
	.strict();

export type WhereData = z.infer<typeof whereDataSchema>;

const assignmentDataSchema = z
	.object({
		name: z.string(),
		value: z.string()
	})
	.strict();

export type AssignmentData = z.infer<typeof assignmentDataSchema>;

const joinDataSchema = z
	.object({
		table: z.string(),
		localColumnName: z.string().optional(),
		foreignColumnName: z.string().optional(),
		custom: z.string().optional(),
		type: z.enum(['LEFT', 'INNER']),
		alias: z.string().optional()
	})
	.strict();

export type JoinData = z.infer<typeof joinDataSchema>;

const requestDataSchema = z
	.object({
		name: z.string(),
		required: z.boolean(),
		isNullable: z.boolean().optional().default(false),
		validator: z.array(validatorDataSchema)
	})
	.strict();

export type RequestData = z.infer<typeof requestDataSchema>;

const responseDataSchema = z
	.object({
		name: z.string(),
		selector: z.string().optional(),
		subquery: z
			.object({
				table: z.string(),
				joins: z.array(joinDataSchema),
				where: z.array(whereDataSchema),
				properties: z.array(z.lazy((): z.ZodSchema => responseDataSchema)), // Explicit type for the lazy schema
				groupBy: groupBySchema.optional(),
				orderBy: orderBySchema.optional()
			})
			.optional()
	})
	.strict();

export type ResponseData = z.infer<typeof responseDataSchema>;

const routeDataBaseSchema = z
	.object({
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
		name: z.string(),
		description: z.string(),
		path: z.string(),
		roles: z.array(z.string())
	})
	.strict();

export type RouteDataBase = z.infer<typeof routeDataBaseSchema>;

const standardRouteSchema = routeDataBaseSchema
	.extend({
		type: z.enum(['ONE', 'ARRAY', 'PAGED']),
		table: z.string(),
		joins: z.array(joinDataSchema),
		assignments: z.array(assignmentDataSchema),
		where: z.array(whereDataSchema),
		request: z.array(requestDataSchema),
		response: z.array(responseDataSchema),
		groupBy: groupBySchema.optional(),
		orderBy: orderBySchema.optional()
	})
	.strict();

export type StandardRouteData = z.infer<typeof standardRouteSchema>;

const customRouteSchema = routeDataBaseSchema
	.extend({
		type: z.enum(['CUSTOM_ONE', 'CUSTOM_ARRAY', 'CUSTOM_PAGED']),
		responseType: z.union([z.string(), z.enum(['string', 'number', 'boolean'])]),
		requestType: z.string().optional(),
		request: z.array(requestDataSchema).optional(),
		table: z.undefined(),
		joins: z.undefined(),
		assignments: z.undefined(),
		fileUploadType: z.enum(['SINGLE', 'MULTIPLE']).optional()
	})
	.strict();

export type CustomRouteData = z.infer<typeof customRouteSchema>;

export type RouteData = CustomRouteData | StandardRouteData;

// PostgresColumnNumericTypes Zod enum with PascalCase values and comments
export const postgresColumnNumericTypesSchema = z.enum([
	'SMALLINT', // 2 bytes, -32,768 to 32,767
	'INTEGER', // 4 bytes, -2,147,483,648 to 2,147,483,647
	'BIGINT', // 8 bytes, -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
	'DECIMAL', // user-specified precision, exact numeric
	'NUMERIC', // same as DECIMAL
	'REAL', // 4 bytes, 6 decimal digits precision (single precision)
	'DOUBLE PRECISION', // 8 bytes, 15 decimal digits precision (double precision)
	'SERIAL', // auto-incrementing integer
	'BIGSERIAL' // auto-incrementing big integer
]);
export type PostgresColumnNumericTypes = z.infer<typeof postgresColumnNumericTypesSchema>;

// PostgresColumnStringTypes Zod enum with PascalCase values and comments
export const postgresColumnStringTypesSchema = z.enum([
	'CHAR', // fixed-length, blank-padded
	'VARCHAR', // variable-length with limit
	'TEXT', // variable-length without limit
	'BYTEA' // binary data
]);
export type PostgresColumnStringTypes = z.infer<typeof postgresColumnStringTypesSchema>;

// PostgresColumnDateTypes Zod enum with PascalCase values and comments
export const postgresColumnDateTypesSchema = z.enum([
	'DATE', // calendar date (year, month, day)
	'TIMESTAMP', // both date and time (without time zone)
	'TIMESTAMPTZ', // both date and time (with time zone)
	'TIME', // time of day (without time zone)
	'INTERVAL' // time span
]);
export type PostgresColumnDateTypes = z.infer<typeof postgresColumnDateTypesSchema>;

// MariaDbColumnNumericTypes Zod enum with PascalCase values and comments
export const mariaDbColumnNumericTypesSchema = z.enum([
	'BOOLEAN', // 1-byte A synonym for "TINYINT(1)". Supported from version 1.2.0 onwards.
	'TINYINT', // 1-byte A very small integer. Numeric value with scale 0. Signed: -126 to +127. Unsigned: 0 to 253.
	'SMALLINT', // 2-bytes A small integer. Signed: -32,766 to 32,767. Unsigned: 0 to 65,533.
	'MEDIUMINT', // 3-bytes A medium integer. Signed: -8388608 to 8388607. Unsigned: 0 to 16777215. Supported starting with MariaDB ColumnStore 1.4.2.
	'INTEGER', // 4-bytes A normal-size integer. Numeric value with scale 0. Signed: -2,147,483,646 to 2,147,483,647. Unsigned: 0 to 4,294,967,293
	'BIGINT', // 8-bytes A large integer. Numeric value with scale 0. Signed: -9,223,372,036,854,775,806 to +9,223,372,036,854,775,807 Unsigned: 0 to +18,446,744,073,709,551,613
	'DECIMAL', // 2, 4, or 8 bytes A packed fixed-point number that can have a specific total number of digits and with a set number of digits after a decimal. The maximum precision (total number of digits) that can be specified is 18.
	'FLOAT', // 4 bytes Stored in 32-bit IEEE-754 floating point format. As such, the number of significant digits is about 6, and the range of values is approximately +/- 1e38.
	'DOUBLE' // 8 bytes Stored in 64-bit IEEE-754 floating point format. As such, the number of significant digits is about 15 and the range of values is approximately +/-1e308.
]);
export type MariaDbColumnNumericTypes = z.infer<typeof mariaDbColumnNumericTypesSchema>;

// MariaDbColumnStringTypes Zod enum with PascalCase values and comments
export const mariaDbColumnStringTypesSchema = z.enum([
	'CHAR', // 1, 2, 4, or 8 bytes Holds letters and special characters of fixed length. Max length is 255. Default and minimum size is 1 byte.
	'VARCHAR', // 1, 2, 4, or 8 bytes or 8-byte token Holds letters, numbers, and special characters of variable length. Max length = 8000 bytes or characters and minimum length = 1 byte or character.
	'TINYTEXT', // 255 bytes Holds a small amount of letters, numbers, and special characters of variable length. Supported from version 1.1.0 onwards.
	'TINYBLOB', // 255 bytes Holds a small amount of binary data of variable length. Supported from version 1.1.0 onwards.
	'TEXT', // 64 KB Holds letters, numbers, and special characters of variable length. Supported from version 1.1.0 onwards.
	'BLOB', // 64 KB Holds binary data of variable length. Supported from version 1.1.0 onwards.
	'MEDIUMTEXT', // 16 MB Holds a medium amount of letters, numbers, and special characters of variable length. Supported from version 1.1.0 onwards.
	'MEDIUMBLOB', // 16 MB Holds a medium amount of binary data of variable length. Supported from version 1.1.0 onwards.
	'LONGTEXT', // 1.96 GB Holds a large amount of letters, numbers, and special characters of variable length. Supported from version 1.1.0 onwards.
	'JSON', // Alias for LONGTEXT, creates a CONSTRAINT for JSON_VALID, holds a JSON-formatted string of plain text.
	'LONGBLOB', // 1.96 GB Holds a large amount of binary data of variable length. Supported from version 1.1.0 onwards.
	'ENUM' // Enum type
]);
export type MariaDbColumnStringTypes = z.infer<typeof mariaDbColumnStringTypesSchema>;

// MariaDbColumnDateTypes Zod enum with PascalCase values and comments
export const mariaDbColumnDateTypesSchema = z.enum([
	'DATE', // 4-bytes Date has year, month, and day.
	'DATETIME', // 8-bytes A date and time combination. Supported range is 1000-01-01 00:00:00 to 9999-12-31 23:59:59. From version 1.2.0 microseconds are also supported.
	'TIME', // 8-bytes Holds hour, minute, second and optionally microseconds for time.
	'TIMESTAMP' // 4-bytes Values are stored as the number of seconds since 1970-01-01 00:00:00 UTC, and optionally microseconds.
]);
export type MariaDbColumnDateTypes = z.infer<typeof mariaDbColumnDateTypesSchema>;

// Define the ColumnData schema
const columnDataSchema = z
	.object({
		name: z.string(),
		type: z.union([
			postgresColumnNumericTypesSchema,
			postgresColumnStringTypesSchema,
			postgresColumnDateTypesSchema,
			mariaDbColumnNumericTypesSchema,
			mariaDbColumnStringTypesSchema,
			mariaDbColumnDateTypesSchema
		]),
		isNullable: z.boolean(),
		roles: z.array(z.string()),
		comment: z.string().optional(),
		default: z.string().optional(),
		value: z.string().optional(),
		isPrimary: z.boolean().optional(),
		isUnique: z.boolean().optional(),
		hasAutoIncrement: z.boolean().optional(),
		length: z.number().optional()
	})
	.strict();

export type ColumnData = z.infer<typeof columnDataSchema>;

const indexDataSchema = z
	.object({
		name: z.string(),
		columns: z.array(z.string()),
		isUnique: z.boolean(),
		isPrimaryKey: z.boolean(),
		order: z.enum(['ASC', 'DESC'])
	})
	.strict();

export type IndexData = z.infer<typeof indexDataSchema>;

// ForeignKeyActions Zod enum with PascalCase values
export const foreignKeyActionsSchema = z.enum([
	'CASCADE', // CASCADE action for foreign keys
	'SET NULL', // SET NULL action for foreign keys
	'RESTRICT', // RESTRICT action for foreign keys
	'NO ACTION', // NO ACTION for foreign keys
	'SET DEFAULT' // SET DEFAULT action for foreign keys
]);
export type ForeignKeyActions = z.infer<typeof foreignKeyActionsSchema>;

const foreignKeyDataSchema = z
	.object({
		name: z.string(),
		column: z.string(),
		refTable: z.string(),
		refColumn: z.string(),
		onDelete: foreignKeyActionsSchema,
		onUpdate: foreignKeyActionsSchema
	})
	.strict();

export type ForeignKeyData = z.infer<typeof foreignKeyDataSchema>;

const checkConstraintDataSchema = z
	.object({
		name: z.string(),
		check: z.string()
	})
	.strict();

export type CheckConstraintData = z.infer<typeof checkConstraintDataSchema>;

const tableDataSchema = z
	.object({
		name: z.string(),
		columns: z.array(columnDataSchema),
		indexes: z.array(indexDataSchema),
		foreignKeys: z.array(foreignKeyDataSchema),
		checkConstraints: z.array(checkConstraintDataSchema),
		roles: z.array(z.string())
	})
	.strict();

export type TableData = z.infer<typeof tableDataSchema>;

const endpointDataSchema = z
	.object({
		name: z.string(),
		description: z.string(),
		baseUrl: z.string(),
		routes: z.array(z.union([standardRouteSchema, customRouteSchema]))
	})
	.strict();

export type EndpointData = z.infer<typeof endpointDataSchema>;

// The full Schema schema
export const resturaZodSchema = z
	.object({
		database: z.array(tableDataSchema),
		endpoints: z.array(endpointDataSchema),
		globalParams: z.array(z.string()),
		roles: z.array(z.string()),
		customTypes: z.string()
	})
	.strict();

export type ResturaSchema = z.infer<typeof resturaZodSchema>;

export async function isSchemaValid(schemaToCheck: unknown): Promise<boolean> {
	try {
		resturaZodSchema.parse(schemaToCheck);
		return true;
	} catch (error) {
		logger.error(error);
		return false;
	}
}
