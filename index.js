//Nik Hendricks 10/13/23
const SIP = require('./SIP')
const utils = require('./utils')
const SDPParser = require('./SDP')

class VOIP{
    constructor(props, callback){
        props = props || {};
        this.transparent = props.transparent || false; //enableing transparent mode will cause the deafault repsonses to be bypassed and the user will have to handle the responses themselves.
        this.unique_debug_id = props.unique_debug_id || `VOIP_${(this.type == 'client') ? 'UAC' : 'UAS'}__${Math.floor(Math.random() * 1000000)}`;
        this.SDPParser = SDPParser;
        this.transport = (props.existing_transport !== undefined) ? props.existing_transport : new SIP.Transport({
            type: props.transport.type || 'udp4',
            port: props.transport.port || Math.floor(Math.random() * 65535) + 1,
            ip: utils.getLocalIpAddress(),
        });
        this.utils = utils;
        this.message_stack = {};
        this.type = props.type;
        if(props.type == 'client'){
            this.UAC(props, callback);
        }else if(props.type == 'server'){
            this.UAS(props, callback);
        }
    }
        
    UAS(props, callback){
        this.TrunkManager = new SIP.TrunkManager(VOIP); //need to pass the VOIP class through so that new UACs can be created as the Trunks.
        this.UserManager = new SIP.UserManager();
        this.Router = props.Router || new SIP.Router();
        this.internal_uac = new VOIP({
            type:'client',
            server_uac: true,
            transport:{
                type: 'udp4',
                port: Math.floor(Math.random() * 65535) + 1,
                ip: utils.getLocalIpAddress(),
            },
            transparent: true,
        }, (d) => {
            console.log('internal_uac callback')
            console.log(d)
        })
        
        callback({type:'UAS_READY'})
        this.sip_event_listener(callback, 'server');
    }
    
    UAC(props, client_callback){
        this.server_uac = props.server_uac || false;
        this.username = props.username;
        this.register_ip = props.register_ip;
        this.register_port = props.register_port || 5060;
        this.register_password = props.register_password;
        this.ip = this.transport.ip;
        this.port = this.transport.port;
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
            if(msg.toString().length <= 4){
                return;
            }
            var res = SIP.Parser.parse(msg.toString());
            if(res === undefined){
                return;
            }
            var tag = SIP.Parser.ParseHeaders(res.headers).From.tag;
            var branch = SIP.Parser.ParseHeaders(res.headers).Via.branch;

            let check_for_callbacks = (tag, branch) => {
                let mg = [].concat.apply([], Object.entries(this.message_stack[branch]).map((d => d[1]))).filter((d) => d.sent == true)
                if(mg.length == 0){
                    return;
                }
                var c = null;            
                for(var i = mg.length - 1; i >= 0; i--){
                    if(mg[i].callback !== undefined){
                        console.log('callback found')
                        c = mg[i].callback;
                        break;
                    }
                }
                if(c == null){
                    return undefined;
                }
                return c
            }

            if(this.message_stack[branch] == undefined){
                this.message_stack[branch] = {};
            }
            if(this.message_stack[branch][tag] == undefined){
                this.message_stack[branch][tag] = [];
            }
            this.message_stack[branch][tag].push({message:res, sent: false})

            let cb = check_for_callbacks(tag, branch);
            console.log('cb > ', cb)

            if(cb == undefined){
                console.log('no callback')
                if(user_agent_type == 'client'){
                    if(this.transparent == true){
                        client_callback({type:res.method || res.statusCode, message:res})
                    }else{
                        this.uac_responses(msg, client_callback)
                    }
                }else if(user_agent_type == 'server'){
                    if(this.transparent == true){
                        client_callback({type:res.method || res.statusCode, message:res})
                    }else{
                        this.uas_responses(msg, client_callback)
                    }
                }
            }else{
                cb(res);
            }
        })
    }

    server_send(message, ip, port, msg_callback){
        var built = SIP.Builder.Build(message)   
        this.transport.send(built, ip, port)
        var tag = SIP.Parser.ParseHeaders(message.headers).From.tag;
        var branch = SIP.Parser.ParseHeaders(message.headers).Via.branch;
        if(!this.message_stack[branch]){
            this.message_stack[branch] = {};
            this.message_stack[branch][tag] = [];
        }else if(this.message_stack[branch][tag] == undefined){
            this.message_stack[branch][tag] = [];
        }
        this.message_stack[branch][tag].push({message, callback: msg_callback, sent: true})
    }

    send(message, msg_callback){
        var built = SIP.Builder.Build(message)   
        this.transport.send(built, this.register_ip, this.register_port)
        var tag = SIP.Parser.ParseHeaders(message.headers).From.tag;
        var branch = SIP.Parser.ParseHeaders(message.headers).Via.branch;
        if(!this.message_stack[branch]){
            this.message_stack[branch] = {};
            this.message_stack[branch][tag] = [];
        }else if(this.message_stack[branch][tag] == undefined){
            this.message_stack[branch][tag] = [];
        }
        this.message_stack[branch][tag].push({message, callback: msg_callback, sent: true})
        console.log('send > message_stack')
        console.log(this.message_stack)
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
        }else if(type == 401){
            console.log('uac_responses > 401')
            this.send(this.response({   
                statusCode: 401,
                statusText: 'Unauthorized',
                headers: SIP.Parser.ParseHeaders(res.headers)
            }))
        }
    }

    uas_responses(msg, client_callback){
        //have check for a transparent mode in the future. which is enabled for now.
        var res = SIP.Parser.parse(msg.toString());
        var type = res.method || res.statusCode;
        console.log('UAS RESPONSES > client_callback')
        client_callback({type:type, message:res})
    }

    uas_handle_registration(msg, client_callback){
        console.log('uas_handle_registration')
        var parsed_headers = SIP.Parser.ParseHeaders(msg.headers);
        let client_username = parsed_headers.Contact.contact.username;
        let client_ip = parsed_headers.Contact.contact.ip;
        let client_port = parsed_headers.Contact.contact.port;
        console.log(parsed_headers)

        if(this.UserManager.users[client_username] !== undefined){
            this.UserManager.users[client_username].ip = client_ip;
            this.UserManager.users[client_username].port = client_port;
            let authorization = parsed_headers.Authorization;
            if(authorization !== undefined){
                this.UserManager.users[client_username].registered = true;
                this.server_send(this.response({
                    statusCode: 200,
                    statusText: 'OK',
                    headers: parsed_headers,
                    expires: 3600
                }), client_ip, client_port)
                this.Router.addRoute({
                    name: `Extension ${client_username}`,
                    type: 'extension',
                    match: `^${client_username}$`,
                    endpoint: client_username
                })
            }else{
                this.server_send(this.response({
                    statusCode: 401,
                    statusText: 'Unauthorized',
                    headers: parsed_headers,
                    auth_required: true
                }), client_ip, client_port)
            }
        }else{
            this.server_send(this.response({
                statusCode: 403,
                statusText: 'Forbidden',
                headers: parsed_headers,
            }), client_ip, client_port)
        }
    }

    uas_handle_invite(msg, client_callback){
        console.log('uas_handle_invite')
        var parsed_headers = SIP.Parser.ParseHeaders(msg.headers);
        let invite_branch = parsed_headers.Via.branch;
        let authorization = parsed_headers.Authorization;

        if(authorization !== undefined){
            let callee = parsed_headers.To.contact.username;
            let caller = parsed_headers.From.contact.username;
            let endpoint = this.Router.route(callee);
            console.log('ENDPOINT')
            console.log(endpoint)
            if(endpoint == null){
                this.server_send(this.response({
                    statusCode: 404,
                    statusText: 'Not Found',
                    headers: parsed_headers
                }), parsed_headers.Contact.contact.ip, parsed_headers.Contact.contact.port)
            }else if(endpoint.type.toLowerCase() == 'trunk'){
                let final_ep = this.TrunkManager.trunks[endpoint.endpoint];
                console.log(this.TrunkManager.trunks[endpoint.endpoint])

                this.accept(msg, SIP.Parser.parse(msg.toString()).body, client_callback)

                final_ep.uac.call({username:caller, to: callee, ip: final_ep.uac.register_ip, port: final_ep.uac.register_port, client_callback: (d) => {
                    console.log('call callback')
                    console.log(d)
                }})
            }else if(endpoint.type.toLowerCase() == 'extension'){
                let final_ep = this.UserManager.users[endpoint.endpoint];
                console.log('uas_handle_invite > uac_call')

                this.internal_uac.call({username:caller, to: callee, ip: final_ep.ip, port: final_ep.port, client_callback: (d) => {

                }})
            }
        }else{
            //401 Unauthorized
            this.server_send(this.response({
                statusCode: 401,
                statusText: 'Unauthorized',
                headers: parsed_headers,
                auth_required: true
            }), parsed_headers.Contact.contact.ip, parsed_headers.Contact.contact.port)

        }
    }

    register(props, client_callback){
        var try_count = 0;
        var headers = {
            to: this.username,
            ip: this.register_ip,
            port: this.register_port,
            requestUri: `sip:${this.register_ip}`,
            username: this.username,
            callId: props.callId || '123',
            cseq: this.registration_cseq,
            branchId: SIP.Builder.generateBranch(),
            from_tag: SIP.Builder.generateTag(),
            remote_port:this.transport.port,
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

    call(props){
        var cseq = 1;
        var try_count = 0;
        var sdp = `v=0
        o=- 123456789 123456789 IN IP4 ${utils.getLocalIpAddress()}
        s=node.js-sip Call
        c=IN IP4 ${utils.getLocalIpAddress()}
        t=0 0
        m=audio 5005 RTP/AVP 8
        a=rtpmap:8 PCMA/8000
        a=fmtp:8 0-15`.replace(/^[ \t]+/gm, '');

        let h = {
            to: props.to,
            ip: props.ip || this.register_ip,
            port: props.port,
            username: props.username,
            callId: SIP.Builder.generateBranch(),
            cseq: cseq,
            branchId: SIP.Builder.generateBranch(),
            from_tag: SIP.Builder.generateTag(),
            body: sdp,
            password: this.register_password,
            requestUri: `sip:${props.to}@${props.ip}:${props.port}`,
            remote_port: this.transport.port,
        };

        const sendInvite = (challenge_headers, proxy_auth = false) => {
            try_count++;
            if(try_count > this.max_retries){
                console.log('Max retries reached');
                props.client_callback({type:'CALL_FAILED', message:{statusCode:408, statusText:'Request Timeout'}});
                return;
            }

            
            let inv_responses = (response) => {
                if(response.statusCode == 400){
                    console.log('400 Bad Request');
                    return;
                }else if (response.statusCode == 401 || response.statusCode == 407) {
                    let challenge_data = (response.statusCode == 401) ? SIP.Parser.ParseHeaders(response.headers)['WWW-Authenticate'] : SIP.Parser.ParseHeaders(response.headers)['Proxy-Authenticate'];
                    sendInvite(challenge_data, false);
                }else if (response.statusCode == 100) {
                    console.log('100 Trying');
                    return;
                }else if (response.statusCode == 403) {
                    console.log('403 Forbidden');
                    props.client_callback({type:'CALL_REJECTED', message:response});
                    return;
                }else if (response.statusCode == 486) {
                    console.log('486 Busy Here');
                    props.client_callback({type:'CALL_BUSY', message:response});
                    return;
                }else if (response.statusCode == 183) {
                    console.log('183 Session Progress');
                    return
                }else if (response.statusCode == 200) {
                    if(this.server_uac == true){
                        this.server_send(this.response({   
                            statusCode: 200,
                            statusText: 'OK',
                            headers: SIP.Parser.ParseHeaders(response.headers)
                        }), h.ip, h.port)
                    }else{
                        this.send(this.response({   
                            statusCode: 200,
                            statusText: 'OK',
                            headers: SIP.Parser.ParseHeaders(response.headers)
                        }))
                    }
                    props.client_callback({type:'CALL_CONNECTED', message:response, sdp: response.body});
                    return;
                }else if (response.isResponse == false && response.method == 'BYE') {
                    console.log('BYE Received');
                    let res = this.response({   
                        statusCode: 200,
                        statusText: 'OK',
                        headers: SIP.Parser.ParseHeaders(response.headers)
                    })
                    if(this.server_uac == true){
                        this.server_send(res, h.ip, h.port)
                    }else{
                        this.send(res)  
                    }

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
            }

            let inv_message = SIP.Builder.SIPMessageObject('INVITE', h, challenge_headers, proxy_auth);

            if(this.server_uac == true){
                this.server_send(inv_message, h.ip, h.port, (response) => {
                    inv_responses(response)
                });
            }else{
                this.send(inv_message, (response) => {
                    inv_responses(response)
                });
            }
        };
        
        sendInvite();
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
        let nonce = SIP.Builder.generateChallengeNonce();
        let opaque = SIP.Builder.generateChallengeOpaque();
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
            ret.headers['WWW-Authenticate'] = `Digest realm="node.js-sip",nonce="${nonce}",opaque="${opaque}",algorithm=md5,qop="auth"`
        }

        if(props.expires){
            ret.headers.Contact = ret.headers.Contact + `;expires=${props.expires}`;
        }
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
                'To': `<sip:${headers.To.contact.username}>@${headers.Via.uri.ip}:${headers.Via.uri.port || 5060}`,
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