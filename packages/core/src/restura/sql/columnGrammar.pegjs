start
  = fields:fieldsList {
      return fields
    }


fieldsList
  = fields:field+ {
        return fields.join(",")
    }

field
  = id:identifier alias:(" AS "i  aliasOptions)? (_","_)? {
    return id + (alias?  (' ' + alias.map(x=>x.trim()).join(' ')): '')
  }

aliasOptions
  = chars:[a-zA-Z0-9_\"]+ {
      return chars.join("");
    }


identifier
  = chars:[a-zA-Z0-9_\.]+ {
      return chars.join("");
    }

_ "whitespace"
  = [ \t\n\r]*

