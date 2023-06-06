const dgram = require("dgram");
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

    listen(){
        this.Socket.on("message", (message) => {
            var response = message.toString();
            var type = Parser.getResponseType(response);
            if(this.Events.length > 0){
                this.Events.forEach(event => {
                    if(event.event == type){
                        //console.log(Parser.parse(response));
                        event.callback(Parser.parse(response));
                    }
                })
            }
        })
    }

    on(event, callback){
        this.Events.push({event: event, callback: callback});
    }

    start(){
        return new Promise(resolve => {
            this.listen();
            var register_transaction = new SIPTransaction(this, "REGISTER", {}).create();
            this.send(register_transaction).then(response => {
                if(!response.error){
                    this.on("482", (res) => {
                        console.log("Loop Detected")
                        console.log(res)
                    })

                    this.on("401", (res) => {
                        console.log("401 Unauthorized")
                        console.log(res)
                        var cseq = res.headers.CSeq;
                        var req;
                        if(cseq == "1 REGISTER"){
                            if (res.headers['WWW-Authenticate']) {
                                var parsed_params = Parser.extractHeaderParams(res.headers['WWW-Authenticate']);
                                this.realm = parsed_params.realm;
                                this.nonce = parsed_params.nonce;                     
                                req = new SIPTransaction(this, "REGISTER", {}).create();
                            }
                        }else if (cseq == "1 INVITE"){
                            if (res.headers['WWW-Authenticate']) {
                                var parsed_params = Parser.extractHeaderParams(res.headers['WWW-Authenticate']);
                                this.realm = parsed_params.realm;
                                this.nonce = parsed_params.nonce;                  
                                req = new SIPTransaction(this, "INVITE", {extension:"420"}).create();            
                            }
                        }

                        this.send(req).then(res => {
                                    
                        })

                    })

                    this.on("200", (res) => {
                        var cseq = res.headers.CSeq;
                        if(cseq.includes("REGISTER")){
                            this.nonce = "";
                            this.realm = "";
                            console.log("REGISTERED")

                        }else if(cseq.includes("INVITE")){
                            console.log("INVITED")
                        }
                        resolve({context: this, 'success':'success'})
                    })

                    this.on('180', (res) => {
                        console.log("Ringing")
                    })

                    this.on("INVITE", (res) => {
                        console.log(res);
                    })

                    this.on("NOTIFY", (res) => {
                        //console.log(res);
                        this.send('SIP/2.0 200 OK\r\n\r\n')
                    })

                } else {
                    resolve({context: this, 'error': res.error})
                }
            })
        })
    }
}

new SIP(asteriskIP, asteriskPort, username, password).start().then(res => {

    var invite_request = new SIPTransaction(res.context, "INVITE", {extension:"420"}).create();


    //want to make syntax like this

    //


    console.log(invite_request)
    res.context.send(invite_request).then(res => {
        
    })
});