import peg, { ParserBuildOptions } from 'pegjs';

/**
 * Compiles a pegjs grammar that references external dependencies without relying on a runtime
 * `require` being in scope. pegjs's own `format: 'commonjs'` output is eval'd in a scope where
 * `require` only exists under Node CJS — it crashes in ESM bundles and bun-compiled binaries —
 * so we generate the parser source and evaluate it ourselves with an injected require shim
 * backed by statically imported modules.
 *
 * @param grammar pegjs grammar text
 * @param dependencies pegjs dependency map: local variable name in the grammar -> module id
 * @param modules module id -> statically imported module object handed to the require shim
 */
export default function compilePegParser(
	grammar: string,
	dependencies: Record<string, string>,
	modules: Record<string, unknown>
): peg.Parser {
	const parserSource = peg.generate(grammar, {
		output: 'source',
		format: 'commonjs',
		dependencies
	} as ParserBuildOptions) as unknown as string;
	const moduleShim: { exports: peg.Parser } = { exports: {} as peg.Parser };
	const requireShim = (moduleId: string): unknown => {
		if (moduleId in modules) return modules[moduleId];
		throw new Error(`compilePegParser: no module provided for dependency '${moduleId}'`);
	};
	new Function('module', 'exports', 'require', parserSource)(moduleShim, moduleShim.exports, requireShim);
	return moduleShim.exports;
}
