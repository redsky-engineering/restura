#!/usr/bin/env bun
import 'dotenv/config';

import { Command } from 'commander';
import { createRequire } from 'node:module';
import { diffCommand } from './commands/diff.js';
import { generateTypesCommand } from './commands/generateTypes.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const program = new Command();

program.name('restura').description('Restura CLI').version(version);

program
	.command('types')
	.alias('t')
	.description('Regenerate Restura types from a schema file')
	.requiredOption('-s, --schema <path>', 'Path to the restura.schema.json file')
	.option('-o, --output <dir>', 'Output directory for generated .d.ts files', '.')
	.action(generateTypesCommand);

program
	.command('diff')
	.alias('d')
	.description('Diff a restura.schema.json against a live database and emit migration SQL')
	.requiredOption('-s, --schema <path>', 'Path to the restura.schema.json file')
	.option('--scratch-suffix <string>', 'Suffix appended to the scratch database name', '')
	.action(diffCommand);

program.parseAsync();
