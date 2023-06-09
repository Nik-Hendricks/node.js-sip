const dgram = require("dgram");
const net = require("net");
const crypto = require("crypto");
const Builder = require("./Builder");
const Parser = require("./Parser");
const Dialog = require("./Dialog");

const asteriskDOMAIN = "64.227.16.15";
const asteriskIP = "64.227.16.15";
const asteriskPort = 6111;
const clientIP = "192.168.1.2";
const clientPort = 6111;
const username = "Rob";
const password = "Marge23";
let callId;


const generateCallid = () => {
  const branchId = Math.floor(Math.random() * 10000000000000);
  return `${branchId}`;
};

class SIPTransaction{
    constructor(context, type, props){
        this.context = context;
        this.type = type;
        this.props = props;
        return this;
    }

    create(){
        this.props.client_ip = this.context.client_ip;
        this.props.client_port = this.context.client_port;
        this.props.callId = this.context.callId;
        this.props.cseq_count = this.context.cseq_count;
        this.props.username = this.context.username;
        this.props.password = this.context.password;
        this.props.ip = this.context.ip;
        this.props.port = this.context.port;
        if(this.context.realm && this.context.nonce){
            this.props.realm = this.context.realm;
            this.props.nonce = this.context.nonce;
        }
        return Builder.BuildResponse(this.type, this.props);
    }

}


class SIP{
    constructor(ip, port, username, password){
        this.ip = ip;
        this.client_ip = clientIP;
        this.client_port = clientPort;
        this.port = port;
        this.username = username;
        this.password = password;
        this.Socket = dgram.createSocket("udp4");
        this.callId = generateCallid();
        this.Events = [];
        this.cseq_count = {REGISTER: 1, INVITE: 1, ACK: 1}
        this.SipMessageProps = []
        return this;
    }

    send(message){
        return new Promise(resolve => {
            this.Socket.send(message, 0, message.length, this.port, this.ip, (error) => {
                this.cseq_count[Parser.getResponseType(message)]++;
                if(error){
                    resolve({context: this, 'error': error})
                } else {
                    resolve({context: this, 'success':'success'});
                }
            })
        })
    }

    on(ref, event, callback){
        //need to add event matching to match the event to the dialog
        //this will allow for multiple dialogs to be created and used at the same time

        this.Events.push({ref: ref, event: event, callback: callback});
    }


    register(){
        return new Promise(resolve => {
            var register_transaction = new SIPTransaction(this, "REGISTER", {}).create();
            this.send(register_transaction).then(response => {
                if(!response.error){
                    resolve({context: this, 'success':'success'})
                } else {
                    resolve({context: this, 'error': res.error})
                }
            })
        })
    }

    AuthorizeMessage(message){
        if(typeof message == "string"){
            message = Parser.parse(message);
        }
        var response = Builder.DigestResponse(this.username, this.password, this.realm, this.nonce, message.method, `${message.requestUri}`);
        console.log(message)
        message.headers.CSeq = `${this.cseq_count[message.method]} ${message.method}`;
        message.headers['Authorization'] = `Digest username="${this.username}", realm="${this.realm}", nonce="${this.nonce}", uri="${message.requestUri}", response="${response}", algorithm=MD5`;
        return Builder.Build(message)
    }

    setup_listeners(){

    }

    createDialog(message){
        return new Promise(resolve => {
            var dialog = new Dialog({context: this, initialRequest: message}).then(dialog => {
                resolve(dialog);
            })
        })
    }

}

var Client = new SIP(asteriskIP, asteriskPort, username, password);

var initialRequest = new SIPTransaction(Client, "REGISTER", {}).create();

Client.createDialog(initialRequest).then(dialog => {
    dialog.on('401', (res) => {
        console.log('REGISTER 401')
        res = Parser.parse(res);
        var extractHeaderParams = Parser.extractHeaderParams(res.headers['WWW-Authenticate']);
        Client.nonce = extractHeaderParams.nonce;
        Client.realm = extractHeaderParams.realm;
        var a = Client.AuthorizeMessage(initialRequest);
        dialog.send(a)
    })

    dialog.on('200', (res) => {
        console.log("REGISTERED")
        call();
    })
})

var call = () => {
    var invite_request = new SIPTransaction(Client, "INVITE", {extension:"69"}).create();
    Client.createDialog(invite_request).then(dialog => {
        dialog.on('401', (res) => {
            res = Parser.parse(res);
            console.log('INVITE 401')
            var extractHeaderParams = Parser.extractHeaderParams(res.headers['WWW-Authenticate']);
            Client.nonce = extractHeaderParams.nonce;
            Client.realm = extractHeaderParams.realm;
            var a = Client.AuthorizeMessage(invite_request);
            console.log(a)
            dialog.send(a)
        })

        dialog.on('200', (res) => {
            console.log('SPAGHETTI4')
        })

        dialog.on('180', (res) => {
            console.log("Ringing")
        })
    })
}

//Client.REGISTER().then(res => {
//    Client.INVITE(69).then(res => {
//        console.log(res);
//    })
//})
