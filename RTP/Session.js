const fs = require('fs');
const { spawn } = require('child_process');
const Parser = require('../SDP').Parser;

class Session{
    constructor(props){
        this.call_id = props.call_id;
        this.sdp = props.sdp;
        this.listen_sdp = props.listen_sdp;
        this.callback = props.callback;
    }

    start(){
        let call_id = this.call_id;
        let parsed_sdp = Parser.parse(this.sdp);

        console.log('codecs')
        console.log(parsed_sdp.codecs)

        let selected_codec = parsed_sdp.codecs[0]
        if(selected_codec.name == 'telephone-event'){
            selected_codec = parsed_sdp.codecs[1]
            console.log(selected_codec)
        }

        //see if opus is available
        parsed_sdp.codecs.forEach(codec => {
            if(codec.name == 'opus'){
                selected_codec = codec;
            }
        })

        if(selected_codec.name != 'opus'){
            //check if g729 is available
            parsed_sdp.codecs.forEach(codec => {
                if(codec.name == 'G729'){
                    selected_codec = codec;
                }
            })
        }

        let ffmpeg = spawn('ffmpeg', [
            '-re',
            '-i', 'song.mp3',
            '-acodec', selected_codec.codec,
            '-ar', selected_codec.rate,
            '-ac', selected_codec.channels,
            '-payload_type', selected_codec.id,
            '-f', 'rtp', `rtp://${parsed_sdp.ip}:${parsed_sdp.port}`
        ]);

        ffmpeg.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        ffmpeg.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        this.ffmpeg = ffmpeg;
        this.callback({type: 'SESSION_STARTED'});
    }

    stop(){
        this.ffmpeg.kill('SIGINT');
    }

    listen(){
        //use ffplay to listen to the stream
        let listen_sdp = this.listen_sdp;
        let port = listen_sdp.match(/m=audio (\d+) RTP/)[1];
        let ip = listen_sdp.match(/c=IN IP4 (\d+\.\d+\.\d+\.\d+)/)[1];
        let codec_ids = listen_sdp.match(/m=audio \d+ RTP\/AVP (.+)/)[1].split(' ');
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

        listen_sdp.split('\n').forEach(line => {
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
    }

    pick_codec(codecs){
        
    }
}

module.exports = Session;