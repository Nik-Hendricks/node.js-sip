const { spawn } = require('child_process');

class Streamer{
    constructor(inputFilePath, rtpAddress, output_port){
        this.inputFilePath = 'output.wav';
        this.rtpAddress = rtpAddress;
        this.output_port = output_port;
    }

    start(){
        return new Promise((resolve) => {
            const ffmpegArgs = [
                '-re', // Read input at the native frame rate
                '-i', this.inputFilePath,
                '-ar', '8000', // Adjust audio sampling rate as required
                '-acodec', 'pcm_mulaw', // Choose the desired codec (e.g., pcm_mulaw or opus)
                '-f', 'rtp', // Output format is RTP
                `rtp://${this.rtpAddress}:${this.output_port}` // RTP output URL
              ];

              const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
           // const ffmpegCommand = `ffmpeg -re -i ${this.inputFilePath} -ar 8000 -acodec mulaw -f rtp rtp://${this.rtpAddress}:${this.rtpPort}`;
           // const ffmpegProcess = spawn(ffmpegCommand, { shell: true });
    
            ffmpegProcess.stdout.on('data', (data) => {
                data = data.toString()
                //replace all instances of 127.0.0.1 with our local ip address
                data = data.replace(new RegExp('127.0.0.1', 'g'), '192.168.1.3');
                data.split('SDP:')[1]

                data = `v=0
                o=- ${this.output_port} ${this.output_port} IN IP4 192.168.1.3
                s=SDP data
                c=IN IP4 192.168.1.3
                t=0 0
                m=audio ${this.output_port} RTP/AVP 0 8 18 9 101
                a=rtpmap:0 PCMU/8000
                a=rtpmap:8 PCMA/8000
                a=rtpmap:18 G729/8000
                a=fmtp:18 annexb=no
                a=rtpmap:9 G722/8000
                a=fmtp:101 0-15
                a=rtpmap:1
                01 telephone-event/8000
                a=ptime:20
                a=sendrecv`
                            


                resolve(data)
            });
    
            ffmpegProcess.stderr.on('data', (data) => {
              // Handle stderr data if required
              console.log(data.toString())
            });
    
            ffmpegProcess.on('close', (code) => {
              // Handle process close event if required
              console.log('close')
              console.log(code.toString())
            });
    
            ffmpegProcess.on('error', (error) => {
              // Handle process error event if required
              console.log(error.toString())
            });
        })
    }
     
}

module.exports = Streamer;

