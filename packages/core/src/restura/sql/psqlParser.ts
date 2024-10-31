import peg, { ParserBuildOptions } from 'pegjs';
import fs from 'fs';
import path from 'path';

const psqlParser = peg.generate(fs.readFileSync(path.join(__dirname, './psqlGrammar.pegjs'), 'utf-8'), {
	format: 'commonjs',
	dependencies: {}
} as ParserBuildOptions);
export default psqlParser;
