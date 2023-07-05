const spawn = require('child_process').spawn;

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

            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

            ffmpegProcess.stderr.on('data', (data) => {
                ffmpegProcess.stdin.write('y');
                ffmpegProcess.stdin.end();
            })

            ffmpegProcess.on('close', (code) => {
                resolve(true)
            })
        })
    }
}

module.exports = Converter;