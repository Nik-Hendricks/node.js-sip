const {SIP, SIPMessage} = require("../SIP.js");
const SDPParser = require("../SDPParser.js");
const Parser = require("../Parser.js");
const RTP = require("../RTP.js");
const MediaStream = require("../Media.js");

const asteriskDOMAIN = "64.227.16.15";
const asteriskIP = "64.227.16.15";
const asteriskPort = 6111;
const clientIP = "192.168.1.2";
const clientPort = 6111;
const username = "Rob";
const password = "Marge23";
let callId;


var Client = new SIP(asteriskIP, asteriskPort, username, password);

var initialRequest = Client.Message("REGISTER", {}).create();
Client.Dialog(initialRequest.message).then(dialog => {
    dialog.on('401', (res) => {
        console.log('REGISTER 401')
        var a = initialRequest.Authorize(res); //generate authorized message from the original invite request
        dialog.send(a)
    })

    dialog.on('200', (res) => {
        console.log("REGISTERED")
        //call("420");
        call("69");
    })
})

//receive a call
Client.on('INVITE', (res) => {
    console.log("Received INVITE")
    //create new Invite Message from the received message.
    var invite = Client.Message("INVITE", {branchId: Parser.getBranch(res), callId: Parser.getCallId(res), cseq: Parser.getCseq(res)}).create();
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
            console.log(SDPParser.parse(res.body))
            var p = {
                extension: username,
                branchId: Parser.getBranch(res),
                callId: Parser.getCallId(res),
                cseq: Parser.getCseq(res),
            }

            var ok_response = Client.Message("200", p).create();
            var ringing_response = Client.Message("180", p).create();

            console.log(ringing_response.message);
            dialog.send(ringing_response.message);
            dialog.send(ok_response.message);
        })

    })
})


//function to make a call
var call = (extension) => {
    var media;
    var invite_request = Client.Message("INVITE", {extension:extension}).create();
    Client.Dialog(invite_request.message).then(dialog => {
        dialog.on('401', (res) => {
            var a = invite_request.Authorize(res); //generate authorized message from the original invite request
            console.log(`authorize message for ${extension}`)
            dialog.send(a)
        })

        dialog.on('200', (res) => {
            console.log(`200 OK ext: ${extension}`)
            media = new MediaStream(SDPParser.parse(res.body))
            media.start()
        })

        dialog.on('INVITE', (res) => {
            console.log(`INVITE from ${extension}`)
            media = new MediaStream(SDPParser.parse(res.body))
            media.start()
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