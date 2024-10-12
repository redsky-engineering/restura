import peg, { ParserBuildOptions } from 'pegjs';

const filterSqlGrammar = `
start = expressionList

expressionList =
        leftExpression:expression operator:operator rightExpression:expressionList 
    { return \`\${leftExpression} \${operator} \${rightExpression}\`;}
    / expression

expression = 
    negate:negate?"(" "column:" column:column ","? value:value? ","? type:type? ")" 
    {return \`\${negate? "!" : ""}(\${type?  type(column, value) : \`\${column\} = \${format.literal(value)}\`})\`;}
    /
    negate:negate?"("expression:expressionList")" { return \`\${negate? "!" : ""}(\${expression})\`; }

negate = "!"
    
operator = "and"i / "or"i

	   
column = left:text "." right:text { return  \`\${format.ident(left)}.\${format.ident(right)}\`; } 
    / 
    text:text { return format.ident(text); } 
    

text = text:[a-z0-9-_:@]i+ { return text.join("");}

type = "type:" type:typeString { return type; }
typeString = text:"startsWith" { return function(column, value) { return \`\${column} ILIKE '\${format.literal(value).slice(1,-1)}%'\`; } } /
    text:"endsWith"  { return function(column, value) { return \`\${column} ILIKE '%\${format.literal(value).slice(1,-1)}'\`; } } /
    text:"contains" { return function(column, value) { return \`\${column} ILIKE '%\${format.literal(value).slice(1,-1)}%'\`; } } /
    text:"exact" { return function(column, value)    { return \`\${column} = '\${format.literal(value).slice(1,-1)}'\`; } } /
    text:"greaterThanEqual" { return function(column, value) { return \`\${column} >= '\${format.literal(value).slice(1,-1)}'\`; } } /
    text:"greaterThan" { return function(column, value) { return \`\${column} > '\${format.literal(value).slice(1,-1)}'\`; } } /
    text:"lessThanEqual" { return function(column, value) { return \`\${column} <= '\${format.literal(value).slice(1,-1)}'\`; } } /
    text:"lessThan" { return function(column, value) { return \`\${column} < '\${format.literal(value).slice(1,-1)}'\`; } } / 
    text:"isNull"   { return function(column, value) { return \`isNull(\${column})\`; } } 
    
value = "value:" value:text { return value; } 

`;

const filterPsqlParser = peg.generate(filterSqlGrammar, {
	format: 'commonjs',
	dependencies: { format: 'pg-format' }
} as ParserBuildOptions);
export default filterPsqlParser;
