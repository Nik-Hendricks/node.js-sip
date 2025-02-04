const fs = require('fs');
const { spawn } = require('child_process');

class IVRManager{
    constructor(VOIP){
        this.VOIP = VOIP;
        this.items = {};
    }

    addIVR(props){
        this.items[String(props.name)] = this.IVR(props);
        console.log(this.items)
    }

    removeIVR(name){
        delete this.items[name];
    }

    IVR(props){
        return {
            name: String(props.name),
            start_stream: this.start_stream,
            stop_stream: this.stop_stream,
            handle_dtmf: this.handle_dtmf,
            streams: [],
        }
    }

    start_stream(call_id, sdp, dtmf_callback){
        console.log('Starting Stream')
        let port = sdp.match(/m=audio (\d+) RTP/)[1];
        let ip = sdp.match(/c=IN IP4 (\d+\.\d+\.\d+\.\d+)/)[1];
        let codec_ids = sdp.match(/m=audio \d+ RTP\/AVP (.+)/)[1].split(' ');
        let ffmpeg_codec_map = {
            'opus': 'libopus',
            'PCMU': 'pcm_mulaw',
            'PCMA': 'pcm_alaw',
            'telephone-event': 'pcm_mulaw',
            'speex': 'speex',
            'G722': 'g722',
            'G729': 'g729',
            'GSM': 'gsm',
            'AMR': 'amr',
            'AMR-WB': 'amr_wb',
            'iLBC': 'ilbc',
            'iSAC': 'isac',
        }

        let codecs = [];
        sdp.split('\n').forEach(line => {
            if(line.includes('a=rtpmap')){
                let codec = line.match(/a=rtpmap:(\d+) (.+)/)[2];
                let c_id = line.match(/a=rtpmap:(\d+) (.+)/)[1];
                codecs.push({                    
                    name: codec.split('/')[0],
                    rate: codec.split('/')[1],
                    channels: codec.split('/')[2] !== undefined ? codec.split('/')[2] : 1,
                    id: c_id
                })
            }
        })

        console.log('codecs')
        console.log(codecs)

        let selected_codec = codecs[0]
        if(selected_codec.name == 'telephone-event'){
            selected_codec = codecs[1]
            console.log(selected_codec)
        }

        //see if opus is available
        codecs.forEach(codec => {
            if(codec.name == 'opus'){
                selected_codec = codec;
            }
        })

        if(selected_codec.name != 'opus'){
            //check if g729 is available
            codecs.forEach(codec => {
                if(codec.name == 'G729'){
                    selected_codec = codec;
                }
            })
        }


        console.log('selected_codec')
        console.log(selected_codec)

        let ffmpegArgs = [
            '-re',
            '-i', 'song.mp3',
            '-acodec', ffmpeg_codec_map[selected_codec.name],
            '-ar', selected_codec.rate,
            '-ac', selected_codec.channels,
            '-payload_type', selected_codec.id,
            '-f', 'rtp', `rtp://${ip}:${port}`
        ];

        let ffmpeg = spawn('ffmpeg', ffmpegArgs);
        this.streams[call_id] = ffmpeg;

        ffmpeg.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        ffmpeg.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
    }

    stop_stream(call_id){
        console.log('Stopping Stream')  
        this.streams[call_id].kill('SIGINT');
        delete this.streams[call_id];
    }

    handle_dtmf(call_id, callback) {
        const outputAudioFile = "rtp_audio.wav";

        console.log("Starting FFmpeg RTP capture...");
    
        //const ffmpeg = spawn("ffmpeg", [
        //    "-protocol_whitelist", "file,rtp,udp",
        //    "-i", "rtp://192.168.1.12:5050",
        //    "-vn", "-acodec", "pcm_s16le", "-ar", "8000", "-ac", "1", outputAudioFile
        //]);
        const ffmpeg = spawn("ffmpeg", [
            "-protocol_whitelist", "file,udp,rtp",
            "-i", 'stream.sdp',
            "-vn", "-acodec", "pcm_s16le", "-ar", "8000", "-ac", "1", outputAudioFile
        ]);
    
        ffmpeg.stderr.on("data", (data) => {
            console.log(`FFmpeg: ${data.toString()}`);
        });
    
        ffmpeg.on("close", () => {
            console.log("FFmpeg finished recording. Analyzing audio...");
    
            const sox = spawn("sox", [outputAudioFile, "-n", "stat"]);
    
            let soxOutput = "";
            sox.stderr.on("data", (data) => {
                soxOutput += data.toString();
            });
    
            sox.on("close", () => {
                // Extract detected frequency
                const match = soxOutput.match(/Frequency:\s+(\d+\.\d+)/);
                if (match) {
                    const detectedFreq = parseFloat(match[1]);
                    const dtmfMapping = {
                        "697": "1", "770": "4", "852": "7", "941": "*",
                        "697,1209": "2", "770,1209": "5", "852,1209": "8", "941,1209": "0",
                        "697,1336": "3", "770,1336": "6", "852,1336": "9", "941,1336": "#",
                        "697,1477": "A", "770,1477": "B", "852,1477": "C", "941,1477": "D"
                    };
    
                    Object.entries(dtmfMapping).forEach(([freq, digit]) => {
                        if (freq.includes(detectedFreq.toFixed(0))) {
                            console.log(`In-band DTMF detected: ${digit}`);
                            callback(digit);
                        }
                    });
                }
                fs.unlinkSync(outputAudioFile); // Cleanup
            });
        });
    }
}

module.exports = IVRManager;