const fs = require('fs');
const { spawn } = require('child_process');
const Parser = require('../SDP').Parser;

class Session{
    constructor(props){
        this.call_id = props.call_id;
        this.sdp = props.sdp;
        this.listen_sdp = props.listen_sdp;
        this.callback = props.callback;
        this.listen_ip = null;
        this.listen_port = null;
        if (this.listen_sdp) {
            const portMatch = this.listen_sdp.match(/m=audio (\d+) RTP/);
            const ipMatch = this.listen_sdp.match(/c=IN IP4 (\d+\.\d+\.\d+\.\d+)/);
            this.listen_port = portMatch ? parseInt(portMatch[1], 10) : null;
            this.listen_ip = ipMatch ? ipMatch[1] : null;
        }
        this.rtp_socket = null;
        this.received_packets = 0;
        this.received_bytes = 0;
        this.last_packet_at = null;
        this.on_packet = null;
    }

    start(){
        let call_id = this.call_id;
        let parsed_sdp;
        try {
            parsed_sdp = Parser.parse(this.sdp);
        } catch (e) {
            console.error('Session start failed to parse SDP:', e && e.message ? e.message : e);
            if (this.callback) this.callback({type: 'SESSION_ERROR', error: e});
            return;
        }
        if(!parsed_sdp || !parsed_sdp.ip || !parsed_sdp.port || !Array.isArray(parsed_sdp.codecs) || parsed_sdp.codecs.length === 0){
            console.error('Session start failed: invalid SDP');
            if (this.callback) this.callback({type: 'SESSION_ERROR', error: new Error('invalid SDP')});
            return;
        }

        console.log('codecs')
        console.log(parsed_sdp.codecs)

        let selected_codec = parsed_sdp.codecs[0]
        if(selected_codec && selected_codec.name == 'telephone-event' && parsed_sdp.codecs[1]){
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
            '-i', require('path').join(__dirname, '..', 'sounds', 'test.mp3'),
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
        if (this.ffmpeg && typeof this.ffmpeg.unref === 'function') this.ffmpeg.unref();

        this.rtp_socket = require('dgram').createSocket('udp4');
        this.rtp_socket.on('error', (err) => {
            console.error('RTP receive socket error:', err && err.message ? err.message : err);
        });
        this.rtp_socket.on('message', (msg, rinfo) => {
            this.received_packets++;
            this.received_bytes += msg.length;
            this.last_packet_at = Date.now();
            if (typeof this.on_packet === 'function') {
                try { this.on_packet({type:'RTP_PACKET', size: msg.length, from: rinfo.address, port: rinfo.port, time: this.last_packet_at}); } catch(e) {}
            }
        });

        const finishStart = () => {
            if (this.callback) this.callback({type: 'SESSION_STARTED'});
        };

        if (this.listen_ip && this.listen_port) {
            this.rtp_socket.bind(this.listen_port, this.listen_ip, finishStart);
        } else {
            finishStart();
        }
    }

    stop(){
        if (this.rtp_socket) {
            try { this.rtp_socket.close(); } catch (e) { /* ignore */ }
            this.rtp_socket = null;
        }
        this.on_packet = null;
        if (this.ffmpeg && typeof this.ffmpeg.kill === 'function') {
            try { this.ffmpeg.kill('SIGKILL'); } catch (e) { /* ignore */ }
            try { if (this.ffmpeg.stdout) this.ffmpeg.stdout.destroy(); } catch (e) { /* ignore */ }
            try { if (this.ffmpeg.stderr) this.ffmpeg.stderr.destroy(); } catch (e) { /* ignore */ }
            try { this.ffmpeg.unref(); } catch (e) { /* ignore */ }
        }
        this.ffmpeg = null;
    }

    receive(callback){
        this.on_packet = (typeof callback === 'function') ? callback : null;
        return this;
    }

    update(new_sdp){
        if (typeof new_sdp === 'string' && new_sdp.trim()) {
            this.sdp = new_sdp;
        }

        let parsed_sdp;
        try {
            parsed_sdp = Parser.parse(this.sdp);
        } catch (e) {
            console.error('Session update failed to parse SDP:', e && e.message ? e.message : e);
            return {type: 'SESSION_ERROR', error: e};
        }
        if (!parsed_sdp || !parsed_sdp.ip || !parsed_sdp.port || !Array.isArray(parsed_sdp.codecs) || parsed_sdp.codecs.length === 0) {
            return {type: 'SESSION_ERROR', error: new Error('invalid SDP')};
        }

        if (this.ffmpeg && typeof this.ffmpeg.kill === 'function') {
            try { this.ffmpeg.kill('SIGKILL'); } catch (e) { /* ignore */ }
            try { if (this.ffmpeg.stdout) this.ffmpeg.stdout.destroy(); } catch (e) { /* ignore */ }
            try { if (this.ffmpeg.stderr) this.ffmpeg.stderr.destroy(); } catch (e) { /* ignore */ }
            try { this.ffmpeg.unref(); } catch (e) { /* ignore */ }
        }
        this.ffmpeg = null;

        let selected_codec = parsed_sdp.codecs[0];
        if (selected_codec && selected_codec.name == 'telephone-event' && parsed_sdp.codecs[1]) {
            selected_codec = parsed_sdp.codecs[1];
        }
        parsed_sdp.codecs.forEach(codec => {
            if (codec.name == 'opus') selected_codec = codec;
        });
        if (selected_codec.name != 'opus') {
            parsed_sdp.codecs.forEach(codec => {
                if (codec.name == 'G729') selected_codec = codec;
            });
        }

        let ffmpeg = spawn('ffmpeg', [
            '-re',
            '-i', require('path').join(__dirname, '..', 'sounds', 'test.mp3'),
            '-acodec', selected_codec.codec,
            '-ar', selected_codec.rate,
            '-ac', selected_codec.channels,
            '-payload_type', selected_codec.id,
            '-f', 'rtp', `rtp://${parsed_sdp.ip}:${parsed_sdp.port}`
        ]);
        ffmpeg.stdout.on('data', (data) => { console.log(`stdout: ${data}`); });
        ffmpeg.stderr.on('data', (data) => { console.error(`stderr: ${data}`); });
        this.ffmpeg = ffmpeg;
        if (this.ffmpeg && typeof this.ffmpeg.unref === 'function') this.ffmpeg.unref();

        return {
            type: 'SESSION_UPDATED',
            remote_ip: parsed_sdp.ip,
            remote_port: parsed_sdp.port,
            codec: selected_codec.name,
        };
    }

    rtpStats(){
        return {
            received_packets: this.received_packets,
            received_bytes: this.received_bytes,
            last_packet_at: this.last_packet_at,
            listen_ip: this.listen_ip,
            listen_port: this.listen_port,
        };
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