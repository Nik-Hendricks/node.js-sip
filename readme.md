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
const VOIP = require('node.js-sip');

const voipClient = new VOIP({
    type: 'client',
    transport: {
        type: 'UDP',
        port: 5060,
    },
    username: '1000',
    register_password: 'yourPassword',
    register_ip: '192.168.1.2',
    register_port: 5060,
}, (response) => {
    if (response.type === 'REGISTERED') {
        console.log('Successfully registered with the SIP server.');
        v.call({
            to:'14444444444',
            ip:'192.168.1.12',
            port:'5060',
            callId:'1234567890',
            username:'1001',
            client_callback:(m) => {
                console.log(`client_callback`)
                console.log(m)
            }
        })
    }
});
```

### Setting Up a SIP Server

```javascript
//Nik Hendricks 10/13/23
const SIP = require('../SIP')
const VOIP = require('../')

const USERS = {
    '1000':{
        password:'rootPassword',
        name:'test testerson',
        ip:undefined,
        port:undefined,
        registered:false,
        call_id:undefined,  
        extension: '1000'
    },
    '1001':{
        password:'rootPassword',
        name:'Bill Billerson',
        ip:undefined,
        port:undefined,
        registered:false,
        call_id:undefined,  
        extension: '1001'
    }
}


var server = new VOIP({
    type:'server',
    transport:{
        type: 'UDP',
        port: 5060,
    },
},
(d) => {
    if(d.type == 'UAS_READY'){
    }else if(d.message !== undefined){
        let parsed_headers = SIP.Parser.ParseHeaders(d.message.headers);
        if(d.type == 'REGISTER'){
            server.uas_handle_registration(d.message, USERS, (response) => {
                console.log('response')
                console.log(response)
            })
        }else if(d.type == 'INVITE'){
            server.uas_handle_invite(d.message, USERS, (response) => {
                console.log('response')
                console.log(response)
            })
            
        }
    }
})

server.TrunkManager.addTrunk({
    name:'trunk1',
    type:'SIP',
    username:'1001',
    password:'rootPassword',
    ip:'192.168.1.2',
    port:5060,
    callId:'1234567890'
})

server.Router.addRoute({
    name: 'Main Trunk Route',
    type: 'trunk',
    match: '^[0-9]{11}$',
    endpoint: 'trunk:trunk1', //will decide if i want the prefix or to use the type property
})

setTimeout(() => {
    server.TrunkManager.trunks['trunk1'].register();
}, 1000)
```

## API Reference

### Constructor

#### `new VOIP(props, callback)`
- `props`: Configuration object for the VOIP instance.
  - `type`: `'client'` or `'server'`.
  - `transport`: Transport configuration.
    - `type`: `'UDP'` (currently supported).
    - `ip`: Local IP address for the transport.
    - `port`: Port for the transport.
  - `username`: SIP username (for client).
  - `register_password`: SIP password (for client).
  - `register_ip`: Registrar IP (for client).
  - `register_port`: Registrar port (default: `5060`).
- `callback(response)`: Callback invoked on significant events.

### Methods

#### `call(props)`
Initiates a SIP call.
- `props`: Call properties.
  - `to`: Destination phone number.
  - `ip`: Destination IP address.
  - `port`: Destination port.
  - `callId`: Call ID.
  - `username`: SIP username.
  - `client_callback`: Callback for client events.

#### `accept(message)`
Accepts an incoming SIP INVITE message.

#### `reject(message)`
Rejects an incoming SIP INVITE message.

#### `bye(message)`
Terminates an ongoing call.

#### `message(extension, body)`
Sends a SIP MESSAGE to the specified extension.
- `extension`: The SIP extension to message.
- `body`: The message body.

## TODO / Known Issues
- Further orginization of the codebase is needed.
- Finish RTP implementation.
- Finish SDPParser implementation.
- When making a call from a UAS in a b2bua configuration bye messages recived from the UAS Trunk UAC are not being associated with the originating messages.
- UAS UAC Registrations does not actually check if the password is correct.

## Star History

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

