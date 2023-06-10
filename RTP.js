const dgram = require("dgram");
const SDPParser = require("./SDPParser");

class RTP {
    constructor(SDP) {
        this.sdp = SDPParser.parse(SDP);
        this.localPort = 14299; // local port to send/receive RTP packets
        this.remoteAddress = this.sdp.session.origin.split('IP4')[1].split(" ")[1]; // remote IP address
        this.remotePort = this.sdp.media[0].port; // remote port for RTP packets
        console.log(this.remoteAddress, this.remotePort)
        // Create a UDP socket
        this.socket = dgram.createSocket("udp4");

        // Bind the socket to the local port
        
        
        // Event handler for receiving messages
        this.socket.on("message", (message, rinfo) => {
          // Process received RTP packet
          const rtpPacket = this.parseRTPPacket(message);
          this.processRTPPacket(rtpPacket);
        });
    }
  
    // Parse RTP packet
    parseRTPPacket(packet) {
        const headerSize = 12; // Size of the RTP header
      
        if (packet.length < headerSize) {
          throw new Error("Invalid RTP packet: Packet size is too small");
        }
      
        const version = (packet.readUInt8(0) & 0xC0) >>> 6; // Extract RTP version
        const padding = (packet.readUInt8(0) & 0x20) !== 0; // Check padding flag
        const extension = (packet.readUInt8(0) & 0x10) !== 0; // Check extension flag
        const csrcCount = packet.readUInt8(0) & 0x0F; // Extract CSRC count
        const marker = (packet.readUInt8(1) & 0x80) !== 0; // Check marker flag
        const payloadType = packet.readUInt8(1) & 0x7F; // Extract payload type
        const sequenceNumber = packet.readUInt16BE(2); // Extract sequence number
        const timestamp = packet.readUInt32BE(4); // Extract timestamp
        const ssrc = packet.readUInt32BE(8); // Extract SSRC identifier
        const payload = packet.slice(headerSize); // Extract payload
      
        const rtpPacket = {
          version,
          padding,
          extension,
          csrcCount,
          marker,
          payloadType,
          sequenceNumber,
          timestamp,
          ssrc,
          payload
        };
      
        return rtpPacket;
    }
  
    // Send RTP packet
    sendRTPPacket(packet) {
        const rtpPacket = this.createRTPPacket(packet);
        const buffer = this.serializeRTPPacket(rtpPacket);
        this.socket.send(buffer, 0, buffer.length, this.remotePort, this.remoteAddress);
    }
      
  
    // Create RTP packet
    createRTPPacket(packet) {
        const rtpPacket = {
          version: 2, // RTP version
          padding: 0, // Padding flag
          extension: 0, // Extension flag
          csrcCount: 0, // CSRC count
          marker: 0, // Marker flag
          payloadType: 0, // Payload type
          sequenceNumber: 0, // Sequence number
          timestamp: 0, // Timestamp
          ssrc: 0, // SSRC identifier
          payload: Buffer.from(packet) // Payload data
        };
      
        return rtpPacket;
      }
  
    // Serialize RTP packet
    serializeRTPPacket(packet) {
        const buffer = Buffer.alloc(12 + packet.payload.length); // Allocate buffer for RTP header + payload
        buffer.writeUInt8(packet.version << 6 | packet.padding << 5 | packet.extension << 4 | packet.csrcCount, 0); // RTP Version, Padding, Extension, CSRC Count
        buffer.writeUInt8(packet.marker << 7 | packet.payloadType, 1); // Marker, Payload Type
        buffer.writeUInt16BE(packet.sequenceNumber, 2); // Sequence Number
        buffer.writeUInt32BE(packet.timestamp, 4); // Timestamp
        buffer.writeUInt32BE(packet.ssrc, 8); // SSRC Identifier
        packet.payload.copy(buffer, 12); // Copy payload to buffer starting at offset 12
        return buffer;
      }
  }

module.exports = RTP;