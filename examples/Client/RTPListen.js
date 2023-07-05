const { spawn } = require('child_process');


class RTPListen{
    constructor(sdp){
        this.sdp = sdp
    }

    start(){

        const ffmpegArgs = [
            '-protocol_whitelist', 'pipe,file,rtp,udp', // Read input at the native frame rate
            '-i','pipe:0',
          ];

        const ffmpegProcess = spawn('ffplay', ffmpegArgs);
        ffmpegProcess.stdin.write(this.sdp);

            
        ffmpegProcess.stdout.on('data', (data) => {
            data = data.toString()
            console.log(data)
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
    }
}

module.exports = RTPListen;