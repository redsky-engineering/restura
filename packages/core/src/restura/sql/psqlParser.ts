import { Parser } from 'node-sql-parser';
const parser = new Parser();
const opt = {
	database: 'Postgresql'
};

class PsqlParser {
	toTotalQuery(sql: string, totalSelect?: string) {
		const countSql = totalSelect || `SELECT COUNT(*) AS total`;
		const ast = parser.astify(sql, opt); // Parse SQL into an Abstract Syntax Tree (AST)
		const countAST = parser.astify(countSql, opt); // Parse SQL into an Abstract Syntax Tree (AST)
		const newAST = [
			{ ...ast[0], columns: countAST.columns, groupby: null, having: null, orderby: null, limit: null }
		];

		const toSql = parser.sqlify(newAST, opt); // Tree back to sql
		return toSql;
	}
}

export const psqlParser = new PsqlParser();
