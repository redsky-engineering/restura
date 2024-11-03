{
  function trim(array) {
    return array.map(item => item.trim());
  }
}

start = query

query = select:selectClause from:fromClause joins:joinClause? where:whereClause? groupBy:groupByClause? orderBy:orderByClause? limit:limitClause? {
      return {
        select,
        from,
        joins,
        where,
        groupBy,
        orderBy,
        limit
      };
    }

selectClause
  = _ "SELECT"i _ fields:fieldsList {
      return  "SELECT " + fields;
    }


fieldsList
  = fields:field+  {
        return fields.join(",")
    }

column = field / subQuery

field
  = id:identifier alias:(" AS "i  aliasOptions)? (_","_)? {
    return id + (alias?  (' ' + alias.map(x=>x.trim()).join(' ')): '')
  }

subQuery
  = id:(_"("_) query (_")"_) alias:(" AS "i  aliasOptions)? (_","_)? {
    return id + (alias?  (' ' + alias.map(x=>x.trim()).join(' ')): '')
  }

aliasOptions
  = chars:[a-zA-Z0-9_\"]+ {
      return chars.join("");
    }

fromClause
  = _ "FROM"i _ table:identifier _ {
      return "FROM " + table;
    }

joinClause
  = _ joinType:("INNER"i / "LEFT"i / "RIGHT"i)? _ "JOIN"i _ table:identifier _ "ON"i _ joinCondition:condition {
      return (joinType || '') + " JOIN " + table + " ON " + joinCondition

    }

whereClause
  = _ "WHERE"i _ condition:condition {
      return  "WHERE " + condition;
    }

groupByClause
  = _ "GROUP BY"i _ fields:fieldsList {
      return  "GROUP BY " + fields;
    }

orderByClause
  = _ "ORDER BY"i _ fields:fieldsList {
      return "ORDER BY " + fields
    }

limitClause
  = _ "LIMIT"i _ value:[0-9]+ {
      return "LIMIT " + parseInt(value.join(""), 10);
    }

condition
  = lhs:identifier _ operator:(">" / "<" / "=" / "!=" / ">=" / "<=") _ rhs:identifier {
      return lhs + ' ' + operator + ' ' + rhs
    }

identifier
  =  ident

ident
  = chars:$[a-zA-Z0-9_\.\"\(\)\*]+ {
      return chars
    }

_ "whitespace"
  = [ \t\n\r]*

__ "whitespaceRequired"
  = [ \t\n\r]+

reservedWord
  = "(" / ")" / "SELECT"i / "UPDATE"i / "INSERT"i / "DELETE"i / "AS"i / "ORDER"i / "BY"i / "GROUP"i / "LIMIT"i / "INNER"i / "LEFT"i / "RIGHT"i / "JOIN"i
