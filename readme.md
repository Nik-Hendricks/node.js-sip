# node.js-sip

**node.js-sip** is a comprehensive VoIP framework for Node.js. Despite its name, this library goes beyond SIP (Session Initiation Protocol) and offers a full-fledged toolkit for building robust VoIP applications. Leverage its extensive capabilities for SIP transport, registration, messaging, call handling, and more.

## Features

- **SIP Transport**: Built-in transport layer supporting UDP.
- **Client and Server Modes**: Easily switch between User Agent Client (UAC) and User Agent Server (UAS).
- **Call Handling**: Initiate, accept, reject, and terminate calls.
- **Message Handling**: Send and receive SIP messages.
- **Customizable**: Built with modularity and extensibility in mind.

## Installation

```bash
npm install node.js-sip
```

## Getting Started

### Basic Usage

Here's a quick example to demonstrate how to set up a client and make a SIP call.

```javascript
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
    register_password:'1234',
    register_ip:'192.168.1.12',
    register_port:5060,
    callId:'1234567890'
}, (d) => {
    console.log(`client_test.js > d.type: ${d.type}`)
    if(d.type == 'REGISTERED'){
        console.log(`REGISTERED`)
        v.uac_init_call({
            to:'1001',
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
```

## API Reference

### Constructor

#### `new VOIP(props, callback)`
- `props`: Configuration object for the VOIP instance.
  - `type`: `'client'` or `'server'`.
  - `transport`: Transport configuration.
    - `type`: `'udp4'` (currently supported).
    - `ip`: Local IP address for the transport.
    - `port`: Port for the transport.
  - `username`: SIP username (for client).
  - `register_password`: SIP password (for client).
  - `register_ip`: Registrar IP (for client).
  - `register_port`: Registrar port (default: `5060`).
- `callback(response)`: Callback invoked on significant events.

## TODO / Known Issues
- Further orginization of the codebase is needed.
- Finish RTP implementation.
- UAS UAC Registrations does not actually check if the password is correct.

### 🔆 Activity

![Alt](https://repobeats.axiom.co/api/embed/aba9ef6e6abee84d7af22ab66a0ab294f23f44ed.svg "Repobeats analytics image")

### 🌟 Star History

<a href="https://star-history.com/#Nik-Hendricks/node.js-sip&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Nik-Hendricks/node.js-sip&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=Nik-Hendricks/node.js-sip&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Nik-Hendricks/node.js-sip&type=Date" />
 </picture>
</a>

## License

MIT License. See the [LICENSE](./LICENSE) file for more details.

---

For detailed usage and advanced configurations, refer to the full documentation (coming soon).

