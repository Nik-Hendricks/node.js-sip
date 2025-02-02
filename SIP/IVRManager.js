class IVRManager{
    constructor(){
        this.items = {};
        this.rtp_streams = {};
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
        }
    }

    start_stream(call_id, sdp){
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

        //convert audio file to the codec that the call is using

        //let convertArgs = [
        //    '-i', 'song.mp3',
        //    '-acodec', ffmpeg_codec_map[selected_codec.name],
        //    '-ar', selected_codec.rate,
        //    '-ac', selected_codec.channels,
        //    'song.wav'
        //];
//
        //let convert = spawn('ffmpeg', convertArgs);
//
        //convert.stdout.on('data', (data) => {
        //    console.log(`stdout: ${data}`);
        //});
//
        //convert.stderr.on('data', (data) => {
        //    console.error(`stderr: ${data}`);
        //});
//
        //convert.on('close', (code) => {
        //    console.log(`child process exited with code ${code}`);
        //});



        let spawn = require('child_process').spawn;
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

        ffmpeg.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        ffmpeg.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });




    }
}

module.exports = IVRManager;