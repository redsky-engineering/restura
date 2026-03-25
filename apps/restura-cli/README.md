# restura-cli

Command-line interface for Restura. Provides tooling for generating TypeScript types and diffing a Restura schema against a live database.

## Prerequisites

`@restura/core` must be built before using the CLI:

```bash
pnpm --filter @restura/core build
```

## Setup

Install dependencies from the workspace root:

```bash
pnpm install
```

To make the `restura` command available globally:

```bash
cd apps/restura-cli
pnpm link --global
```

## Commands

### `types` (alias: `t`)

Regenerates `api.d.ts`, `models.d.ts`, and `restura.d.ts` from a Restura schema file.

```bash
restura types --schema ./restura.schema.json --output ./generated-types
restura t -s ./restura.schema.json -o ./generated-types
```

**Options:**

| Flag              | Alias | Description                                  | Required             |
| ----------------- | ----- | -------------------------------------------- | -------------------- |
| `--schema <path>` | `-s`  | Path to the `restura.schema.json` file       | Yes                  |
| `--output <dir>`  | `-o`  | Output directory for generated `.d.ts` files | No (defaults to `.`) |

### `diff` (alias: `d`)

Diffs a `restura.schema.json` against a live database and prints the SQL needed to bring the database in line with the schema. The diff engine introspects the live database directly via `pg_catalog` and `information_schema` — no scratch database is needed.

Supported operations:

**Table drops**
- `DROP TABLE` — suppresses redundant index, FK, and check constraint drops that would be implicit

**Table creates**
- `CREATE TABLE` with FK constraints and check constraints inlined in the statement
- Tables are created in dependency order based on FK relationships
- Self-referencing FKs are inlined in the `CREATE TABLE`
- Circular FK references are handled by deferring one side to `ALTER TABLE ADD CONSTRAINT`

**Column changes**
- `ADD COLUMN` / `DROP COLUMN`
- `ALTER COLUMN` for nullability and default changes
- `ALTER COLUMN TYPE` for `VARCHAR` length changes (adding, removing, tightening, or widening)
- `ALTER COLUMN TYPE` for `DECIMAL` precision and scale changes

**Index changes**
- `CREATE INDEX` / `DROP INDEX`
- Index is rebuilt (`DROP` + `CREATE`) when columns, uniqueness, sort order, or `WHERE` clause changes

**Foreign key changes**
- `ALTER TABLE ADD CONSTRAINT ... FOREIGN KEY` for new FKs on existing tables
- `ALTER TABLE DROP CONSTRAINT` for removed FKs

**Check constraint changes**
- `ALTER TABLE ADD CONSTRAINT ... CHECK` / `ALTER TABLE DROP CONSTRAINT` when the expression changes
- `ENUM` column value sets are normalized and diffed against Postgres `ANY(ARRAY[...])` syntax, so only actual value-set changes trigger a rebuild

Output goes to stdout so it can be inspected, piped, or redirected as needed.

Requires the `RESTURA_DB_URL` environment variable (or a `.env` file in the working directory).

```bash
RESTURA_DB_URL=postgresql://user:pass@localhost:5432/mydb restura diff --schema ./restura.schema.json
RESTURA_DB_URL=postgresql://user:pass@localhost:5432/mydb restura d -s ./restura.schema.json

# Redirect output to a file
RESTURA_DB_URL=... restura diff -s ./restura.schema.json > migrations/001_changes.sql
```

**Options:**

| Flag               | Alias | Description                            | Required |
| ------------------ | ----- | -------------------------------------- | -------- |
| `--schema <path>`  | `-s`  | Path to the `restura.schema.json` file | Yes      |

**Environment variables:**

| Variable         | Description                                        | Required |
| ---------------- | -------------------------------------------------- | -------- |
| `RESTURA_DB_URL` | Postgres connection string for the target database | Yes      |

## Building

Produces a single self-contained binary with no runtime dependency:

```bash
pnpm build
```

## Development

```bash
# Run directly without linking
pnpm dev -- types -s ./restura.schema.json -o ./generated-types
pnpm dev -- diff -s ./restura.schema.json

# Run tests
pnpm test
```
