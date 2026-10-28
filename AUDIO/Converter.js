const spawn = require('child_process').spawn;
const fs = require('fs');

const Converter = {
    convert(inputFilePath, outputFilePath, outputFormat){
        return new Promise((resolve, reject) => {
            var format_map = {
                'ulaw': 'pcm_mulaw',
                'alaw': 'pcm_alaw'
            };

            if(!Object.prototype.hasOwnProperty.call(format_map, outputFormat)){
                reject(new Error(`Unsupported output format: ${outputFormat}`));
                return;
            }

            const ffmpegArgs = [
                '-i', inputFilePath,
                '-ac', '1',
                '-ar', '8000', // Adjust audio sampling rate as required
                '-f', 'wav',
                '-acodec', format_map[outputFormat],
                outputFilePath
            ];

            this.audioExists(outputFilePath).then((exists) => {
                if(exists){
                    try { fs.unlinkSync(outputFilePath); } catch (e) { /* ignore */ }
                }
                const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
                let stderr = '';

                ffmpegProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                ffmpegProcess.on('error', (err) => {
                    reject(err);
                });

                ffmpegProcess.on('close', (code) => {
                    if(code === 0){
                        resolve(true);
                    }else{
                        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`));
                    }
                });
            }).catch(reject);
        });
    },

    audioExists(file){
        return new Promise((resolve) => {
            fs.access(file, fs.constants.F_OK, (err) => {
                resolve(!err);
            });
        });
    }
};

module.exports = Converter;
