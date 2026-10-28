const utils = require('../utils.js');
const Session = require('./Session.js');

class SessionManager{
    constructor(){
        this.sessions = {};
    }

    new_session(props){
        if(!props || props.call_id === undefined){
            throw new Error('SessionManager.new_session requires call_id');
        }
        //pick a random port for listening
        let port = Math.floor(Math.random() * 65535) + 1;
        let localIp = require('../utils').getLocalIpAddress();
        let advertisedIp = (props && (props.listen_ip || props.advertised_ip)) || localIp;
        let listen_sdp = `v=0
        o=Z 0 177241510 IN IP4 ${utils.getLocalIpAddress()}
        s=Z
        c=IN IP4 ${advertisedIp}
        t=0 0
        m=audio ${port} RTP/AVP 106 9 98 101 0 8 3
        a=rtpmap:106 opus/48000/2
        a=fmtp:106 sprop-maxcapturerate=16000; minptime=20; useinbandfec=1
        a=rtpmap:98 telephone-event/48000
        a=fmtp:98 0-16
        a=rtpmap:101 telephone-event/8000
        a=fmtp:101 0-16
        a=sendrecv
        a=rtcp-mux`.replace(/^[ \t]+/gm, '')

        props.listen_sdp = listen_sdp;
        if (!props.listen_bind_ip) props.listen_bind_ip = localIp;
        this.sessions[props.call_id] = new Session(props);
        return this.sessions[props.call_id];
    }

    remove_session(call_id){
        const session = this.sessions[call_id];
        if(session){
            try { session.stop(); } catch (e) { /* ignore */ }
            delete this.sessions[call_id];
        }
    }
}

module.exports = SessionManager;
