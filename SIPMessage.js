const Parser = require('./Parser');
const Builder = require('./Builder');

class SIPMessage{
    //constructor(context, type, props){
    //    this.context = context;
    //    this.type = type;
    //    this.props = props;
    //    this.body = (typeof this.props.body == "string") ? this.props.body : "";
    //    this.callID = (typeof this.props.callID == "string") ? this.props.callID : Builder.generateBranch();
    //    this.cseq = (typeof this.props.cseq_count !== "undefined") ? Number(this.props.cseq_count) : 1;
    //    this.branchId = (typeof this.props.branchId == "string") ? this.props.branchId : Builder.generateBranch();
//
    //    return this;
    //}

    constructor(context, obj){
        this.context = context;
        this.message = obj;
        return this;
    }


    /*
    BuildResponse({

    })
    */

    BuildResponse(type){
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
        var res = {
            isResponse: true,
            method: type,
            requestUri: responses[Number(type)],
            protocol: "SIP/2.0",
            headers: {
                'Via': `SIP/2.0/UDP ${props.client_ip}:${props.client_port};branch=${props.branchId}`,
                'From': `<sip:${props.username}@${props.ip}>;tag=${Builder.generateBranch()}`,
                'To': `<sip:${props.extension}@${props.ip}>`,
                'Call-ID': `${props.callId}@${props.client_ip}`,
                'CSeq': `${props.cseq} 180`,
                'Contact': `<sip:${props.username}@${props.client_ip}:${props.client_port}>`,
                'Max-Forwards': '70',
            }
        }
    }

    ExtractChallenge(){
        console.log(this.message)
        return Parser.extractHeaderParams(this.message.headers['WWW-Authenticate']);
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
        return Builder.Build(message) //build message from object.
    }
}

module.exports = SIPMessage;