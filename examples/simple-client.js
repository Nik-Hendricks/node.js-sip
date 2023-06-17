const SIP = require("../SIP.js");
const SIPMessage = require("../SIPMessage.js");
const SDPParser = require("../SDPParser.js");
const Parser = require("../Parser.js");
const RTP = require("../RTP.js");
const MediaStream = require("../Media.js");
const Builder = require("../Builder.js");
require('dotenv').config({ path: 'CONFIG.env' });

const asteriskDOMAIN = process.env.ASTERISK_DOMAIN;
const asteriskIP = process.env.ASTERISK_IP;
const asteriskPort = process.env.ASTERISK_PORT;
const clientIP = process.env.CLIENT_IP;
const clientPort = process.env.CLIENT_PORT;
const username = process.env.USERNAME;
const password = process.env.PASSWORD;
let callId;

console.log(username)
console.log(asteriskIP)
console.log(asteriskPort)
var Client = new SIP(asteriskIP, asteriskPort, username, password);

Client.Register().then(dialog => {
    console.log("REGISTERED")
    call("69");
})

//receive a call
Client.on('INVITE', (res) => {
    console.log("Received INVITE")
    //create new Invite Message from the received message.
    console.log(res)
    var invite = Client.Message("INVITE", {branchId: res.branchId, callId: res.callId, cseq: res.cseq_count}).create();
    //create new dialog with the returned message.
    var call_dialog = Client.Dialog(invite.message).then(dialog => {
        dialog.on('401', (res) => {
            console.log('INVITE 401')
            var a = invite.Authorize(res); //generate authorized message from the original invite request
            dialog.send(a)
        })

        dialog.on('200', (res) => {
            console.log('INVITE 200')
        })

        dialog.on('INVITE', (res) => {
            //create all the parameters to keep send messages within the same dialog.
            var p = {
                extension: username,
                branchId: Parser.getBranch(res),
                callId: Parser.getCallId(res),
                cseq: Parser.getCseq(res),
                cseq_method: Parser.getResponseType(res),
            }

            console.log(res.CreateResponse(100))
        })

    })
})


//function to make a call
var call = (extension) => {
    var media;
    //var invite_request = Client.Message("INVITE", {extension:extension}).create();

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

    Client.Dialog(message).then(dialog => {
        
        
        dialog.on('401', (res) => {
            var a = message.Authorize(res); //generate authorized message from the original invite request
            console.log(`authorize message for ${extension}`)
            dialog.send(a)
        })

        dialog.on('200', (res) => {
            console.log(`200 OK ext: ${extension}`)
            console.log(res.ParseSDP())
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