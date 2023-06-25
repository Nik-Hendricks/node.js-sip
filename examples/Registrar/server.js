const SIP = require("../../SIP.js");
const SIPMessage = require("../../SIPMessage.js");
const SDPParser = require("../../SDPParser.js");
const Parser = require("../../Parser.js");
const RTP = require("../../RTP.js");
const MediaStream = require("../../Media.js");
const Builder = require("../../Builder.js");

var contacts = [];

var extensions = {
    '200':'Rob',
    '201':'John',
}


class User{
    constructor(props){
        props = (typeof props !== 'undefined') ? props : {};
        this.username = (typeof props.username !== 'undefined') ? props.username : undefined;
        this.password = (typeof props.password !== 'undefined') ? props.password : undefined;
        this.ip = (typeof props.ip !== 'undefined') ? props.ip : undefined;
        this.port = (typeof props.port !== 'undefined') ? props.port : undefined;
    }
}


class Server{
    constructor(){
        this.SIP = new SIP({type: "server"});
        this.SIP.Socket.bind(6111, "192.168.1.2")
        this.SIP.Listen()
        this.users = [];
    }

    Start(){
        this.SIP.on('REGISTER', (res) => {
            console.log("REGISTER")
            console.log(res.GetAuthCredentials())
            res.message.headers['CSeq'] = `${Parser.getCseq(res.message) + 1} REGISTER`;
            res.message.headers.From = `<sip:NRegistrar@192.168.1.2:6111>;tag=${res.branchId}`
            res.message.headers.Via = `SIP/2.0/UDP 192.168.1.2:6111;branch=${res.branchId}`
            res.message.headers.From = `<sip:NRegistrar@192.168.1.2:6111>;tag=${res.branchId}`
        
            if(res.GetAuthCredentials().error){
                console.log("ERROR")
                res.message.headers['WWW-Authenticate'] = "Digest realm=\"NRegistrar\", nonce=\"1234abcd\" algorithm=\"MD5\"";
                var d = this.SIP.dialog_stack[res.branchId]

                d.on('REGISTER', (res) => {
                    console.log("REGISTER LEVEL 2")

                    if(!res.GetAuthCredentials().error){
                        var contact = res.message.headers.Contact.match(/<sip:(.*)>/)[1];
                        var username = contact.split(":")[0].split("@")[0];
                        var ip = contact.split(":")[0].split("@")[1];
                        var port = contact.split(":")[1].split(">")[0];
                        
                        if(this.users.hasOwnProperty(username)){
                            console.log("USER EXISTS")
                            this.SIP.send(res.CreateResponse(200), res.GetIdentity())
                        }
                    }
                })

                this.SIP.send(res.CreateResponse(401), res.GetIdentity())
            }
        })
        
        this.SIP.on('INVITE', (res) => {
            //extract the extension from the request URI
            
        })
    }

    QueryContact(username){
        for(var i in contacts){
            if(contacts[i].username == username){
                contacts[i].extension = extensions[username];
                return contacts[i];
            }
        }
    }

    AddUser(props){
        var user = new User(props);
        this.users[user.username] = user;
    }
}



var SIPServer = new Server();

SIPServer.Start();
SIPServer.AddUser({username: "Rob", password: "1234"})
SIPServer.AddUser({username: "Tim", password: "1234"})




//receive a call
//Client.on('INVITE', (res) => {
//    console.log("Received INVITE")
//    var d = Client.Dialog(res).then(dialog => {
//        console.log("RESPONSE")
//        dialog.send(res.CreateResponse(100))
//        dialog.send(res.CreateResponse(180))
//        dialog.send(res.CreateResponse(200))
//
//        console.log(res.ParseSDP())
//        
//        dialog.on('BYE', (res) => {
//            console.log("BYE")
//            dialog.send(res.CreateResponse(200))
//            dialog.kill()
//        })
//
//        
//
//    })
//})

//Server.on('INVITE', (res) => {
//    console.log("Received INVITE");
//
//    // Determine the new target location (extension) for redirection
//    var newExtension = `730@${asteriskIP}`;
//    
//    // Create a SIP 302 Moved Temporarily response
//    var redirectResponse = res.CreateResponse(302);
//    redirectResponse.headers.Contact = `<sip:${newExtension}>`;
//
//    // Send the redirect response
//    var d = Client.Dialog(res).then(dialog => {
//        dialog.send(redirectResponse);
//        // Optionally, you can send additional provisional responses (e.g., 180 Ringing) if desired
//        dialog.send(res.CreateResponse(180));
//   
//        dialog.on('BYE', (res) => {
//            console.log("BYE");
//            dialog.send(res.CreateResponse(200));
//            dialog.kill();
//        });
//    });
//});
//
//
//function to make a call
var call = (extension) => {
    var media;
    var message = Client.Message({
        isResponse: false,
        protocol: "SIP/2.0",
        method: "INVITE",
        requestUri: `sip:${extension}@${asteriskDOMAIN}`,
        headers: {
            'Via': `SIP/2.0/UDP ${clientIP}:${clientPort};branch=${Builder.generateBranch()}`,
            'From': `<sip:${username}@${asteriskDOMAIN}>;tag=${Builder.generateBranch()}`,
            'To': `<sip:${extension}@${asteriskDOMAIN}>`,
            'Call-ID': `${Builder.generateBranch()}@${clientIP}`,
            'CSeq': `1 INVITE`,
            'Contact': `<sip:${username}@${clientIP}:${clientPort}>`,
            'Max-Forwards': '70',
            'User-Agent': 'Node.js SIP Library',
            'Content-Type': 'application/sdp',
            'Content-Length': '0'
        },
        body: ''
    })

    Client.send(message)

    var d = Client.Dialog(message).then(dialog => {
        
        
        dialog.on('401', (res) => {
            var a = message.Authorize(res); //generate authorized message from the original invite request
            console.log(`authorize message for ${extension}`)
            dialog.send(a)
        })

        dialog.on('200', (res) => {
            console.log(`200 OK ext: ${extension}`)
            console.log(res.ParseSDP())
            //dialog.send(res.CreateResponse(''))
            console.trace()
            //media.start()
        })

        dialog.on('INVITE', (res) => {
            console.log(`INVITE from ${extension}`)
            console.log(res.ParseSDP())
            //media.start()
        })

        dialog.on('180', (res) => {
            console.log(`Ringing ${extension}`)
        })

        dialog.on('BYE', (res) => {
            console.log(`BYE from ${extension}`)
            var p = {
                extension: username,
                branchId: Parser.getBranch(res),
                callId: Parser.getCallId(res),
                cseq: Parser.getCseq(res),
            }
            var ok_response = Client.Message("200", p).create();
            dialog.send(ok_response.message);
        })
    })
}
