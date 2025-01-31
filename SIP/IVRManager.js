class IVRManager{
    constructor(){
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
        }
    }

    start_stream(sdp){
        console.log('Starting Stream')
        var port = sdp.match(/m=audio (\d+) RTP/)[1];
        var ip = sdp.match(/c=IN IP4 (\d+\.\d+\.\d+\.\d+)/)[1];
        let codec_ids = sdp.match(/m=audio \d+ RTP\/AVP (.+)/)[1].split(' ');

        let codecs = {};
        sdp.split('\n').forEach(line => {
            if(line.includes('a=rtpmap')){
                let codec = line.match(/a=rtpmap:(\d+) (.+)/)[2];
                let c_id = line.match(/a=rtpmap:(\d+) (.+)/)[1];
                codecs[c_id] = {
                    name: codec.split('/')[0],
                    rate: codec.split('/')[1],
                }
            }
        })

        let found_codecs = [];
        codec_ids.forEach(codec_id => {
            if(codecs[codec_id]){
                console.log(`${codec_id}: ${codecs[codec_id].name} ${codecs[codec_id].rate}`)
                found_codecs.push({...codecs[codec_id], id: codec_id});
                return;
            }else{
                console.log(`${codec_id}: Unknown Codec`)
            }
        })

        let selected_codec = found_codecs[0];
        console.log(codecs)


        console.log(selected_codec)
        console.log(ip)
        console.log(port)
        
        //using ffmpeg play song.mp3 using pcmu codec and send it to rtp://ip:port make sure rtp muxer is used

        let spawn = require('child_process').spawn;
        let ffmpeg = spawn('ffmpeg', ['-re', '-i', 'song.mp3', '-f', 'rtp', `rtp://${ip}:${port}`, '-acodec', selected_codec.name, '-ar', selected_codec.rate, '-ac', '1', '-vn', '-payload_type', selected_codec.id]);
        ffmpeg.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        ffmpeg.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
    }
}

module.exports = IVRManager;