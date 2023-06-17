const Parser = require('./Parser');
const Builder = require('./Builder');
const SDPParser = require('./SDPParser');

class SIPMessage{
    constructor(context, obj){
        this.context = context;
        this.message = (typeof obj == "string") ? Parser.parse(obj) : obj;
        this.branchId = Parser.getBranch(this.message);
        this.callId = Parser.getCallId(this.message);
        this.cseq = Parser.getCseq(this.message);
        this.challenge = this.ExtractChallenge();
    
        return this;
    }

    CreateResponse(type){
        var responses = {
            100: 'Trying',
            180: 'Ringing',
            200: 'OK',
            401: 'Unauthorized',
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
        this.cseq++;
        var res = {
            isResponse: true,
            method: type,
            requestUri: `SIP/2.0 ${type} ${responses[Number(type)]}`,
            protocol: "SIP/2.0",
            headers: {
                'Via': `SIP/2.0/UDP ${this.context.client_ip}:${this.context.client_port};branch=${this.branchId}`,
                'From': `<sip:${this.context.username}@${this.context.ip}>;tag=${Builder.generateBranch()}`,
                'To': `<sip:69@${this.context.ip}>`,
                'Call-ID': `${this.callId}@${this.context.client_ip}`,
                'CSeq': `${this.cseq} ${this.message.method}`,
                'Contact': `<sip:${this.context.username}@${this.context.client_ip}:${this.context.client_port}>`,
                'Max-Forwards': '70',
            },
            body:''
        }
        return new SIPMessage(this.context, res);
    }

    ExtractChallenge(){
        return (typeof this.message.headers['WWW-Authenticate'] !== "undefined") ? Parser.extractHeaderParams(this.message.headers['WWW-Authenticate']) : null;
    }

    GetCallId(){
        return Parser.getCallId(this.message);
    }

    ParseSDP(){
        return SDPParser.parse(this.message.body);
    }

    Authorize(challenge_response){
        var message = (typeof this.message == "string") ? Parser.parse(this.message) : this.message;
        challenge_response = (typeof challenge_response == "string") ? Parser.parse(challenge_response) : challenge_response;
        var extractHeaderParams = challenge_response.ExtractChallenge();
        var nonce = extractHeaderParams.nonce;
        var realm = extractHeaderParams.realm;
        var response = Builder.DigestResponse(this.context.username, this.context.password, realm, nonce, message.method, `${message.requestUri}`);
        
        message.headers.CSeq = `${Parser.getCseq(message) + 1} ${message.method}`;
        message.headers['Authorization'] = `Digest username="${this.context.username}", realm="${realm}", nonce="${nonce}", uri="${message.requestUri}", response="${response}", algorithm=MD5`;
        return message //build message from object.
    }
}

module.exports = SIPMessage;