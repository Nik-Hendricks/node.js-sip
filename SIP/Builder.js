const crypto = require("crypto");
const Parser = require("./Parser");
const utils = require("../utils");




/**
 * The Builder object provides methods for building SIP messages and objects.
 */
const Builder = {
    user_agent: "node-js-sip",
    max_forwards: 70,
    /**
    * Builds a SIP Message object.
    *
    * @param {Object} props - The properties object.
    * @param {string} props.extension - The extension to call.
    * @param {string} props.ip - The IP address to send the request to.
    * @param {string} props.listen_ip - The IP address to listen on.
    * @param {number} props.listen_port - The port to listen on.
    * @param {string} props.branchId - The branch ID.
    * @param {string} props.username - The username.
    * @param {string} props.callId - The call ID.
    * @param {number} props.cseq - The CSeq number.
    * @param {string} props.body - The request body.
    * @returns {Object} - The SIP INVITE request object.
    */

    SIPMessageObject: (method, props, challenge_data, proxy_auth = false) => {
        console.log(props)

        var res = {
            method: method.toUpperCase(),
            requestUri: props.requestUri,
            protocol: "SIP/2.0",
            headers: {
                'Via': `SIP/2.0/UDP ${utils.getLocalIpAddress()}:${props.port};branch=${props.branchId}`,
                'From': `<sip:${props.username}@${utils.getLocalIpAddress()}>;tag=${props.from_tag || Math.floor(Math.random() * 10000000000000)}`,
                'To': `<sip:${props.to}@${props.ip}>`,
                'Call-ID': `${props.callId}@${utils.getLocalIpAddress()}`,
                'CSeq': `${props.cseq} ${props.cseq_method || method.toUpperCase()}`,
                'Contact': `<sip:${props.username}@${utils.getLocalIpAddress()}:5060>`,
                'Max-Forwards': Builder.max_forwards,
                'User-Agent': Builder.user_agent,
            },
            body: (typeof props.body !== 'undefined') ? props.body : ""
        }

        if (challenge_data) {
            var cnonce = Builder.generateBranch();
            if(proxy_auth){
                res.headers['Proxy-Authorization'] = `Digest username="${props.username}", realm="${challenge_data.realm}", nonce="${challenge_data.nonce}", uri="${res.requestUri}", response="${Builder.DigestResponse(props.username, props.password, challenge_data.realm, challenge_data.nonce, res.method, res.requestUri, challenge_data.qop, cnonce, '00000001')}", qop="${challenge_data.qop}", cnonce="${cnonce}", nc="00000001", algorithm="MD5"`;
            }else{
                res.headers['Authorization'] = `Digest username="${props.username}", realm="${challenge_data.realm}", nonce="${challenge_data.nonce}", uri="${res.requestUri}", response="${Builder.DigestResponse(props.username, props.password, challenge_data.realm, challenge_data.nonce, res.method, res.requestUri, challenge_data.qop, cnonce, '00000001')}", qop="${challenge_data.qop}", cnonce="${cnonce}", nc="00000001", algorithm="MD5"`;
            }
        }
        
        res.headers['Content-Length'] = res.body.length;

        return res;
    },

    Build(obj) {
        if(!obj.isResponse){
            obj.isResponse = false;
        }
        let message = '';
        if (obj.isResponse) {
            message += `SIP/2.0 ${obj.statusCode} ${obj.statusText} ${(typeof obj.requestUri !== 'undefined') ? obj.requestUri.slice(obj.requestUri.indexOf(" ") + 1) : ""}\r\n`;
        } else {
          message += `${obj.method} ${obj.requestUri} SIP/2.0\r\n`;
        }
        for (const header in obj.headers) {
          message += `${header}: ${obj.headers[header]}\r\n`;
        }
        message += '\r\n';
        message += obj.body;
        return message;
    },

    generateBranch:() =>{
        const branchId = Math.floor(Math.random() * 10000000000000);
        return `z9hG4bK${branchId}X2`;
    },

    generateTag:() =>{
        const tag = Math.floor(Math.random() * 10000000000000);
        return tag;
    },

    /**
    * Builds response to a challenge.
    *
    * @param {Object} username - The username.
    * @param {Object} password - The password.
    * @param {Object} realm - The realm.
    * @param {Object} nonce - The nonce.
    * @param {Object} method - The method.
    * @param {Object} uri - The URI.
    * @param {Object} qop - The qop.
    * @param {Object} cnonce - The cnonce.
    * @param {Object} nc - The nc.
    * @returns {string} - The response.
    */

    DigestResponse:(username, password, realm, nonce, method, uri, qop, cnonce, nc) => {
        const ha1 = crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
        const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
        const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');
        return response;
    },        

    generateChallengeNonce:() =>{
        return crypto.randomBytes(16).toString('hex');
    },

    generateChallengeOpaque:() =>{
        return crypto.randomBytes(8).toString('hex');
    },
}

module.exports = Builder;