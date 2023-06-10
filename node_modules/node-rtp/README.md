node-rtp
========

node-rtp is an RTP module for node.js. It currently only supports sending audio only.

Requirements
============

- Node.JS v0.1.103+

Example
=======

See 'examples/sendg711.js' for how to send G.711 audio (you will need to provide the audio file -- the example works with a PCM mu-law encoded audio file).
Currently, you will need to find a receiver program/device that plays incoming audio at least until receiving audio is implemented in node-rtp.
FWIW, I am personally testing node-rtp with a Cisco IP phone (7961G with SIP firmware) over a LAN.

API
===

node-rtp currently exports one objects: RtpPacket.

## RtpPacket

### Constructor: new RtpPacket(payload)

Creates a new instance of an RTP packet.

`payload` is simply a Buffer containing up to 512 bytes of audio data.

Note: The size of the payload may need to be less than 512 bytes, depending on what encoding you are using.

### type

Gets/Sets the RTP packet's payload type. This must be a valid value from the table given in section 6 of RFC3551.

### seq

Gets/Sets the RTP packet's sequence number. This number must be incremented by 1 for each RTP packet in a continuous stream. This is useful for the receiver to detect if it has missed any packets in the stream.

### time

Gets/Sets the RTP packet's timestamp. This number must be incremented by the number of samples contained in the payload (generally the length of the payload buffer) for each RTP packet in a continuous stream.

### source

Gets/Sets the RTP packet's synchronization source identifier. This number must be a unique number that identifies the source of the outgoing audio.

### payload

Gets/Sets the RTP packet's payload. This is a buffer object containing audio samples.

### packet

Returns the fully assembled RTP packet as a buffer object for sending over the network.