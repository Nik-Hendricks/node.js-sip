const utils = require('../utils.js');
const Session = require('./Session.js');

class SessionManager{
    constructor(){
        this.sessions = {};
    }

    new_session(props){
        //pick a random port for listening
        let port = Math.floor(Math.random() * 65535) + 1;
        let listen_sdp = `v=0
        o=Z 0 177241510 IN IP4 ${utils.getLocalIpAddress()}
        s=Z
        c=IN IP4 ${utils.getLocalIpAddress()}
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
        this.sessions[props.call_id] = new Session(props);
        return this.sessions[props.call_id];
    }
}

module.exports = SessionManager;