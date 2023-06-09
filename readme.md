# SIP Library
This is a Node.js library that provides functionality for working with the Session Initiation Protocol (SIP). It allows you to send and receive SIP messages, register a SIP client, and handle SIP dialogs.

## Features
1. Send and receive SIP messages using UDP protocol.
2. Register a SIP client with a SIP server.
3. Handle SIP dialogs and events.
4. Generate and parse SIP messages.

## Prerequisites
Node.js installed on your system.
## Installation
To use this library in your Node.js project, you need to follow these steps:

Clone the repository or download the source code.
Navigate to the project directory.
Install the required dependencies by running the following command:
```bash
npm install
```

## Usage
To use the SIP library in your Node.js application, follow these steps:

Import the SIP class from the library:

```javascript
const SIP = require("./SIP");
```

Create a new instance of the SIP class by providing the IP address, port number, username, and password for your SIP client:

```javascript
const sipClient = new SIP(ip, port, username, password);
```

Use the various methods and events provided by the library to interact with the SIP protocol. For example, you can send a SIP message using the send method:

```javascript
sipClient.send(message).then(response => {
    // Handle the response
})
```

Register your SIP client with the SIP server using the Register method:
```javascript
sipClient.Register().then(dialog => {
    // Handle the registration success
})

```

Handle SIP events using the on method. For example, you can listen for a 401 Unauthorized resposse:

```javascript
sipClient.on('401', response => {
  // Handle the 401 response
});s
```

## Examples
The following examples demonstrate how to use the SIP library:

**Sending a SIP Message:**


```javascript
const message = "SIP MESSAGE ";

sipClient.send(message).then(response => {
    // Handle the response
})
```
**Registering a SIP Client:**

```javascript
sipClient.Register().then(dialog => {
    // Handle the registration success
})
```

## Contributing
Contributions are welcome! If you have any bug reports, feature requests, or suggestions, please open an issue on the GitHub repository.

## License
Copyright Nicholas Cooley 2023

This library is licensed under the MIT License.