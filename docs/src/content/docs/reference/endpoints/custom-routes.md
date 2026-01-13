---
title: Custom Routes
description: Creating custom route handlers and using custom types in Restura
---

Custom routes delegate to your TypeScript handler code instead of auto-generating SQL. Use these when you need complex business logic, external API calls, file processing, or authentication flows.

## When to Use Custom Routes

| Use Case                 | Example                                    |
| ------------------------ | ------------------------------------------ |
| External API calls       | Payment processing, weather data           |
| Complex business logic   | Multi-step workflows, calculations         |
| File processing          | Image uploads, PDF generation              |
| Authentication flows     | Login, password reset, token refresh       |
| Data transformation      | Aggregations, custom formatting            |
| Third-party integrations | Email services, SMS providers              |
| Custom validation        | Business rules beyond simple type checking |

---

## Custom Route Types

| Type           | Description                                  |
| -------------- | -------------------------------------------- |
| `CUSTOM_ONE`   | Returns a single object via your handler     |
| `CUSTOM_ARRAY` | Returns a list of objects via your handler   |
| `CUSTOM_PAGED` | Returns paginated data via your handler code |

---

## Handler File Structure

### File Naming Convention

Handler files are placed in `src/api/v1/` and named after the first path segment:

| Path            | Handler File        |
| --------------- | ------------------- |
| `/user/login`   | `user.api.v1.ts`    |
| `/order/status` | `order.api.v1.ts`   |
| `/weather`      | `weather.api.v1.ts` |

### Function Naming Convention

Function names combine the HTTP method with the path in PascalCase:

| Endpoint               | Function Name      |
| ---------------------- | ------------------ |
| `POST /user/login`     | `postUserLogin`    |
| `GET /user/me`         | `getUserMe`        |
| `POST /user/me/avatar` | `postUserMeAvatar` |
| `PATCH /order/status`  | `patchOrderStatus` |

### Handler Structure

```typescript
import type { RsRequest, RsResponse } from '@restura/core';

export default class UserApiV1 {
	constructor() {}

	async postUserLogin(req: RsRequest<Api.V1.User.Login.Post.Req>, res: RsResponse<Api.V1.User.Login.Post.Res>) {
		const { username, password } = req.data;

		// Your logic here...

		res.sendData({
			token: 'abc123',
			tokenExp: '2025-01-01T00:00:00.000Z'
		});
	}
}
```

---

## Request and Response Types

### Standard Request

Use individual validated parameters:

```typescript
// Route configuration:
// Parameters: username (string), password (string)

async postUserLogin(req: RsRequest<Api.V1.User.Login.Post.Req>, res: RsResponse<Api.V1.User.Login.Post.Res>) {
	const { username, password } = req.data;
	// username and password are validated and typed
}
```

### Custom Request Type

Use a complete TypeScript interface for the request:

```typescript
export interface LoginRequest {
	username: string;
	password: string;
	rememberMe?: boolean;
}

// In your handler:
async postUserLogin(req: RsRequest<LoginRequest>, res: RsResponse<AuthResponse>) {
	const { username, password, rememberMe } = req.data;
}
```

### Custom Response Type

Define custom TypeScript interfaces for complex response structures:

```typescript
export interface AuthResponse {
	token: string;
	tokenExp: string;
	refreshToken: string;
	refreshTokenExp: string;
	user: {
		id: number;
		email: string;
		role: string;
	};
}
```

---

## Custom Types

Define TypeScript types for use with custom routes.

### Creating Custom Types

1. Navigate to **Global** in the sidebar
2. Click the **Custom Types** tab
3. Click **Add Custom Type**
4. Write your TypeScript interface or type

```typescript
export interface AuthResponse {
	token: string;
	tokenExp: string;
	refreshToken: string;
	refreshTokenExp: string;
}

export interface UserProfile {
	id: number;
	firstName: string;
	lastName: string;
	email: string;
	avatar?: string;
	preferences: {
		theme: 'light' | 'dark';
		notifications: boolean;
	};
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderSummary {
	orderId: number;
	status: OrderStatus;
	total: string;
	itemCount: number;
	createdOn: string;
}
```

### Using Custom Types

| Usage             | Description                                         |
| ----------------- | --------------------------------------------------- |
| **Request type**  | The custom type for a custom route's expected input |
| **Response type** | The custom type for a custom route's returned data  |

Custom routes can use either:

- **Standard request** – Individual validated parameters
- **Custom request type** – A complete TypeScript interface

---

## File Uploads

Custom routes can accept file attachments.

### Upload Types

| Upload Type  | Description              |
| ------------ | ------------------------ |
| **Single**   | Accepts exactly one file |
| **Multiple** | Accepts multiple files   |

File upload is only available for custom routes and is configured in the API Details section.

### Single File Upload

```typescript
async postUserAvatar(req: RsRequest<Api.V1.User.Avatar.Post.Req>, res: RsResponse<Api.V1.User.Avatar.Post.Res>) {
	const file = req.file; // Single file

	// Process the file
	const filename = await saveFile(file);

	res.sendData({
		avatarUrl: `/uploads/${filename}`
	});
}
```

### Multiple File Upload

```typescript
async postOrderDocuments(req: RsRequest<Api.V1.Order.Documents.Post.Req>, res: RsResponse<Api.V1.Order.Documents.Post.Res>) {
	const files = req.files; // Array of files

	// Process each file
	const uploadedFiles = await Promise.all(
		files.map(file => saveFile(file))
	);

	res.sendData({
		documents: uploadedFiles
	});
}
```

---

## Handler Examples

### Authentication

```typescript
async postUserLogin(req: RsRequest<Api.V1.User.Login.Post.Req>, res: RsResponse<Api.V1.User.Login.Post.Res>) {
	const { username, password } = req.data;

	// Validate credentials
	const user = await db.query.user.findFirst({
		where: eq(schema.user.username, username)
	});

	if (!user || !await bcrypt.compare(password, user.passwordHash)) {
		return res.sendError('UNAUTHORIZED', 'Invalid credentials');
	}

	// Generate tokens
	const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
	const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

	res.sendData({
		token,
		tokenExp: new Date(Date.now() + 3600000).toISOString(),
		refreshToken,
		refreshTokenExp: new Date(Date.now() + 604800000).toISOString()
	});
}
```

### External API Call

```typescript
async getWeather(req: RsRequest<Api.V1.Weather.Get.Req>, res: RsResponse<Api.V1.Weather.Get.Res>) {
	const { city } = req.data;

	// Call external API
	const response = await fetch(`https://api.weather.com/v1/current?city=${city}`);
	const data = await response.json();

	res.sendData({
		city: data.location.name,
		temperature: data.current.temp_f,
		conditions: data.current.condition.text,
		humidity: data.current.humidity
	});
}
```

### Complex Business Logic

```typescript
async postOrderCheckout(req: RsRequest<Api.V1.Order.Checkout.Post.Req>, res: RsResponse<Api.V1.Order.Checkout.Post.Res>) {
	const { cartId, paymentMethod, shippingAddress } = req.data;
	const userId = req.global.userId;

	// Start transaction
	const result = await db.transaction(async (tx) => {
		// Get cart items
		const items = await tx.query.cartItem.findMany({
			where: eq(schema.cartItem.cartId, cartId)
		});

		// Calculate totals
		const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
		const tax = subtotal * 0.08;
		const shipping = calculateShipping(shippingAddress);
		const total = subtotal + tax + shipping;

		// Process payment
		const paymentResult = await processPayment(paymentMethod, total);

		if (!paymentResult.success) {
			throw new Error('Payment failed');
		}

		// Create order
		const order = await tx.insert(schema.order).values({
			userId,
			subtotal,
			tax,
			shipping,
			total,
			status: 'processing',
			paymentId: paymentResult.transactionId
		}).returning();

		// Create order items
		await tx.insert(schema.orderItem).values(
			items.map(item => ({
				orderId: order[0].id,
				productId: item.productId,
				quantity: item.quantity,
				price: item.price
			}))
		);

		// Clear cart
		await tx.delete(schema.cartItem).where(eq(schema.cartItem.cartId, cartId));

		return order[0];
	});

	res.sendData({
		orderId: result.id,
		total: result.total.toString(),
		status: result.status
	});
}
```

---

## Error Handling

Use the response object's `sendError` method to return errors:

```typescript
// Standard error codes
res.sendError('BAD_REQUEST', 'Invalid request parameters');
res.sendError('UNAUTHORIZED', 'Authentication required');
res.sendError('FORBIDDEN', 'Insufficient permissions');
res.sendError('NOT_FOUND', 'Resource not found');
res.sendError('VALIDATION_ERROR', 'Validation failed');
res.sendError('SERVER_ERROR', 'Internal server error');

// Custom error with details
res.sendError('VALIDATION_ERROR', 'Invalid input', {
	fields: {
		email: 'Email is already in use',
		password: 'Password must be at least 8 characters'
	}
});
```

Learn more about [error handling](/reference/endpoints/permissions/#error-handling).

---

## Next Steps

- [Configure permissions](/reference/endpoints/permissions/)
- [Learn about SQL query building](/reference/endpoints/sql-queries/)
- [Set up request parameters](/reference/endpoints/parameters/)
