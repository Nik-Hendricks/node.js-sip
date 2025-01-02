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
const utils = require('./utils');

const voipClient = new VOIP({
    type: 'client',
    transport: {
        type: 'UDP',
        ip: utils.getLocalIpAddress(),
        port: 5060,
    },
    username: '1000',
    register_password: 'yourPassword',
    register_ip: '192.168.1.2',
    register_port: 5060,
}, (response) => {
    if (response.type === 'REGISTERED') {
        console.log('Successfully registered with the SIP server.');

        voipClient.call('1001', '192.168.1.3', 5060, (callResponse) => {
            if (callResponse.type === 'CALL_CONNECTED') {
                console.log('Call connected!');
            }
        });
    }
});
```

### Setting Up a SIP Server

```javascript
const VOIP = require('node.js-sip');

const voipServer = new VOIP({
    type: 'server',
    transport: {
        type: 'UDP',
        ip: '0.0.0.0', // Listen on all available IPs
        port: 5060,
    },
}, (response) => {
    console.log(`Server event: ${response.type}`);
});

// Handle incoming calls
voipServer.on('INVITE', (message) => {
    voipServer.accept(message);
    console.log('Incoming call accepted.');
});
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

#### `call(extension, ip, port, callback)`
Initiates a call to the specified extension.
- `extension`: The SIP extension to call.
- `ip`: The IP address of the callee.
- `port`: The port of the callee (default: `5060`).
- `callback(response)`: Callback for call events.

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

## Examples

### Sending a SIP MESSAGE

```javascript
voipClient.message('1001', 'Hello, this is a test message!');
```

### Accepting an Incoming Call

```javascript
voipServer.on('INVITE', (message) => {
    voipServer.accept(message);
    console.log('Incoming call accepted.');
});
```

### Terminating a Call

```javascript
voipServer.on('BYE', (message) => {
    voipServer.bye(message);
    console.log('Call terminated.');
});
```

## License

MIT License. See the [LICENSE](./LICENSE) file for more details.

---

For detailed usage and advanced configurations, refer to the full documentation (coming soon).

