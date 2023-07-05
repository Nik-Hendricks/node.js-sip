const spawn = require('child_process').spawn;
const fs = require('fs');

class Converter{
    constructor(){

    }

    convert(inputFilePath, outputFilePath, outputFormat = 'ulaw'){
        return new Promise((resolve) => {
            var format_map = {
                'ulaw': 'pcm_mulaw',
                'alaw': 'pcm_alaw'
            }

            const ffmpegArgs = [
                '-i', inputFilePath,
                '-ac',1,
                '-ar', '8000', // Adjust audio sampling rate as required
                '-acodec', format_map[outputFormat],
                outputFilePath
            ];


            this.audioExists(inputFilePath).then(exists => {
                if(exists){
                    fs.unlinkSync(inputFilePath)
                }
                const ffmpegProcess = spawn('ffmpeg', ffmpegArgs , {shell: true});


                ffmpegProcess.on('close', (code) => {
                    resolve(true)
                })
            })
        })
    }
    audioExists(file){
        return new Promise((resolve) => {
            fs.access(file, fs.constants.F_OK, (err) => {
                if (err) {
                  resolve(false)
                } else {
                  resolve(true)
                }
            });
        })
    }
}

module.exports = Converter;