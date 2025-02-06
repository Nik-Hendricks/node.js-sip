const VOIP = require('../index.js')
const utils = require('../utils.js')
const SIP = require('../SIP/index.js')

//made up port to recieve audio
var receive_port = 5000
var call_id = '1234567890' + Math.floor(Math.random() * 100000000)

var v = new VOIP({
    type:'client',
    transport:{
        type: 'udp4',
        port: 5060,
    },
    username:'1111',
    register_password:'rootPassword',
    register_ip:'192.168.1.12',
    register_port:5060,
    callId:'1234567890'
}, (d) => {
    console.log(`client_test.js > d.type: ${d.type}`)
    console.log(d)
    if(d.type == 'REGISTERED'){
        console.log(`REGISTERED`)
        v.uac_init_call({
            to:'1002',
            ip:'192.168.1.2',
            port:'5050',
            callId:call_id,
            username:'1111',
            branch: SIP.Builder.generateBranch(),
            from_tag: SIP.Builder.generateTag(),
            client_callback:(m) => {
                console.log(`client_callback`)
                console.log(m)
                let parsed_headers = SIP.Parser.ParseHeaders(m.message.headers)
                console.log(parsed_headers)
                //when we recieve a 200 OK we send a 200 OK back
                if(m.message.statusCode == 200){
                    v.send(v.response({
                        isResponse: true,
                        statusCode: 200,
                        statusText: 'OK',
                        headers: parsed_headers,
                        body: ` v=0 
                                o=Z 0 ${call_id} IN IP4 ${utils.getLocalIpAddress()}
                                s=Z
                                c=IN IP4 ${utils.getLocalIpAddress()}
                                t=0 0
                                m=audio ${receive_port} RTP/AVP 106 9 98 101 0 8 3
                                a=rtpmap:106 opus/48000/2
                                a=fmtp:106 sprop-maxcapturerate=16000; minptime=20; useinbandfec=1
                                a=rtpmap:98 telephone-event/48000
                                a=fmtp:98 0-16
                                a=rtpmap:101 telephone-event/8000
                                a=fmtp:101 0-16
                                a=sendrecv
                                a=rtcp-mux`.replace(/^[ \t]+/gm, ''),
                    }))
                
                }else if(m.message.method == 'BYE'){
                    console.log(`BYE`)
                    v.send(v.response({
                        isResponse: true,
                        statusCode: 200,
                        statusText: 'OK',
                        headers: parsed_headers,
                        body: '',
                    }))
                }

            }
        })
    }else if(d.type == 'REGISTER_FAILED'){
        console.log(`REGISTER_FAILED`)
        console.log(d.message)
    }
})
