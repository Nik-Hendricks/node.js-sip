const { spawn } = require('child_process');
const fs = require('fs');


class RTPListen{
    constructor(sdp){
        this.sdp = sdp;
    }

    start(){

        const ffmpegArgs = [
            '-protocol_whitelist', 'pipe,file,rtp,udp', // Read input at the native frame rate
            '-i','pipe:0' 
        ];

        const ffmpegProcess = spawn('ffplay', ffmpegArgs);
        ffmpegProcess.stdin.write(this.sdp);
        ffmpegProcess.stdin.end();
    }

    stop(){
        
    }
}

module.exports = RTPListen;