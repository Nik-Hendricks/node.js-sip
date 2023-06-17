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


const generateCallid = () => {
  const branchId = Math.floor(Math.random() * 10000000000000);
  return `${branchId}`;
};


class Listener{
    constructor(){
        
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
        this.events = [];
        this.dialogs = [];
        this.transactions = []
        this.message_stack = [];
        return this;
    }

    send(message) {
        message = typeof message.message !== 'undefined' ? message : this.Message(message);
        var constructed_message = typeof message === 'object' ? Builder.Build(message.message) : message;
        return new Promise((resolve, reject) => { // Add reject parameter
            console.log("_______Constructed Message_______")
            console.log(constructed_message)
            this.Socket.send(constructed_message, 0, constructed_message.length, this.port, this.ip, (error) => {
                if (!error) {
                    if (typeof this.message_stack[message.branchId] == 'undefined') {
                        this.message_stack[message.branchId] = [message];
                    } else {
                        this.message_stack[message.branchId].push(message);
                    }
                }
            });
        });
    }
      
    DialogExists(branchId){
        return Object.keys(this.dialogs).includes(branchId);
    }

    on(event, callback){
        this.events[event] = callback;
    }

    Listen() {
        return new Promise((resolve) => {
            this.Socket.on('message', (res_message) => {
                res_message = res_message.toString();
                var sipMessage = this.Message(res_message);
                var message_ev = sipMessage.message.isResponse ? String(sipMessage.message.statusCode) : sipMessage.message.method;
                if (Object.keys(this.dialogs).includes(sipMessage.branchId)) {
                    if (sipMessage.isResponse) {
                        resolve(sipMessage);
                    } else {
                        if (Object.keys(this.dialogs).includes(sipMessage.branchId)) {
                            var d = this.dialogs[sipMessage.branchId];
                            if (Object.keys(d.events).includes(message_ev)) {
                                d.events[message_ev](sipMessage);
                            }
                            resolve(d);
                        }
                    }
                }else{
                    if (typeof this.message_stack[sipMessage.branchId] == 'undefined') {
                        this.message_stack[sipMessage.branchId] = [sipMessage];
                    } else {
                        this.message_stack[sipMessage.branchId].push(sipMessage);
                    }
                    if (Object.keys(this.events).includes(message_ev)) {
                        this.events[message_ev](sipMessage);
                    }
                    this.Dialog(this.message_stack[sipMessage.branchId][0]).then((dialog) => {
                            resolve(dialog);
                    })
                    
                }
            })
        });
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
