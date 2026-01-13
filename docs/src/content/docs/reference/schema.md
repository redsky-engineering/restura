---
title: restura.schema.json
description: The syntax and structure of the Restura schema file
---

`restura.schema.json` defines your database tables, API endpoints, types, and access control. Restura reads this file and generates everything needed to run your API.

Restura automatically regenerates your database, types, and API whenever the schema changes.

## Structure

The schema has six top-level properties:

```json
{
  "customTypes": [...],
  "database": [...],
  "endpoints": [...],
  "globalParams": ["companyId", "userId"],
  "roles": ["admin", "user", "anonymous"],
  "scopes": ["read:user", "write:user"]
}
```

| Property       | Purpose                                                |
| -------------- | ------------------------------------------------------ |
| `customTypes`  | TypeScript interfaces for non-standard response shapes |
| `database`     | Table definitions with columns, keys, and indexes      |
| `endpoints`    | API route groups and their configurations              |
| `globalParams` | User context values available in all endpoints         |
| `roles`        | User roles for access control                          |
| `scopes`       | Fine-grained permissions (OAuth-style)                 |

## Custom Types

Custom Types are reusable response shapes for endpoints with code-driven logic. When you write custom handler code that joins tables, transforms data, or returns computed results, define your response shape here instead of relying on Restura's automatic type generation.

```json
{
	"customTypes": [
		"export interface DashboardStats {\n    totalOrders: number;\n    revenue: number;\n    activeUsers: number;\n    topSellingProductId: number;\n}",
		"export interface OrderSummary {\n    orderId: number;\n    customerName: string;\n    itemCount: number;\n    subtotal: number;\n    tax: number;\n    total: number;\n}"
	]
}
```

Reference these in your endpoint configuration using `responseType`:

```json
{
	"method": "GET",
	"path": "/dashboard/stats",
	"name": "GetDashboardStats",
	"description": "Returns aggregated dashboard statistics",
	"responseType": "DashboardStats",
	"action": "getDashboardStats"
}
```

**When to use Custom Types:**

- Your endpoint has a custom action handler that manually constructs its response
- You're joining multiple tables in code rather than using Restura's subquery feature
- The response shape doesn't map directly to any database table
- You need computed or aggregated fields that Restura can't infer

Restura extracts these definitions during generation and creates proper `.d.ts` files, giving your custom handlers full type safety.

## Database

An array of table definitions. Each table includes its columns, foreign keys, indexes, and optional access control. Restura uses these definitions to generate SQL migrations and keep your database synchronized.

**Example:**

```json
{
	"name": "user",
	"notify": ["id", "firstName", "lastName", "email"],
	"roles": [],
	"scopes": [],
	"columns": [
		{
			"name": "id",
			"type": "BIGSERIAL",
			"isPrimary": true,
			"hasAutoIncrement": true,
			"isNullable": false
		},
		{
			"name": "firstName",
			"type": "VARCHAR",
			"length": 30,
			"isNullable": false
		},
		{
			"name": "email",
			"type": "VARCHAR",
			"length": 100,
			"isNullable": false
		},
		{
			"name": "role",
			"type": "ENUM",
			"value": "'admin','user'",
			"isNullable": false
		},
		{
			"name": "companyId",
			"type": "BIGINT",
			"isNullable": false
		}
	],
	"foreignKeys": [
		{
			"name": "user_companyId_company_id_fk",
			"column": "companyId",
			"refTable": "company",
			"refColumn": "id",
			"onDelete": "NO ACTION",
			"onUpdate": "NO ACTION"
		}
	],
	"indexes": [
		{ "name": "PRIMARY", "columns": ["id"], "isPrimaryKey": true, "isUnique": true },
		{ "name": "user_email_unique_index", "columns": ["email"], "isUnique": true }
	],
	"checkConstraints": []
}
```

**Table Properties:**

| Property           | Description                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `name`             | Table name in the database                                                                                          |
| `columns`          | Array of column definitions                                                                                         |
| `foreignKeys`      | Relationships to other tables                                                                                       |
| `indexes`          | Performance and uniqueness indexes                                                                                  |
| `checkConstraints` | Custom SQL check constraints                                                                                        |
| `notify`           | Columns to include in real-time notifications. Set to `"ALL"` for all columns, or an array of specific column names |
| `roles` / `scopes` | Table-level access restrictions                                                                                     |

**Column Properties:**

| Property           | Description                                                                    |
| ------------------ | ------------------------------------------------------------------------------ |
| `name`             | Column name (required)                                                         |
| `type`             | Data type (required)                                                           |
| `length`           | Character limit for VARCHAR                                                    |
| `value`            | For ENUM: quoted values like `"'a','b'"`. For DECIMAL: precision like `"10,2"` |
| `default`          | Default value expression                                                       |
| `isPrimary`        | Part of primary key                                                            |
| `isNullable`       | Allows NULL                                                                    |
| `hasAutoIncrement` | Auto-incrementing value                                                        |
| `comment`          | Documentation note                                                             |

**Supported Types:** `BIGSERIAL`, `BIGINT`, `INTEGER`, `MEDIUMINT`, `VARCHAR`, `TEXT`, `BOOLEAN`, `DATETIME`, `DECIMAL`, `ENUM`, `JSON`

## Endpoints

Endpoints are organized into groups, each with a base URL. This lets you version your API (`/api/v1`, `/api/v2`) or organize by domain.

```json
{
  "endpoints": [
    {
      "name": "V1",
      "description": "V1 Endpoints",
      "baseUrl": "/api/v1",
      "routes": [...]
    }
  ]
}
```

Each route defines an HTTP endpoint. Standard routes (`ONE`, `ARRAY`, `PAGED`) generate SQL queries automatically based on the table, response selectors, and where clauses. Custom routes (`CUSTOM_ONE`, `CUSTOM_ARRAY`) require you to write the handler logic yourself.

**Route Types:**

| Type           | Returns                               | Use Case                                    |
| -------------- | ------------------------------------- | ------------------------------------------- |
| `ONE`          | Single object                         | Get one record by ID or condition           |
| `ARRAY`        | Array of objects                      | List all matching records                   |
| `PAGED`        | Paginated response with metadata      | Large datasets with page/perPage support    |
| `CUSTOM_ONE`   | Single object (you write the handler) | Complex logic, external APIs, auth flows    |
| `CUSTOM_ARRAY` | Array (you write the handler)         | Complex aggregations, multi-step operations |

### Basic Endpoint

This endpoint returns the authenticated user. The `#userId` in the where clause references a global parameter extracted from the auth token.

```json
{
	"name": "Get My User",
	"description": "Get the authenticated user",
	"method": "GET",
	"path": "/user/me",
	"type": "ONE",
	"table": "user",
	"roles": ["user", "admin"],
	"scopes": [],
	"request": [],
	"response": [
		{ "name": "id", "selector": "user.id" },
		{ "name": "firstName", "selector": "user.firstName" },
		{ "name": "lastName", "selector": "user.lastName" },
		{ "name": "email", "selector": "user.email" }
	],
	"where": [{ "tableName": "user", "columnName": "id", "operator": "=", "value": "#userId" }],
	"joins": [],
	"assignments": []
}
```

The `response` array controls which columns are returned and how they're named. The `selector` uses `table.column` format.

### Paged Endpoint

Paged endpoints automatically handle pagination, filtering, and sorting. The request params (`page`, `perPage`, `filter`, `sortBy`, `sortOrder`) are standard for `PAGED` type routes.

```json
{
	"name": "Get Users Paged",
	"description": "List users with pagination",
	"method": "GET",
	"path": "/user/paged",
	"type": "PAGED",
	"table": "user",
	"roles": ["admin"],
	"scopes": [],
	"request": [
		{ "name": "page", "required": false, "validator": [{ "type": "TYPE_CHECK", "value": "number" }] },
		{ "name": "perPage", "required": false, "validator": [{ "type": "TYPE_CHECK", "value": "number" }] },
		{ "name": "filter", "required": false, "validator": [{ "type": "TYPE_CHECK", "value": "string" }] },
		{ "name": "sortBy", "required": false, "validator": [{ "type": "TYPE_CHECK", "value": "string" }] },
		{
			"name": "sortOrder",
			"required": false,
			"validator": [{ "type": "ONE_OF", "value": ["ASC", "DESC", "NONE", "RAND"] }]
		}
	],
	"response": [
		{ "name": "id", "selector": "user.id" },
		{ "name": "firstName", "selector": "user.firstName" },
		{ "name": "email", "selector": "user.email" }
	],
	"where": [],
	"joins": [],
	"assignments": []
}
```

The response includes pagination metadata alongside the data array.

### Endpoint with Joins

Joins let you include data from related tables. Each join needs an `alias` to reference in the response selectors. The `type` can be `INNER`, `LEFT`, or `RIGHT`.

```json
{
	"name": "Get Orders with User Info",
	"description": "List orders with user details",
	"method": "GET",
	"path": "/order/all",
	"type": "ARRAY",
	"table": "order",
	"roles": [],
	"scopes": [],
	"joins": [
		{
			"alias": "userId_user",
			"table": "user",
			"localColumnName": "userId",
			"foreignColumnName": "id",
			"type": "INNER"
		}
	],
	"response": [
		{ "name": "id", "selector": "order.id" },
		{ "name": "amount", "selector": "order.amountCents" },
		{ "name": "userFirstName", "selector": "userId_user.firstName" },
		{ "name": "userLastName", "selector": "userId_user.lastName" }
	],
	"where": [],
	"request": [],
	"assignments": []
}
```

For chained joins (joining a table through another join), use `localTable` and `localTableAlias` to specify which joined table to join from.

### Endpoint with Subquery

Subqueries nest related data inside each record. This returns users with their orders as a nested array.

```json
{
	"name": "Users With Orders",
	"description": "Get users with their order history",
	"method": "GET",
	"path": "/user/with-orders",
	"type": "ARRAY",
	"table": "user",
	"roles": [],
	"scopes": [],
	"response": [
		{ "name": "id", "selector": "user.id" },
		{ "name": "firstName", "selector": "user.firstName" },
		{
			"name": "orders",
			"subquery": {
				"table": "order",
				"joins": [],
				"properties": [
					{ "name": "id", "selector": "order.id" },
					{ "name": "createdOn", "selector": "order.createdOn" }
				],
				"where": [{ "tableName": "order", "columnName": "userId", "operator": "=", "value": "\"user\".\"id\"" }]
			}
		}
	],
	"where": [],
	"request": [],
	"joins": [],
	"assignments": []
}
```

The subquery's where clause links it to the parent record. Use quoted identifiers (`"table"."column"`) for raw column references.

## Request Validation

Each request parameter can have validators that run before the handler executes.

```json
{
	"name": "email",
	"required": true,
	"validator": [{ "type": "TYPE_CHECK", "value": "string" }]
}
```

**Validator Types:**

| Type         | Value                               | Purpose                          |
| ------------ | ----------------------------------- | -------------------------------- |
| `TYPE_CHECK` | `"string"`, `"number"`, `"boolean"` | Type validation                  |
| `ONE_OF`     | `["a", "b", "c"]`                   | Must be one of the listed values |

Set `required: false` for optional parameters. Use `isNullable: true` if the parameter can be explicitly set to null.

## Global Config

**globalParams**

Values extracted from the authenticated user and available in where clauses. Reference them with `#`:

```json
"globalParams": ["companyId", "userId"]
```

```json
"where": [{ "tableName": "user", "columnName": "id", "operator": "=", "value": "#userId" }]
```

**roles**

Define all user roles your application uses. Endpoints reference these to restrict access.

```json
"roles": ["admin", "user", "anonymous"]
```

An endpoint with `"roles": ["admin"]` only allows admin users. An endpoint with `"roles": []` is public.

**scopes**

OAuth-style permissions for finer control than roles. Useful when the same role might have different permission levels in different contexts.

```json
"scopes": ["read:user", "write:user", "read:company", "write:company"]
```

## Troubleshooting

**Type errors**

- Custom type strings must be valid TypeScript. Check for syntax errors.
- `responseType` must reference a type defined in `customTypes`.

**Migration failures**

- ENUM values must be single-quoted: `"value": "'admin','user'"`
- Foreign key target tables and columns must exist.
- Valid referential actions: `NO ACTION`, `CASCADE`, `SET NULL`, `SET DEFAULT`

**Route conflicts**

- Paths must be unique per HTTP method within an endpoint group.
- Specific routes (`/user/me`) must come before parameterized routes (`/user/:id`).

**Auth not working**

- `"roles": []` means public—no authentication required.
- Any role used in an endpoint must exist in the top-level `roles` array.
- Verify your auth handler sets the user's role correctly.

**Where clause issues**

- Global params use `#`: `"value": "#userId"`
- Raw column references use quoted identifiers: `"value": "\"user\".\"id\""`
- String literals need quotes: `"value": "'active'"`

**Joins returning wrong data**

- Always set a unique `alias` for each join.
- LEFT joins make columns nullable in generated types.
- For chained joins, specify `localTable` and `localTableAlias` to join from a joined table.

**Validation failing unexpectedly**

- `TYPE_CHECK` values are lowercase: `"string"`, `"number"`, `"boolean"`
- `ONE_OF` requires an array, even for one value: `["admin"]`
- Check `required` and `isNullable` settings match your intent.
