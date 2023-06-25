const SIP = require("../../SIP.js");
const SIPMessage = require("../../SIPMessage.js");
const SDPParser = require("../../SDPParser.js");
const Parser = require("../../Parser.js");
//const RTP = require("../../RTP.js");
//const MediaStream = require("../../Media.js");
const Builder = require("../../Builder.js");
const FixNat = require('./FixNat.js')

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
        this.FixNat = new FixNat();
        this.SIP.Socket.bind(PORT, IP)
        this.SIP.Listen()
        this.users = [];
    }


    Start(){
        this.FixNat.AddRoute('172.0.3.75', '72.172.213.173')


        this.SIP.on('REGISTER', (res) => {
            console.log("REGISTER")
            res.message.headers['CSeq'] = `${Parser.getCseq(res.message) + 1} REGISTER`;
            res.message.headers.Via = `SIP/2.0/UDP ${IP}:${PORT};branch=${res.branchId}`
            res.message.headers.From = `<sip:NRegistrar@${IP}:${PORT}>;tag=${res.tag}`

            var sender_identity = res.GetIdentity()

            sender_identity.ip = this.FixNat.GetRoute(sender_identity.ip)

            console.log(this.GetRoutes(res))



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
                            this.SIP.send(res.CreateResponse(200), this.GetRoutes(res).sender)
                        }
                    }
                })
                this.SIP.send(res.CreateResponse(401), this.GetRoutes(res).sender)
            }
        })
        
        this.SIP.on('INVITE', (res) => {
            //extract the extension from the request URI
            console.log("INVITE")

            
            if(res.GetAuthCredentials().error){
                var s = this.GetRoutes(res).sender
                var d = this.SIP.dialog_stack[res.tag]
                d.on('INVITE', (res) => {
                        console.log("INVITE LEVEL 2")
                        var r = this.GetRoutes(res).receiver
                        var s = this.GetRoutes(res).sender

                        if(typeof r.ip !== "undefined" && typeof r.port !== "undefined"){
                            res.message.headers['To'] = `<sip:${r.username}@${r.ip}:${r.port}>`
                            //res.message.headers['Via'] = `SIP/2.0/UDP ${receiver_identity.ip}:${receiver_identity.port};branch=${res.branchId}`
                            this.SIP.send(res.message, r)
                        }else{
                            console.log('user not found')
                            this.SIP.send(res.CreateResponse(404), s)
                        }
                })
    
                d.on('100', (res) => {
                    console.log("100 LEVEL 2")
                    var r = this.GetRoutes(res).receiver
                    res.message.headers['To'] = `<sip:${r.username}@${r.ip}:${r.port}>`
                    this.SIP.send(res.CreateResponse(100), r)
                })
    
                d.on('180', (res) => {
                    console.log("180 LEVEL 2")
                    var r = this.GetRoutes(res).receiver
                    res.message.headers['To'] = `<sip:${r.username}@${r.ip}:${r.port}>`
                    this.SIP.send(res.CreateResponse(180), r)
                })
                
                d.on('200', (res) => {
                    console.log("200 LEVEL 2")
                    var r = this.GetRoutes(res).receiver
                    res.message.headers['To'] = `<sip:${r.username}@${r.ip}:${r.port}>`
                    this.SIP.send(res.CreateResponse(200), r)
                })
                

                d.on('486', (res) => {
                    var s = this.GetRoutes(res).sender
                    this.SIP.send(res.CreateResponse(200), s)
                })

                res.message.headers['WWW-Authenticate'] = "Digest realm=\"NRegistrar\", nonce=\"1234abcd\" algorithm=\"MD5\"";
                this.SIP.send(res.CreateResponse(401), s)
                return;
            }
        })

        this.SIP.on('OPTIONS', (res) => {
            res.message.headers['KYS'] = 'Hack me if you can MF'
            this.SIP.send(res.CreateResponse(200), s)
        })
    }

    GetRoutes(res){
        var receiver_identity = this.QueryByExtension(res.headers.To.contact.username)
        if(receiver_identity !== false){
            receiver_identity.ip = this.FixNat.GetRoute(receiver_identity.ip)
        }
        var sender_identity = res.GetIdentity()
        sender_identity.ip = this.FixNat.GetRoute(sender_identity.ip)
        return {sender: sender_identity, receiver: receiver_identity}
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


