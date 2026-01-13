---
title: Database Tables
description: Creating and configuring database tables in Restura
---

Tables are the fundamental building blocks of your database schema. Each table represents an entity in your application.

## Default Columns

When you create a new table, Restura automatically generates three columns:

| Column       | Type        | Configuration                     |
| ------------ | ----------- | --------------------------------- |
| `id`         | BIGSERIAL   | Auto-increment, primary key       |
| `createdOn`  | TIMESTAMPTZ | Not nullable, defaults to `now()` |
| `modifiedOn` | TIMESTAMPTZ | Not nullable, defaults to `now()` |

These columns provide:

- **Unique identification** – Every row has a unique ID
- **Audit trail** – Track when records were created and last modified
- **Consistency** – All tables follow the same pattern

---

## Table Properties

| Property              | Description                                        |
| --------------------- | -------------------------------------------------- |
| **Name**              | Table name (use `camelCase`, e.g., `userProfile`)  |
| **Columns**           | Array of column definitions                        |
| **Indexes**           | Array of index definitions                         |
| **Foreign Keys**      | Array of foreign key constraints                   |
| **Check Constraints** | Array of check constraint rules                    |
| **Roles**             | User roles that can access this table              |
| **Scopes**            | OAuth-style scopes for fine-grained access control |
| **Notify**            | Configure real-time notifications for row changes  |

---

## Smart Column Name Detection

When you create a new column, Restura automatically configures it based on naming patterns:

| Pattern                          | Auto Configuration                                           |
| -------------------------------- | ------------------------------------------------------------ |
| `*Id` (e.g., `userId`)           | BIGINT, creates index, creates foreign key to matching table |
| `id`                             | BIGSERIAL, auto-increment, not nullable                      |
| `*On` (e.g., `createdOn`)        | DATETIME/TIMESTAMPTZ, not nullable, defaults to `now()`      |
| `firstName`, `lastName`, `name`  | VARCHAR(30)                                                  |
| `address1`                       | VARCHAR(30)                                                  |
| `role`                           | ENUM with `'ADMIN','USER'` values                            |
| `is*`, `has*` (e.g., `isActive`) | BOOLEAN, not nullable                                        |

This smart detection saves time and ensures consistency across your schema.

---

## Foreign Key Auto-Detection

When you name a column ending with `Id` (e.g., `userId`), Restura:

1. Sets the type to `BIGINT`
2. Creates a non-unique index on the column
3. Looks for a table matching the prefix (e.g., `user`)
4. If found, creates a foreign key to that table's `id` column
5. Adds a comment documenting the relationship

### Example

**Creating a column named `companyId` in the `user` table:**

Restura automatically:

- Sets type to `BIGINT`
- Creates index: `user_companyId_index`
- Creates foreign key: `user_companyId_company_id_fk`
- Links to: `company.id`
- Adds comment: "References company.id"

This automation ensures referential integrity without manual configuration.

---

## Naming Conventions

### Best Practices

- Use `camelCase` for table and column names
- Use descriptive names that indicate purpose
- Use `Id` suffix for foreign keys (enables auto-detection)
- Use `On` suffix for timestamp fields (enables auto-configuration)
- Use `is` or `has` prefix for boolean fields

### Examples

**Good table names:**

- `user`
- `order`
- `orderItem`
- `userProfile`
- `companySettings`

**Good column names:**

- `firstName`, `lastName`, `email`
- `userId`, `companyId`, `orderId`
- `createdOn`, `modifiedOn`, `deletedOn`
- `isActive`, `hasAccess`, `isVerified`
- `totalAmount`, `itemCount`, `status`

**Avoid:**

- `tbl_user`, `user_table` (unnecessary prefixes)
- `user_id` (use `userId` instead for camelCase consistency)
- `created_at` (use `createdOn` for consistency)
- `is_active` (use `isActive` for camelCase)

---

## Common Table Patterns

### User Table

```
Table: user
Columns:
  - id (BIGSERIAL, primary key)
  - firstName (VARCHAR(30))
  - lastName (VARCHAR(30))
  - email (VARCHAR(255), unique)
  - passwordHash (TEXT)
  - role (ENUM: 'ADMIN','USER')
  - isActive (BOOLEAN, default: true)
  - createdOn (TIMESTAMPTZ)
  - modifiedOn (TIMESTAMPTZ)
```

### Order Table with Foreign Key

```
Table: order
Columns:
  - id (BIGSERIAL, primary key)
  - userId (BIGINT, foreign key to user.id)
  - status (ENUM: 'pending','processing','completed','cancelled')
  - subtotal (DECIMAL(10,2))
  - tax (DECIMAL(10,2))
  - total (DECIMAL(10,2))
  - createdOn (TIMESTAMPTZ)
  - modifiedOn (TIMESTAMPTZ)
```

### Junction Table (Many-to-Many)

```
Table: userRole
Columns:
  - id (BIGSERIAL, primary key)
  - userId (BIGINT, foreign key to user.id)
  - roleId (BIGINT, foreign key to role.id)
  - createdOn (TIMESTAMPTZ)
  - modifiedOn (TIMESTAMPTZ)
Indexes:
  - Unique composite index on (userId, roleId)
```

---

## Database Page UI

The Database page in Restura UI provides tools to manage your schema.

### Section Toggles

Toggle visibility of different sections across all tables:

| Toggle            | Shows/Hides                 |
| ----------------- | --------------------------- |
| **Columns**       | Column definitions          |
| **Indexes**       | Index configurations        |
| **Foreign Keys**  | Foreign key relationships   |
| **Checks**        | Check constraints           |
| **Notifications** | Notification configurations |

### Search Functionality

The search bar supports multiple search modes:

| Search Type | Example  | Description                               |
| ----------- | -------- | ----------------------------------------- |
| Table name  | `user`   | Filters tables containing "user"          |
| Exact match | `"user"` | Shows only the table named exactly "user" |
| Column type | `BIGINT` | Shows tables with BIGINT columns          |

### Visual Indicators

| Indicator      | Meaning                                   |
| -------------- | ----------------------------------------- |
| 🔑 Key icon    | Primary key column                        |
| Red "MISSING!" | Required field not configured             |
| Disabled edit  | Field cannot be modified (e.g., PK index) |

---

## Performance Considerations

- Add indexes for columns used in WHERE clauses
- Add indexes for foreign key columns (auto-created by Restura)
- Use composite indexes for multi-column queries
- Consider partial indexes for frequently filtered subsets

Learn more about [indexes and relationships](/reference/database/relationships/).

---

## Data Integrity

- Use foreign keys to enforce relationships
- Add check constraints for business rules
- Set appropriate NOT NULL constraints
- Use ENUM or check constraints for status fields

Learn more about [constraints](/reference/database/constraints/).

---

## Security

- Configure table-level permissions for sensitive tables
- Use column-level permissions for PII (email, phone, SSN)
- Grant minimum necessary permissions
- Use scopes for fine-grained API access control

Learn more about [permissions](/reference/database/permissions/).

---

## Next Steps

- [Configure columns and data types](/reference/database/columns/)
- [Set up relationships with indexes and foreign keys](/reference/database/relationships/)
- [Add validation with constraints](/reference/database/constraints/)
- [Configure permissions](/reference/database/permissions/)
