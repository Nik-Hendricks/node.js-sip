const Parser = {
    parse: (sdp) => {
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
                    id: c_id,
                    codec: ffmpeg_codec_map[codec.split('/')[0]]
                })
            }
        })

        return {
            ip: ip,
            port: port,
            codecs: codecs,
        }
    }
}

module.exports = Parser;