const fs = require('fs');
const { spawn } = require('child_process');
const Parser = require('../SDP').Parser;

class Session{
    constructor(props){
        this.call_id = props.call_id;
        this.sdp = props.sdp;
        this.audio_file = props.audio_file || require('path').join(__dirname, '..', 'sounds', 'test.mp3');
        this.loop = (props.loop === undefined) ? true : (props.loop !== false && props.loop !== 0 && props.loop !== 'false');
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
        this.outbound_socket = null;
        this.outbound_interval = null;
        this.rtcp_timer = null;
        this.outbound_ssrc = (Math.random() * 0xffffffff) >>> 0;
        this.outbound_seq = 0;
        this.outbound_timestamp = 0;
        this.outbound_packet_count = 0;
        this.outbound_octet_count = 0;
        this.outbound_rtcp_port = null;
        this.outbound_offset = 0;
        this.outbound_source = null;
        this.received_packets = 0;
        this.received_bytes = 0;
        this.last_packet_at = null;
        this.on_packet = null;
        this._last_dtmf_end = null;
        this.telephone_event_payload_types = new Set();
        this.dtmf_events = [];
        this.on_dtmf = null;
        this.listen_bind_ip = props.listen_bind_ip || require('../utils').getLocalIpAddress();
        this._last_dtmf_end = null;
        if (typeof props.dtmf_callback === 'function') {
            this.on_dtmf = props.dtmf_callback;
        }
        this._parseTelephoneEventTypes(this.listen_sdp);
    }

    start(){
        this._killOutboundSync();


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
            this._handleRtpPacket(msg, rinfo);
        });

        this._spawnOutbound();

        const finishStart = () => {
            if (this.callback) this.callback({type: 'SESSION_STARTED'});
        };

        if (this.listen_ip && this.listen_port) {
            this.rtp_socket.bind(this.listen_port, this.listen_bind_ip, finishStart);
        } else {
            finishStart();
        }
    }

    setAudioFile(file){
        this.audio_file = file || this.audio_file;
        return this._spawnOutbound();
    }

    _killOutboundSync(){
        if (this.ffmpeg && typeof this.ffmpeg.pid === 'number') {
            try { process.kill(this.ffmpeg.pid, 'SIGKILL'); } catch (e) { /* ignore */ }
            const deadline = Date.now() + 100;
            while (true) {
                try {
                    process.kill(this.ffmpeg.pid, 0);
                } catch (e) {
                    // Process no longer exists.
                    break;
                }
                if (Date.now() >= deadline) {
                    try { process.kill(this.ffmpeg.pid, 'SIGKILL'); } catch (e) { /* ignore */ }
                    break;
                }
            }
        }
        if (this.ffmpeg) {
            try { if (this.ffmpeg.stdout) this.ffmpeg.stdout.destroy(); } catch (e) { /* ignore */ }
            try { if (this.ffmpeg.stderr) this.ffmpeg.stderr.destroy(); } catch (e) { /* ignore */ }
            try { this.ffmpeg.unref(); } catch (e) { /* ignore */ }
        }
        this.ffmpeg = null;
        this._outboundProcess = null;
        if (this.outbound_interval) { clearInterval(this.outbound_interval); this.outbound_interval = null; }
        if (this.rtcp_timer) { clearInterval(this.rtcp_timer); this.rtcp_timer = null; }
        if (this.outbound_socket) {
            try { this.outbound_socket.close(); } catch (e) { /* ignore */ }
        }
        this.outbound_socket = null;
        this.outbound_offset = 0;
    }

    _startRawOutbound(parsed_sdp){
        const fs = require('fs');
        const dgram = require('dgram');
        let audio;
        try { audio = fs.readFileSync(this.audio_file); } catch (e) {
            console.error('Unable to read raw uLaw media data:', e && e.message ? e.message : e);
            if (this.callback) this.callback({type: 'SESSION_ERROR', error: e});
            return;
        }
        if (!Buffer.isBuffer(audio) || audio.length === 0) {
            console.error('Raw uLaw media file is empty:', this.audio_file);
            return;
        }
        this.outbound_offset = 0;
        this.outbound_packet_count = 0;
        this.outbound_octet_count = 0;
        const socket = dgram.createSocket('udp4');
        this.outbound_socket = socket;
        const targetIp = parsed_sdp.ip;
        const targetPort = parsed_sdp.port;
        const sendOne = () => {
            if (!this.outbound_socket || !Buffer.isBuffer(audio) || audio.length === 0) return;
            const payloadSize = 160;
            const payload = Buffer.allocUnsafe(payloadSize);
            for (let i = 0; i < payloadSize; i++) {
                payload[i] = audio[(this.outbound_offset + i) % audio.length];
            }
            this.outbound_offset = (this.outbound_offset + payloadSize) % audio.length;
            const packet = Buffer.allocUnsafe(12 + payload.length);
            packet[0] = 0x80;
            packet[1] = 0;
            packet.writeUInt16BE(this.outbound_seq & 0xffff, 2);
            packet.writeUInt32BE(this.outbound_timestamp >>> 0, 4);
            packet.writeUInt32BE(this.outbound_ssrc >>> 0, 8);
            payload.copy(packet, 12);
            try { socket.send(packet, 0, packet.length, targetPort, targetIp); } catch (e) { /* ignore */ }
            this.outbound_seq = (this.outbound_seq + 1) & 0xffff;
            this.outbound_timestamp = (this.outbound_timestamp + 160) >>> 0;
            this.outbound_packet_count++;
            this.outbound_octet_count += payload.length;
        };
        sendOne();
        this.outbound_interval = setInterval(sendOne, 20);
        if (typeof this.outbound_interval?.unref === 'function') this.outbound_interval.unref();
        if (this.outbound_rtcp_port && this.outbound_rtcp_port > 0) {
            this.rtcp_timer = setInterval(() => {
                if (!this.outbound_socket) return;
                const rtcp = Buffer.allocUnsafe(28);
                rtcp[0] = 0x80;
                rtcp[1] = 200;
                rtcp.writeUInt16BE(6, 2);
                rtcp.writeUInt32BE(this.outbound_ssrc >>> 0, 4);
                const now = Date.now();
                rtcp.writeUInt32BE(Math.floor((now / 1000) * 0xFFFFFFFF) + 2208988800, 8);
                rtcp.writeUInt32BE((now % 1000) * 0x100000, 12);
                rtcp.writeUInt32BE(this.outbound_timestamp >>> 0, 16);
                rtcp.writeUInt32BE(this.outbound_packet_count >>> 0, 20);
                rtcp.writeUInt32BE(this.outbound_octet_count >>> 0, 24);
                try { socket.send(rtcp, 0, rtcp.length, this.outbound_rtcp_port, targetIp); } catch (e) { /* ignore */ }
            }, 5000);
            if (typeof this.rtcp_timer?.unref === 'function') this.rtcp_timer.unref();
        }
    }

    _spawnOutbound(){
        this._killOutboundSync();

        if (typeof this.audio_file === 'string' && this.audio_file.endsWith('.ulaw')) {
            let parsed_sdp;
            try { parsed_sdp = Parser.parse(this.sdp); } catch (e) { return {type:'SESSION_ERROR', error:e}; }
            if (!parsed_sdp || !parsed_sdp.ip || !parsed_sdp.port || !Array.isArray(parsed_sdp.codecs) || parsed_sdp.codecs.length === 0) {
                return {type:'SESSION_ERROR', error:new Error('invalid SDP')};
            }
            const rtcpMatch = this.sdp.match(/a=rtcp:(\d+)/i);
            this.outbound_rtcp_port = rtcpMatch ? parseInt(rtcpMatch[1],10) : parsed_sdp.port + 1;
            this._startRawOutbound(parsed_sdp);
            return {type: 'SESSION_OUTBOUND_STARTED', remote_ip: parsed_sdp.ip, remote_port: parsed_sdp.port, codec: 'PCMU', audio_file: this.audio_file};
        }

        let parsed_sdp;
        try {
            parsed_sdp = Parser.parse(this.sdp);
        } catch (e) {
            console.error('Session outbound failed to parse SDP:', e && e.message ? e.message : e);
            if (this.callback) this.callback({type: 'SESSION_ERROR', error: e});
            return {type: 'SESSION_ERROR', error: e};
        }
        if(!parsed_sdp || !parsed_sdp.ip || !parsed_sdp.port || !Array.isArray(parsed_sdp.codecs) || parsed_sdp.codecs.length === 0){
            console.error('Session outbound failed: invalid SDP');
            if (this.callback) this.callback({type: 'SESSION_ERROR', error: new Error('invalid SDP')});
            return {type: 'SESSION_ERROR', error: new Error('invalid SDP')};
        }

        let selected_codec = parsed_sdp.codecs[0];
        if (selected_codec && selected_codec.name == 'telephone-event' && parsed_sdp.codecs[1]) {
            selected_codec = parsed_sdp.codecs[1];
        }
        parsed_sdp.codecs.forEach(codec => {
            if(codec.name == 'opus') selected_codec = codec;
        });
        if (!selected_codec || selected_codec.name != 'opus') {
            parsed_sdp.codecs.forEach(codec => {
                if (codec.name == 'G729') selected_codec = codec;
            });
        }
        if (!selected_codec) selected_codec = parsed_sdp.codecs[0];

        const args = [];
        if (this.loop) args.push('-stream_loop', '-1');
        args.push('-re', '-i', this.audio_file);
        args.push('-acodec', selected_codec.codec,
            '-ar', selected_codec.rate,
            '-ac', selected_codec.channels,
            '-payload_type', selected_codec.id,
            '-f', 'rtp', `rtp://${parsed_sdp.ip}:${parsed_sdp.port}`);

        console.log(`[RTP] outbound target=${parsed_sdp.ip}:${parsed_sdp.port} codec=${selected_codec.name} audio=${this.audio_file}`);
        let ffmpeg = spawn('ffmpeg', args, {stdio: ['ignore', 'ignore', 'pipe']});
        ffmpeg.stderr.on('data', (data) => { console.error(`stderr: ${data.toString().trim()}`); });
        this.ffmpeg = ffmpeg;
        this._outboundProcess = ffmpeg;
        if (this.ffmpeg && typeof this.ffmpeg.unref === 'function') this.ffmpeg.unref();

        return {type: 'SESSION_OUTBOUND_STARTED', remote_ip: parsed_sdp.ip, remote_port: parsed_sdp.port, codec: selected_codec.name, audio_file: this.audio_file};
    }

    stop(){
        if (this.rtp_socket) {
            try { this.rtp_socket.close(); } catch (e) { /* ignore */ }
            this.rtp_socket = null;
        }
        this.on_packet = null;
        this._last_dtmf_end = null;
        if (this.ffmpeg && typeof this.ffmpeg.pid === 'number') {
            try { process.kill(this.ffmpeg.pid, 'SIGKILL'); } catch (e) { /* ignore */ }
        }
        if (this.ffmpeg) {
            try { if (this.ffmpeg.stdout) this.ffmpeg.stdout.destroy(); } catch (e) { /* ignore */ }
            try { if (this.ffmpeg.stderr) this.ffmpeg.stderr.destroy(); } catch (e) { /* ignore */ }
            try { this.ffmpeg.unref(); } catch (e) { /* ignore */ }
        }
        this.ffmpeg = null;
        this._outboundProcess = null;
        if (this.outbound_interval) { clearInterval(this.outbound_interval); this.outbound_interval = null; }
        if (this.rtcp_timer) { clearInterval(this.rtcp_timer); this.rtcp_timer = null; }
        if (this.outbound_socket) {
            try { this.outbound_socket.close(); } catch (e) { /* ignore */ }
        }
        this.outbound_socket = null;
        this.outbound_offset = 0;
    }

    receive(callback){
        this.on_packet = (typeof callback === 'function') ? callback : null;
        return this;
    }

    update(new_sdp){
        if (typeof new_sdp === 'string' && new_sdp.trim()) {
            this.sdp = new_sdp;
        }
        const result = this._spawnOutbound();
        if (result && result.type === 'SESSION_OUTBOUND_STARTED') {
            return {type: 'SESSION_UPDATED', remote_ip: result.remote_ip, remote_port: result.remote_port, codec: result.codec, audio_file: result.audio_file};
        }
        return result;
    }


    rtpStats(){
        return {
            received_packets: this.received_packets,
            received_bytes: this.received_bytes,
            last_packet_at: this.last_packet_at,
            listen_ip: this.listen_ip,
            listen_bind_ip: this.listen_bind_ip,
            listen_port: this.listen_port,
        };
    }

    _parseTelephoneEventTypes(sdp){
        this.telephone_event_payload_types.clear();
        if (typeof sdp !== 'string') return;
        const lines = sdp.split('\n');
        for (const line of lines) {
            const listenMatch = line.match(/a=rtpmap:(\d+) telephone-event\//i);
            if (listenMatch) this.telephone_event_payload_types.add(parseInt(listenMatch[1], 10));
        }
    }

    _handleRtpPacket(msg, rinfo){
        if (!Buffer.isBuffer(msg) || msg.length < 16) return;
        const pt = msg[1] & 0x7f;
        if (!this.telephone_event_payload_types.has(pt)) return;

        const eventCode = msg[12];
        const endBit = (msg[13] & 0x80) !== 0;
        const volume = msg[13] & 0x3f;
        const duration = (msg[14] << 8) | msg[15];
        const seq = (msg[2] << 8) | msg[3];
        const event = {
            type: 'DTMF',
            eventCode,
            digit: this._dtmfDigit(eventCode),
            end: endBit,
            volume,
            duration,
            sequence: seq,
            from: rinfo.address,
            port: rinfo.port,
        };

        const rtpTimestamp = (msg.length > 7)
            ? ((msg[4] << 24) >>> 0) + ((msg[5] << 16) >>> 0) + ((msg[6] << 8) >>> 0) + (msg[7] >>> 0)
            : 0;
        const signature = `${eventCode}:${duration}:${rtpTimestamp}`;
        event.rtpTimestamp = rtpTimestamp;
        event.signature = signature;

        // RFC 2833 repeats completed events; suppress exact retransmissions while allowing
        // genuinely separate presses of the same digit.
        if (endBit) {
            const now = Date.now();
            if (this._last_dtmf_end && this._last_dtmf_end.signature === signature && (now - this._last_dtmf_end.time) < 300) {
                return;
            }
            this._last_dtmf_end = {signature, time: now};
            this.dtmf_events.push(event);
            if (typeof this.on_dtmf === 'function') {
                try { this.on_dtmf(event); } catch (e) {}
            }
        }
    }

    _dtmfDigit(code){
        const mapping = ['0','1','2','3','4','5','6','7','8','9','*','#','A','B','C','D'];
        return mapping[code] || String(code);
    }

    dtmf(callback){
        this.on_dtmf = (typeof callback === 'function') ? callback : null;
        return this;
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