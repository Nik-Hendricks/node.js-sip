# Node.js RTP Library

*This is a WIP library and is not yet ready for production use*

this is a simple library for RTP protocol in Node.js
it is specifically focused around voip and uses FFMPEG to support multiple codecs such as G711a, G711u, and G722.

## Usage

The library exports classes `Streamer` and `Listener` which are used to send and receive RTP packets respectively.



```javascript
const Streamer = require('./RTP').Streamer

var stream1 = new Streamer('./audio/dtmf_test.wav', '192.168.1.43', 5004, 'g711a', (data) => {
    console.log(data)
})
```

```javascript
const Listener = require('./RTP').Listener

console.log('starting')
new Listener(5004, 'g711a', (stream) => {
    console.log(stream)
})
```

## API

### Streamer

#### `new Streamer(file, ip, port, codec, callback)`
Creates a new RTP streamer. The streamer will read the file and send it to the specified ip and port using the specified codec. The callback will be called when the streamer is finished sending the file.

#### `streamer.pause()`
Pauses the streamer.

#### `streamer.resume()`
Resumes the streamer.

### Listener

#### `new Listener(port, codec, callback)`
Creates a new RTP listener. The listener will listen on the specified port and decode the packets using the specified codec. The callback will be called when the listener receives a stream.

#### `listener.stop()`
Stops the listener.