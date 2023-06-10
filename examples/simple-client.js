const {SIP, SIPMessage} = require("../SIP.js");

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

Client.createDialog(initialRequest).then(dialog => {
    dialog.on('401', (res) => {
        console.log('REGISTER 401')
        var a = Client.AuthorizeMessage(initialRequest, res);
        dialog.send(a)
    })

    dialog.on('200', (res) => {
        console.log("REGISTERED")
        //call("420");
        call("69");
        //call("14173620296")
    })
})


Client.on('INVITE', (res) => {
    console.log("Received INVITE")
    var parsedMessage = Parser.parse(res);

    // create new dialog with the returned message.
    //var dialog = new Dialog({context: Client, initialRequest: res}).then(dialog => {
    //    
    //})
})


var call = (extension) => {
    var invite_request = new SIPMessage(Client, "INVITE", {extension:extension}).create();
    Client.createDialog(invite_request).then(dialog => {
        dialog.on('401', (res) => {
            var a = Client.AuthorizeMessage(invite_request, res); //generate authorized message from the original invite request
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