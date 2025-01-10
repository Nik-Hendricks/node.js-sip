//Nik Hendricks 10/13/23
const SIP = require('./SIP')
const utils = require('./utils')
const SDPParser = require('./SDP')

class VOIP{
    constructor(props, callback){
        props = props || {};
        this.SDPParser = SDPParser;
        this.transport = SIP.Transport.new(props);
        this.message_stack = {};
        if(props.type == 'client'){
            this.UAC(props, callback);
        }else if(props.type == 'server'){
            this.UAS(props, callback);
        }
    }
        
    UAS(props, callback){
        this.username = 'test';
        this.password = 'test';
        this.sip_event_listener(callback, 'server');

        callback({type:'UAS_READY'})
    }
    
    UAC(props, client_callback){
        this.username = props.username;
        this.register_ip = props.register_ip;
        this.register_port = props.register_port;
        this.register_password = props.register_password;
        this.ip = props.transport.ip;
        this.port = props.transport.port;
        this.max_retries = 10;
        this.registration_interval = 10;
        this.registration_cseq = 1;

        this.register(props, (d) => {
            client_callback(d);
        })

        this.sip_event_listener(client_callback, 'client');
    }

    sip_event_listener(client_callback, user_agent_type){
        this.transport.on((msg) => {
            var res = SIP.Parser.parse(msg.toString());
            var tag = SIP.Parser.ParseHeaders(res.headers).From.tag;
            var branch = SIP.Parser.ParseHeaders(res.headers).Via.branch;
            console.log('tag > ', tag)
            console.log('branch > ', branch)    
            console.log('method > ', res.method || res.statusCode)
            console.log('NEW PARSED MESSAGE')
            console.log(SIP.HeaderParser.parse(res.headers))

            let check_for_callbacks = (tag, branch) => {
                console.log('checking for callbacks')
                let mg = [].concat.apply([], Object.entries(this.message_stack[tag]).map((d => d[1]))).filter((d) => d.sent == true)
                if(mg.length == 0){
                    console.log('no callbacks')
                    return;
                }
                //let last_mg_func = mg[mg.length - 1].callback;
                (mg[mg.length - 1].callback == undefined) ? () => {return} : mg[mg.length - 1].callback(res);
                //last_mg_func(res)
                return;
            }

            if(this.message_stack[tag] == undefined){
                this.message_stack[tag] = {};
                if(this.message_stack[tag][branch] == undefined){
                    this.message_stack[tag][branch] = [];
                    this.message_stack[tag][branch].push({message: res, sent: false})
                    console.log('brand new stack')
                    if(user_agent_type == 'client'){
                        this.uac_responses(msg, client_callback)
                    }else if(user_agent_type == 'server'){
                        this.uas_responses(msg, client_callback)
                    }
                    return;
                }else{
                    this.message_stack[tag][branch].push({message: res, sent: false})
                    check_for_callbacks(tag, branch)
                    return;
                }
            }else{
                if(this.message_stack[tag][branch] == undefined){
                    this.message_stack[tag][branch] = [];
                }
                this.message_stack[tag][branch].push({message: res, sent: false})
                check_for_callbacks(tag, branch)
                return;
            }
        })
    }

    server_send(message, ip, port, msg_callback){
        console.log('server_send')
        console.log(message)
        var built = SIP.Builder.Build(message)   
        this.transport.send(built, ip, port)
        var tag = SIP.Parser.ParseHeaders(message.headers).From.tag;
        var branch = SIP.Parser.ParseHeaders(message.headers).Via.branch;
        if(!this.message_stack[tag]){
            this.message_stack[tag] = {};
            this.message_stack[tag][branch] = [];
        }
        this.message_stack[tag][branch].push({message, callback: msg_callback, sent: true})
    }

    send(message, msg_callback){
        var built = SIP.Builder.Build(message)   
        this.transport.send(built, this.register_ip, 5060)
        var tag = SIP.Parser.ParseHeaders(message.headers).From.tag;
        var branch = SIP.Parser.ParseHeaders(message.headers).Via.branch;
        if(!this.message_stack[tag]){
            this.message_stack[tag] = {};
            this.message_stack[tag][branch] = [];
        }
        this.message_stack[tag][branch].push({message, callback: msg_callback, sent: true})
    }

    uac_responses(msg, client_callback){
        var res = SIP.Parser.parse(msg.toString());
        var tag = SIP.Parser.ParseHeaders(res.headers).From.tag;
        var branch = SIP.Parser.ParseHeaders(res.headers).Via.branch;
        var type = res.method || res.statusCode;
        if(type == 'NOTIFY'){
            console.log('uac_responses > NOTIFY')
            this.send(this.response({   
                statusCode: 200,
                statusText: 'OK',
                headers: SIP.Parser.ParseHeaders(res.headers)
            }))  
        }else if (type == 'INFO') {
            console.log('uac_responses > INFO')
            this.send(this.response({   
                statusCode: 200,
                statusText: 'OK',
                headers: SIP.Parser.ParseHeaders(res.headers)
            }))  
        }else if (type == 'INVITE') {
            console.log('uac_responses > INVITE')
            this.accept(res, SIP.Parser.parse(msg.toString()).body, client_callback)
        }
    }

    uas_responses(msg, client_callback){
        var res = SIP.Parser.parse(msg.toString());
        let parsed_headers = SIP.Parser.ParseHeaders(res.headers);
        var tag = parsed_headers.From.tag;
        var branch = parsed_headers.Via.branch;
        var type = res.method || res.statusCode;
        if(type == 'REGISTER'){
            console.log('uas_responses > REGISTER')
            //401 Unauthorized
            let message = this.response({
                statusCode: 401,
                statusText: 'Unauthorized',
                headers: parsed_headers,
                auth_required: true
            })
            this.server_send(message, parsed_headers.Contact.contact.ip, parsed_headers.Contact.contact.port, (d) => {
                if(d.isResponse == false && d.method == 'REGISTER'){
                    if(d.headers.Authorization !== undefined){
                        let response = this.response({
                            statusCode: 200,
                            statusText: 'OK',
                            headers: parsed_headers,
                            expires: 3600
                        })
                        this.server_send(response, parsed_headers.Contact.contact.ip, parsed_headers.Contact.contact.port)
                    }
                }else if(d.isResponse == false && d.method == 'INVITE'){
                    
                }
            })
        }
    }

    register(props, client_callback){
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
                client_callback({type:'REGISTER_FAILED', message:{statusCode:408, statusText:'Request Timeout'}});
                return;
            }

            this.send(SIP.Builder.SIPMessageObject('REGISTER', headers), (d) => {

                let ph = SIP.Parser.ParseHeaders(d.headers);
                let challenge_data = (ph['WWW-Authenticate'] !== undefined) ? ph['WWW-Authenticate'] : ph['Proxy-Authenticate'];
                headers.cseq = headers.cseq + 1;
                headers.username = this.username;
                headers.password = this.register_password;
                this.send(SIP.Builder.SIPMessageObject('REGISTER', headers, challenge_data, (ph['Proxy-Authenticate'] !== undefined) ? true : false), (d) => {
                    let parsed_headers = SIP.Parser.ParseHeaders(d.headers);


                    if(d.statusCode == 200){
                        console.log(`REGISTERED for ${parsed_headers.Contact.expires} seconds`);
                        setTimeout(() => {
                            let tag = parsed_headers.From.tag;
                            let branch = parsed_headers.Via.branch;
                            props.callId = SIP.Builder.generateBranch();
                            this.register(props, client_callback);
                        }, parsed_headers.Contact.expires * 1000);
                        client_callback({type:'REGISTERED', message:d})
                    }else if(d.statusCode == 401){
                        let challenge_data = SIP.Parser.ParseHeaders(d.headers)['WWW-Authenticate'];
                        sendRegister(challenge_data, false);
                    }else if(d.statusCode == 403){
                        console.log(`${d.statusCode} ${d.statusText}`);
                        client_callback({type:'REGISTER_FAILED', message:d})
                    }else if(d.statusCode == 407){
                        let challenge_data = SIP.Parser.ParseHeaders(d.headers)['Proxy-Authenticate'];
                        sendRegister(challenge_data, true);
                    }else{
                        console.log('Unexpected status code:', d.statusCode);
                    }
                })
            })
        }

        sendRegister();
    }

    call(extension, ip, port, client_callback){
        var cseq = 1;
        var try_count = 0;
        let b = SIP.Builder.generateBranch();
        var sdp = `v=0
        o=- 123456789 123456789 IN IP4 192.168.1.110
        s=Asterisk Call
        c=IN IP4 192.168.1.110
        t=0 0
        m=audio 5005 RTP/AVP 8
        a=rtpmap:8 PCMA/8000
        a=fmtp:8 0-15`.replace(/^[ \t]+/gm, '');
        
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
                client_callback({type:'CALL_FAILED', message:{statusCode:408, statusText:'Request Timeout'}});
                return;
            }
            this.send(SIP.Builder.SIPMessageObject('INVITE', h, challenge_headers, proxy_auth), (response) => {
                console.log(response)
                if(response.statusCode == 400){
                    console.log('400 Bad Request');
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
                    //delete this.message_stack[tag];
                    client_callback({type:'CALL_REJECTED', message:response});
                    return;
                }else if (response.statusCode == 183) {
                    console.log('183 Session Progress');
                    return
                }else if (response.statusCode == 200) {
                    console.log('200 OK');
                    console.log('ack')
                    this.ack(response);
                    client_callback({type:'CALL_CONNECTED', message:response, sdp: response.body});
                    return;
                }else if (response.isResponse == false && response.method == 'BYE') {
                    console.log('BYE Received');
                    this.send(this.response({   
                        statusCode: 200,
                        statusText: 'OK',
                        headers: SIP.Parser.ParseHeaders(res.headers)
                    }))  
                    return;
                }else if(response.isResponse == false && response.method == 'INFO'){
                    console.log('INFO Received');
                    console.log(response.body)
                    this.send(this.response({   
                        statusCode: 200,
                        statusText: 'OK',
                        headers: SIP.Parser.ParseHeaders(res.headers)
                    }))  
                    return;
                }else {
                    console.error('Unexpected status code:', response.statusCode);
                }
            });
        };
        
        sendInvite();
    }

    accept(message, sdp, client_callback){
        var cseq = 1;
        let our_sdp = `v=0
                        o=- 123456789 123456789 IN IP4 192.168.1.110
                        s=Asterisk Call
                        c=IN IP4 192.168.1.110
                        t=0 0
                        m=audio 5005 RTP/AVP 8
                        a=rtpmap:8 PCMA/8000
                        a=fmtp:8 0-15`.replace(/^[ \t]+/gm, '');
        var headers = SIP.Parser.ParseHeaders(message.headers);
        this.send(this.response({
            statusCode: 100,
            statusText: 'Trying',
            headers: headers
        }))
        this.send(this.response({
            statusCode: 180,
            statusText: 'Ringing',
            headers: headers
        }))
        this.send(this.response({
            statusCode: 200,
            statusText: 'OK',
            headers: headers,
            body: our_sdp
        }), (d) => {
            if(d.isResponse == false && d.method == 'BYE'){
                this.send(this.response({   
                    statusCode: 200,
                    statusText: 'OK',
                    headers: SIP.Parser.ParseHeaders(res.headers)
                }))  
                return;
            }
        })
        client_callback({type:'CALL_ACCEPTED', message:message, sdp: sdp});
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

    response(props){
        //function to calulate nonce and opaque given the username and password
        let nonce = SIP.Builder.generateNonce(props.username, props.password);
        let opaque = SIP.Builder.generateNonce(props.username, props.password);
        let ret = {
            statusCode: props.statusCode,
            statusText: props.statusText,
            isResponse: true,
            protocol: 'SIP/2.0',
            headers: {
                'Via': `SIP/2.0/UDP ${props.headers.Via.uri.ip}:${props.headers.Via.uri.port || 5060};branch=${props.headers.Via.branch}`,
                'To': `<sip:${props.headers.From.contact.username}@${props.headers.Via.uri.ip}:${props.headers.Via.uri.port || 5060}>`,
                'From': `<sip:${props.headers.To.contact.username}@${props.headers.Via.uri.ip}:${props.headers.Via.uri.port || 5060}>;tag=${props.headers.From.tag}`,
                'Call-ID': props.headers['Call-ID'],
                'CSeq': `${props.headers.CSeq.count} ${props.headers.CSeq.method}`,
                'Contact': `<sip:${props.headers.To.contact.username}@${props.headers.Via.uri.ip}:${props.headers.Via.uri.port || 5060}>`,
                'Max-Forwards': SIP.Builder.max_forwards,
                'User-Agent': SIP.Builder.user_agent,
                'Content-Length': '0',
            },
            body: props.body || ''
        }   

        if(props.body !== '' && props.body !== undefined){
            ret.headers['Content-Length'] = props.body.length;
            ret.headers['Content-Type'] = 'application/sdp';
        }

        if(props.auth_required == true){
            ret.headers['WWW-Authenticate'] = `Digest realm="grandstream",nonce="${nonce}",opaque="${opaque}",algorithm=md5,qop="auth"`
        }

        if(props.expires){
            ret.headers.Contact = ret.headers.Contact + `;expires=${props.expires}`;
        }

        console.log(ret)

        return ret;
    }

    ack(message){
        var headers = SIP.Parser.ParseHeaders(message.headers);
        var new_message = {
            isResponse: false,
            protocol: 'SIP/2.0',
            method: 'ACK',
            requestUri: `sip:${headers.To.contact.username}@${headers.Via.uri.ip}:${headers.Via.uri.port || 5060}`,
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
        }
        this.send(new_message)
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