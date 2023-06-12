const dgram = require("dgram");
const net = require("net");
const crypto = require("crypto");
const Builder = require("./Builder");
const Parser = require("./Parser");
const SDPParser = require("./SDPParser");
const Dialog = require("./Dialog");
const clientIP = require("ip").address();
const SIPMessage = require("./SIPMessage");


const generateCallid = () => {
  const branchId = Math.floor(Math.random() * 10000000000000);
  return `${branchId}`;
};




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
                    //convert the message to a SIPMessage object.
                    var sipMessage = new SIPMessage(parsedMessage);
                    callback(sipMessage);
                };
            }
        })
    }

    Dialog(message){
        return new Promise(resolve => {
            var dialog = new Dialog(message).then(dialog => {
                resolve(dialog);
            })
        })
    }

    Message(message){
        return new SIPMessage(this, message);
    }

    Register(){
        return new Promise(resolve => {
            
            //create a new register message.
            //will be super verbose here
            //build function will be used as it takes an object and returns a string.
            var message = this.Message({
                isResponse: false,
                protocol: "SIP/2.0",
                method: "REGISTER",
                requestUri: `sip:${this.ip}:${this.port}`,
                headers: {
                    'Via': `SIP/2.0/UDP ${this.client_ip}:${this.client_port};branch=${Builder.generateBranch()}`,
                    'From': `<sip:${this.username}@${this.ip}>;tag=${Builder.generateBranch()}`,
                    'To': `<sip:${this.username}@${this.ip}>`,
                    'Call-ID': `${this.callId}@${this.client_ip}`,
                    'CSeq': `1 REGISTER`,
                    'Contact': `<sip:${this.username}@${this.client_ip}:${this.client_port}>`,
                    'Max-Forwards': '70',
                    'User-Agent': 'Node.js SIP Library',
                    'Content-Length': '0'
                },
                body: ''
            })

            this.Dialog(message).then(dialog => {
                dialog.on('401', (res) => {
                    var a = message.Authorize(res); //generate authorized message from the original invite request
                    dialog.send(a)
                })

                dialog.on('200', (res) => {
                    resolve(dialog);
                })
            })
        })
    }

}


module.exports = SIP