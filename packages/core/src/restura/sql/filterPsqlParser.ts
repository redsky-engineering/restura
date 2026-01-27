import peg, { ParserBuildOptions } from 'pegjs';

const initializers = `
    // Quotes a SQL identifier (column/table name) with double quotes, escaping any embedded quotes
    function quoteSqlIdentity(value) {
        return '"' + value.replace(/"/g, '""') + '"';
    }

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
        var literals = values.map(function(v) { return formatValue(v); });
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

    // Format a value with optional type cast
    function formatValueWithCast(rawValue, cast) {
        var formatted = formatValue(unescapeValue(rawValue));
        return cast ? formatted + '::' + cast : formatted;
    }

    // Build SQL IN clause from pipe-separated values with optional cast
    function buildInClauseWithCast(column, rawValue, cast) {
        var values = splitPipeValues(rawValue);
        var literals = values.map(function(v) {
            var formatted = formatValue(v);
            return cast ? formatted + '::' + cast : formatted;
        });
        return column + ' IN (' + literals.join(', ') + ')';
    }

    // Format column with optional cast
    function formatColumn(col) {
        return col.cast ? col.sql + '::' + col.cast : col.sql;
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
    = first:OldColumnPart rest:("." OldColumnPart)* { 
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

OldColumnPart
    = text:[a-z0-9 \\t\\r\\n\\-_:@']i+ {
        return text.join(""); 
    }

OldText
    = text:[a-z0-9 \\t\\r\\n\\-_:@'\.]i+ {
        return text.join(""); 
    }

OldType
    = "type" _ ":" _ type:OldTypeString {
        return type; 
    }

OldTypeString
    = text:"startsWith" { return function(column, value) { return \`\${column} ILIKE '\${format.literal(value).slice(1,-1)}%'\`; } }
    / text:"endsWith"  { return function(column, value) { return \`\${column} ILIKE '%\${format.literal(value).slice(1,-1)}'\`; } }
    / text:"contains" { return function(column, value) { return \`\${column} ILIKE '%\${format.literal(value).slice(1,-1)}%'\`; } }
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
    / negate:"!"? _ "(" _ col:Column _ "," _ val:CastedValue _ ")" _
        { return (negate ? 'NOT ' : '') + '(' + formatColumn(col) + ' = ' + formatValueWithCast(val.value, val.cast) + ')'; }

Column
    = first:ColPart rest:("." ColPart)* cast:TypeCast? {
        const partsArray = [first];
        if (rest && rest.length > 0) {
            partsArray.push(...rest.map(item => item[1]));
        }
        
        if (partsArray.length > 3) {
            throw new SyntaxError('Column path cannot have more than 3 parts (table.column.jsonField)');
        }
        
        var sql;
        if (partsArray.length === 1) {
            sql = quoteSqlIdentity(partsArray[0]);
        } else {
            const tableName = quoteSqlIdentity(partsArray[0]);
            
            if (partsArray.length === 2) {
                sql = tableName + '.' + quoteSqlIdentity(partsArray[1]);
            } else {
                const jsonColumn = quoteSqlIdentity(partsArray[1]);
                const lastPart = partsArray[partsArray.length - 1];
                const escapedLast = lastPart.replace(/'/g, "''");
                sql = tableName + '.' + jsonColumn + "->>'" + escapedLast + "'";
            }
        }
        
        return { sql: sql, cast: cast };
    }

ColPart
    = chars:[a-zA-Z0-9_]+ { return chars.join(''); }

NullOperator
    = "notnull"i { return function(col) { return formatColumn(col) + ' IS NOT NULL'; }; }
    / "null"i { return function(col) { return formatColumn(col) + ' IS NULL'; }; }

OperatorWithValue
    = "in"i _ "," _ val:CastedValueWithPipes { return function(col) { return buildInClauseWithCast(formatColumn(col), val.value, val.cast); }; }
    / "ne"i _ "," _ val:CastedValue { return function(col) { return formatColumn(col) + ' <> ' + formatValueWithCast(val.value, val.cast); }; }
    / "gte"i _ "," _ val:CastedValue { return function(col) { return formatColumn(col) + ' >= ' + formatValueWithCast(val.value, val.cast); }; }
    / "gt"i _ "," _ val:CastedValue { return function(col) { return formatColumn(col) + ' > ' + formatValueWithCast(val.value, val.cast); }; }
    / "lte"i _ "," _ val:CastedValue { return function(col) { return formatColumn(col) + ' <= ' + formatValueWithCast(val.value, val.cast); }; }
    / "lt"i _ "," _ val:CastedValue { return function(col) { return formatColumn(col) + ' < ' + formatValueWithCast(val.value, val.cast); }; }
    / "has"i _ "," _ val:CastedValue { return function(col) { var formatted = format.literal('%' + unescapeValue(val.value) + '%'); return formatColumn(col) + ' ILIKE ' + (val.cast ? formatted + '::' + val.cast : formatted); }; }
    / "sw"i _ "," _ val:CastedValue { return function(col) { var formatted = format.literal(unescapeValue(val.value) + '%'); return formatColumn(col) + ' ILIKE ' + (val.cast ? formatted + '::' + val.cast : formatted); }; }
    / "ew"i _ "," _ val:CastedValue { return function(col) { var formatted = format.literal('%' + unescapeValue(val.value)); return formatColumn(col) + ' ILIKE ' + (val.cast ? formatted + '::' + val.cast : formatted); }; }

CastedValue
    = val:Value cast:TypeCast? { return { value: val, cast: cast }; }

CastedValueWithPipes
    = val:ValueWithPipes cast:TypeCast? { return { value: val, cast: cast }; }

TypeCast
    = "::" type:("timestamptz"i / "timestamp"i / "boolean"i / "numeric"i / "bigint"i / "text"i / "date"i / "int"i)
        { return type.toLowerCase(); }

Value
    = chars:ValueChar+ { return chars.join(''); }

ValueChar
    = "\\\\\\\\" { return '\\\\\\\\'; }
    / "\\\\," { return '\\\\,'; }
    / "\\\\|" { return '\\\\|'; }
    / [^,()\\\\|:]
    / c:":" !":"  { return c; }

ValueWithPipes
    = chars:ValueWithPipesChar+ { return chars.join(''); }

ValueWithPipesChar
    = "\\\\\\\\" { return '\\\\\\\\'; }
    / "\\\\," { return '\\\\,'; }
    / "\\\\|" { return '\\\\|'; }
    / [^,()\\\\:]
    / c:":" !":"  { return c; }
`;

const fullGrammar = entryGrammar + oldGrammar + newGrammar;

const filterPsqlParser = peg.generate(fullGrammar, {
	format: 'commonjs',
	dependencies: { format: 'pg-format' }
} as ParserBuildOptions);
export default filterPsqlParser;
