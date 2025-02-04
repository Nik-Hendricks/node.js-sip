const fs = require('fs');
const { spawn } = require('child_process');

class Session{
    constructor(props){
        this.call_id = props.call_id;
        this.sdp = props.sdp;
        this.listen_sdp = props.listen_sdp;
        this.callback = props.callback;
    }

    start(){
        let call_id = this.call_id;
        let port = this.sdp.match(/m=audio (\d+) RTP/)[1];
        let ip = this.sdp.match(/c=IN IP4 (\d+\.\d+\.\d+\.\d+)/)[1];
        let codec_ids = this.sdp.match(/m=audio \d+ RTP\/AVP (.+)/)[1].split(' ');
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
        this.sdp.split('\n').forEach(line => {
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
        //this.streams[call_id] = ffmpeg;

        ffmpeg.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        ffmpeg.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        //this.sessions[call_id].ffmpeg = ffmpeg;
        this.ffmpeg = ffmpeg;

        //this.sessions[call_id].callback({type: 'SESSION_STARTED'});
        this.callback({type: 'SESSION_STARTED'});
    }

    stop(){
        this.ffmpeg.kill('SIGINT');
    }
}

module.exports = Session;