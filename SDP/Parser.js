const Parser = {
    parse: (sdp) => {
        if(typeof sdp !== 'string' || !sdp.trim()){
            throw new Error('SDP input must be a non-empty string');
        }
        const portMatch = sdp.match(/m=audio (\d+) RTP/);
        const ipMatch = sdp.match(/c=IN IP4 (\d+\.\d+\.\d+\.\d+)/);
        const codecMatch = sdp.match(/m=audio \d+ RTP\/AVP (.+)/);
        if(!portMatch || !ipMatch || !codecMatch){
            throw new Error('Unable to parse required SDP fields');
        }
        let port = portMatch[1];
        let ip = ipMatch[1];
        let codec_ids = codecMatch[1].split(' ');
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
                const rtpMatch = line.match(/a=rtpmap:(\d+) (.+)/);
                if(!rtpMatch) return;
                let codec = rtpMatch[2];
                let c_id = rtpMatch[1];
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