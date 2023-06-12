const { spawn } = require('child_process');
const { RtpPacket } = require('rtp');
const dgram = require('dgram');
const ffmpeg = require('fluent-ffmpeg');


class MediaStream {
  constructor(input, sdp) {
    console.log(sdp);
    this.input = input;
    this.sdp = sdp;
    this.rtpPort = sdp.media[0].port;
    this.rtpIp = sdp.session.origin.split('IP4')[1].split(' ')[1];
    this.ffmpegProcess = null;
  }

  start() {
    const ssrc = 12345678; // SSRC identifier
    //const ffmpegArgs = this.buildFFmpegArgs();
    //this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
//
    //const udpSocket = dgram.createSocket('udp4'); // Create a UDP socket
//
    //this.ffmpegProcess.stdout.on('data', (data) => {
    //  const rtpPacket = new RtpPacket(0, ssrc); // Assuming format '0' as per the SDP
    //  rtpPacket.payload = data;
    //  const buffer = rtpPacket.serialize();
//
    //  // Send the buffer over the network using UDP socket

    ffmpeg(this.input)
    .output('../audio.raw')
    .audioCodec('pcm_mulaw')
    .outputFormat('mulaw')
    .audioFrequency(8000)
    .on('end', () => {
      console.log('Conversion completed successfully.');
    })
    .on('error', (err) => {
      console.error('An error occurred:', err.message);
    })
    .run();

      //udpSocket.send(buffer, 0, buffer.length, this.rtpPort, this.rtpIp, (error) => {
      //  if (error) {
      //    console.error(`Failed to send RTP packet: ${error}`);
      //  }
      //});
    //});

    //this.ffmpegProcess.stderr.on('data', (data) => {
    //  console.error(`FFmpeg error: ${data}`);
    //});
//
    //this.ffmpegProcess.on('close', (code) => {
    //  console.log(`FFmpeg process exited with code ${code}`);
    //  udpSocket.close(); // Close the UDP socket when FFmpeg process exits
    //});
  }

  stop() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill();
      this.ffmpegProcess = null;
    }
  }

  buildFFmpegArgs() {

  }
}

module.exports = MediaStream;
