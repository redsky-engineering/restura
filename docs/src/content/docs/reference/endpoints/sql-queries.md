---
title: SQL Query Building
description: Configuring automatic SQL query generation in Restura
---

Standard routes automatically generate SQL based on your configuration. This page covers all the components that make up a SQL query.

## Base Table

The primary table this route queries. Determines which columns are available for filtering and response mapping.

**Example:** For a user profile endpoint, the base table would be `user`.

---

## Joins

Combine data from related tables to include information from multiple tables in your response.

### Join Properties

| Property           | Description                                           |
| ------------------ | ----------------------------------------------------- |
| **Table**          | The related table to join                             |
| **Local Column**   | The foreign key column in your base (or joined) table |
| **Foreign Column** | The column in the related table (typically `id`)      |
| **Type**           | Join type: `INNER` or `LEFT`                          |
| **Alias**          | Short name for referencing joined columns             |

### Join Types

| Type      | Description                                                                       |
| --------- | --------------------------------------------------------------------------------- |
| **INNER** | Only returns rows where matching records exist in both tables                     |
| **LEFT**  | Returns all rows from the left table, with NULL for non-matching right table rows |

**When to use INNER:**

- When the relationship is required (e.g., every order must have a user)
- When you only want results where both sides exist

**When to use LEFT:**

- When the relationship is optional (e.g., a user might not have a manager)
- When you want all base table rows regardless of whether related data exists

### Join Alias Convention

Aliases follow the format: `{localColumn}_{foreignTable}`

**Example:** Joining `user.companyId` to `company.id` creates alias `companyId_company`

This allows you to reference the joined table's columns:

- `companyId_company.name` → Company name
- `companyId_company.address` → Company address

### Join Example

**Base table:** `order`

**Join configuration:**

```
Table: user
Local Column: order.userId
Foreign Column: user.id
Type: INNER
Alias: userId_user
```

**Generated SQL:**

```sql
SELECT ...
FROM "order"
INNER JOIN "user" AS "userId_user" ON "order"."userId" = "userId_user"."id"
```

Now you can use `userId_user.firstName`, `userId_user.email`, etc. in your response properties.

---

## Where Clauses

Filter which rows are returned or affected by your query.

### Where Clause Properties

| Property        | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| **Table**       | The table containing the column to filter                    |
| **Column**      | The column to compare                                        |
| **Operator**    | The comparison type                                          |
| **Value**       | The value to compare against (can use `$param` or `#global`) |
| **Conjunction** | Logical connector to previous condition (`AND` or `OR`)      |
| **Custom**      | Raw SQL expression (alternative to column-based filter)      |

### Operators

| Operator      | Description                      | Example                    |
| ------------- | -------------------------------- | -------------------------- |
| `=`           | Equals                           | `user.id = $id`            |
| `!=`          | Not equals                       | `status != 'deleted'`      |
| `<`           | Less than                        | `price < $maxPrice`        |
| `>`           | Greater than                     | `createdOn > $since`       |
| `<=`          | Less than or equal               | `quantity <= $max`         |
| `>=`          | Greater than or equal            | `age >= 18`                |
| `LIKE`        | Pattern match (use `%` wildcard) | `name LIKE $search`        |
| `NOT LIKE`    | Negative pattern match           | `email NOT LIKE '%test%'`  |
| `IN`          | Match any value in set           | `status IN $statuses`      |
| `NOT IN`      | Exclude values in set            | `role NOT IN ('guest')`    |
| `STARTS WITH` | String prefix match              | `name STARTS WITH $prefix` |
| `ENDS WITH`   | String suffix match              | `email ENDS WITH $domain`  |
| `IS`          | Identity comparison              | `deletedOn IS NULL`        |
| `IS NOT`      | Negative identity                | `manager IS NOT NULL`      |

### Where Clause Examples

**Simple equality:**

```
Table: user
Column: id
Operator: =
Value: $userId
```

**Pattern matching:**

```
Table: user
Column: email
Operator: LIKE
Value: %$searchTerm%
```

**Status filtering:**

```
Table: order
Column: status
Operator: IN
Value: $statuses
```

**Date range:**

```
Table: order
Column: createdOn
Operator: >=
Value: $startDate
Conjunction: AND

Table: order
Column: createdOn
Operator: <=
Value: $endDate
```

**Custom SQL:**

```
Custom: "user"."firstName" || ' ' || "user"."lastName" LIKE $fullName
```

---

## Order By

Sort query results (available for `ARRAY` and `PAGED` types).

### Order By Properties

| Property   | Description                      |
| ---------- | -------------------------------- |
| **Table**  | Table containing the sort column |
| **Column** | Column to sort by                |
| **Order**  | Direction: `ASC` or `DESC`       |

### Examples

**Sort by creation date (newest first):**

```
Table: order
Column: createdOn
Order: DESC
```

**Sort by name (alphabetical):**

```
Table: user
Column: lastName
Order: ASC
```

**Multiple sort columns:**

```
1. Table: user, Column: lastName, Order: ASC
2. Table: user, Column: firstName, Order: ASC
```

---

## Group By

Aggregate rows by a column value.

### Group By Properties

| Property   | Description                       |
| ---------- | --------------------------------- |
| **Table**  | Table containing the group column |
| **Column** | Column to group by                |

### Example: Count Orders by User

**Base table:** `order`

**Group by:** `order.userId`

**Response properties:**

- `userId` → `order.userId`
- `orderCount` → `COUNT(*)`

**Generated SQL:**

```sql
SELECT "order"."userId", COUNT(*) as "orderCount"
FROM "order"
GROUP BY "order"."userId"
```

---

## Assignments

Value mappings for INSERT/UPDATE operations (`POST`, `PUT`, `PATCH` methods).

### Assignment Properties

| Property  | Description                                         |
| --------- | --------------------------------------------------- |
| **Name**  | The column name to assign a value to                |
| **Value** | The value to assign (can use `$param` or `#global`) |

### Examples

**Create user (POST):**

```
firstName = $firstName
lastName = $lastName
email = $email
companyId = #companyId
createdOn = now()
```

**Update user status (PATCH):**

```
status = $status
modifiedOn = now()
```

**Set ownership (POST):**

```
userId = #userId
companyId = #companyId
```

---

## Subqueries

Nested queries within a response that fetch related data from another table.

### Subquery Properties

| Property       | Description                           |
| -------------- | ------------------------------------- |
| **Table**      | The related table to query            |
| **Joins**      | Additional joins within the subquery  |
| **Where**      | Conditions to filter subquery results |
| **Properties** | Fields to return from the subquery    |
| **Group By**   | Optional grouping                     |
| **Order By**   | Optional sorting                      |

### Example: User with Orders

**Base table:** `user`

**Response properties:**

- `id` → `user.id`
- `name` → `user.firstName`
- `orders` → Subquery

**Subquery configuration:**

```
Table: order
Where: order.userId = user.id
Properties:
  - id → order.id
  - total → order.total
  - status → order.status
Order By: order.createdOn DESC
```

**Response:**

```json
{
	"data": {
		"id": 1,
		"name": "John",
		"orders": [
			{ "id": 101, "total": "299.99", "status": "completed" },
			{ "id": 102, "total": "149.99", "status": "pending" }
		]
	}
}
```

---

## Complete Example

**Endpoint:** Get user profile with company and recent orders

**Base table:** `user`

**Joins:**

```
Table: company
Local: user.companyId
Foreign: company.id
Type: LEFT
Alias: companyId_company
```

**Where clauses:**

```
user.id = $userId
AND user.status != 'deleted'
```

**Response properties:**

```
id → user.id
firstName → user.firstName
lastName → user.lastName
email → user.email
companyName → companyId_company.name
orders → [subquery]
```

**Subquery (orders):**

```
Table: order
Where: order.userId = user.id
Order By: order.createdOn DESC
Limit: 5
Properties:
  - id → order.id
  - total → order.total
  - status → order.status
  - createdOn → order.createdOn
```

---

## Next Steps

- [Configure request parameters](/reference/endpoints/parameters/)
- [Set up response properties](/reference/endpoints/responses/)
- [Learn about database relationships](/reference/database/relationships/)
