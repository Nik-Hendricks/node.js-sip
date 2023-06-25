const Parser = require('./Parser');
const Builder = require('./Builder');
const SDPParser = require('./SDPParser');

class SIPMessage{
    constructor(context, obj){
        this.context = context;
        this.message = (typeof obj == "string") ? Parser.parse(obj) : obj;
        this.cseq = Parser.getCseq(this.message);
        this.challenge = this.ExtractChallenge();
        this.headers = Parser.ParseHeaders(this.message.headers);
        if(typeof this.headers !== "undefined"){
            this.branchId = (typeof this.headers.Via !== "undefined") ? this.headers.Via.branch : Builder.generateBranch();
            this.tag = (typeof this.headers.From !== "undefined") ? this.headers.From.tag : Builder.generateBranch();
        }else{
            this.branchId = Builder.generateBranch();
            this.tag = Builder.generateBranch();
        }
        return this;
    }

    CreateResponse(type){
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
        r.method = type;
        r.requestUri = `${type} ${responses[Number(type)]}`;

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

    Authorize(challenge_response){
        var message = (typeof this.message == "string") ? Parser.parse(this.message) : this.message;
        challenge_response = (typeof challenge_response == "string") ? Parser.parse(challenge_response) : challenge_response;
        var nonce = challenge_response.headers['WWW-Authenticate'].nonce;
        var realm = challenge_response.headers['WWW-Authenticate'].realm;
        var response = Builder.DigestResponse(this.context.username, this.context.password, realm, nonce, message.method, `${message.requestUri}`);
        message.headers.CSeq = `${Parser.getCseq(message) + 1} ${message.method}`;
        message.headers['Authorization'] = `Digest username="${this.context.username}", realm="${realm}", nonce="${nonce}", uri="${message.requestUri}", response="${response}", algorithm=MD5`;
        return message //build message from object.
    }
}

module.exports = SIPMessage;