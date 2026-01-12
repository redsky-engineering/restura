---
title: Check Constraints
description: Adding validation rules with check constraints in Restura
---

Check constraints enforce custom validation rules at the database level. They ensure data integrity by rejecting invalid data before it's stored.

## Check Constraint Properties

| Property  | Description                                    |
| --------- | ---------------------------------------------- |
| **Name**  | Unique constraint name (e.g., `order_check_1`) |
| **Check** | SQL expression that must evaluate to true      |

---

## When to Use Check Constraints

| Use Case                  | Example                                      |
| ------------------------- | -------------------------------------------- |
| Range validation          | Price must be positive                       |
| Value restrictions        | Status must be in a specific set             |
| Date logic                | End date must be after start date            |
| Percentage validation     | Discount must be between 0 and 100           |
| Format validation         | Email must contain @ symbol                  |
| Conditional requirements  | Premium orders must have a minimum value     |
| Cross-column dependencies | Quantity must match total when status is set |

---

## Basic Examples

### Positive Values

```sql
"price" > 0
```

Ensures prices are always positive.

### Range Validation

```sql
"quantity" >= 0 AND "quantity" <= 1000
```

Ensures quantity is between 0 and 1000.

### Percentage Validation

```sql
"discount" >= 0 AND "discount" <= 100
```

Ensures discount is a valid percentage.

### Age Validation

```sql
"age" >= 18 AND "age" <= 120
```

Ensures age is within a reasonable range.

---

## Status and Enum Validation

### Status Values

```sql
"status" IN ('pending', 'active', 'completed', 'cancelled')
```

Restricts status to specific values (alternative to ENUM type).

### Priority Levels

```sql
"priority" IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')
```

### Order Status

```sql
"status" IN ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')
```

### User Role

```sql
"role" IN ('ADMIN', 'MANAGER', 'USER', 'GUEST')
```

---

## Date and Time Validation

### Date Range

```sql
"endDate" > "startDate"
```

Ensures end date is after start date.

### Future Date

```sql
"scheduledDate" > "createdOn"
```

Ensures scheduled date is after creation date. For runtime validation against current time, use application logic or database triggers.

### Date Ordering

```sql
"expiresOn" > "createdOn"
```

Ensures expiration date is after creation date.

### Business Hours

```sql
EXTRACT(HOUR FROM "scheduledTime") >= 9
AND EXTRACT(HOUR FROM "scheduledTime") < 17
```

Ensures scheduled time is during business hours (9 AM - 5 PM).

---

## String Validation

### Email Format (Basic)

```sql
"email" LIKE '%@%.%'
```

Basic email format validation (contains @ and at least one dot after @).

### Phone Format

```sql
"phone" ~ '^\+?[0-9]{10,15}$'
```

Validates phone number format (10-15 digits, optional + prefix).

### Minimum Length

```sql
LENGTH("password") >= 8
```

Ensures password is at least 8 characters.

### Non-Empty String

```sql
LENGTH(TRIM("name")) > 0
```

Ensures name is not empty or just whitespace.

---

## Conditional Validation

### Compound Validation

```sql
("type" = 'premium' AND "price" > 100)
OR ("type" = 'basic' AND "price" <= 100)
```

Premium items must cost more than $100, basic items must cost $100 or less.

### Required Field Based on Status

```sql
("status" != 'COMPLETED') OR ("completedOn" IS NOT NULL)
```

If status is COMPLETED, completedOn must be set.

### Discount Logic

```sql
("hasDiscount" = false) OR ("discountAmount" > 0)
```

If hasDiscount is true, discountAmount must be positive.

### Shipping Requirements

```sql
("requiresShipping" = false)
OR ("shippingAddress" IS NOT NULL AND "shippingMethod" IS NOT NULL)
```

If shipping is required, both address and method must be set.

---

## Numeric Relationships

### Total Calculation

```sql
"total" = "subtotal" + "tax" + "shipping"
```

Ensures total is correctly calculated.

### Quantity and Price

```sql
"lineTotal" = "quantity" * "price"
```

Ensures line total matches quantity times price.

### Percentage of Total

```sql
"tax" <= "subtotal" * 0.2
```

Ensures tax doesn't exceed 20% of subtotal.

### Balance Validation

```sql
"balance" >= 0
```

Ensures account balance is never negative.

---

## Advanced Examples

### Credit Card Expiration

```sql
"expiryYear" >= 2024 AND "expiryMonth" >= 1 AND "expiryMonth" <= 12
```

Ensures expiry year and month are valid. For runtime expiration validation against current date, use application logic or database triggers since `now()` is not allowed in CHECK constraints.

### Inventory Management

```sql
("status" != 'IN_STOCK') OR ("quantity" > 0)
```

If status is IN_STOCK, quantity must be positive.

### Rating Range

```sql
"rating" >= 1 AND "rating" <= 5
```

Ensures rating is between 1 and 5 stars.

### Mutual Exclusivity

```sql
("paymentMethod" = 'CASH' AND "cardNumber" IS NULL)
OR ("paymentMethod" = 'CARD' AND "cardNumber" IS NOT NULL)
```

Cash payments shouldn't have a card number, card payments must have one.

### Geographic Coordinates

```sql
"latitude" >= -90 AND "latitude" <= 90
AND "longitude" >= -180 AND "longitude" <= 180
```

Ensures valid geographic coordinates.

---

## Naming Convention

Check constraints are named using this pattern:

```
{tableName}_check_{number}
```

**Examples:**

- `order_check_1`
- `user_check_1`
- `product_check_2`

The number increments for each constraint on the same table.

---

## Error Handling

When a check constraint fails, the database returns an error:

```
ERROR: new row for relation "order" violates check constraint "order_check_1"
DETAIL: Failing row contains (price = -10.00)
```

Restura translates this into a user-friendly error response:

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Check constraint violation: price must be positive"
	}
}
```

---

## Best Practices

### Keep Constraints Simple

- Simple constraints are easier to understand and maintain
- Complex logic should be in application code
- Document the purpose of each constraint

### Use Meaningful Names

While Restura auto-generates names, you can customize them:

```
order_price_positive
user_age_valid
product_quantity_range
```

### Combine with Application Validation

- Use check constraints for critical data integrity
- Use application validation for user-friendly error messages
- Check constraints are the last line of defense

### Test Constraint Behavior

```sql
-- This should succeed
INSERT INTO "order" (price) VALUES (10.00);

-- This should fail
INSERT INTO "order" (price) VALUES (-10.00);
```

### Document Business Rules

Add comments explaining why constraints exist:

```sql
-- Ensures orders are always profitable
"price" > "cost"

-- Prevents overselling
"quantity" <= "inventory"

-- Business rule: Premium accounts must have a subscription
("accountType" != 'PREMIUM') OR ("subscriptionId" IS NOT NULL)
```

---

## Common Patterns

### Order Validation

```sql
-- Order table constraints
"subtotal" >= 0
"tax" >= 0
"shipping" >= 0
"total" = "subtotal" + "tax" + "shipping"
"status" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED')
```

### User Validation

```sql
-- User table constraints
"age" >= 18
"email" LIKE '%@%.%'
LENGTH("password") >= 8
"role" IN ('ADMIN', 'USER', 'GUEST')
```

### Product Validation

```sql
-- Product table constraints
"price" > 0
"compareAtPrice" IS NULL OR "compareAtPrice" > "price"
"inventory" >= 0
"weight" > 0
```

### Booking Validation

```sql
-- Booking table constraints
"checkOut" > "checkIn"
"guests" > 0
"guests" <= "maxOccupancy"
"status" IN ('PENDING', 'CONFIRMED', 'CANCELLED')
```

---

## Limitations

### What Check Constraints Cannot Do

- **Cross-table validation** – Cannot reference other tables
- **Subqueries** – Cannot use SELECT statements
- **User-defined functions** – Limited to built-in SQL functions
- **Temporal logic** – Cannot validate against historical data
- **Non-immutable functions** – Cannot use `now()`, `CURRENT_TIMESTAMP`, or other volatile functions (PostgreSQL requires CHECK constraints to be immutable)

For these cases, use:

- Foreign keys for cross-table relationships
- Triggers for complex validation (e.g., validating against current time)
- Application code for business logic
- Column comparisons instead of `now()` (e.g., `"scheduledDate" > "createdOn"`)

---

## Next Steps

- [Learn about database tables](/reference/database/tables/)
- [Configure columns and data types](/reference/database/columns/)
- [Set up relationships with foreign keys](/reference/database/relationships/)
- [Configure permissions](/reference/database/permissions/)
