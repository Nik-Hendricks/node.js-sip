const SIP = require("../../SIP.js");
const SIPMessage = require("../../SIPMessage.js");
const SDPParser = require("../../SDPParser.js");
const Parser = require("../../Parser.js");
const Builder = require("../../Builder.js");
const STREAMER = require("./Stream.js")
const RTPListen = require("./RTPListen.js")
const Converter = require("./Converter.js")
const UTILS = require("../../UTILS.js")

const asteriskDOMAIN = '192.168.2.63';
const asteriskIP = '192.168.2.63';
const asteriskPort = 5060;
const clientIP = UTILS.getLocalIpAddress();
const clientPort = 6420
const username = 'Tim'
const password = '1234';
let callId;
var Client = new SIP({ip: asteriskIP, port: asteriskPort, username: username, password: password, client_ip: clientIP, client_port: clientPort})

Client.Socket.bind(clientPort, clientIP)


//should make transaction and dialog objects just behaviors of the SIP class.
//you can use either one to send SIP messages.



var call_listeners = []


Client.Listen();

Client.Register().then(dialog => {
    console.log("REGISTERED")
    //call('200')
    new Converter().convert('song.mp3', 'output_song.wav','ulaw').then(() => {
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
        var s = new STREAMER('output_song.wav', ip, port, 'ulaw')

        

        s.start(res.message.headers['User-Agent']).then(sdp => {
            var ok = res.CreateResponse(200)
            ok.body = sdp
            dialog.send(ok)
            new_listener('test', 21214);
        })

        dialog.on('BYE', (res) => {
            console.log("BYE")
            res.message.headers['Cseq'] = res.message.headers['Cseq'].split(' ')[0] + ' BYE'
            dialog.send(res.CreateResponse(200))
            dialog.kill()
        })

        dialog.on('CANCEL', (res) => {
            console.log(`CANCEL from ${res.headers.From.contact.username} at: ${res.headers.From.contact.ip}:${res.headers.From.contact.port}`)
            dialog.send(res.CreateResponse(200))
        })
    })
})

function new_listener(id, port){
    var test_sdp = `
v=0
o=- 0 0 IN IP4 ${UTILS.getLocalIpAddress()}
s=Stream from Node.js
c=IN IP4 ${UTILS.getLocalIpAddress()}
t=0 0
a=tool:libavformat 58.29.100
m=audio ${port} RTP/AVP 0
b=AS:64`
    call_listeners[id] = new RTPListen(test_sdp)
    call_listeners[id].start()
}


//Client.on('INVITE', (res) => {
//    console.log("Received INVITE");
//
//    // Determine the new target location (extension) for redirection
//    var newExtension = `202@${asteriskIP}`;
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
