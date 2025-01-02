const HeaderParser = {
    parse: (headers) => {
      // NOTE if you specify a key within the header object, the function will automatically return just the value of that key if it exists.
      //an example is the CSeq header, which has a count and a method. If you specify the key as CSeq, the function will return an object with the count and method as keys.
      var checks = {
          "From": {contact: HeaderParser.Contact, tag: HeaderParser.Tag},
          'f': {contact: HeaderParser.Contact, tag: HeaderParser.Tag},
          "To": {contact: HeaderParser.Contact, transport: HeaderParser.Transport, tag: HeaderParser.Tag},
          't':{contact: HeaderParser.Contact, transport: HeaderParser.Transport, tag: HeaderParser.Tag},
          "Contact": {contact: HeaderParser.Contact, transport: HeaderParser.Transport},
          "Via": {uri: HeaderParser.URI, branch: HeaderParser.branchId},
          "v":{uri: HeaderParser.URI, branch: HeaderParser.branchId},
          "CSeq": {count: HeaderParser.Cseq, method: HeaderParser.Cseq},
          "WWW-Authenticate": {realm: HeaderParser.Realm, nonce: HeaderParser.Nonce, algorithm: HeaderParser.Algorithm, qop: HeaderParser.Qop},
          "Proxy-Authenticate": {realm: HeaderParser.Realm, nonce: HeaderParser.Nonce, algorithm: HeaderParser.Algorithm},
          "Authorization": {realm: HeaderParser.Realm, username: HeaderParser.Username, algorithm: HeaderParser.Algorithm, nonce: HeaderParser.Nonce, response: HeaderParser.Response},
          "Supported": HeaderParser.SpaceSeparated,
          "Allow": HeaderParser.SpaceSeparated,
          "Call-ID": HeaderParser.CallID,
      }
      var ret = {}
      for(var header in headers){
          var h = headers[header];
          if(typeof checks[header] !== "undefined"){
              if(typeof checks[header] == "function"){
                  ret[header] = checks[header](h);
              }else{
                  for(var check in checks[header]){
                      var c = checks[header][check](h);
                      if(c){
                          if(typeof ret[header] == "undefined"){
                              ret[header] = {}
                          }
                          if(typeof c == "object"){
                              if(typeof c[check] !== "undefined"){
                                  ret[header][check] = c[check];
                              }else{
                                  ret[header][check] = c;
                              }
                          }else{
                              ret[header][check] = c;
                          }
                      }
                  }
              }
          }

      }
      return ret;
  },

  branchId:(str) => {
      if(str.indexOf("branch=") > -1){
          var v = str.match(/branch=(.*)/)[1]
          return (v.indexOf(";") > -1) ? v.split(";")[0] : v;
      }else{
          return false
      }
  },


  FindKey(str, key){
    //will match values such as "key=value","key="value" but also "key=value;key2=value2" or "key=value,key2="value2""

    var regex = new RegExp(`${key}=(?:"([^"]*)"|([^,;]*))`, "g");
    var match = regex.exec(str);
    if(match !== null){
        var ret = match[1] || match[2];
        if(ret.indexOf(";") > -1){
            ret = ret.split(";")[0];
        }
        if(ret.indexOf(":") > -1){
          ret = ret.split(":")[0];
        }
        if(ret.indexOf(">") > -1){
          ret = ret.split(">")[0];
        }
        return ret;

    }else{
        return false;
    }
  },

  CallID:(str) => {
    return str;
  },

  Username:(str) => {
    //make work for <tel:1001> and <sip:1001@ip:port>
    var regex1 = /<sip:(.*)>/;
    var regex2 = /<tel:(.*)>/;

    var match1 = str.match(regex1);
    var match2 = str.match(regex2);

    if(match1 !== null){
      return match1[1].split("@")[0];
    }else if(match2 !== null){
      return match2[1];
    }else{
      return HeaderParser.FindKey(str, "username");
    }
  },

  Qop:(str) => {
      return HeaderParser.FindKey(str, "qop");
  },

  Algorithm:(str) => {
      return HeaderParser.FindKey(str, "algorithm");
  },

  Nonce:(str) => {
    return HeaderParser.FindKey(str, "nonce");
  },

  Tag:(str) => {
    return HeaderParser.FindKey(str, "tag");
  },

  Realm:(str) => {
    return HeaderParser.FindKey(str, "realm");
  },

  Response:(str) => {
    return HeaderParser.FindKey(str, "response");
  },

  Transport:(str) => {
    return HeaderParser.FindKey(str, "transport");
  },

  URI: (str) => {
    var regex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d+))?/;
    var match = str.match(regex);
    if (match !== null) {
        return {
            ip: match[1],
            port: match[2] ? match[2] : null
        };
    } else {
        return false;
    }
  },

  Contact:(str) => {
    var match = str.match(/sip:(.*)/)
    var username = HeaderParser.Username(str);
    var ret = {
      username:username,
    }

    if(match !== null){
      ret.ip = HeaderParser.URI(match[0]).ip;
      ret.port = HeaderParser.URI(match[0]).port;
    }

    return ret;
  },

  Quoted:(str) => {
      if(str.indexOf("\"") > -1){
          return str.split("\"")
      }else{
          return false;
      }
  },

  Cseq:(str) => {
      var v = HeaderParser.SpaceSeparated(str)
      if(v){
          return { count: v[0], method: v[1] }
      }else{
          return false;
      }
  },

  SpaceSeparated:(str) => {
      if(str.indexOf(" ") > -1){
          return str.split(" ")
      }else{
          return false;
      }
  },

  getQuotedValues:(str) => {
      const regex = /([^=\s]+)\s*=\s*(?:"([^"]*)"|([^,;]*))/g;
      let match;
      while ((match = regex.exec(str))) {
        const key = match[1];
        const value = match[2] || match[3];
      }
  },

}


const Parser = {
    parse: (message) => {
        const lines = message.split('\r\n');
        const firstLine = lines.shift();
        const isResponse = firstLine.startsWith('SIP');
      
        if (isResponse) {
          // Parse SIP response
          const [protocol, statusCode] = firstLine.split(' ');
          const statusText = firstLine.substr(protocol.length + statusCode.length + 2);
          const headers = {};
          let index = 0;
      
          // Parse headers
          while (index < lines.length && lines[index] !== '') {
            const line = lines[index];
            const colonIndex = line.indexOf(':');
            if (colonIndex !== -1) {
              const headerName = line.substr(0, colonIndex).trim();
              const headerValue = line.substr(colonIndex + 1).trim();
              if (headers[headerName]) {
                // If header name already exists, convert it to an array
                if (Array.isArray(headers[headerName])) {
                  headers[headerName].push(headerValue);
                } else {
                  headers[headerName] = [headers[headerName], headerValue];
                }
              } else {
                headers[headerName] = headerValue;
              }
            }
            index++;
          }
      
          // Parse message body if it exists
          const body = lines.slice(index + 1).join('\r\n');
      
          return {
            isResponse: true,
            protocol,
            statusCode: parseInt(statusCode),
            statusText,
            headers,
            body,
          };
        } else {
          // Parse SIP request
          const [method, requestUri, protocol] = firstLine.split(' ');
      
          const headers = {};
          let index = 0;
      
          // Parse headers
          while (index < lines.length && lines[index] !== '') {
            const line = lines[index];
            const colonIndex = line.indexOf(':');
            if (colonIndex !== -1) {
              const headerName = line.substr(0, colonIndex).trim();
              const headerValue = line.substr(colonIndex + 1).trim();
              if (headers[headerName]) {
                // If header name already exists, convert it to an array
                if (Array.isArray(headers[headerName])) {
                  headers[headerName].push(headerValue);
                } else {
                  headers[headerName] = [headers[headerName], headerValue];
                }
              } else {
                headers[headerName] = headerValue;
              }
            }
            index++;
          }
      
          // Parse message body if it exists
          const body = lines.slice(index + 1).join('\r\n');
          return {
            isResponse: false,
            method,
            requestUri,
            protocol,
            headers,
            body,
          };
        }
    },

    ParseHeaders(headers){
      return HeaderParser.parse(headers);
    },

    extractHeaderParams: (header) => {
      const params = {};
      const regex = /([^=\s]+)=("[^"]*"|[^,\s]+)/g;
      let match;
    
      // Check if the header is wrapped in single quotes and remove them
      if (header.startsWith("'") && header.endsWith("'")) {
        header = header.slice(1, -1);
      }
    
      while ((match = regex.exec(header))) {
        const key = match[1];
        const value = match[2].replace(/"/g, '');
        params[key] = value;
      }
    
      // Handle additional format: 'SIP/2.0/UDP 192.168.1.2:6111;branch=z9hG4bK5358096010232X2'
      if (!Object.keys(params).length && header.includes(' ')) {
        const spaceIndex = header.indexOf(' ');
        const keyValue = header.slice(0, spaceIndex);
        const rest = header.slice(spaceIndex + 1);
    
        const semicolonIndex = rest.indexOf(';');
        const value = semicolonIndex !== -1 ? rest.slice(0, semicolonIndex) : rest;
    
        params[keyValue] = value;
      }
    
      return params;
    },

    getBranch: (message) => {
      message = (typeof message == "string") ? Parser.parse(message.message) : message;
      return message.headers.Via.split(";")[1].split("=")[1];
    },

    getTag: (message) => {
      message = (typeof message == "string") ? Parser.parse(message) : message;
      return message.headers.From.split(";")[1].split("=")[1];
    },

    getCallId: (message) => {
      message = (typeof message == "string") ? Parser.parse(message) : message;
      return message.headers['Call-ID'].split("@")[0];
    },

    getCseq: (message) => {
      message = (typeof message == "string") ? Parser.parse(message) : message;
      return Number(message.headers.CSeq.split(" ")[0]);
    },

    getResponseType: (message) => {
        message = (typeof message == "string") ? Parser.parse(message) : message;
        return (typeof message.statusCode == "undefined") ? message.method : message.statusCode;
    },

    isSipMessage(message) {
      // Regular expression pattern to match SIP message format
      const sipMessagePattern = /^(?:[A-Z]+)\s(?:sip|sips):\/{2}(?:[^\s:@]+)(?::\d+)?@(?:[^\s:@]+\.)+(?:[a-zA-Z]{2,})(?:\?[\S]*)?(?:\s(?:SIP\/\d\.\d))?\r\n(?:[^\r\n]+\r\n)*(?:\r\n(?:[^\r\n]+))*$/;
    
      // Check if the message matches the SIP message pattern
      return sipMessagePattern.test(message);
    }
}

module.exports = Parser;