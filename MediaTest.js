const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');
const { RtpPacket } = require('rtp');
const dgram = require('dgram');

const Recorder = require('node-record-lpcm16');

class MediaStream {
    constructor(sdp) {
        console.log(sdp)
        this.sdp = sdp;
        this.rtpPort = sdp.media[0].port;
        this.rtpIp = sdp.session.origin.split('IP4')[1].split(' ')[1];
        this.ffmpegProcess = null;
    }


    start() {
      const ssrc = 12345678; // SSRC identifier
      const udpSocket = dgram.createSocket('udp4'); // Create a UDP socket
  
      const audioStream = Recorder.record({
        sampleRate: 8000, // Audio sample rate
        channels: 1,      // Number of audio channels
        audioType: 'raw', // Output audio type (raw PCM)
        verbose: false,   // Set to true for verbose logging
      });
  
      audioStream.stream().on('data', (data) => {
        const rtpPacket = new RtpPacket(0, ssrc); // Assuming format '0' as per the SDP
        rtpPacket.payload = data;
        const buffer = rtpPacket.serialize();
  
        // Send the buffer over the network using UDP socket
        udpSocket.send(buffer, 0, buffer.length, this.rtpPort, this.rtpIp, (error) => {
          if (error) {
            console.error(`Failed to send RTP packet: ${error}`);
          }
        });
      });
  
      audioStream.stream().on('error', (error) => {
        console.error(`Audio stream error: ${error}`);
      });
  
      // Start recording audio
      audioStream.start();
    }
  
    stop() {
      if (audioStream) {
        audioStream.stop();
      }
    }
  
    // ...
}


module.exports = MediaStream;

// To stop the media stream: