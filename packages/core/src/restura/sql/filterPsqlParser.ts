import peg, { ParserBuildOptions } from 'pegjs';

const filterSqlGrammar = `
{
// ported from pg-format but intentionally will add double quotes to every column
 function quoteSqlIdentity(value) {
    if (value === undefined || value === null) {
        throw new Error('SQL identifier cannot be null or undefined');
    } else if (value === false) {
        return '"f"';
    } else if (value === true) {
        return '"t"';
    } else if (value instanceof Date) {
        // return '"' + formatDate(value.toISOString()) + '"';
    } else if (value instanceof Buffer) {
        throw new Error('SQL identifier cannot be a buffer');
    } else if (Array.isArray(value) === true) {
        var temp = [];
        for (var i = 0; i < value.length; i++) {
            if (Array.isArray(value[i]) === true) {
                throw new Error('Nested array to grouped list conversion is not supported for SQL identifier');
            } else {
                // temp.push(quoteIdent(value[i]));
            }
        }
        return temp.toString();
    } else if (value === Object(value)) {
        throw new Error('SQL identifier cannot be an object');
    }

    var ident = value.toString().slice(0); // create copy

    // do not quote a valid, unquoted identifier
    // if (/^[a-z_][a-z0-9_$]*$/.test(ident) === true && isReserved(ident) === false) {
    //     return ident;
    // }

    var quoted = '"';

    for (var i = 0; i < ident.length; i++) {
        var c = ident[i];
        if (c === '"') {
            quoted += c + c;
        } else {
            quoted += c;
        }
    }

    quoted += '"';

    return quoted;
};
}

start = expressionList

_ = [ \\t\\r\\n]*  // Matches spaces, tabs, and line breaks

expressionList =
    leftExpression:expression _ operator:operator _ rightExpression:expressionList 
    { return \`\${leftExpression} \${operator} \${rightExpression}\`;}
    / expression

expression = 
    negate:negate? _ "(" _ "column" _ ":"  column:column _ ","? _ value:value? ","? _ type:type? _ ")"_
    {return \`\${negate? " NOT " : ""}(\${type?  type(column, value) : \`\${column\} = \${format.literal(value)}\`})\`;}
    /
    negate:negate?"("expression:expressionList")" { return \`\${negate? " NOT " : ""}(\${expression})\`; }

negate = "!"
    
operator = "and"i / "or"i

	   
column = left:text "." right:text { return  \`\${quoteSqlIdentity(left)}.\${quoteSqlIdentity(right)}\`; } 
    / 
    text:text { return quoteSqlIdentity(text); } 
    

text = text:[a-z0-9 \\t\\r\\n\\-_:@']i+ { return text.join(""); }


type = "type" _ ":" _ type:typeString { return type; }
typeString = text:"startsWith" { return function(column, value) { return \`\${column} ILIKE '\${format.literal(value).slice(1,-1)}%'\`; } } /
    text:"endsWith"  { return function(column, value) { return \`\${column} ILIKE '%\${format.literal(value).slice(1,-1)}'\`; } } /
    text:"contains" { return function(column, value) { return \`\${column} ILIKE '%\${format.literal(value).slice(1,-1)}%'\`; } } /
    text:"exact" { return function(column, value)    { return \`\${column} = '\${format.literal(value).slice(1,-1)}'\`; } } /
    text:"greaterThanEqual" { return function(column, value) { return \`\${column} >= '\${format.literal(value).slice(1,-1)}'\`; } } /
    text:"greaterThan" { return function(column, value) { return \`\${column} > '\${format.literal(value).slice(1,-1)}'\`; } } /
    text:"lessThanEqual" { return function(column, value) { return \`\${column} <= '\${format.literal(value).slice(1,-1)}'\`; } } /
    text:"lessThan" { return function(column, value) { return \`\${column} < '\${format.literal(value).slice(1,-1)}'\`; } } / 
    text:"isNull"   { return function(column, value) { return \`isNull(\${column})\`; } } 

value = "value" _ ":" value:text { return value; }


`;

const filterPsqlParser = peg.generate(filterSqlGrammar, {
	format: 'commonjs',
	dependencies: { format: 'pg-format' }
} as ParserBuildOptions);
export default filterPsqlParser;
