#!/usr/bin/env bun
import 'dotenv/config';

import { Command } from 'commander';
import { createRequire } from 'node:module';
import { diffCommand } from './commands/diff.js';
import { generateTypesCommand } from './commands/generateTypes.js';
import { resetScratchCommand } from './commands/resetScratch.js';
import { sqlCommand } from './commands/sql.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const program = new Command();

program.name('restura').description('Restura CLI').version(version);

program
	.command('types')
	.alias('t')
	.description('Regenerate Restura types from a schema file')
	.option('-s, --schema <path>', 'Path to the restura.schema.json file', 'restura.schema.json')
	.option('-o, --output <dir>', 'Output directory for generated .d.ts files', '.')
	.action(generateTypesCommand);

program
	.command('diff')
	.alias('d')
	.description('Diff a restura.schema.json against a live database and emit migration SQL')
	.option('-s, --schema <path>', 'Path to the restura.schema.json file', 'restura.schema.json')
	.action(diffCommand);

program
	.command('reset-scratch')
	.alias('rs')
	.description('Reset the scratch database and rebuild it from the schema file')
	.option('-s, --schema <path>', 'Path to the restura.schema.json file', 'restura.schema.json')
	.option('--suffix <suffix>', 'Scratch database suffix (matches restura.config scratchDatabaseSuffix)')
	.action(resetScratchCommand);

program
	.command('sql')
	.alias('s')
	.description('Generate SQL to create the full database schema from a restura.schema.json file')
	.option('-s, --schema <path>', 'Path to the restura.schema.json file', 'restura.schema.json')
	.action(sqlCommand);

program.parseAsync().catch((err) => {
	console.error(err);
	process.exit(1);
});
