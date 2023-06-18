const dgram = require("dgram");
const net = require("net");
const crypto = require("crypto");
const Builder = require("./Builder");
const Parser = require("./Parser");
const SDPParser = require("./SDPParser");
const Dialog = require("./Dialog");
const clientIP = require("ip").address();
const SIPMessage = require("./SIPMessage");
const Transaction = require("./Transaction");
const os = require("os");



const generateCallid = () => {
  const branchId = Math.floor(Math.random() * 10000000000000);
  return `${branchId}`;
};


class Listener{
    constructor(){
        
    }
}

class SIP{
    constructor(props){
        props = (typeof props !== 'undefined') ? props : {};
        this.ip = (typeof props.ip !== 'undefined') ? props.ip : "";
        this.client_ip = (typeof props.client_ip !== 'undefined') ? props.client_ip : "";
        this.client_port = (typeof props.client_port !== 'undefined') ? props.client_port : 5060;
        this.port = (typeof props.port !== 'undefined') ? props.port : 5060;
        this.username = (typeof props.username !== 'undefined') ? props.username : "";
        this.password = (typeof props.password !== 'undefined') ? props.password : "";
        this.Socket = dgram.createSocket("udp4");
        this.callId = generateCallid();
        this.events = [];
        this.dialogs = [];
        this.transactions = []
        this.message_stack = [];
        return this;
    }

    send(message, identity) {
        identity = (typeof identity !== 'undefined') ? identity : {ip: this.ip, port: this.port};
        message = typeof message.message !== 'undefined' ? message : this.Message(message);
        var constructed_message = typeof message === 'object' ? Builder.Build(message.message) : message;
        return new Promise((resolve) => {
            console.log("_______Constructed Message_______")
            console.log(constructed_message)
            console.log(identity)
            this.Socket.send(constructed_message, 0, constructed_message.length, Number(identity.port), identity.ip, (error) => {
                if (!error) {
                    this.push_to_stack(message);
                }else{
                    console.log(error)
                }
            });
        });
    }

    push_to_stack(message){
        if (typeof this.message_stack[message.branchId] == 'undefined') {
            this.message_stack[message.branchId] = [message];
        } else {
            this.message_stack[message.branchId].push(message);
        }
    }
      
    DialogExists(branchId){
        return Object.keys(this.dialogs).includes(branchId);
    }

    on(event, callback){
        this.events[event] = callback;
    }

    Listen() {
        var ret;
        this.Socket.on('message', (res_message) => {
            console.log("_______Received Message_______")
            res_message = res_message.toString();
            var sipMessage = this.Message(res_message);
            var message_ev = sipMessage.message.isResponse ? String(sipMessage.message.statusCode) : sipMessage.message.method;
            if (Object.keys(this.dialogs).includes(sipMessage.branchId)) {
                if (sipMessage.isResponse) {
                    ret = sipMessage
                } else {
                    if (Object.keys(this.dialogs).includes(sipMessage.branchId)) {
                        var d = this.dialogs[sipMessage.branchId];
                        if (Object.keys(d.events).includes(message_ev)) {
                            d.events[message_ev](sipMessage);
                        }
                        ret = d;
                    }
                }
            }else{
                this.push_to_stack(sipMessage);
                if (Object.keys(this.events).includes(message_ev)) {
                    this.events[message_ev](sipMessage);
                }
                this.Dialog(this.message_stack[sipMessage.branchId][0]).then((dialog) => {
                        ret = dialog;
                })
                
            }
        })
        setInterval(() => {}, 1000);
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

    Transaction(message){
        return new Transaction(this, message);
    }

    Register(){
        return new Promise(resolve => {
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

            this.send(message)

            var d = this.Dialog(message).then(dialog => {
                dialog.on('401', (res) => {
                    var a = message.Authorize(res); //generate authorized message from the original invite request
                    this.send(a)
                })

                dialog.on('200', (res) => {
                    resolve(dialog);
                })
            })
        })
    }

}


module.exports = SIP
