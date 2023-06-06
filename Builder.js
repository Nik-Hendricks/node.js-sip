const crypto = require("crypto");
const Builder = {
    register: (props) => {
        var res = {
            method: "REGISTER",
            requestUri: `sip:${props.ip}:${props.port}`,
            protocol: "SIP/2.0",
            headers: {
                'Via': `SIP/2.0/UDP ${props.client_ip}:${props.client_port};branch=${Builder.generateBranch()}`,
                'From': `<sip:${props.username}@${props.ip}>;tag=${Builder.generateBranch()}`,
                'To': `<sip:${props.username}@${props.ip}>`,
                'Call-ID': `${props.callId}@${props.client_ip}`,
                'CSeq': `${props.cseq_count['REGISTER']} REGISTER`,
                'Contact': `<sip:${props.username}@${props.client_ip}:${props.client_port}>`,
                'Max-Forwards': '70',
                'Expires': '3600',
                'User-Agent': 'Node.js SIP Library',
                'Content-Length': '0'
            },
            body: ""
        }

        if(props.realm && props.nonce && props.realm != "" && props.nonce != ""){
            res.headers["Authorization"] = `Digest username="${props.username}", realm="${props.realm}", nonce="${props.nonce}", uri="sip:${props.ip}:${props.port}", response="${Builder.DigestResponse(props.username, props.password, props.realm, props.nonce, "REGISTER", `sip:${props.ip}:${props.port}`)}"`
        }
        return res;
    },

    invite: (props) => {
        var res = {
            method: "INVITE",
            requestUri: `sip:${props.extension}@${props.ip}`,
            protocol: "SIP/2.0",
            headers: {
                'Via': `SIP/2.0/UDP ${props.client_ip}:${props.client_port};branch=${Builder.generateBranch()}`,
                'From': `<sip:${props.username}@${props.ip}>;tag=${Builder.generateBranch()}`,
                'To': `<sip:${props.extension}@${props.ip}>`,
                'Call-ID': `${props.callId}@${props.client_ip}`,
                'CSeq': `${props.cseq_count['INVITE']} INVITE`,
                'Contact': `<sip:${props.username}@${props.client_ip}:${props.client_port}>`,
                'Max-Forwards': '70',
                'User-Agent': 'Node.js SIP Library',
                'Content-Length': '0'
            },
            body: ""
        }

        if(props.realm && props.nonce && props.realm != "" && props.nonce != ""){
            res.headers["Authorization"] = `Digest username="${props.username}", realm="${props.realm}", nonce="${props.nonce}", uri="sip:${props.extension}@${props.ip}:${props.port}", response="${Builder.DigestResponse(props.username, props.password, props.realm, props.nonce, "INVITE", `sip:${props.extension}@${props.ip}:${props.port}`)}"`
        }

        return res;
    },

    bye: (props) => {
        var res = {
            method: "BYE",
            requestUri: `sip:${props.extension}@${props.ip}`,
            protocol: "SIP/2.0",
            headers: {
                'Via': `SIP/2.0/UDP ${props.client_ip}:${props.client_port};branch=${Builder.generateBranch()}`,
                'From': `<sip:${props.username}@${props.ip}>;tag=${Builder.generateBranch()}`,
                'To': `<sip:${props.extension}@${props.ip}>`,
                'Call-ID': `${props.callId}@${props.client_ip}`,
                'CSeq': `${props.cseq_count['BYE']} BYE`,
                'Contact': `<sip:${props.username}@${props.client_ip}:${props.client_port}>`,
                'Max-Forwards': '70',
                'User-Agent': 'Node.js SIP Library',
                'Content-Length': '0'
            },
            body: ""
        }

        return res;
    },

    BuildResponse:(type, props) =>{
        var map = {
            "REGISTER": Builder.register(props),
            "INVITE": Builder.invite(props),
            "BYE": Builder.bye(props)
        }
        return Builder.Build(map[type]);
    },

    Build(obj) {
        if(!obj.isResponse){
            obj.isResponse = false;
        }
        let message = '';
      
        // Add request line
        if (obj.isResponse) {
          message += `${obj.protocol} 200 OK\r\n`;
        } else {
          message += `${obj.method} ${obj.requestUri} ${obj.protocol}\r\n`;
        }
      
        // Add headers
        for (const header in obj.headers) {
          message += `${header}: ${obj.headers[header]}\r\n`;
        }
      
        // Add empty line to separate headers and body
        message += '\r\n';
      
        // Add body
        message += obj.body;
      
        return message;
    },


    generateBranch:() =>{
        const branchId = Math.floor(Math.random() * 10000000000000);
        return `z9hG4bK${branchId}X2`;
    },

    DigestResponse:(username, password, realm, nonce, method, uri) => {
        const ha1 = crypto.createHash("md5")
          .update(`${username}:${realm}:${password}`)
          .digest("hex");
      
        const ha2 = crypto.createHash("md5")
          .update(`${method}:${uri}`)
          .digest("hex");
      
        const response = crypto.createHash("md5")
          .update(`${ha1}:${nonce}:${ha2}`)
          .digest("hex");
        return response;
    },
}

module.exports = Builder;