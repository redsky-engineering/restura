start
  = fields:fieldsList {
      return fields
    }


fieldsList
  = fields:field+ {
        return fields.join(",")
    }


field
  = id:identifier (",")? {
    return id
  }


identifier
  = chars:[a-zA-Z0-9_\.]+ {
      return chars.join("");
    }

_ "whitespace"
  = [ \t\n\r]*

