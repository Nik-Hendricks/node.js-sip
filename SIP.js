const dgram = require("dgram");
const net = require("net");
const crypto = require("crypto");
const Builder = require("./Builder");
const Parser = require("./Parser");
const SDPParser = require("./SDPParser");
const Dialog = require("./Dialog");
const clientIP = require("ip").address();


const generateCallid = () => {
  const branchId = Math.floor(Math.random() * 10000000000000);
  return `${branchId}`;
};

class SIPMessage{
    constructor(context, type, props){
        this.context = context;
        this.type = type;
        this.props = props;
        this.body = (typeof this.props.body == "string") ? this.props.body : "";
        this.callID = (typeof this.props.callID == "string") ? this.props.callID : Builder.generateBranch();
        this.cseq = (typeof this.props.cseq_count !== "undefined") ? Number(this.props.cseq_count) : 1;
        this.branchId = (typeof this.props.branchId == "string") ? this.props.branchId : Builder.generateBranch();

        return this;
    }

    create(){
        this.props.client_ip = this.context.client_ip;
        this.props.client_port = this.context.client_port;
        this.props.callId = this.callID;
        this.props.branchId = this.branchId;
        this.props.cseq = this.cseq;
        this.props.username = this.context.username;
        this.props.password = this.context.password;
        this.props.ip = this.context.ip;
        this.props.port = this.context.port;
        this.props.body = this.body;
        this.message = Builder.BuildResponse(this.type, this.props);
        return this;
    }

    Authorize(challenge_response){
        var message = (typeof this.message == "string") ? Parser.parse(this.message) : this.message;
        challenge_response = (typeof challenge_response == "string") ? Parser.parse(challenge_response) : challenge_response;
        
        var extractHeaderParams = Parser.extractHeaderParams(challenge_response.headers['WWW-Authenticate']);
        var nonce = extractHeaderParams.nonce;
        var realm = extractHeaderParams.realm;
        var response = Builder.DigestResponse(this.context.username, this.context.password, realm, nonce, message.method, `${message.requestUri}`);
        
        message.headers.CSeq = `${Parser.getCseq(message) + 1} ${message.method}`;
        message.headers['Authorization'] = `Digest username="${this.context.username}", realm="${realm}", nonce="${nonce}", uri="${message.requestUri}", response="${response}", algorithm=MD5`;
        return Builder.Build(message) //build message from object.
    }

}


class SIP{
    constructor(ip, port, username, password){
        this.ip = ip;
        this.client_ip = clientIP;
        this.client_port = 5060;
        this.port = port;
        this.username = username;
        this.password = password;
        this.Socket = dgram.createSocket("udp4");
        this.callId = generateCallid();
        this.Events = [];
        this.cseq_count = {REGISTER: 1, INVITE: 1, ACK: 1}
        this.dialogs = {};
        return this;
    }

    send(message){
        return new Promise(resolve => {
            this.Socket.send(message, 0, message.length, this.port, this.ip, (error) => {
                if(error){
                    resolve({context: this, 'error': error})
                } else {
                    resolve({context: this, 'success':'success'});
                }
            })
        })
    }

    on(event, callback){
        this.Socket.on('message', (message) => {
            message = message.toString();
            var parsedMessage = Parser.parse(message);
            if(Object.keys(this.dialogs).includes(Parser.getBranch(message))){
                //here we could just access this.dialogs and then pass the message to a function there.
            }else{
                if(Parser.getResponseType(message) == event){
                    callback(parsedMessage);
                };
            }
        })
    }

    Dialog(message){
        return new Promise(resolve => {
            var dialog = new Dialog({context: this, initialRequest: message}).then(dialog => {
                resolve(dialog);
            })
        })
    }

    Message(type, props){
        return new SIPMessage(this, type, props);
    }
}


module.exports = {SIP, SIPMessage};
