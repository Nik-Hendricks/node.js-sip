const os = require('os');
const SIP = require("../../SIP.js");
const SIPMessage = require("../../SIPMessage.js");
const SDPParser = require("../../SDPParser.js");
const Parser = require("../../Parser.js");
const Builder = require("../../Builder.js");
const FixNat = require('./FixNat.js')
const UTILS = require('../../UTILS.js')
const WebAPI = require('../WebAPI/WebAPI.js')

class User{
    constructor(props){
        props = (typeof props !== 'undefined') ? props : {};
        this.username = (typeof props.username !== 'undefined') ? props.username : undefined;
        this.password = (typeof props.password !== 'undefined') ? props.password : undefined;
        this.ip = (typeof props.ip !== 'undefined') ? props.ip : undefined;
        this.port = (typeof props.port !== 'undefined') ? props.port : undefined;
        this.extension = (typeof props.extension !== 'undefined') ? props.extension : undefined;
    }

    toJSON() {
        return {
          username: (typeof this.username == 'undefined') ? "" : this.username, 
          password: (typeof this.password == 'undefined') ? "" : this.password,
          ip: (typeof this.ip == 'undefined') ? "" : this.ip,
          port: (typeof this.port == 'undefined') ? "" : this.port,
          extension: (typeof this.extension == 'undefined') ? "" : this.extension
        };
    }
}


class Server{
    constructor(){
        this.IP = UTILS.getLocalIpAddress();
        this.PORT = 5060;
        this.SIP = new SIP({listen_ip: this.IP, listen_port: this.PORT});
        this.users = [];
        this.adminPanel = new WebAPI(this)
        this.adminPanel.start();
        this.sip_trunks = []

    }

    Start(){
        this.SIP.AddNATRoute('172.0.3.75', '72.172.213.173');
        this.SIP.ONMESSAGE((ev) => {
            console.log("-----------Received Message-----------")
            var m = Parser.parse(ev)
            console.log(ev)
            //if(typeof m.method !== 'undefined'){
            //    if(m.method == 'REGISTER'){
            //        console.log(ev)
            //    }
            //}
        })

        this.SIP.ONSENDMESSAGE((ev) => {
            ev = JSON.parse(ev)
            console.log(`-----------Sent Message to ${ev.identity.ip}:${ev.identity.port}-----------`)
            var m = Parser.parse(ev.message)
            console.log(ev.message)
            //if(typeof m.method !== 'undefined'){
            //    if(m.method == 'REGISTER'){
            //        console.log(ev.message)
            //    }
            //}
            //if(typeof m.statusCode !== 'undefined'){
            //    if(m.statusCode == 401){
            //        console.log(ev.message)
            //    }
            //}
        })

        this.SIP.on('REGISTER', (res) => {
            console.log('first register')
            if(res.GetAuthCredentials().error || !this.SIP.DialogExists(res.tag)){
                res.message.headers['CSeq'] = `${Parser.getCseq(res.message) + 1} REGISTER`;
                res.message.headers['WWW-Authenticate'] = "Digest realm=\"NRegistrar\", nonce=\"1234abcd\", algorithm=\"MD5\"";
                var d = this.SIP.dialog_stack[res.tag]
                d.on('REGISTER', (res) => {
                    console.log('second register')
                    //handle second register
                    var username = res.headers.Contact.contact.username
                    if(!res.GetAuthCredentials().error && this.users.hasOwnProperty(username)){
                            this.users[username].ip = res.headers.Contact.contact.ip
                            this.users[username].port = res.headers.Contact.contact.port;
                            this.SIP.send(res.CreateResponse(200),this.GetMemberRoutes(res).contact)
                    }else{
                        this.SIP.send(res.CreateResponse(401), {port: res.headers.Contact.contact.port, ip: res.headers.Contact.contact.ip})
                    }
                })
                this.SIP.send(res.CreateResponse(401), {port: res.headers.Contact.contact.port, ip: res.headers.Contact.contact.ip})
            }
        })
        
        this.SIP.on('INVITE', (res) => {
            if(res.GetAuthCredentials().error){
                var d = this.SIP.dialog_stack[res.tag]
                
                d.on('INVITE', (res) => {
                        var r = this.GetMemberRoutes(res).to
                        var s = this.GetMemberRoutes(res).from
                        console.log(this.ResolveRoute(res))
                        if(typeof s.ip == "undefined" && typeof s.port == "undefined"){
                            console.log(res.headers)
                            this.SIP.send(res.CreateResponse(404, {message: 'Not Registered'}), res.headers.Via.uri)
                        }else if(typeof r.ip !== "undefined" && typeof r.port !== "undefined"){
                            this.SIP.send(res.message, r)
                        }else{
                            this.SIP.send(res.CreateResponse(404), s)
                        }
                })
    
                d.on('100', (res) => {
                    //console.log("100 LEVEL 2")
                    var r = this.GetMemberRoutes(res).from
                    //res.message.headers['To'] = `<sip:${r.username}@${r.ip}:${r.port}>`
                    this.SIP.send(res.CreateResponse(100), r)
                })
    
                d.on('180', (res) => {
                    console.log("180 LEVEL 2")
                    var r = this.GetMemberRoutes(res).from
                    //res.message.headers['To'] = `<sip:${r.username}@${r.ip}:${r.port}>`
                    this.SIP.send(res.CreateResponse(180), r)
                })
                
                d.on('200', (res) => {
                    console.log("200 LEVEL 2")
                    var r = this.GetMemberRoutes(res).from
                    //res.message.headers['To'] = `<sip:${r.username}@${r.ip}:${r.port}>`
                    this.SIP.send(res.CreateResponse(200), r)
                })
                
                d.on('302', (res) => {
                    console.log("302 LEVEL 2")
                    var r = this.GetMemberRoutes(res).from
                    //res.message.headers['To'] = `<sip:${r.username}@${r.ip}:${r.port}>`
                    this.SIP.send(res.CreateResponse(302), r)
                })
                
                d.on('486', (res) => {
                    this.SIP.send(res.CreateResponse(486), this.GetMemberRoutes(res).from)
                })

                d.on('CANCEL', (res) => {
                    this.SIP.send(res.message, this.GetMemberRoutes(res).to)
                })

                res.message.headers['WWW-Authenticate'] = "Digest realm=\"NRegistrar\", nonce=\"1234abcd\" algorithm=\"MD5\"";
                this.SIP.send(res.CreateResponse(401), this.GetMemberRoutes(res).from)
                return;
            }
        })
    }

    AddTrunk(name, credentials){
        var s = new SIP({ip: credentials.ip, port: credentials.port, listen_ip: UTILS.getLocalIpAddress(), listen_port: 5555})
        s.Register({username:credentials.username, password: credentials.password}).then(res => {
            console.log(res)
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

        if(ret !== false || ret.ip !== undefined){
            ret.ip = ret.ip
        }

        return ret;
    }

    ResolveRoute(res){
        var dialed_number = res.headers.To.contact.username
        if(dialed_number.length == '10'){

        }


        return dialed_number
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
SIPServer.AddUser({username: "Billy", password: "1234", extension: "202"})
SIPServer.AddUser({username: 'ADMIN', passwod:' 1234', extension: '1000'})
SIPServer.AddTrunk('callcentric', {username: '17778021863', password: '@5S4i8702a', ip:'sip.callcentric.net', port:5060})