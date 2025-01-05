const SDPParser = {
    parse: (sdp) => {
        let ret = {
            ip: null,
            port: null,
            media: []
        }
        let r = [];
        let fs = [];
        
        for (let line of sdp.split('\r\n')) {
            if (line.startsWith('m=')) {
                let parts = line.split(' ');
                let media = parts[0].substr(2);
                let port = parts[1];
                let protocol = parts[2];
                let formats = parts.slice(3);
                r.push({
                    media,
                    port,
                    protocol,
                    formats
                });
            }
            if(line.startsWith('a=rtpmap:')){
                let parts = line.split(' ');
                let payload = parts[0].split(':')[1];
                let rate = parts[1].split('/')[1];
                let codec = parts[1].split('/')[0];
                fs[payload] = {
                    rate,
                    codec
                }
            }
        }

        console.log(r);
        console.log(fs);

        r = r.map((media) => {
            media.formats = media.formats.map((format) => {
                return fs[format];
            });
            return media;
        })

      

        r.ip = sdp.match(/c=IN IP4 (\d+\.\d+\.\d+\.\d+)/)[1];

        return r;
    }
}

module.exports = SDPParser;