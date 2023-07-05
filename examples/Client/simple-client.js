const SIP = require("../../SIP.js");
const SIPMessage = require("../../SIPMessage.js");
const SDPParser = require("../../SDPParser.js");
const Parser = require("../../Parser.js");
const Builder = require("../../Builder.js");
const STREAMER = require("./Stream.js")
const RTPListen = require("./RTPListen.js")
const Converter = require("./Converter.js")
require('dotenv').config({ path: 'CONFIG.env' });

const asteriskDOMAIN = process.env.ASTERISK_DOMAIN;
const asteriskIP = process.env.ASTERISK_IP;
const asteriskPort = process.env.ASTERISK_PORT;
const clientIP = process.env.CLIENT_IP;
const clientPort = process.env.CLIENT_PORT;
const username = process.env.USERNAME;
const password = process.env.PASSWORD;
let callId;
var Client = new SIP({ip: asteriskIP, port: asteriskPort, username: username, password: password, client_ip: clientIP, client_port: clientPort})

Client.Socket.bind(clientPort, clientIP)


//should make transaction and dialog objects just behaviors of the SIP class.
//you can use either one to send SIP messages.





Client.Listen();

Client.Register().then(dialog => {
    console.log("REGISTERED")
    //call('200')
    new Converter().convert('test2.mp3', 'output.wav','ulaw').then(() => {
        console.log('Conversion complete')
    })
})

//receive a call
Client.on('INVITE', (res) => {
    console.log("Received INVITE")
    var d = Client.Dialog(res).then(dialog => {

        dialog.send(res.CreateResponse(100))
        dialog.send(res.CreateResponse(180))

        var port = SDPParser.parse(res.message.body).media[0].port
        var ip = SDPParser.parse(res.message.body).session.origin.split(' ')[5]
        var s = new STREAMER('output.wav', ip, port, 'ulaw')

        //monitor()

        s.start().then(sdp => {
            var ok = res.CreateResponse(200)
            ok.body = sdp
            dialog.send(ok)
        })

        dialog.on('BYE', (res) => {
            console.log("BYE")
            dialog.send(res.CreateResponse(200))
            dialog.kill()
        })
    })
})



function monitor(){
    //var s2 = new STREAMER('output.wav', '192.168.1.3', 12342, 'ulaw')

    var test_sdp = `v=0
o=- 0 0 IN IP4 192.168.1.3
s=Stream from Node.js
c=IN IP4 192.168.1.3
t=0 0
a=tool:libavformat 58.29.100
m=audio 12420 RTP/AVP 0
b=AS:64`

    //s2.start()
    var l = new RTPListen(test_sdp)
    l.start()

}

//Client.on('INVITE', (res) => {
//    console.log("Received INVITE");
//
//    // Determine the new target location (extension) for redirection
//    var newExtension = `420@${asteriskIP}`;
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
            dialog.send(res.CreateResponse(200))
        })

        dialog.on('INVITE', (res) => {
            console.log(`INVITE from ${extension}`)
            //media.start()
        })

        dialog.on('180', (res) => {
            console.log(`Ringing ${extension}`)
        })
    })
}

//setInterval(() => {
//    console.log("____ CLIENT DIALOGS ____\n\n")
//    console.log(Client.dialog_stack)
//    console.log("\n\n")
//    console.log("____ CLIENT TRANSACTIONS ____\n\n")
//    console.log(Client.transactions)
//}, 5000);