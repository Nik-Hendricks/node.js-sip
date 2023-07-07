const crypto = require("crypto");
const Parser = require("./Parser");
const Builder = {
    register: (props) => {
        var res = {
            method: "REGISTER",
            requestUri: `sip:${props.ip}:${props.port}`,
            protocol: "SIP/2.0",
            headers: {
                'Via': `SIP/2.0/UDP ${props.listen_ip}:${props.listen_port};branch=${props.branchId}`,
                'From': `<sip:${props.username}@${props.ip}>;tag=${Builder.generateBranch()}`,
                'To': `<sip:${props.username}@${props.ip}>`,
                'Call-ID': `${props.callId}@${props.listen_ip}`,
                'CSeq': `${props.cseq} REGISTER`,
                'Contact': `<sip:${props.username}@${props.listen_ip}:${props.listen_port}>`,
                'Max-Forwards': '70',
                'Expires': '3600',
                'User-Agent': 'Node.js SIP Library',
                'Content-Length': '0'
            },
            body: ""
        }

        return res;
    },

    invite: (props) => {
        var res = {
            method: "INVITE",
            requestUri: `sip:${props.extension}@${props.ip}`,
            protocol: "SIP/2.0",
            headers: {
                'Via': `SIP/2.0/UDP ${props.listen_ip}:${props.listen_port};branch=${props.branchId}`,
                'From': `<sip:${props.username}@${props.ip}>;tag=${Builder.generateBranch()}`,
                'To': `<sip:${props.extension}@${props.ip}>`,
                'Call-ID': `${props.callId}@${props.listen_ip}`,
                'CSeq': `${props.cseq} INVITE`,
                'Contact': `<sip:${props.username}@${props.listen_ip}:${props.listen_port}>`,
                'Max-Forwards': '70',
                'User-Agent': 'Node.js SIP Library',
                'Content-Length': '0'
            },
            body: props.body
        }

        return res;
    },

    bye: (props) => {
        var res = {
            method: "BYE",
            requestUri: `sip:${props.extension}@${props.ip}`,
            protocol: "SIP/2.0",
            headers: {
                'Via': `SIP/2.0/UDP ${props.listen_ip}:${props.listen_port};branch=${props.branchId}`,
                'From': `<sip:${props.username}@${props.ip}>;tag=${Builder.generateBranch()}`,
                'To': `<sip:${props.extension}@${props.ip}>`,
                'Call-ID': `${props.callId}@${props.listen_ip}`,
                'CSeq': `${props.cseq} BYE`,
                'Contact': `<sip:${props.username}@${props.listen_ip}:${props.listen_port}>`,
                'Max-Forwards': '70',
                'User-Agent': 'Node.js SIP Library',
                'Content-Length': '0'
            },
            body: props.body
        }

        return res;
    },

    200: (props) => {
        var res = {
            method: "200",
            requestUri: `sip:${props.extension}@${props.ip}`,
            protocol: "SIP/2.0",
            headers: {
                'Via': `SIP/2.0/UDP ${props.listen_ip}:${props.listen_port};branch=${props.branchId}`,
                'From': `<sip:${props.username}@${props.ip}>;tag=${Builder.generateBranch()}`,
                'To': `<sip:${props.extension}@${props.ip}>`,
                'Call-ID': `${props.callId}@${props.listen_ip}`,
                'CSeq': `${props.cseq} 200`,
                'Contact': `<sip:${props.username}@${props.listen_ip}:${props.listen_port}>`,
                'Max-Forwards': '70',
                'User-Agent': 'Node.js SIP Library',
                'Content-Length': '0'
            },
            body: props.body
        }

        return res;
    },

    100: (props) => {

    },

    180: (props) => {
        var res = {
            method: "180",
            requestUri: `sip:${props.extension}@${props.ip}`,
            protocol: "SIP/2.0",
            headers: {
                'Via': `SIP/2.0/UDP ${props.listen_ip}:${props.listen_port};branch=${props.branchId}`,
                'From': `<sip:${props.username}@${props.ip}>;tag=${Builder.generateBranch()}`,
                'To': `<sip:${props.extension}@${props.ip}>`,
                'Call-ID': `${props.callId}@${props.listen_ip}`,
                'CSeq': `${props.cseq} 180`,
                'Contact': `<sip:${props.username}@${props.listen_ip}:${props.listen_port}>`,
                'Max-Forwards': '70',
                'User-Agent': 'Node.js SIP Library',
                'Content-Length': '0'
            },
            body: props.body
        }

        return res;
    },

    401: (props) => {
        var res = {
            method: "401",
            requestUri: props.requestUri,
            protocol: "SIP/2.0",
            headers: {
                'Via': `SIP/2.0/UDP ${props.listen_ip}:${props.listen_port};branch=${props.branchId}`,
                'From': `<sip:${props.username}@${props.ip}>;tag=${Builder.generateBranch()}`,
                'To': `<sip:${props.extension}@${props.ip}>`,
                'Call-ID': `${props.callId}@${props.listen_ip}`,
                'CSeq': `${props.cseq} 180`,
                'Contact': `<sip:${props.username}@${props.listen_ip}:${props.listen_port}>`,
                'Max-Forwards': '70',
                'User-Agent': 'Node.js SIP Library',
                'Content-Length': '0'
            },
            body: props.body
        }

        return res;
    },

    BuildResponse:(type, props) =>{
        var map = {
            "REGISTER": Builder.register(props),
            "INVITE": Builder.invite(props),
            "BYE": Builder.bye(props),
            "200": Builder['200'](props),
            "100": Builder['100'](props),
            "180": Builder['180'](props),
            "401": Builder['401'](props),
        }
        return Builder.Build(map[type]);
    },

    //takes an object and returns a string.
    Build(obj) {
        if(!obj.isResponse){
            obj.isResponse = false;
        }
        let message = '';
      
        // Add request line
        if (obj.isResponse) {
            message += `${obj.protocol} ${obj.statusCode} ${(typeof obj.requestUri !== 'undefined') ? obj.requestUri.slice(obj.requestUri.indexOf(" ") + 1) : "NRegistrar"}\r\n`;
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