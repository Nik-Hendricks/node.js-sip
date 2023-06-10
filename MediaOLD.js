const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');
const { RtpPacket } = require('rtp');
const dgram = require('dgram');

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
    const ffmpegArgs = this.buildFFmpegArgs();
    this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
  
    const udpSocket = dgram.createSocket('udp4'); // Create a UDP socket
  
    this.ffmpegProcess.stdout.on('data', (data) => {
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
  
    this.ffmpegProcess.stderr.on('data', (data) => {
      console.error(`FFmpeg error: ${data}`);
    });
  
    this.ffmpegProcess.on('close', (code) => {
      console.log(`FFmpeg process exited with code ${code}`);
      udpSocket.close(); // Close the UDP socket when FFmpeg process exits
    });
  }

  stop() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill();
      this.ffmpegProcess = null;
    }
  }

  buildFFmpegArgs() {
    const audioMedia = this.sdp.media[0];
    const inputArgs = ['-f', 'alsa', '-i', 'default']; // Assuming the default audio input device is used
  
    const outputArgs = [
        '-f', 'alsa',                // Input format is ALSA
        '-i', 'hw:0',                // Use the default audio capture device (microphone)
        '-ar', '8000',               // Audio sample rate
        '-ac', '1',                  // Number of audio channels
        '-f', 'rtp',                 // Output format is RTP
        `udp://${this.rtpIp}:${this.rtpPort}?pkt_size=188`,  // RTP output URL with destination IP and port
    ];
  
    return inputArgs.concat(outputArgs);
  }
}

module.exports = MediaStream;

// To stop the media stream: