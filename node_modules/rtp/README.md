# Node-RTP

Real-time Transport Protocol (RTP) is an Internet standards track protocol for
real-time data such as audio or video. For more information on RTP see [IETF
RFC 3550](https://datatracker.ietf.org/doc/html/rfc3550).

This library provides a wrapper for [librtp](https://github.com/Daxbot/librtp)

## Usage

This package supports both RTP and RTCP packets. RTP packets deliver data and
are typically sent on an even numbered UDP port. RTCP packets carry statistical
and control data and are typically sent on the next higher odd-numbered port.

Packet objects have a common `serialize()` method to convert the packet into a
NodeJS Buffer. A Buffer can be converted back to it's corresponding packet
object by passing it into the packet constructor. A convience method `parse()`
is provided which will attempt to convert an unknown Buffer into its
corresponding packet object based on type.

An example of Buffer parsing:
```js
const { RtpPacket, parse } = require("rtp");

// Create a Buffer containing a serialized RTP packet
const pkt1 = new RtpPacket(96);
pkt1.payload = Buffer.from([1, 2, 3]);
const buffer = pkt1.serialize(); // <Buffer ... >

// Parse the Buffer
const pkt2 = parse(buffer);
console.log(pkt2 instanceof RtpPacket); // true
console.log(pkt2.payload); // <Buffer 01 02 03>
```

What follows are initialization examples for each packet type.

### RtpPacket: RTP Data Packet

```js
const { RtpPacket } = require("rtp");

// Create the payload
const rate_hz = 48000;
const duration_ms = 20;
const channels = 1;

const frame_samples = (rate_hz * duration_ms) / 1000;
const frame_size = (channels * frame_samples * 2) // int16_t
const frame_buffer = Buffer.alloc(frame_size);

// ... fill the frame buffer

// Create the packet
const pkt = new RtpPacket(96);

// Add the payload
pkt.seq += 1;
pkt.ts += samples;
pkt.payload = frame_buffer;

// Serialize
const data = pkt.serialize(); // <Buffer ... >

// ... send the buffer
```

### AppPacket: Application-Defined RTCP Packet

```js
const { AppPacket } = require("rtp");

// Creating a new AppPacket
const pkt = new AppPacket();
pkt.ssrc = 0;
pkt.subtype = 1;
pkt.name = 0x646178; // dax
pkt.data = Buffer.alloc(10);

// Serialize
const data = pkt.serialize(); // <Buffer ... >

// ... send the buffer
```

### ByePacket: Goodbye RTCP Packet

```js
const { ByePacket } = require("rtp");

// Creating a new ByePacket
const pkt = new ByePacket();

// Add sources
pkt.addSource(0);
pkt.addSource(1);

// Set "reason" message
pkt.message = "Disconnect";

// Serialize
const data = pkt.serialize(); // <Buffer ... >

// ... send the buffer
```

### RrPacket: Receiver Report RTCP Packet

```js
const { RrPacket } = require("rtp");

// Creating a new RrPacket
const pkt = new RrPacket();

// Add reports
pkt.addReport({
    ssrc: 1,            // Source identifier
    fraction: 0,        // Percentage of packets lost
    lost: 0,            // Cumulative number of packets lost
    last_seq: 1024,     // Highest sequence number received
    jitter: 0,          // Interarrival jitter
    lsr: 0,             // Last SR timestamp
    dlsr: 0,            // Delay since last SR
});

// Add optional extension data
pkt.ext = Buffer.alloc(12);

// Serialize
const data = pkt.serialize(); // <Buffer ... >

// ... send the buffer
```

### SdesPacket: Source Description RTCP Packet

```js
const { SdesPacket } = require("rtp");

// Creating a new SdesPacket
const pkt = new SdesPacket();

// Add sources
pkt.addSource({
    ssrc: 1,
    cname: "33994c30-773c-4bc7-8514-a2e8f398940b",
    name: "John Doe",
    email: "john.doe@example.com"
    phone: "+1 000 555 0100"
    loc: "Portland, Oregon",
    tool: "node-rtp",
    note: "optional note",
    priv: "private extension",
});

// Serialize
const data = pkt.serialize(); // <Buffer ... >

// ... send the buffer
```

### SrPacket: Sender Report RTCP Packet

```js
const { SrPacket } = require("rtp");

// Creating a new SrPacket
const pkt = new SrPacket();
pkt.ssrc = 1;
pkt.ntp_ts = new Date();
pkt.rtp_ts = 0;

// Add reports
pkt.addReport({
    ssrc: 1,            // Source identifier
    fraction: 0,        // Percentage of packets lost
    lost: 0,            // Cumulative number of packets lost
    last_seq: 1024,     // Highest sequence number received
    jitter: 0,          // Interarrival jitter
    lsr: 0,             // Last SR timestamp
    dlsr: 0,            // Delay since last SR
});

// Add optional extension data
pkt.ext = Buffer.alloc(12);

// Serialize
const data = pkt.serialize(); // <Buffer ... >

// ... send the buffer
```
