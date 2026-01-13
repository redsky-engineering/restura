---
title: Permissions & Security
description: Configuring roles, scopes, deprecation, and error handling in Restura
---

:::caution[Important: Empty Arrays Mean Public Access]
Setting `Roles: []` or `Scopes: []` means **PUBLIC ACCESS**, not restricted access. To restrict access, you must specify at least one role or scope.
:::

## Permission Properties

| Property   | Description                                      |
| ---------- | ------------------------------------------------ |
| **Roles**  | User roles allowed to access this route          |
| **Scopes** | OAuth-style scopes required to access this route |

### How Permissions Work

**If a route has roles/scopes defined:**

- Users without the required role/scope cannot access the route
- An error is thrown: `403 FORBIDDEN - Insufficient permissions`

**If a route has no roles/scopes:**

- The route is considered public
- Any authenticated (or unauthenticated) user can access it

### Role-Based Access

```
Route: GET /api/v1/users
Roles: ['ADMIN', 'MANAGER']
```

Only users with the `ADMIN` or `MANAGER` role can access this route.

### Scope-Based Access

```
Route: GET /api/v1/user/profile
Scopes: ['read:profile']
```

Only users with the `read:profile` scope can access this route.

### Combined Permissions

```
Route: DELETE /api/v1/users/:id
Roles: ['ADMIN']
Scopes: ['write:users']
```

Users must have the `ADMIN` role or the `write:users` scope.

---

## Global Parameters

Values from the authenticated user context, available in all routes.

| Prefix | Example      | Usage                                              |
| ------ | ------------ | -------------------------------------------------- |
| `#`    | `#userId`    | Reference in where clauses: `user.id = #userId`    |
| `#`    | `#companyId` | Reference in assignments: `companyId = #companyId` |

### Configuring Global Parameters

Global parameters are configured in the **Global** section and are typically populated by your authentication handler.

**Common global parameters:**

- `#userId` – The authenticated user's ID
- `#companyId` – The user's company/organization ID
- `#role` – The user's role
- `#email` – The user's email address

### Using Global Parameters

**In where clauses:**

```sql
-- Only show the authenticated user's data
user.id = #userId

-- Only show data from the user's company
order.companyId = #companyId

-- Filter by user role
user.role = #role
```

**In assignments:**

```sql
-- Automatically set the creator
createdBy = #userId

-- Set the company ownership
companyId = #companyId
```

### Authentication Handler Example

```typescript
export async function authenticate(req: RsRequest): Promise<GlobalParams> {
	const token = req.headers.authorization?.replace('Bearer ', '');

	if (!token) {
		throw new Error('No token provided');
	}

	const decoded = jwt.verify(token, process.env.JWT_SECRET);

	return {
		userId: decoded.userId,
		companyId: decoded.companyId,
		role: decoded.role,
		email: decoded.email
	};
}
```

---

## Deprecation

Mark routes as deprecated to warn consumers before removal.

### Deprecation Properties

| Property    | Description                                    |
| ----------- | ---------------------------------------------- |
| **Date**    | ISO date when the route will be removed        |
| **Message** | Optional explanation or migration instructions |

### Example

```
Route: GET /api/v1/users/old-format
Deprecated: true
Date: 2025-06-01
Message: Use /api/v1/users instead. This endpoint will be removed on June 1, 2025.
```

### Deprecation Response Headers

Deprecated routes include a warning header:

```
Deprecation: true
Sunset: 2025-06-01T00:00:00Z
Link: </api/v1/users>; rel="alternate"
```

### Best Practices

1. **Give ample notice** – Deprecate at least 3-6 months before removal
2. **Provide alternatives** – Always indicate which route to use instead
3. **Document changes** – Include migration instructions in the message
4. **Monitor usage** – Track calls to deprecated endpoints
5. **Communicate** – Notify API consumers via email, changelog, or documentation

---

## Error Handling

### Standard Error Codes

| Code               | HTTP Status | Description                       |
| ------------------ | ----------- | --------------------------------- |
| `BAD_REQUEST`      | 400         | Invalid request parameters        |
| `UNAUTHORIZED`     | 401         | Missing or invalid authentication |
| `FORBIDDEN`        | 403         | Insufficient permissions          |
| `NOT_FOUND`        | 404         | Resource not found                |
| `VALIDATION_ERROR` | 422         | Request validation failed         |
| `SERVER_ERROR`     | 500         | Internal server error             |

### Error Response Format

```json
{
	"error": {
		"code": "BAD_REQUEST",
		"message": "Parameter 'id' must be a number"
	}
}
```

### Validation Errors

When parameter validation fails:

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Validation failed",
		"details": {
			"email": "Invalid email format",
			"age": "Must be at least 18"
		}
	}
}
```

### Permission Errors

When a user lacks required permissions:

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Insufficient permissions to access this resource"
	}
}
```

### Custom Error Handling

In custom routes, use the response object's `sendError` method:

```typescript
// Simple error
res.sendError('NOT_FOUND', 'User not found');

// Error with details
res.sendError('VALIDATION_ERROR', 'Invalid input', {
	fields: {
		email: 'Email is already in use',
		password: 'Password must be at least 8 characters'
	}
});
```

---

## Security Best Practices

### Authentication

- Always validate JWT tokens in your authentication handler
- Use strong secrets for token signing
- Implement token expiration and refresh flows
- Store sensitive data (passwords, tokens) securely

### Authorization

- Use the principle of least privilege
- Grant only the minimum necessary permissions
- Implement both role-based and scope-based access control
- Validate permissions at the route level

### Data Access

- Use global parameters to filter data by user/company
- Never trust client-provided IDs for ownership checks
- Always validate that users can only access their own data
- Use column-level permissions for sensitive fields

### Input Validation

- Always validate and sanitize user input
- Use parameter validators for type checking
- Implement business rule validation in custom routes
- Protect against SQL injection (Restura uses parameterized queries)

### Rate Limiting

- Implement rate limiting for authentication endpoints
- Throttle API calls per user/IP
- Use exponential backoff for failed login attempts
- Monitor for suspicious activity

---

## Common Permission Patterns

### Public Endpoint

```
Route: GET /api/v1/products
Roles: []
Scopes: []
```

Anyone can access this route.

### Authenticated Users Only

```
Route: GET /api/v1/user/profile
Roles: []
Scopes: []
Where: user.id = #userId
```

No specific roles required, but the route uses `#userId` which requires authentication.

### Admin Only

```
Route: DELETE /api/v1/users/:id
Roles: ['ADMIN']
Scopes: []
```

Only admins can delete users.

### Multi-Tenant Data Isolation

```
Route: GET /api/v1/orders
Roles: []
Scopes: []
Where: order.companyId = #companyId
```

Users can only see orders from their own company.

### Hierarchical Permissions

```
Route: GET /api/v1/reports
Roles: ['ADMIN', 'MANAGER']
Scopes: ['read:reports']
```

Users need either ADMIN or MANAGER role, plus the read:reports scope.

---

## Next Steps

- [Configure request parameters](/reference/endpoints/parameters/)
- [Set up SQL queries](/reference/endpoints/sql-queries/)
- [Learn about database permissions](/reference/database/permissions/)
