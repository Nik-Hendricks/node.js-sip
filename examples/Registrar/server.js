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
        this.SIP.Socket.bind(PORT, IP)
        this.SIP.Listen()
        this.users = [];
    }


    Start(){
        this.SIP.AddNATRoute('172.0.3.75', '72.172.213.173')


        this.SIP.on('REGISTER', (res) => {
            console.log("REGISTER")
            res.message.headers['CSeq'] = `${Parser.getCseq(res.message) + 1} REGISTER`;
            res.message.headers.Via = `SIP/2.0/UDP ${IP}:${PORT};branch=${res.branchId}`
            res.message.headers.From = `<sip:NRegistrar@${IP}:${PORT}>;tag=${res.tag}`

            console.log(res.headers)

            if(res.GetAuthCredentials().error){
                res.message.headers['WWW-Authenticate'] = "Digest realm=\"NRegistrar\", nonce=\"1234abcd\" algorithm=\"MD5\"";
                var d = this.SIP.dialog_stack[res.tag]
                d.on('REGISTER', (res) => {
                    console.log("REGISTER LEVEL 2")
                    var username = res.headers.Contact.contact.username
                    if(!res.GetAuthCredentials().error){
                        console.log(username)
                        if(this.users.hasOwnProperty(username)){
                            console.log('USER DOES EXIST')
                            this.users[username].ip = res.headers.Contact.contact.ip
                            this.users[username].port = res.headers.Contact.contact.port;
                            console.log(this.GetMemberRoutes(res).contact.ip)
                            this.SIP.send(res.CreateResponse(200),this.GetMemberRoutes(res).contact)
                        }
                    }
                })

                this.SIP.send(res.CreateResponse(401), {port: res.headers.Contact.contact.port, ip: res.headers.Contact.contact.ip})
            }
        })
        
        this.SIP.on('INVITE', (res) => {
            //extract the extension from the request URI
            console.log("INVITE")

            
            if(res.GetAuthCredentials().error){
                var d = this.SIP.dialog_stack[res.tag]

                d.on('INVITE', (res) => {
                        console.log("INVITE LEVEL 2")
                        var r = this.GetMemberRoutes(res).to
                        var s = this.GetMemberRoutes(res).from
                        console.log(r)
                        if(typeof r.ip !== "undefined" && typeof r.port !== "undefined"){
                            res.message.headers['To'] = `<sip:${r.username}@${r.ip}:${r.port}>`
                            res.message.headers['Via'] = `SIP/2.0/UDP 67.227.16.15:${this.SIP.port};branch=${res.branchId}`
                            this.SIP.send(res.message, r)
                        }else{
                            console.log('user not found')
                            this.SIP.send(res.CreateResponse(404), s)
                        }
                })
    
                d.on('100', (res) => {
                    console.log("100 LEVEL 2")
                    var r = this.GetMemberRoutes(res).from
                    res.message.headers['To'] = `<sip:${r.username}@${r.ip}:${r.port}>`
                    this.SIP.send(res.CreateResponse(100), r)
                })
    
                d.on('180', (res) => {
                    console.log("180 LEVEL 2")
                    var r = this.GetMemberRoutes(res).from
                    res.message.headers['To'] = `<sip:${r.username}@${r.ip}:${r.port}>`
                    this.SIP.send(res.CreateResponse(180), r)
                })
                
                d.on('200', (res) => {
                    console.log("200 LEVEL 2")
                    var r = this.GetMemberRoutes(res).from
                    res.message.headers['To'] = `<sip:${r.username}@${r.ip}:${r.port}>`
                    this.SIP.send(res.CreateResponse(200), r)
                })
                

                d.on('486', (res) => {
                    this.SIP.send(res.CreateResponse(200), this.GetMemberRoutes(res).from)
                })

                res.message.headers['WWW-Authenticate'] = "Digest realm=\"NRegistrar\", nonce=\"1234abcd\" algorithm=\"MD5\"";
                this.SIP.send(res.CreateResponse(401), this.GetMemberRoutes(res).from)
                return;
            }
        })

        this.SIP.on('OPTIONS', (res) => {
            res.message.headers['PISS'] = 'Hack me if you can MF'
            this.SIP.send(res.CreateResponse(200), this.GetMemberRoutes(res).from)
        })
    }

    convertToNumber(str) {
        const num = parseFloat(str);
      
        if (isNaN(num)) {
          return false;
        }
      
        return num;  
    }

    QueryUser(query){
        var ret;
        if(this.convertToNumber(query) !== false){
            ret =  false;
            for(var user in this.users){
                if(Number(this.users[user].extension) == Number(query)){
                    ret = this.users[user];
                }
            }
        }else{
            ret = this.users[query]
        }

        if(ret !== false){
            if(typeof ret.ip !== 'undefined'){
                ret.ip = ret.ip
            }
        }

        return ret;
    }

    GetMemberRoutes(res){
        return {
            contact:(typeof res.headers.Contact !== 'undefined') ? this.QueryUser(res.headers.Contact.contact.username) : false,
            to:this.QueryUser(res.headers.To.contact.username),
            from:this.QueryUser(res.headers.From.contact.username),
        }
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
SIPServer.AddUser({username: "Joe", password: "1234", extension: "69"})
SIPServer.AddUser({username: "Nik", password: "1234", extension: "420"})
