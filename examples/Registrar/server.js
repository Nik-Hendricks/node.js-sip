const SIP = require("../../SIP.js");
const SIPMessage = require("../../SIPMessage.js");
const SDPParser = require("../../SDPParser.js");
const Parser = require("../../Parser.js");
//const RTP = require("../../RTP.js");
//const MediaStream = require("../../Media.js");
const Builder = require("../../Builder.js");

var IP = '64.227.16.15'
var PORT = 5060


class User{
    constructor(props){
        props = (typeof props !== 'undefined') ? props : {};
        this.username = (typeof props.username !== 'undefined') ? props.username : undefined;
        this.password = (typeof props.password !== 'undefined') ? props.password : undefined;
        this.ip = (typeof props.ip !== 'undefined') ? props.ip : undefined;
        this.port = (typeof props.port !== 'undefined') ? props.port : undefined;
        this.extension = (typeof props.extension !== 'undefined') ? props.extension : undefined;
    }
}


class Server{
    constructor(){
        this.SIP = new SIP({type: "server"});
        this.SIP.Socket.bind(PORT, IP)
        this.SIP.Listen()
        this.users = [];
    }

    Start(){
        this.SIP.on('REGISTER', (res) => {
            console.log("REGISTER")
            res.message.headers['CSeq'] = `${Parser.getCseq(res.message) + 1} REGISTER`;
            res.message.headers.Via = `SIP/2.0/UDP ${IP}:${PORT};branch=${res.branchId}`
            res.message.headers.From = `<sip:NRegistrar@${IP}:${PORT}>;tag=${res.tag}`
            if(res.GetAuthCredentials().error){
                res.message.headers['WWW-Authenticate'] = "Digest realm=\"NRegistrar\", nonce=\"1234abcd\" algorithm=\"MD5\"";
                var d = this.SIP.dialog_stack[res.tag]
                d.on('REGISTER', (res) => {
                    console.log("REGISTER LEVEL 2")
                    var username = res.headers.Contact.contact.username
                    if(!res.GetAuthCredentials().error){
                        if(this.users.hasOwnProperty(username)){
                            this.users[username].ip = res.headers.Contact.contact.ip
                            this.users[username].port = res.headers.Contact.contact.port;
                            this.SIP.send(res.CreateResponse(200), res.GetIdentity())
                        }
                    }
                })

                this.SIP.send(res.CreateResponse(401), res.GetIdentity())
            }
        })
        
        this.SIP.on('INVITE', (res) => {
            //extract the extension from the request URI
            console.log("INVITE")
            if(res.GetAuthCredentials().error){
                var d = this.SIP.dialog_stack[res.tag]
                d.on('INVITE', (res) => {
                        console.log("INVITE LEVEL 2")
                        var u = res.headers.To.contact.username;
                        var receiver_identity = this.QueryByExtension(u)
                        var sender_identity = res.GetIdentity()
                        if(typeof receiver_identity.ip !== "undefined" && typeof receiver_identity.port !== "undefined"){
                            res.message.headers['To'] = `<sip:${receiver_identity.username}@${receiver_identity.ip}:${receiver_identity.port}>`
                            //res.message.headers['Via'] = `SIP/2.0/UDP ${receiver_identity.ip}:${receiver_identity.port};branch=${res.branchId}`
                            this.SIP.send(res.message, receiver_identity)
                        }else{
                            console.log('user not found')
                            this.SIP.send(res.CreateResponse(404), sender_identity)
                        }
                })
    
                d.on('100', (res) => {
                    console.log("100 LEVEL 2")
                    var u = res.headers.To.contact.username;
                    var receiver_identity = this.QueryByExtension(u)
                    res.message.headers['To'] = `<sip:${receiver_identity.username}@${receiver_identity.ip}:${receiver_identity.port}>`
                    this.SIP.send(re7200s.CreateResponse(100), receiver_identity)
                })
    
                d.on('180', (res) => {
                    console.log("180 LEVEL 2")
                    var u = res.headers.To.contact.username;
                    var receiver_identity = this.QueryByExtension(u)
                    res.message.headers['To'] = `<sip:${receiver_identity.username}@${receiver_identity.ip}:${receiver_identity.port}>`
                    this.SIP.send(res.CreateResponse(180), this.QueryByExtension(u))
                })
                
                d.on('200', (res) => {
                    console.log("200 LEVEL 2")
                    var u = res.headers.To.contact.username;
                    var receiver_identity = this.QueryByExtension(u)
                    res.message.headers['To'] = `<sip:${receiver_identity.username}@${receiver_identity.ip}:${receiver_identity.port}>`
                    this.SIP.send(res.CreateResponse(200), this.QueryByExtension(u))
                })
                

                d.on('486', (res) => {
                    this.SIP.send(res.CreateResponse(200), res.GetIdentity())
                })

                res.message.headers['WWW-Authenticate'] = "Digest realm=\"NRegistrar\", nonce=\"1234abcd\" algorithm=\"MD5\"";
                this.SIP.send(res.CreateResponse(401), res.GetIdentity())
                return;
            }
        })

        this.SIP.on('OPTIONS', (res) => {
            res.message.headers['KYS'] = 'Hack me if you can MF'
            this.SIP.send(res.CreateResponse(200), res.GetIdentity())
        })
    }

    QueryByExtension(extension){
        for(var user in this.users){
            if(Number(this.users[user].extension) == Number(extension)){
                return this.users[user];
            }
        }
        return false;
    }

    AddUser(props){
        var user = new User(props);
        this.users[user.username] = user;
    }
}



var SIPServer = new Server();

SIPServer.Start();
SIPServer.AddUser({username: "Rob", password: "1234", extension: "200"})
SIPServer.AddUser({username: "Tim", password: "1234", extension: "201"})


