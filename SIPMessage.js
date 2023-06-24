const Parser = require('./Parser');
const Builder = require('./Builder');
const SDPParser = require('./SDPParser');


class P{
    constructor(headers){
        this.headers = headers
    }

    parse(){
        // NOTE if you specify a key within the header object, the function will automatically return just the value of that key if it exists.
        //an example is the CSeq header, which has a count and a method. If you specify the key as CSeq, the function will return an object with the count and method as keys.
        var checks = {
            "From": {contact: this.Contact, tag: this.Tag},
            "To": {contact: this.Contact},
            "Contact": {contact: this.Contact},
            "Via": {uri: this.URI, branch: this.branchId},
            "CSeq": {count: this.Cseq, method: this.Cseq},
        }
        var ret = {}
        for(var header in this.headers){
            var h = this.headers[header];
            if(typeof checks[header] !== "undefined"){
                if(typeof checks[header] == "function"){
                    ret[header] = checks[header].bind(this)(h);
                }else{
                    for(var check in checks[header]){
                        var c = checks[header][check].bind(this)(h);
                        if(c){
                            if(typeof ret[header] == "undefined"){
                                ret[header] = {}
                            }
                            if(typeof c == "object"){
                                if(typeof c[check] !== "undefined"){
                                    ret[header][check] = c[check];
                                }else{
                                    ret[header][check] = c;
                                }
                            }else{
                                ret[header][check] = c;
                            }
                        }
                    }
                }
            }
 
        }
        return ret;
    }

    branchId(str){
        if(str.indexOf("branch=") > -1){
            var v = str.match(/branch=(.*)/)[1]
            return (v.indexOf(";") > -1) ? v.split(";")[0] : v;
        }else{
            return false
        }
    }

    Tag(str){
        if(str.indexOf("tag=") > -1){
            return str.match(/tag=(.*)/)[1]
        }else{
            return false
        }
    }

    URI(str){
        var regex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+)/;
        var match = str.match(regex);
        if(match !== null){
            return {ip: match[1].split(":")[0], port: match[1].split(":")[1]}
        }else{
            return false;
        }
    }

    Contact(str){
        if(str.indexOf("sip:") > -1){
            var match = str.match(/<sip:(.*)>/)[1]
            var username = match.split(":")[0].split("@")[0];
            var v = this.URI(match);
            v.username = username;
            return v
        }else{
            return false
        }
    }

    Quoted(str){
        if(str.indexOf("\"") > -1){
            return str.split("\"")
        }else{
            return false;
        }
    }

    Cseq(str){
        var v = this.SpaceSeparated(str)
        if(v){
            return { count: v[0], method: v[1] }
        }else{
            return false;
        }
    }

    SpaceSeparated(str){
        if(str.indexOf(" ") > -1){
            return str.split(" ")
        }else{
            return false;
        }
    }

    getQuotedValues(str){
        const regex = /([^=\s]+)\s*=\s*(?:"([^"]*)"|([^,;]*))/g;
        let match;
        while ((match = regex.exec(str))) {
          const key = match[1];
          const value = match[2] || match[3];
          console.log(`Key: ${key}, Value: ${value}`);
        }
    }

}

class SIPMessage{
    constructor(context, obj){
        this.context = context;
        this.message = (typeof obj == "string") ? Parser.parse(obj) : obj;
        this.branchId = Parser.getBranch(this.message);
        this.callId = Parser.getCallId(this.message);
        this.cseq = Parser.getCseq(this.message);
        this.challenge = this.ExtractChallenge();
    
        var p = new P(this.message.headers);
        console.log(p.parse());

        return this;
    }

    CreateResponse(type){
        var responses = {
            100: 'Trying',
            180: 'Ringing',
            200: 'OK',
            302: 'Moved Temporarily',
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
        
        var r = Object.assign({}, this.message);
        r.isResponse = true;
        r.method = type;
        r.requestUri = `${type} ${responses[Number(type)]}`;

        return r
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

    GetIdentity(){

        var ip = this.message.headers.Contact.match(/@(.*)>/)[1].split(":")[0];
        ip = (typeof ip == "undefined") ? this.message.headers.From.match(/@(.*)>/)[1].split(":")[0] : ip;

        var port = this.message.headers.Contact.match(/@(.*)>/)[1].split(":")[1];
        port = (typeof port == "undefined") ? this.message.headers.From.match(/@(.*)>/)[1].split(":")[1] : port;
        if(port.indexOf(";") > -1){
            port = port.split(";")[0];
        }

        return {
            username: this.message.headers.From.match(/<sip:(.*)@/)[1],
            ip: ip,
            port: port,
        }
    }


    GetAuthCredentials(){
        if(typeof this.message.headers.Authorization !== "undefined"){
            return {
                username: this.message.headers.From.match(/<sip:(.*)@/)[1],
                password: this.message.headers.Authorization.match(/response="(.*)"/)[1],
                nonce: this.message.headers.Authorization.match(/nonce="(.*)"/)[1],
            }
        }else{
            return {error: "No Authorization header found"};
        }
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