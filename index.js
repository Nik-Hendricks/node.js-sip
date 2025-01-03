//Nik Hendricks 10/13/23
const SIP = require('./SIP')
const utils = require('./utils')

class VOIP{
    constructor(props, callback){
        props = props || {};
        this.message_stack = {};
        this.transport = this.create_transport(props);
        if(props.type == 'client'){
            this.UAC(props, callback);
        }else if(props.type == 'server'){
            this.UAS(props, callback);
        }
    }

    create_transport(props, callback){
        return SIP.Transport.new(props, callback);
    }

    UAS(props, callback){
    }

    UAC(props, callback){
        this.username = props.username;
        this.register_ip = props.register_ip;
        this.register_port = props.register_port;
        this.register_password = props.register_password;
        this.ip = props.transport.ip;
        this.port = props.transport.port;
        this.max_retries = 10;
        this.registration_interval = 10;
        this.registration_cseq = 1;
        console.log(props)

        this.register(props, (d) => {
            callback(d);
        })

        this.transport.on((msg) => {
            var res = SIP.Parser.parse(msg.toString());
            var tag = SIP.Parser.ParseHeaders(res.headers).From.tag;
            var branch = SIP.Parser.ParseHeaders(res.headers).Via.branch;

            console.log('tag > ', tag)
            console.log('branch > ', branch)    
            console.log('method > ', res.method || res.statusCode)

            console.log(this.message_stack)
            var cb = null;
           
            if(this.message_stack[tag][branch].length > 0){
                if(this.message_stack[tag][branch][this.message_stack[tag][branch].length - 1].callback != undefined){
                    console.log('running message_stack callback')
                    cb = this.message_stack[tag][branch][this.message_stack[tag][branch].length - 1].callback;
                }else{
                    console.log('No callback')
                }
                this.message_stack[tag][branch].push({message: res})
                if(cb != null){
                    cb(res)
                }
            }else{
                callback({
                    type: res.method || res.statusCode,
                    message: [res, this.message_stack[tag]]
                })
            }
        })
    }

    send(message, msg_callback){
        var built = SIP.Builder.Build(message)   
        this.transport.send(built, this.register_ip, 5060)
        var tag = SIP.Parser.ParseHeaders(message.headers).From.tag;
        var branch = SIP.Parser.ParseHeaders(message.headers).Via.branch;
        if(!this.message_stack[tag]){
            this.message_stack[tag] = [];
            this.message_stack[tag][branch] = [];
        }
        this.message_stack[tag][branch].push({message, callback: msg_callback})
    }

    register(props, callback){
        var try_count = 0;
        var headers = {
            extension: this.username,
            ip: this.ip,
            port: this.port,
            requestUri: `sip:${this.register_ip}`,
            register_ip: this.register_ip,
            register_port: this.register_port,
            username: this.username,
            callId: props.callId || '123',
            cseq: this.registration_cseq,
            branchId: SIP.Builder.generateBranch(),
            from_tag: SIP.Builder.generateTag(),
        }


        const sendRegister = (challenge_headers, proxy_auth = false) => {
            try_count++;
            this.registration_cseq++;
            if(try_count > this.max_retries){
                console.log('Max retries reached');
                callback({type:'REGISTER_FAILED', message:{statusCode:408, statusText:'Request Timeout'}});
                return;
            }

            this.send(SIP.Builder.SIPMessageObject('REGISTER', headers), (d) => {

                let ph = SIP.Parser.ParseHeaders(d.headers);
                let challenge_data = (ph['WWW-Authenticate'] !== undefined) ? ph['WWW-Authenticate'] : ph['Proxy-Authenticate'];
                headers.cseq = headers.cseq + 1;
                headers.username = this.username;
                headers.password = this.register_password;
                this.send(SIP.Builder.SIPMessageObject('REGISTER', headers, challenge_data, (ph['Proxy-Authenticate'] !== undefined) ? true : false), (d) => {
                    if(d.statusCode == 200){
                        let expires = d.headers.Contact.split(';expires=')[1].split(';')[0];
                        console.log(`REGISTERED for ${expires} seconds`);
                        setTimeout(() => {
                            let tag = SIP.Parser.ParseHeaders(d.headers).From.tag;
                            let branch = SIP.Parser.ParseHeaders(d.headers).Via.branch;
                            console.log(this.message_stack[tag][branch])
                            console.log('tag > ', tag)
                            delete this.message_stack[tag]
                            props.callId = SIP.Builder.generateBranch();
                            //props.from_tag = tag;
                            this.register(props, callback);
                        }, expires * 1000);
                        callback({type:'REGISTERED', message:d})
                    }else if(d.statusCode == 401){
                        let challenge_data = SIP.Parser.ParseHeaders(d.headers)['WWW-Authenticate'];
                        //new branch id 
                        //headers.branchId = SIP.Builder.generateBranch();
                        sendRegister(challenge_data, false);
                    }else if(d.statusCode == 403){
                        console.log(`${d.statusCode} ${d.statusText}`);
                        callback({type:'REGISTER_FAILED', message:d})
                    }else if(d.statusCode == 407){
                        let challenge_data = SIP.Parser.ParseHeaders(d.headers)['Proxy-Authenticate'];
                        //new branch id
                        //headers.branchId = SIP.Builder.generateBranch();
                        sendRegister(challenge_data, true);
                    }else{
                        console.log('Unexpected status code:', d.statusCode);
                    }
                })
            })
        }

        sendRegister();
    }

    call(extension, ip, port, msg_callback){
        var cseq = 1;
        var try_count = 0;
        let b = SIP.Builder.generateBranch();
        var sdp = ` v=0
                    o=- 0 0 IN IP4 ${utils.getLocalIpAddress()}
                    s=Easy Muffin
                    c=IN IP4 ${utils.getLocalIpAddress()}
                    t=0 0
                    a=tool:libavformat 60.16.100
                    m=audio 10326 RTP/AVP 0
                    b=AS:64`.replace(/^[ \t]+/gm, '');
        
        let h = {
            extension: extension,
            ip: ip,
            port: port,
            register_ip: this.register_ip,
            register_port: this.register_port,
            username: this.username,
            callId: SIP.Builder.generateBranch(),
            cseq: cseq,
            branchId: SIP.Builder.generateBranch(),
            from_tag: SIP.Builder.generateTag(),
            body: sdp,
            password: this.register_password,
            requestUri: `sip:${extension}@${ip}:${port}`,
        };
        
        const sendInvite = (challenge_headers, proxy_auth = false) => {
            try_count++;
            if(try_count > this.max_retries){
                console.log('Max retries reached');
                this.message_stack[h.from_tag].pop();
                msg_callback({type:'CALL_FAILED', message:{statusCode:408, statusText:'Request Timeout'}});
                return;
            }
            this.send(SIP.Builder.SIPMessageObject('INVITE', h, challenge_headers, proxy_auth), (response) => {
                if(response.statusCode == 400){
                    console.log('400 Bad Request');
                    this.message_stack[tag].pop();
                    this.call(extension, ip, port, msg_callback); //retry
                    return;
                }else if (response.statusCode == 401) {
                    let challenge_data = SIP.Parser.ParseHeaders(response.headers)['WWW-Authenticate'];
                    sendInvite(challenge_data, false);
                }else if(response.statusCode == 407){
                    let challenge_data = SIP.Parser.ParseHeaders(response.headers)['Proxy-Authenticate'];
                    sendInvite(challenge_data, true);
                }else if (response.statusCode == 100) {
                    console.log('100 Trying');
                    return;
                }else if (response.statusCode == 403) {
                    console.log('403 Forbidden');
                    this.message_stack[tag].pop();
                    msg_callback({type:'CALL_REJECTED', message:response});
                    return;
                }else if (response.statusCode == 183) {
                    console.log('183 Session Progress');
                }else if (response.statusCode == 200) {
                    let headers = SIP.Parser.ParseHeaders(response.headers);
                    this.send({
                        isResponse: false,
                        protocol: 'SIP/2.0',
                        method: 'ACK',
                        requestUri: `sip:${extension}@${ip}:${port}`,
                        headers: {
                            'Via': `SIP/2.0/UDP ${headers.Via.uri.ip}:${headers.Via.uri.port || 5060};branch=${headers.Via.branch}`,
                            'To': `<sip:${headers.To.contact.username}>`,
                            'From': `<sip:${headers.From.contact.username}@${headers.Via.uri.ip}:${headers.Via.uri.port || 5060}>;tag=${headers.From.tag}`,
                            'Call-ID': headers['Call-ID'],
                            'CSeq': `${headers.CSeq.count} ${headers.CSeq.method}`,
                            'Contact': `<sip:${headers.From.contact.username}@${headers.Via.uri.ip}:${headers.Via.uri.port || 5060}>`,
                            'Max-Forwards': SIP.Builder.max_forwards,
                            'User-Agent': SIP.Builder.user_agent,
                        },
                        body: ''
                    })

                    msg_callback({type:'CALL_CONNECTED', message:response});
                    return;
                //handle bye
                }else if (response.method != undefined && response.method == 'BYE') {
                    console.log('BYE Received');
                    //this.bye(response);
                    return;
                }else {
                    console.error('Unexpected status code:', response.statusCode);
                }
            });
        };
        
        sendInvite();
    }

    accept(message){
        var cseq = 1;
        var headers = SIP.Parser.ParseHeaders(message.headers);
        message.isResponse = true;
        message.statusCode = '100 Trying';
        var old_body = message.body;
        message.body = '';
        message.headers['Contact'] = `<sip:${headers.To.contact.username}@${headers.Via.uri.ip}:${headers.Via.uri.port || 5060}>`
        this.send(message)
        message.statusCode = '180 Ringing';
        this.send(message)
        message.body = `v=0
                        o=- 123456789 123456789 IN IP4 192.168.1.110
                        s=Asterisk Call
                        c=IN IP4 192.168.1.110
                        t=0 0
                        m=audio 5005 RTP/AVP 8
                        a=rtpmap:8 PCMA/8000
                        a=fmtp:8 0-15`.replace(/^[ \t]+/gm, '');
        message.statusCode = '200 OK';
        this.send(message)
    }

    reject(message){
        var headers = SIP.Parser.ParseHeaders(message.headers);
        console.log(headers)
        headers.CSeq.count = headers.CSeq.count + 1;
        var new_message = {
            statusCode: '486 Busy Here',
            isResponse: true,
            protocol: 'SIP/2.0',
            headers: {
                'Via': `SIP/2.0/UDP ${headers.Via.uri.ip}:${headers.Via.uri.port || 5060};branch=${headers.Via.branch}`,
                'To': `<sip:${headers.To.contact.username}>`,
                'From': `<sip:${headers.From.contact.username}@${headers.Via.uri.ip}:${headers.Via.uri.port || 5060}>;tag=${headers.From.tag}`,
                'Call-ID': headers['Call-ID'],
                'CSeq': `${headers.CSeq.count} ${headers.CSeq.method}`,
                'Contact': `<sip:${headers.From.contact.username}@${headers.Via.uri.ip}:${headers.Via.uri.port || 5060}>`,
                'Max-Forwards': SIP.Builder.max_forwards,
                'User-Agent': SIP.Builder.user_agent,
                'Content-Length': '0',
            },
            body: ''
        }
        this.send(new_message)
    }

    bye(message){
        var headers = SIP.Parser.ParseHeaders(message.headers);
        message.isResponse = false;
        message.method = 'BYE';
        message.headers['Contact'] = `<sip:${headers.From.contact.username}@${headers.Via.uri.ip}:${headers.Via.uri.port || 5060}>`
        message.headers['To'] = `<sip:${headers.To.contact.username}@${headers.Via.uri.ip}:${headers.Via.uri.port || 5060}>`
        message.headers['From'] = `<sip:${headers.From.contact.username}@${headers.Via.uri.ip}:${headers.Via.uri.port || 5060}>tag=${headers.From.tag}`
        this.send(message)

    }

    ok(message){
        var headers = SIP.Parser.ParseHeaders(message.headers);
        console.log(headers)
        var new_message = {
            statusCode: '200 OK',
            isResponse: true,
            protocol: 'SIP/2.0',
            headers: {
                'Via': `SIP/2.0/UDP ${headers.Via.uri.ip}:${headers.Via.uri.port || 5060};branch=${headers.Via.branch}`,
                'To': `<tel:${headers.To.contact.username}>`,
                'From': `<sip:${headers.From.contact.username}@${headers.Via.uri.ip}:${headers.Via.uri.port || 5060}>;tag=${headers.From.tag}`,
                'Call-ID': headers['Call-ID'],
                'CSeq': `${headers.CSeq.count} ${headers.CSeq.method}`,
                'Contact': `<sip:${headers.From.contact.username}@${headers.Via.uri.ip}:${headers.Via.uri.port || 5060}>`,
                'Max-Forwards': SIP.Builder.max_forwards,
                'User-Agent': SIP.Builder.user_agent,
            },
            body: ''
        }
        this.transport.send(SIP.Builder.Build(new_message), headers.Via.uri.ip, headers.Via.uri.port)
    }

    message(extension, body){
        var headers = {
            extension: extension,
            ip: this.register_ip,
            listen_ip: utils.getLocalIpAddress(),
            listen_port: 5060,
            username: this.username,
            callId: SIP.Builder.generateBranch(),
            cseq: 1,
            branchId: SIP.Builder.generateBranch(),
            body: body,
        }

       
        this.send(SIP.Builder.SIPMessageObject('MESSAGE', headers))

    }
}

module.exports = VOIP;