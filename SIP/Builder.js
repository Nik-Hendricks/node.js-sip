const crypto = require("crypto");
const Parser = require("./Parser");
const utils = require("../utils");




/**
 * The Builder object provides methods for building SIP messages and objects.
 */
const Builder = {
    user_agent: "node-js-sip",
    max_forwards: 70,

    SIPMessageObject: (props) => {
        let nonce = Builder.generateChallengeNonce();
        let opaque = Builder.generateChallengeOpaque();
        let ret = {
            isResponse: props.isResponse,
            statusCode: (props.isResponse) ? props.statusCode : undefined,
            statusText: (props.isResponse) ? props.statusText : undefined,
            method: (props.isResponse) ? undefined : props.method,
            requestUri: (props.isResponse) ? undefined : props.requestUri,
            protocol: 'SIP/2.0',
            headers: {
                'Via': `SIP/2.0/UDP ${props.headers.Via.uri.ip}:${props.headers.Via.uri.port};branch=${props.headers.Via.branch || Builder.generateBranch()}`,
                'To': `<sip:${props.headers.To.contact.username}@${props.headers.To.contact.ip}${props.headers.To.contact.port ? `:${props.headers.To.contact.port}` : ''}>${(props.headers.To.tag) ? `;tag=${props.headers.To.tag}` : ``}`,
                'From': `<sip:${props.headers.From.contact.username}@${props.headers.From.contact.ip}${props.headers.From.contact.port ? `:${props.headers.From.contact.port}` : ''}>;tag=${props.headers.From.tag || Builder.generateTag()}`,
                'Call-ID': props.headers['Call-ID'] || `1-${props.headers.From.contact.username}-1@${props.headers.From.contact.ip}-${props.headers.From.contact.port}${Math.floor(Math.random() * 100000000)}`,
                'CSeq': `${props.headers.CSeq.count} ${props.headers.CSeq.method}`,
                'Max-Forwards': Builder.max_forwards,
                'User-Agent': Builder.user_agent,
                'Content-Length': '0',
            },
            body: props.body || ''
        }   
        if(props.headers.Contact){
            ret.headers.Contact = `<sip:${props.headers.Contact.contact.username}@${props.headers.Contact.contact.ip}:${props.headers.Contact.contact.port}>`
        }

        if(props.headers['Content-Type']){
            ret.headers['Content-Type'] = props.headers['Content-Type'];
            if(props.body){
                ret.headers['Content-Length'] = props.body.length;
            }
        }
        if (props.challenge_data) {
            var cnonce = Builder.generateBranch();
            if(props.proxy_auth == true){
                ret.headers['Proxy-Authorization'] = `Digest username="${props.username}", realm="${props.challenge_data.realm}", nonce="${props.challenge_data.nonce}", uri="${ret.requestUri}", response="${Builder.DigestResponse(props.username, props.password, props.challenge_data.realm, props.challenge_data.nonce, ret.method, ret.requestUri, props.challenge_data.qop, cnonce, '00000001')}", qop="${props.challenge_data.qop}", cnonce="${cnonce}", nc="00000001", algorithm="MD5"`;
            }else{
                ret.headers['Authorization'] = `Digest username="${props.username}", realm="${props.challenge_data.realm}", nonce="${props.challenge_data.nonce}", uri="${ret.requestUri}", response="${Builder.DigestResponse(props.username, props.password, props.challenge_data.realm, props.challenge_data.nonce, ret.method, ret.requestUri, props.challenge_data.qop, cnonce, '00000001')}", qop="${props.challenge_data.qop}", cnonce="${cnonce}", nc="00000001", algorithm="MD5"`;
            }
        }

        if(props.auth_required == true){
            ret.headers['WWW-Authenticate'] = `Digest realm="node.js-sip",nonce="${nonce}",opaque="${opaque}",algorithm=md5,qop="auth"`
        }

        if(props.expires){
            ret.headers.Contact = ret.headers.Contact + `;expires=${props.expires}`;
        }

        console.log(ret)
        return ret;
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