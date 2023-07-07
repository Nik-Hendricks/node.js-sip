const { spawn } = require('child_process');
const UTILS = require('../../UTILS.js')


class Streamer{
    constructor(inputFilePath, rtpAddress, output_port, outputFormat){
        this.inputFilePath = inputFilePath;
        this.rtpAddress = rtpAddress;
        this.output_port = output_port;
        this.input_port = 21214; //port we expect audio from
        this.outputFormat = outputFormat;
    }

    start(useragent){
        console.log(useragent)
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
                '-ac', 1, // Set the number of audio channels to 1 (mono)
                '-b:a', '64k', // Set the audio bitrate to 64 kbps
                '-f', 'rtp', // Output format is RTP
                '-threads', '4', // Number of threads (adjust as needed)
                '-max_delay', '0.5', // Maximum demux-decode delay (adjust as needed)
                '-bufsize', '500k', // Audio packet buffer size (adjust as needed)
                `rtp://${this.rtpAddress}:${this.output_port}` // RTP output URL
              ];

            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

            ffmpegProcess.stdout.on('data', (data) => {

                if(useragent.includes('Yealink') || useragent.includes('Tadiran')){
                    console.log("ALT SDP")
                    data =  'v=0 \r\n' +
                            'o=- ' + this.input_port + ' ' + this.input_port +' IN IP4 ' + UTILS.getLocalIpAddress() + '\r\n' +
                            's=Stream from Node.js\r\n' +
                            'c=IN IP4 ' + UTILS.getLocalIpAddress() + '\r\n' +
                            't=0 0\r\n' +
                            'a=tool:libavformat 58.29.100\r\n' +
                            'm=audio ' + this.input_port + ' RTP/AVP 0 101\r\n' +
                            'a=rtpmap:0 PCMU/8000\r\n' +
                            'a=fmtp:101 0-15\r\n' +
                            'a=rtpmap:101 telephone-event/8000\r\n' +
                            'a=ptime:0\r\n' +
                            'a=sendrecv\r\n' +
                            'b=AS:64\r\n'

                    console.log(data)

                        //`o=- ${this.input_port} ${this.input_port} IN IP4 ${UTILS.getLocalIpAddress()}
                        //s=SDP data
                        //c=IN IP4 ${UTILS.getLocalIpAddress()}
                        //t=0 0
                        //m=audio ${this.input_port} RTP/AVP 0 101
                        //a=rtpmap:0 PCMU/8000
                        //a=fmtp:101 0-15
                        //a=rtpmap:101 telephone-event/8000
                        //a=ptime:0
                        //a=sendrecv
                        //b=AS:64`
                }else{
                    data = `v=0
o=- ${this.input_port} ${this.input_port} IN IP4 ${UTILS.getLocalIpAddress()}
s=SDP data
c=IN IP4 ${UTILS.getLocalIpAddress()}
t=0 0
m=audio ${this.input_port} RTP/AVP 0 101
a=rtpmap:0 PCMU/8000
a=fmtp:101 0-15
a=rtpmap:101 telephone-event/8000
a=ptime:0
a=sendrecv
b=AS:64`
                }
                resolve(data)
            });
        })
    }
     
}

module.exports = Streamer;

