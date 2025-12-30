import peg, { ParserBuildOptions } from 'pegjs';

const initializers = `
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

    // Unescape special characters in values: \\, -> , | \\| -> | | \\\\ -> \\
    function unescapeValue(str) {
        var result = '';
        for (var i = 0; i < str.length; i++) {
            if (str[i] === '\\\\' && i + 1 < str.length) {
                var next = str[i + 1];
                if (next === ',' || next === '|' || next === '\\\\') {
                    result += next;
                    i++;
                } else {
                    result += str[i];
                }
            } else {
                result += str[i];
            }
        }
        return result;
    }

    // Split pipe-separated values respecting escaped pipes
    function splitPipeValues(str) {
        var values = [];
        var current = '';
        for (var i = 0; i < str.length; i++) {
            if (str[i] === '\\\\' && i + 1 < str.length && str[i + 1] === '|') {
                current += '|';
                i++;
            } else if (str[i] === '|') {
                values.push(unescapeValue(current));
                current = '';
            } else {
                current += str[i];
            }
        }
        if (current.length > 0) {
            values.push(unescapeValue(current));
        }
        return values;
    }

    // Build SQL IN clause from pipe-separated values
    function buildInClause(column, rawValue) {
        var values = splitPipeValues(rawValue);
        var literals = values.map(function(v) { return format.literal(v); });
        return column + ' IN (' + literals.join(', ') + ')';
    }

    // Check if a value is numeric and format appropriately
    function formatValue(value) {
        // Check if the value is a valid number (integer or decimal)
        if (/^-?\\d+(\\.\\d+)?$/.test(value)) {
            return value; // Return as-is without quotes
        }
        return format.literal(value);
    }
`;

const entryGrammar = `
{
    ${initializers}
}

Start 
    = sql:StartOld { return { sql: sql, usedOldSyntax: true }; }
    / sql:StartNew { return { sql: sql, usedOldSyntax: false }; }
`;

const oldGrammar = `
StartOld
    = OldExpressionList
_
    = [ \\t\\r\\n]*  // Matches spaces, tabs, and line breaks

OldExpressionList
    = leftExpression:OldExpression _ operator:OldOperator _ rightExpression:OldExpressionList 
        { return \`\${leftExpression} \${operator} \${rightExpression}\`;}
    / OldExpression

OldExpression
    = negate:OldNegate? _ "(" _ "column" _ ":"  column:OldColumn _ ","? _ value:OldValue? ","? _ type:OldType? _ ")"_
        {return \`\${negate? " NOT " : ""}(\${type ? type(column, value) : (value == null ? \`\${column} IS NULL\` : \`\${column} = \${formatValue(value)}\`)})\`;}
    /
    negate:OldNegate?"("expression:OldExpressionList")" { return \`\${negate? " NOT " : ""}(\${expression})\`; }

OldNegate
    = "!"
    
OldOperator
    = "and"i / "or"i

OldColumn
    = first:OldText rest:("." OldText)* { 
        const partsArray = [first];
        if (rest && rest.length > 0) {
            partsArray.push(...rest.map(item => item[1]));
        }
        
        if (partsArray.length > 3) {
            throw new SyntaxError('Column path cannot have more than 3 parts (table.column.jsonField)');
        }
        
        if (partsArray.length === 1) {
            return quoteSqlIdentity(partsArray[0]);
        }
        const tableName = quoteSqlIdentity(partsArray[0]);
        
        // If we only have two parts (table.column), use regular dot notation
        if (partsArray.length === 2) {
            return tableName + "." + quoteSqlIdentity(partsArray[1]);
        }
        
        // For JSON paths (more than 2 parts), first part is a column, last part uses ->>
        const jsonColumn = quoteSqlIdentity(partsArray[1]);
        const lastPart = partsArray[partsArray.length - 1];
        const escapedLast = lastPart.replace(/'/g, "''");
        const result = tableName + "." + jsonColumn + "->>'" + escapedLast + "'";
        return result;
    }

OldText
    = text:[a-z0-9 \\t\\r\\n\\-_:@']i+ {
        return text.join(""); 
    }

OldType
    = "type" _ ":" _ type:OldTypeString {
        return type; 
    }

OldTypeString
    = text:"startsWith" { return function(column, value) { return \`\${column}::text ILIKE '\${format.literal(value).slice(1,-1)}%'\`; } }
    / text:"endsWith"  { return function(column, value) { return \`\${column}::text ILIKE '%\${format.literal(value).slice(1,-1)}'\`; } }
    / text:"contains" { return function(column, value) { return \`\${column}::text ILIKE '%\${format.literal(value).slice(1,-1)}%'\`; } }
    / text:"exact" { return function(column, value)    { return \`\${column} = \${formatValue(value)}\`; } }
    / text:"greaterThanEqual" { return function(column, value) { return \`\${column} >= \${formatValue(value)}\`; } }
    / text:"greaterThan" { return function(column, value) { return \`\${column} > \${formatValue(value)}\`; } }
    / text:"lessThanEqual" { return function(column, value) { return \`\${column} <= \${formatValue(value)}\`; } }
    / text:"lessThan" { return function(column, value) { return \`\${column} < \${formatValue(value)}\`; } }
    / text:"isNull"   { return function(column, value) { return \`\${column} IS NULL\`; } }

OldValue
    = "value" _ ":" value:OldText {
        return value; 
    }
`;

const newGrammar = `
StartNew
    = ExpressionList

ExpressionList
    = left:Expression _ op:("and"i / "or"i) _ right:ExpressionList
        { return left + ' ' + op.toUpperCase() + ' ' + right; }
    / Expression

Expression
    = negate:"!"? _ "(" _ inner:SimpleExprList _ ")" _
        { return (negate ? 'NOT ' : '') + '(' + inner + ')'; }
    / SimpleExpr

SimpleExprList
    = left:SimpleExpr _ op:("and"i / "or"i) _ right:SimpleExprList
        { return left + ' ' + op.toUpperCase() + ' ' + right; }
    / SimpleExpr

SimpleExpr
    = negate:"!"? _ "(" _ col:Column _ "," _ op:OperatorWithValue _ ")" _
        { return (negate ? 'NOT ' : '') + '(' + op(col) + ')'; }
    / negate:"!"? _ "(" _ col:Column _ "," _ op:NullOperator _ ")" _
        { return (negate ? 'NOT ' : '') + '(' + op(col) + ')'; }
    / negate:"!"? _ "(" _ col:Column _ "," _ val:Value _ ")" _
        { return (negate ? 'NOT ' : '') + '(' + col + ' = ' + formatValue(unescapeValue(val)) + ')'; }

Column
    = first:ColPart rest:("." ColPart)* {
        const partsArray = [first];
        if (rest && rest.length > 0) {
            partsArray.push(...rest.map(item => item[1]));
        }
        
        if (partsArray.length > 3) {
            throw new SyntaxError('Column path cannot have more than 3 parts (table.column.jsonField)');
        }
        
        if (partsArray.length === 1) {
            return quoteSqlIdentity(partsArray[0]);
        }
        const tableName = quoteSqlIdentity(partsArray[0]);
        
        if (partsArray.length === 2) {
            return tableName + '.' + quoteSqlIdentity(partsArray[1]);
        }
        
        const jsonColumn = quoteSqlIdentity(partsArray[1]);
        const lastPart = partsArray[partsArray.length - 1];
        const escapedLast = lastPart.replace(/'/g, "''");
        return tableName + '.' + jsonColumn + "->>'" + escapedLast + "'";
    }

ColPart
    = chars:[a-zA-Z0-9_]+ { return chars.join(''); }

NullOperator
    = "notnull"i { return function(col) { return col + ' IS NOT NULL'; }; }
    / "null"i { return function(col) { return col + ' IS NULL'; }; }

OperatorWithValue
    = "in"i _ "," _ val:ValueWithPipes { return function(col) { return buildInClause(col, val); }; }
    / "ne"i _ "," _ val:Value { return function(col) { return col + ' <> ' + formatValue(unescapeValue(val)); }; }
    / "gte"i _ "," _ val:Value { return function(col) { return col + ' >= ' + formatValue(unescapeValue(val)); }; }
    / "gt"i _ "," _ val:Value { return function(col) { return col + ' > ' + formatValue(unescapeValue(val)); }; }
    / "lte"i _ "," _ val:Value { return function(col) { return col + ' <= ' + formatValue(unescapeValue(val)); }; }
    / "lt"i _ "," _ val:Value { return function(col) { return col + ' < ' + formatValue(unescapeValue(val)); }; }
    / "has"i _ "," _ val:Value { return function(col) { return col + '::text ILIKE ' + format.literal('%' + unescapeValue(val) + '%'); }; }
    / "sw"i _ "," _ val:Value { return function(col) { return col + '::text ILIKE ' + format.literal(unescapeValue(val) + '%'); }; }
    / "ew"i _ "," _ val:Value { return function(col) { return col + '::text ILIKE ' + format.literal('%' + unescapeValue(val)); }; }

Value
    = chars:ValueChar+ { return chars.join(''); }

ValueChar
    = "\\\\\\\\" { return '\\\\\\\\'; }
    / "\\\\," { return '\\\\,'; }
    / "\\\\|" { return '\\\\|'; }
    / [^,()\\\\|]

ValueWithPipes
    = chars:ValueWithPipesChar+ { return chars.join(''); }

ValueWithPipesChar
    = "\\\\\\\\" { return '\\\\\\\\'; }
    / "\\\\," { return '\\\\,'; }
    / "\\\\|" { return '\\\\|'; }
    / [^,()\\\\]
`;

const fullGrammar = entryGrammar + oldGrammar + newGrammar;

const filterPsqlParser = peg.generate(fullGrammar, {
	format: 'commonjs',
	dependencies: { format: 'pg-format' }
} as ParserBuildOptions);
export default filterPsqlParser;
