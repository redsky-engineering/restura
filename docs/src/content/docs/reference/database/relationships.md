---
title: Indexes & Foreign Keys
description: Setting up database relationships and optimizing queries with indexes
---

## Indexes

Indexes improve query performance by allowing the database to find rows faster.

### Index Properties

| Property        | Description                                          |
| --------------- | ---------------------------------------------------- |
| **Name**        | Auto-generated: `{table}_{columns}[_unique]_index`   |
| **Unique**      | Enforces uniqueness across indexed columns           |
| **Order**       | Sort order: `ASC` (ascending) or `DESC` (descending) |
| **Columns**     | One or more columns (composite index)                |
| **Where**       | Partial index condition (optional)                   |
| **Primary Key** | Indicates this is the primary key index (read-only)  |

---

## Index Types

| Type              | Description                                        | Example Use Case                    |
| ----------------- | -------------------------------------------------- | ----------------------------------- |
| **Single-column** | Index on one column                                | `userId` for user lookups           |
| **Composite**     | Index on multiple columns                          | `(userId, createdOn)` for filtering |
| **Unique**        | Prevents duplicate values                          | Email addresses                     |
| **Partial**       | Index only rows matching a WHERE condition         | Active records only                 |
| **Primary Key**   | Unique identifier for each row (cannot be deleted) | `id` column                         |

### Single-Column Index

**Use case:** Looking up users by email

```
Table: user
Column: email
Unique: true
```

**Generated name:** `user_email_unique_index`

This speeds up queries like:

```sql
SELECT * FROM "user" WHERE "email" = 'john@example.com'
```

### Composite Index

**Use case:** Filtering orders by user and date range

```
Table: order
Columns: userId, createdOn
Order: ASC, DESC
```

**Generated name:** `order_userId_createdOn_index`

This speeds up queries like:

```sql
SELECT * FROM "order"
WHERE "userId" = 123
AND "createdOn" > '2024-01-01'
ORDER BY "createdOn" DESC
```

### Unique Index

**Use case:** Preventing duplicate email addresses

```
Table: user
Column: email
Unique: true
```

This enforces uniqueness at the database level, preventing duplicate registrations.

### Partial Index

**Use case:** Indexing only active users

```
Table: user
Column: lastName
Where: "isActive" = true
```

This creates a smaller, faster index that only includes active users.

---

## Partial Index Examples

Use the Where Clause field to create partial indexes:

**Index only active users:**

```sql
"isActive" = true
```

**Index only recent orders:**

```sql
"createdOn" > '2024-01-01'
```

**Index non-null emails:**

```sql
"email" IS NOT NULL
```

**Index pending and processing orders:**

```sql
"status" IN ('PENDING', 'PROCESSING')
```

**Index high-value orders:**

```sql
"total" > 1000
```

---

## Index Naming Convention

Indexes are automatically named using this pattern:

```
{tableName}_{column1}_{column2}_[unique_]index
```

**Examples:**

- `user_email_unique_index`
- `order_userId_createdOn_index`
- `product_sku_unique_index`
- `orderItem_orderId_index`

---

## When to Add Indexes

### Always Index

- Primary keys (automatic)
- Foreign keys (automatic with `*Id` naming)
- Unique constraints (email, username)
- Columns used in WHERE clauses frequently

### Consider Indexing

- Columns used in JOIN conditions
- Columns used in ORDER BY
- Columns used in GROUP BY
- Columns with high selectivity (many unique values)

### Avoid Indexing

- Small tables (< 1000 rows)
- Columns with low selectivity (few unique values)
- Columns that are rarely queried
- Tables with high write volume (indexes slow down writes)

---

## Foreign Keys

Foreign keys enforce referential integrity between tables.

### Foreign Key Properties

| Property       | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| **Name**       | Auto-generated: `{table}_{column}_{refTable}_{refColumn}_fk` |
| **Column**     | The column in your table (must be BIGINT/BIGSERIAL)          |
| **Ref Table**  | The table being referenced                                   |
| **Ref Column** | The column being referenced (typically `id`)                 |
| **On Delete**  | Action when the referenced row is deleted                    |
| **On Update**  | Action when the referenced row is updated                    |

---

## Foreign Key Actions

| Action        | Description                                         | Use Case                           |
| ------------- | --------------------------------------------------- | ---------------------------------- |
| `NO ACTION`   | Prevent delete/update if references exist (default) | Preserve data integrity            |
| `RESTRICT`    | Like NO ACTION, but checked immediately             | Strict integrity enforcement       |
| `CASCADE`     | Automatically delete/update all referencing rows    | Dependent data (e.g., order items) |
| `SET NULL`    | Set the foreign key column to NULL                  | Optional relationships             |
| `SET DEFAULT` | Set the foreign key column to its default value     | Fallback to default reference      |

### When to Use Each Action

**NO ACTION (default):**

- Most relationships
- When you want to prevent accidental deletions
- When child records should be explicitly handled

**CASCADE:**

- Parent-child relationships where children are meaningless without parent
- Example: Delete order → delete all order items
- Example: Delete user → delete all user sessions

**SET NULL:**

- Optional relationships
- Example: Delete manager → set employee.managerId to NULL
- Example: Delete category → set product.categoryId to NULL

**RESTRICT:**

- When you need immediate constraint checking
- Rare in practice (NO ACTION is usually sufficient)

---

## Common Foreign Key Patterns

### User → Orders (CASCADE delete)

```
Table: order
Column: userId
Ref Table: user
Ref Column: id
On Delete: CASCADE
On Update: NO ACTION
```

When a user is deleted, all their orders are automatically deleted.

### Order → OrderItems (CASCADE delete)

```
Table: orderItem
Column: orderId
Ref Table: order
Ref Column: id
On Delete: CASCADE
On Update: NO ACTION
```

When an order is deleted, all its items are automatically deleted.

### Optional Manager Reference (SET NULL)

```
Table: employee
Column: managerId
Ref Table: employee
Ref Column: id
On Delete: SET NULL
On Update: NO ACTION
```

When a manager is deleted, their employees' `managerId` is set to NULL.

### Product → Category (NO ACTION)

```json
Table: product
Column: categoryId
Ref Table: category
Ref Column: id
On Delete: NO ACTION
On Update: NO ACTION
```

Cannot delete a category if products still reference it.

## Relationship Examples

### One-to-Many: User → Orders

**User table:**

```
id: BIGSERIAL, primary key
firstName: VARCHAR(30)
email: VARCHAR(255), unique
```

**Order table:**

```
id: BIGSERIAL, primary key
userId: BIGINT, foreign key to user.id
total: DECIMAL(10,2)
status: ENUM('PENDING','COMPLETED')
```

**Foreign key:**

```
order.userId → user.id
On Delete: CASCADE
```

One user can have many orders. Deleting a user deletes all their orders.

### One-to-Many: Order → OrderItems

**Order table:**

```
id: BIGSERIAL, primary key
userId: BIGINT
total: DECIMAL(10,2)
```

**OrderItem table:**

```
id: BIGSERIAL, primary key
orderId: BIGINT, foreign key to order.id
productId: BIGINT, foreign key to product.id
quantity: INTEGER
price: DECIMAL(10,2)
```

**Foreign keys:**

```
orderItem.orderId → order.id (CASCADE)
orderItem.productId → product.id (NO ACTION)
```

One order can have many items. Deleting an order deletes all its items.

### Many-to-Many: Users ↔ Roles

**User table:**

```
id: BIGSERIAL, primary key
firstName: VARCHAR(30)
email: VARCHAR(255)
```

**Role table:**

```
id: BIGSERIAL, primary key
name: VARCHAR(50)
description: TEXT
```

**UserRole junction table:**

```
id: BIGSERIAL, primary key
userId: BIGINT, foreign key to user.id
roleId: BIGINT, foreign key to role.id
```

**Foreign keys:**

```
userRole.userId → user.id (CASCADE)
userRole.roleId → role.id (CASCADE)
```

**Unique composite index:**

```
Columns: userId, roleId
Unique: true
```

This prevents duplicate role assignments and enables efficient lookups.

### Self-Referencing: Employee → Manager

**Employee table:**

```
id: BIGSERIAL, primary key
firstName: VARCHAR(30)
managerId: BIGINT, nullable, foreign key to employee.id
```

**Foreign key:**

```
employee.managerId → employee.id
On Delete: SET NULL
```

An employee can have a manager (another employee). Deleting a manager sets their employees' `managerId` to NULL.

---

## Performance Optimization

### Composite Index Strategy

For queries that filter by multiple columns, create composite indexes with the most selective column first:

**Good:**

```
Index: (userId, createdOn)
Query: WHERE userId = 123 AND createdOn > '2024-01-01'
```

**Less optimal:**

```
Index: (createdOn, userId)
Query: WHERE userId = 123 AND createdOn > '2024-01-01'
```

### Covering Indexes

Include all columns needed by a query in the index to avoid table lookups:

```
Index: (userId, createdOn, status)
Query: SELECT status FROM order WHERE userId = 123 ORDER BY createdOn
```

The database can satisfy this query entirely from the index.

### Index Maintenance

- Monitor index usage with database analytics
- Remove unused indexes (they slow down writes)
- Rebuild indexes periodically on high-traffic tables
- Use partial indexes for large tables with filtered queries

---

## Best Practices

### Indexes

1. **Index foreign keys** – Speeds up joins (automatic with `*Id` naming)
2. **Index unique constraints** – Enforces uniqueness and speeds up lookups
3. **Use composite indexes** – For multi-column queries
4. **Consider partial indexes** – For large tables with filtered queries
5. **Monitor performance** – Add indexes based on actual query patterns

### Foreign Keys

1. **Always use foreign keys** – Enforces referential integrity
2. **Choose appropriate actions** – CASCADE for dependent data, NO ACTION for independent data
3. **Use SET NULL for optional relationships** – Allows parent deletion without losing children
4. **Document relationships** – Add comments explaining the relationship
5. **Test cascade behavior** – Ensure deletions cascade as expected

---

## Next Steps

- [Learn about database tables](/reference/database/tables/)
- [Configure columns and data types](/reference/database/columns/)
- [Add validation with constraints](/reference/database/constraints/)
