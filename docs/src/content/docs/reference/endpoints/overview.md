---
title: Endpoints Overview
description: Understanding endpoints, routes, and route types in Restura
---

In Restura, an **endpoint** is a group of related routes sharing the same base URL (e.g., `/api/v1/users`). Each endpoint contains one or more **routes**—individual API paths that handle requests for specific operations.

Routes come in two flavors:

- **Standard routes** automatically generate SQL queries based on your schema configuration
- **Custom routes** delegate to your own TypeScript handler code for complex business logic

---

## Route Types

Routes are categorized by the shape of data they return:

| Type           | Description                                   | SQL Generated |
| -------------- | --------------------------------------------- | ------------- |
| `ONE`          | Returns a single object from the database     | Yes           |
| `ARRAY`        | Returns a list of objects from the database   | Yes           |
| `PAGED`        | Returns paginated results with a total count  | Yes           |
| `CUSTOM_ONE`   | Returns a single object via your handler code | No            |
| `CUSTOM_ARRAY` | Returns a list via your handler code          | No            |
| `CUSTOM_PAGED` | Returns paginated data via your handler code  | No            |

### Standard Routes (`ONE`, `ARRAY`, `PAGED`)

Standard routes generate SQL automatically based on:

- Base table selection
- Joins to related tables
- Where clauses for filtering
- Response property mappings
- Order by and group by specifications

Learn more about [SQL query building](/reference/endpoints/sql-queries/).

### Custom Routes (`CUSTOM_ONE`, `CUSTOM_ARRAY`, `CUSTOM_PAGED`)

Custom routes delegate to your TypeScript handler code. Use these when you need:

- External API calls
- Complex business logic
- File processing
- Authentication flows

Learn more about [custom routes](/reference/endpoints/custom-routes/).

---

## Route Properties

### Basic Properties

| Property        | Description                                           | Required |
| --------------- | ----------------------------------------------------- | -------- |
| **Type**        | Route type (`ONE`, `ARRAY`, `PAGED`, `CUSTOM_*`)      | Yes      |
| **Name**        | Descriptive name for the route                        | Yes      |
| **Description** | Documentation of what the route does                  | Yes      |
| **Method**      | HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) | Yes      |
| **Path**        | URL path pattern (e.g., `/user/by-name`)              | Yes      |

### HTTP Methods

| Method   | Purpose        | Has Request Body | Typical Route Types     |
| -------- | -------------- | ---------------- | ----------------------- |
| `GET`    | Read data      | No               | `ONE`, `ARRAY`, `PAGED` |
| `POST`   | Create data    | Yes              | `ONE`, `CUSTOM_ONE`     |
| `PUT`    | Replace data   | Yes              | `ONE`, `CUSTOM_ONE`     |
| `PATCH`  | Partial update | Yes              | `ONE`, `CUSTOM_ONE`     |
| `DELETE` | Remove data    | No               | `ONE`, `CUSTOM_ONE`     |

### Paths

The **path** is the URL pattern for a route. Paths can include dynamic segments called **path parameters** that capture values from the URL:

| Pattern                          | Example URL          | Captured Value               |
| -------------------------------- | -------------------- | ---------------------------- |
| `/users/:id`                     | `/users/42`          | `id = 42`                    |
| `/orders/:orderId/items/:itemId` | `/orders/5/items/10` | `orderId = 5`, `itemId = 10` |

---

## Quick Reference

### Route Type Decision Tree

```
Need custom logic?
├── Yes → CUSTOM_ONE, CUSTOM_ARRAY, or CUSTOM_PAGED
└── No → Standard route
         ├── Single record? → ONE
         ├── List of records? → ARRAY
         └── Paginated list? → PAGED
```

### Glossary

| Term               | Description                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| **Endpoint**       | A group of related routes sharing the same base URL                               |
| **Route**          | A single API path that handles requests for a specific operation                  |
| **Standard route** | A route that automatically generates SQL queries based on schema configuration    |
| **Custom route**   | A route that delegates to your own handler code instead of auto-generating SQL    |
| **Path parameter** | A dynamic segment in a route path (e.g., `:id`) that captures values from the URL |

---

## Next Steps

- [Configure request parameters](/reference/endpoints/parameters/)
- [Set up response configuration](/reference/endpoints/responses/)
- [Build SQL queries](/reference/endpoints/sql-queries/)
- [Create custom routes](/reference/endpoints/custom-routes/)
- [Configure permissions](/reference/endpoints/permissions/)
