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
      message = (typeof message == "string") ? Parser.parse(message) : message;
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