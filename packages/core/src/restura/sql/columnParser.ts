import peg, { ParserBuildOptions } from 'pegjs';
import fs from 'fs';
import path from 'path';

const columnParser = peg.generate(fs.readFileSync(path.join(__dirname, './columnGrammar.pegjs'), 'utf-8'), {
	format: 'commonjs',
	dependencies: {}
} as ParserBuildOptions);
export default columnParser;
