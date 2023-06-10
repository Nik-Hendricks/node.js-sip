const {SIP, SIPMessage} = require("../SIP.js");
const Parser = require("../Parser.js");
const asteriskDOMAIN = "64.227.16.15";
const asteriskIP = "64.227.16.15";
const asteriskPort = 6111;
const clientIP = "192.168.1.2";
const clientPort = 6111;
const username = "Rob";
const password = "Marge23";
let callId;

var Client = new SIP(asteriskIP, asteriskPort, username, password);

var initialRequest = new SIPMessage(Client, "REGISTER", {}).create();
Client.Dialog(initialRequest.message).then(dialog => {
    dialog.on('401', (res) => {
        console.log('REGISTER 401')
        var a = initialRequest.Authorize(res); //generate authorized message from the original invite request
        dialog.send(a)
    })

    dialog.on('200', (res) => {
        console.log("REGISTERED")
        //call("420");
        //call("69");
        //call("14173620296")
    })
})


Client.on('INVITE', (res) => {
    console.log("Received INVITE")
    //create new Invite Message from the received message.
    var invite = new SIPMessage(Client, "INVITE", {branchId: Parser.getBranch(res), callId: Parser.getCallId(res), cseq: Parser.getCseq(res)}).create();
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
            console.log(res.body)
            var ok_response = new SIPMessage(Client, "200", {branchId: Parser.getBranch(res), callId: Parser.getCallId(res), cseq: Parser.getCseq(res)}).create();
            dialog.send(ok_response.message);
        })

    })
})


var call = (extension) => {
    var invite_request = new SIPMessage(Client, "INVITE", {extension:extension}).create();
    Client.Dialog(invite_request.message).then(dialog => {
        dialog.on('401', (res) => {
            var a = invite_request.Authorize(res); //generate authorized message from the original invite request
            console.log(`authorize message for ${extension}`)
            dialog.send(a)
        })

        dialog.on('200', (res) => {
            console.log(`Answered ${extension}`)
        })

        dialog.on('180', (res) => {
            console.log(`Ringing ${extension}`)
        })
    })
}