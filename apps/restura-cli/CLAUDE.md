# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`restura-cli` is the command-line front end for Restura. It lives in an nx + pnpm
monorepo (`apps/restura-cli`); the actual schema/SQL/type logic lives in the
sibling package `@restura/core` (`packages/core`). The CLI itself is a thin
Commander wrapper — it does no SQL, diffing, or type generation of its own.

## Critical: build `@restura/core` first

The CLI imports `@restura/core` via `workspace:*`, but the package's `main`
resolves to its **built** `dist/index.js` — not its source. Nothing the CLI does
will pick up source changes in core until core is rebuilt:

```bash
pnpm --filter @restura/core build      # required before first use, and after ANY core change
```

If a CLI command behaves as if a core change didn't happen, this is almost always why.

## Commands

```bash
pnpm dev -- <command> [opts]   # run via tsx, no build of the CLI needed (e.g. pnpm dev -- diff)
pnpm build                     # bun build --compile → single binary at dist/restura
pnpm test                      # mocha over test/**/*.test.ts (tsx loader)
```

Run a single test: `pnpm exec mocha test/cli.test.ts` (the suite is currently a
skipped placeholder). There is no per-app lint script; linting runs at the
monorepo root via `pnpm lint` (nx).

Tooling note: `pnpm dev`/`pnpm test` use **tsx**; only `pnpm build` requires
**bun**. The published `bin` (`restura`) points at `src/index.ts` with a
`#!/usr/bin/env bun` shebang.

## Architecture

`src/index.ts` registers four subcommands on a single Commander `program`, each
delegating to one file under `src/commands/`:

| Command (alias)        | core function(s) used                                                  | Needs DB |
| ---------------------- | ---------------------------------------------------------------------- | -------- |
| `types` (`t`)          | `apiGenerator`, `modelGenerator`, `resturaGlobalTypesGenerator`        | no       |
| `sql` (`s`)            | `generateDatabaseSchemaFromSchema`                                     | no       |
| `diff` (`d`)           | `introspectDatabase`, `diffSchemaToDatabase`                           | yes      |
| `reset-scratch` (`rs`) | `getNewPublicSchemaAndScratchPool`, `generateDatabaseSchemaFromSchema` | yes      |

Every command follows the identical preamble: read the schema file (default
`restura.schema.json` in cwd, override with `-s/--schema`) → `JSON.parse` →
`isSchemaValid()` → cast to `ResturaSchema` → call into core. On any failure it
prints `Error: ...` to stderr and `process.exit(1)`.

DB-touching commands (`diff`, `reset-scratch`) require the `RESTURA_DB_URL`
env var (loaded from `.env` via `dotenv/config` at the top of `index.ts`),
construct a `PsqlPool`, and **must** end the pool in a `finally` block.

### Adding a command

1. Create `src/commands/<name>.ts` exporting `async function <name>Command(options)`,
   reusing the read→parse→validate preamble above.
2. Register it in `src/index.ts` with `program.command().alias().description().option().action()`.
3. Keep all real logic in `@restura/core` and export it from `packages/core/src/index.ts`;
   the command should only orchestrate I/O and call core.

## Conventions

- ESM throughout (`"type": "module"`); import sibling files with explicit `.js`
  extensions even from `.ts` sources (e.g. `./commands/diff.js`).
- Formatting (Prettier, repo root): tabs, width 4, single quotes, no trailing
  commas, 120 col, LF.
