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
- `CREATE TABLE` / `DROP TABLE`
- `ADD COLUMN` / `DROP COLUMN` / `ALTER COLUMN` (type, nullability, default)
- `CREATE INDEX` / `DROP INDEX`
- `ADD` / `DROP` foreign key constraints
- `ADD` / `DROP` check constraints

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
