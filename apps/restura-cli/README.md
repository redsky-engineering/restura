# restura-cli

Command-line interface for Restura. Provides tooling for generating TypeScript types, diffing a Restura schema against a live database, resetting the scratch database, and generating the full SQL schema from a Restura schema file.

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
# Uses restura.schema.json in the current directory
restura types --output ./generated-types
restura t -o ./generated-types

# Explicit schema path
restura types --schema ./path/to/restura.schema.json --output ./generated-types
restura t -s ./path/to/restura.schema.json -o ./generated-types
```

**Options:**

| Flag              | Alias | Description                                  | Required                                        |
| ----------------- | ----- | -------------------------------------------- | ----------------------------------------------- |
| `--schema <path>` | `-s`  | Path to the `restura.schema.json` file       | No (defaults to `restura.schema.json` in cwd) |
| `--output <dir>`  | `-o`  | Output directory for generated `.d.ts` files | No (defaults to `.`)                            |

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
# Uses restura.schema.json in the current directory
RESTURA_DB_URL=postgresql://user:pass@localhost:5432/mydb restura diff
RESTURA_DB_URL=postgresql://user:pass@localhost:5432/mydb restura d

# Explicit schema path
RESTURA_DB_URL=postgresql://user:pass@localhost:5432/mydb restura diff --schema ./path/to/restura.schema.json
RESTURA_DB_URL=postgresql://user:pass@localhost:5432/mydb restura d -s ./path/to/restura.schema.json

# Redirect output to a file
RESTURA_DB_URL=... restura diff > migrations/001_changes.sql
```

**Options:**

| Flag               | Alias | Description                            | Required                                        |
| ------------------ | ----- | -------------------------------------- | ----------------------------------------------- |
| `--schema <path>`  | `-s`  | Path to the `restura.schema.json` file | No (defaults to `restura.schema.json` in cwd) |

**Environment variables:**

| Variable         | Description                                        | Required |
| ---------------- | -------------------------------------------------- | -------- |
| `RESTURA_DB_URL` | Postgres connection string for the target database | Yes      |

### `reset-scratch` (alias: `rs`)

Drops and recreates the scratch database's `public` schema, then rebuilds it from the schema file. This is the same operation the Restura UI performs when you click "Preview Schema" — it materializes the proposed schema into the scratch database so it can be compared against the live database.

The scratch database name is derived as `{database}_scratch` by default, or `{database}_scratch_{suffix}` when a suffix is provided. The suffix should match the `scratchDatabaseSuffix` value in your `restura.config`.

Requires the `RESTURA_DB_URL` environment variable (or a `.env` file in the working directory).

```bash
# Uses restura.schema.json in the current directory
restura reset-scratch
restura rs

# With a suffix to match your restura.config scratchDatabaseSuffix
restura rs --suffix josh

# Explicit schema path
restura reset-scratch --schema ./path/to/restura.schema.json
restura rs -s ./path/to/restura.schema.json --suffix josh
```

**Options:**

| Flag                | Alias | Description                                                          | Required                                        |
| ------------------- | ----- | -------------------------------------------------------------------- | ----------------------------------------------- |
| `--schema <path>`   | `-s`  | Path to the `restura.schema.json` file                               | No (defaults to `restura.schema.json` in cwd) |
| `--suffix <suffix>` |       | Scratch database suffix (matches `scratchDatabaseSuffix` in config)  | No                                              |

**Environment variables:**

| Variable                 | Description                                                              | Required |
| ------------------------ | ------------------------------------------------------------------------ | -------- |
| `RESTURA_DB_URL`         | Postgres connection string for the target database                       | Yes      |
| `RESTURA_SCRATCH_SUFFIX` | Scratch database suffix (overridden by `--suffix` flag if both are set)  | No       |

### `sql` (alias: `s`)

Generates the full SQL `CREATE TABLE` schema from a `restura.schema.json` file. The output represents the complete database structure — useful for bootstrapping a new database or reviewing the schema as raw SQL.

Output goes to stdout so it can be inspected, piped, or redirected as needed.

```bash
# Uses restura.schema.json in the current directory
restura sql
restura s

# Explicit schema path
restura sql --schema ./path/to/restura.schema.json
restura s -s ./path/to/restura.schema.json

# Redirect output to a file
restura sql > schema.sql
```

**Options:**

| Flag              | Alias | Description                            | Required                                        |
| ----------------- | ----- | -------------------------------------- | ----------------------------------------------- |
| `--schema <path>` | `-s`  | Path to the `restura.schema.json` file | No (defaults to `restura.schema.json` in cwd) |

## Building

Produces a single self-contained binary with no runtime dependency:

```bash
pnpm build
```

## Development

```bash
# Run directly without linking (uses restura.schema.json in cwd by default)
pnpm dev -- types -o ./generated-types
pnpm dev -- diff
pnpm dev -- reset-scratch
pnpm dev -- sql

# Run tests
pnpm test
```
