const Parser = require('./Parser');
const Builder = require('./Builder');
const SDPParser = require('./SDPParser');

class SIPMessage{
    constructor(obj){
        this.message = (typeof obj == "string") ? Parser.parse(obj) : obj;
        this.cseq = Parser.getCseq(this.message);
        this.challenge = this.ExtractChallenge();
        this.headers = Parser.ParseHeaders(this.message.headers);
        if(typeof this.headers !== "undefined"){
            this.branchId = (typeof this.headers.Via !== "undefined") ? this.headers.Via.branch : (typeof this.headers.v.branch !== 'undefined') ? this.headers.v.branch :Builder.generateBranch();
            this.tag = (typeof this.headers.From !== "undefined") ? this.headers.From.tag : (typeof this.headers.f.tag !=='undefined') ? this.headers.f.tag : Builder.generateBranch();
        }else{
            this.branchId = Builder.generateBranch();
            this.tag = Builder.generateBranch();
        }
        return this;
    }

    CreateResponse(type, props){
        props = (typeof props !== 'undefined') ? props : {}
        var responses = {
            100: 'Trying',
            180: 'Ringing',
            200: 'OK',
            302: 'Moved Temporarily',
            401: 'Unauthorized',
            404: 'Not Found',
            407: 'Proxy Authentication Required',
            408: 'Request Timeout',
            480: 'Temporarily Unavailable',
            486: 'Busy Here',
            487: 'Request Terminated',
            488: 'Not Acceptable Here',
            500: 'Server Internal Error',
            503: 'Service Unavailable',
            504: 'Server Time-out',
        }
        
        var r = Object.assign({}, this.message);
        r.isResponse = true;
        r.statusCode = type
        delete r.method
        r.requestUri = `${type} ${(typeof props.message !== 'undefined') ? props.message : responses[Number(type)]}`;

        return r
    }

    ExtractChallenge(){
        return (typeof this.message.headers['WWW-Authenticate'] !== "undefined") ? Parser.extractHeaderParams(this.message.headers['WWW-Authenticate']) : null;
    }


    ParseSDP(){
        return SDPParser.parse(this.message.body);
    }

    GetIdentity(){
        return this.headers.Contact.contact

    }

    GetAuthCredentials(){
        if(typeof this.message.headers.Authorization !== "undefined"){
            return {
                username: this.headers.Authorization.username,
                password: this.headers.Authorization.response,
                nonce: this.headers.Authorization.nonce,
            }
        }else{
            return {error: "No Authorization header found"};
        }
    }

    Authorize(credentials, challenge_response){
        var is_proxy_auth = (typeof challenge_response.headers['WWW-Authenticate'] !== 'undefined') ? false : true
        var headers = challenge_response.headers
        var message = (typeof this.message == "string") ? Parser.parse(this.message) : this.message;
        challenge_response = (typeof challenge_response == "string") ? Parser.parse(challenge_response) : challenge_response;
        var nonce = (is_proxy_auth) ? headers['Proxy-Authenticate'].nonce : headers['WWW-Authenticate'].nonce
        var realm = (is_proxy_auth) ? headers['Proxy-Authenticate'].realm : headers['WWW-Authenticate'].realm
        var response = Builder.DigestResponse(credentials.username, credentials.password, realm, nonce, message.method, `${message.requestUri}`);
        message.headers.CSeq = `${Parser.getCseq(message) + 1} ${message.method}`;
        message.headers['Proxy-Authorization'] = `Digest username="${credentials.username}", realm="${realm}", nonce="${nonce}", uri="${message.requestUri}", response="${response}", algorithm=MD5`;
        return message //build message from object.
    }
}

module.exports = SIPMessage;