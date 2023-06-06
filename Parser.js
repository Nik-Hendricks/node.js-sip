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
      
        while ((match = regex.exec(header))) {
          const key = match[1];
          const value = match[2].replace(/"/g, '');
          params[key] = value;
        }
      
        return params;
    },

    getResponseType: (message) => {
        var response = message.split("\r\n")[0];
        if(response.split(" ")[0].includes("SIP/2.0")){
            return response.split(" ")[1];
        }else{
            return response.split(" ")[0];
        }
        return response;
    }
}

module.exports = Parser;