---
title: Request Parameters
description: Configuring and validating request parameters in Restura
---

Parameters define the inputs your route accepts from callers.

## Parameter Properties

| Property        | Description                                       |
| --------------- | ------------------------------------------------- |
| **Name**        | Parameter name (use camelCase, e.g., `firstName`) |
| **Required**    | Whether the parameter must be provided            |
| **Validators**  | One or more validation rules (see below)          |
| **Is Nullable** | Whether the parameter can explicitly be `null`    |

---

## Parameter Sources

| Source              | Description                                        | Example              |
| ------------------- | -------------------------------------------------- | -------------------- |
| **Query string**    | Parameters passed in the URL                       | `?name=John`         |
| **Request body**    | Parameters sent as JSON in POST/PUT/PATCH requests | `{ "name": "John" }` |
| **Path parameters** | Dynamic segments captured from the URL             | `/users/:id`         |

---

## Parameter Prefixes

Use prefixes to reference parameters in where clauses and assignments:

| Prefix | Type             | Example      | Description                                 |
| ------ | ---------------- | ------------ | ------------------------------------------- |
| `$`    | Local parameter  | `$firstName` | A request parameter specific to this route  |
| `#`    | Global parameter | `#userId`    | A value from the authenticated user context |

### Local Parameters (`$`)

Local parameters are specific to a single route. They come from:

- Query string parameters (for GET requests)
- Request body (for POST/PUT/PATCH requests)
- Path parameters (captured from the URL)

**Example usage in where clauses:**

```sql
user.id = $userId
user.email LIKE $searchTerm
order.status IN $statuses
```

**Example usage in assignments:**

```sql
firstName = $firstName
companyId = $companyId
```

### Global Parameters (`#`)

Global parameters are values from the authenticated user context, available in all routes. They are typically populated by your authentication handler.

**Example usage:**

```sql
user.id = #userId
order.companyId = #companyId
```

Learn more about [configuring global parameters](/reference/endpoints/permissions/#global-parameters).

---

## Parameter Validation

Validators ensure incoming data meets your requirements before processing.

### Validator Types

| Validator      | Description                                         | Value Format                                                             |
| -------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| **Type Check** | Ensures the parameter matches an expected data type | `string`, `number`, `boolean`, `object`, `string[]`, `number[]`, `any[]` |
| **Min**        | Enforces a minimum value for numbers                | Number (e.g., `0`)                                                       |
| **Max**        | Enforces a maximum value for numbers                | Number (e.g., `100`)                                                     |
| **One Of**     | Restricts values to a specific allowed set          | Comma-separated values (e.g., `active,pending,closed`)                   |

### Validation Flow

1. **Request validation** – Incoming parameters are checked against defined validators
2. **Coercion** – Query string parameters are automatically converted to expected types (strings become numbers, booleans, etc.)
3. **Processing** – If validation passes, the request proceeds to SQL generation or handler code

### Multiple Validators

You can apply multiple validators to a single parameter:

```
name: quantity
validators:
  - Type Check: number
  - Min: 1
  - Max: 1000
```

This ensures the `quantity` parameter is:

- A number (not a string or boolean)
- At least 1
- No more than 1000

---

## Common Patterns

### ID Parameter

```
name: id
required: true
validators:
  - Type Check: number
  - Min: 1
```

### Search Term

```
name: searchTerm
required: false
validators:
  - Type Check: string
```

### Status Filter

```
name: status
required: false
validators:
  - Type Check: string
  - One Of: active,pending,completed,cancelled
```

### Pagination Parameters

For `PAGED` routes, these parameters are added automatically:

```
page: number (default: 1)
perPage: number (default: 10)
filter: string (optional)
sortBy: string (optional)
sortOrder: string (optional, ASC or DESC)
```

Learn more about [pagination](/reference/endpoints/responses/#pagination).

---

## Error Handling

When validation fails, Restura returns a `422 VALIDATION_ERROR` response:

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Parameter 'quantity' must be between 1 and 1000"
	}
}
```

Learn more about [error handling](/reference/endpoints/permissions/#error-handling).

---

## Next Steps

- [Configure response properties](/reference/endpoints/responses/)
- [Build SQL where clauses](/reference/endpoints/sql-queries/#where-clauses)
- [Set up permissions](/reference/endpoints/permissions/)
