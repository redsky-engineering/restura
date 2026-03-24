# restura-cli

Command-line interface for Restura. Provides tooling for generating TypeScript types from a Restura schema file.

## Prerequisites

`@restura/core` must be built before using the CLI:

```bash
bun --filter @restura/core build
```

## Setup

Install dependencies from the workspace root:

```bash
bun install
```

To make the `restura` command available globally:

```bash
cd apps/restura-cli
bun link
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

## Development

```bash
# Run directly without linking
bun dev -- types -s ./restura.schema.json -o ./generated-types

# Run tests
bun test
```
