const { spawn } = require('child_process');

class Streamer{
    constructor(inputFilePath, rtpAddress, output_port, outputFormat){
        this.inputFilePath = inputFilePath;
        this.rtpAddress = rtpAddress;
        this.output_port = output_port;
        this.input_port = 12420;
        this.outputFormat = outputFormat;
    }

    start(){
        return new Promise((resolve) => {
            var format_map = {
                'ulaw': 'pcm_mulaw',
                'alaw': 'pcm_alaw'
            }

            const ffmpegArgs = [
                '-re', // Read input at the native frame rate
                '-i', this.inputFilePath,
                '-ar', '8000', // Adjust audio sampling rate as required
                '-acodec', 'libavcodec',
                '-c:a', format_map[this.outputFormat],
                '-f', 'rtp', // Output format is RTP
                `rtp://${this.rtpAddress}:${this.output_port}` // RTP output URL
              ];

            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

            ffmpegProcess.stdout.on('data', (data) => {
                data = `
                        v=0
                        o=- ${this.input_port} ${this.input_port} IN IP4 ${this.rtpAddress}
                        s=SDP data
                        c=IN IP4 ${this.rtpAddress}
                        t=0 0
                        m=audio ${this.input_port} RTP/AVP 0 101
                        a=rtpmap:0 PCMU/8000
                        a=fmtp:101 0-15
                        a=rtpmap:101 telephone-event/8000
                        a=ptime:0
                        a=sendrecv`
                resolve(data)
            });
        })
    }
     
}

module.exports = Streamer;

