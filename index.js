//Nik Hendricks 10/13/23
const SIP = require('./SIP')
const utils = require('./utils')
const SDPParser = require('./SDP')
const RTP = require('./RTP')

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
        this.SessionManager = new RTP.SessionManager();
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
        this.UserManager = new SIP.UserManager(VOIP);
        this.IVRManager = new SIP.IVRManager(VOIP);
        this.Router = props.Router || new SIP.Router({context: this});
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

        this.Router.addEndpointType({
            type: 'trunk',
            manager: this.TrunkManager,
            behavior: (d) => {
                console.log('TRUNK BEHAVIOR')
                console.log(d)
                let final_ep = this.TrunkManager.items[endpoint.endpoint];


            }
        })

        this.Router.addEndpointType({
            type: 'extension',
            manager: this.UserManager,
            behavior: (props) => {
                console.log('EXTENSION BEHAVIOR')
                let final_ep = props.callee_endpoint;
                let caller_final_ep = props.caller_endpoint;
                this.internal_uac.uac_init_call({
                    username:props.caller_endpoint.endpoint.extension,
                    to: props.callee_endpoint.endpoint.extension,
                    branch: props.root_invite_headers.Via.branch,
                    from_tag: props.root_invite_headers.From.tag,
                    callId: props.root_invite_headers['Call-ID'],
                    ip: props.callee_endpoint.endpoint.ip,
                    port: props.callee_endpoint.endpoint.port,
                    body: props.root_invite_body,
                    client_callback: (root_response) => {
                        let m = {...root_response.message};
                        m.headers = SIP.Parser.ParseHeaders(m.headers);
                        this.server_send(SIP.Builder.SIPMessageObject(m), props.caller_endpoint.endpoint.ip, props.caller_endpoint.endpoint.port, (d) => {
                            let m = {...d};
                            m.headers = SIP.Parser.ParseHeaders(m.headers);
                            m.headers['Call-ID'] = props.root_invite_headers['Call-ID'];
                            
                            this.internal_uac.server_send(SIP.Builder.SIPMessageObject(m), props.callee_endpoint.endpoint.ip, props.callee_endpoint.endpoint.port);
                        })
                    }
                })
            }
        })

        this.Router.addEndpointType({
            type: 'VOIP/IVR',
            manager: this.IVRManager,
            behavior: (props) => {
                console.log('IVR BEHAVIOR')        
                let h = {...props.root_invite_headers};
                h.From.contact.username = `${props.callee_endpoint.endpoint.name}`;
                let s = this.SessionManager.new_session({
                    call_id: props.root_invite_headers['Call-ID'],
                    sdp: props.root_invite_body,
                    callback: (d) => {
                        if(d.type == 'SESSION_STARTED'){
                            h['Content-Type'] = 'application/sdp';
                            this.server_send(SIP.Builder.SIPMessageObject({
                                isResponse: true,
                                statusCode: 200,
                                statusText: 'OK',
                                headers: h,
                                body:  s.listen_sdp
                            }), h.Contact.contact.ip, h.Contact.contact.port, (d) => {
                                console.log('IVR RESPONSE CALLBACK')
                                console.log(d)
                                let parsed_headers = SIP.Parser.ParseHeaders(d.headers);
                                if(d.method == 'BYE'){
                                    console.log('IVR BYE')
                                    this.server_send(SIP.Builder.SIPMessageObject({
                                        isResponse: true,
                                        statusCode: 200,
                                        statusText: 'OK',
                                        headers: parsed_headers,
                                    }), parsed_headers.Contact.contact.ip, parsed_headers.Contact.contact.port)
                                    s.stop();
                                }
                            })
                        }else{
                            console.log('SESSION CALLBACK ELSE')
                            console.log(d)
                        }
                    }
                })

                s.start();
            }
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
            var call_id = SIP.Parser.ParseHeaders(res.headers)['Call-ID'];
            let check_for_callbacks = (tag, branch) => {
                //et mg = [].concat.apply([], Object.entries(this.message_stack[branch]).map((d => d[1]))).filter((d) => d.sent == true)
                let mg = this.message_stack[call_id].filter((d) => d.sent == true)
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

            //if(this.message_stack[branch] == undefined){
            //    this.message_stack[branch] = {};
            //}
            //if(this.message_stack[branch][tag] == undefined){
            //    this.message_stack[branch][tag] = [];
            //}
            //this.message_stack[branch][tag].push({message:res, sent: false})
            if(this.message_stack[call_id] == undefined){
                this.message_stack[call_id] = [];
            };

            this.message_stack[call_id].push({message:res, sent: false})


            let cb = check_for_callbacks(tag, branch);
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
        var call_id = SIP.Parser.ParseHeaders(message.headers)['Call-ID'];
        //if(!this.message_stack[branch]){
        //    this.message_stack[branch] = {};
        //    this.message_stack[branch][tag] = [];
        //}else if(this.message_stack[branch][tag] == undefined){
        //    this.message_stack[branch][tag] = [];
        //}
        if(this.message_stack[call_id] == undefined){
            this.message_stack[call_id] = [];
        }
        //this.message_stack[branch][tag].push({message, callback: msg_callback, sent: true})
        this.message_stack[call_id].push({message, callback: msg_callback, sent: true})
    }

    send(message, msg_callback){
        var built = SIP.Builder.Build(message)   
        this.transport.send(built, this.register_ip, this.register_port)
        var tag = SIP.Parser.ParseHeaders(message.headers).From.tag;
        var branch = SIP.Parser.ParseHeaders(message.headers).Via.branch;
        var call_id = SIP.Parser.ParseHeaders(message.headers)['Call-ID'];
        //if(!this.message_stack[branch]){
        //    this.message_stack[branch] = {};
        //    this.message_stack[branch][tag] = [];
        //}else if(this.message_stack[branch][tag] == undefined){
        //    this.message_stack[branch][tag] = [];
        //}
        if(this.message_stack[call_id] == undefined){
            this.message_stack[call_id] = [];
        }
        //this.message_stack[branch][tag].push({message, callback: msg_callback, sent: true})
        this.message_stack[call_id].push({message, callback: msg_callback, sent: true})
    }

    uac_responses(msg, client_callback){
        var res = SIP.Parser.parse(msg.toString());
        var tag = SIP.Parser.ParseHeaders(res.headers).From.tag;
        var branch = SIP.Parser.ParseHeaders(res.headers).Via.branch;
        var type = res.method || res.statusCode;
        if(type == 'NOTIFY'){
            console.log('uac_responses > NOTIFY')
            let h =  SIP.Parser.ParseHeaders(res.headers)
            delete h['Content-Length']
            delete h['Content-Type']
            this.send(SIP.Builder.SIPMessageObject({   
                isResponse: true,
                statusCode: 200,
                statusText: 'OK',
                headers: h
            }))  
        }else if (type == 'INFO') {
            console.log('uac_responses > INFO')
            let h =  SIP.Parser.ParseHeaders(res.headers)
            delete h['Content-Length']
            delete h['Content-Type']
            this.send(SIP.Builder.SIPMessageObject({   
                isResponse: true,
                statusCode: 200,
                statusText: 'OK',
                headers: h
            }))  
        }else if (type == 'INVITE') {
            console.log('uac_responses > INVITE')
            this.accept(res, SIP.Parser.parse(msg.toString()).body, client_callback)
        }
    }

    uas_responses(msg, client_callback){
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

        if(this.UserManager.items[client_username] !== undefined){
            this.UserManager.items[client_username].ip = client_ip;
            this.UserManager.items[client_username].port = client_port;
            let authorization = parsed_headers.Authorization;
            if(authorization !== undefined){
                this.UserManager.items[client_username].registered = true;
                this.server_send(SIP.Builder.SIPMessageObject({
                    isResponse: true,
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
                this.server_send(SIP.Builder.SIPMessageObject({
                    isResponse: true,
                    statusCode: 401,
                    statusText: 'Unauthorized',
                    headers: parsed_headers,
                    auth_required: true
                }), client_ip, client_port)
            }
        }else{
            this.server_send(SIP.Builder.SIPMessageObject({
                isResponse: true,
                statusCode: 403,
                statusText: 'Forbidden',
                headers: parsed_headers,
            }), client_ip, client_port)
        }
    }

    uas_handle_invite(msg, client_callback){
        console.log('uas_handle_invite')
        let root_invite_headers = SIP.Parser.ParseHeaders(msg.headers);
        if(root_invite_headers.Authorization !== undefined){ 
            let callee_endpoint = this.Router.route(root_invite_headers.To.contact.username);
            let caller_endpoint = this.Router.route(root_invite_headers.From.contact.username);
            if(callee_endpoint !== null && caller_endpoint !== null){
                callee_endpoint.endpoint_type.behavior({
                    callee_endpoint: callee_endpoint,
                    caller_endpoint: caller_endpoint,
                    root_invite_headers: SIP.Parser.ParseHeaders(msg.headers),
                    root_invite_body: msg.body,
                })
            }else{
                this.server_send(SIP.Builder.SIPMessageObject({
                    isResponse: true,
                    statusCode: 404,
                    statusText: 'Not Found',
                    headers: root_invite_headers
                }), root_invite_headers.Contact.contact.ip, root_invite_headers.Contact.contact.port)
            }
        }else{
            //401 Unauthorized
            this.server_send(SIP.Builder.SIPMessageObject({
                isResponse: true,
                statusCode: 401,
                statusText: 'Unauthorized',
                headers: root_invite_headers,
                auth_required: true
            }), root_invite_headers.Contact.contact.ip, root_invite_headers.Contact.contact.port)

        }
    }

    uas_handle_subscribe(msg, client_callback){
        console.log('uas_handle_subscribe')
        let parsed_headers = SIP.Parser.ParseHeaders(msg.headers);
        this.server_send(SIP.Builder.SIPMessageObject({
            isResponse: true,
            statusCode: 200,
            statusText: 'OK',
            headers: parsed_headers,
        }), parsed_headers.Contact.contact.ip, parsed_headers.Contact.contact.port)


        setTimeout(() => {
            //send NOTIFY with fake voice mail
            let body = `Voice-Mail: 1/1 (0/0)`;
            this.server_send(SIP.Builder.SIPMessageObject({
                isResponse: false,
                method: 'NOTIFY',
                requestUri: `${parsed_headers.Contact.contact.username}@${parsed_headers.Contact.contact.ip}:${parsed_headers.Contact.contact.port}`,
                headers: {
                    ...parsed_headers,
                    'Event': 'message-summary',
                    'Subscription-State': 'active',
                    'Content-Type': 'application/simple-message-summary',
                    'Content-Length': '0',
                },
                body: body
            }), parsed_headers.Contact.contact.ip, parsed_headers.Contact.contact.port)
        }, 5000)



    }

    register(props, client_callback){
        var try_count = 0;
        var headers = {
            'Via': { uri: { ip: this.transport.ip, port: this.transport.port } },
            'To': { contact: { username: this.username, ip: props.register_ip, port: props.register_port } },
            'From': { contact: { username: this.username, ip: this.transport.ip, port: this.transport.port } },
            'CSeq': { count: '1', method: 'REGISTER' },
            'Contact': { contact: { username: props.username, ip: this.transport.ip, port: this.transport.port } },
        }

        const sendRegister = (challenge_headers, proxy_auth = false) => {
            try_count++;
            this.registration_cseq++;
            if(try_count > this.max_retries){
                console.log('Max retries reached');
                client_callback({type:'REGISTER_FAILED', message:{statusCode:408, statusText:'Request Timeout'}});
                return;
            }

            this.send(SIP.Builder.SIPMessageObject({
                isResponse: false,
                method: 'REGISTER',
                requestUri: `sip:${this.register_ip}:${this.register_port}`,
                headers: headers,
                challenge_data: challenge_headers,
                proxy_auth: proxy_auth
            }), (d) => {

                let ph = SIP.Parser.ParseHeaders(d.headers);
                let challenge_data = (ph['WWW-Authenticate'] !== undefined) ? ph['WWW-Authenticate'] : ph['Proxy-Authenticate'];
                headers.CSeq.count = this.registration_cseq;
                this.send(SIP.Builder.SIPMessageObject({
                    isResponse: false,
                    method: 'REGISTER',
                    requestUri: `sip:${this.register_ip}:${this.register_port}`,
                    headers: headers,
                    challenge_data: challenge_data,
                    proxy_auth: (ph['Proxy-Authenticate'] !== undefined) ? true : false,
                    username: this.username,
                    password: this.register_password
                }), (d) => {
                    let parsed_headers = SIP.Parser.ParseHeaders(d.headers);
                    if(d.statusCode == 200){

                        console.log(`REGISTERED for ${parsed_headers.Contact.expires} seconds`);
                        setTimeout(() => {
                            let tag = parsed_headers.From.tag;
                            let branch = parsed_headers.Via.branch;
                            props.callId = SIP.Builder.generateBranch();
                            this.register(props, client_callback);
                        }, parsed_headers.Contact.expires * 1000);
                        this.status = 'REGISTERED';
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

    uac_init_call(props){
        var cseq = 1;
        var try_count = 0;

        var h = {
            'Via': { uri: { ip: this.transport.ip, port: this.transport.port }, branch: props.branch },
            'To': { contact: { username: props.to, ip: props.ip } },
            'From': { contact: { username: props.username, ip: this.transport.ip, port: this.transport.port }, tag: props.from_tag },
            'CSeq': { count: 1, method: 'INVITE' },
            'Contact': { contact: { username: props.username, ip: this.transport.ip, port: this.transport.port } },
            'Content-Type': 'application/sdp',
            'Call-ID': props.callId,
        }


        const sendInvite = (challenge_headers, proxy_auth = false) => {
            try_count++;
            if(try_count > this.max_retries){
                console.log('Max retries reached');
                props.client_callback({type:'CALL_FAILED', message:{statusCode:408, statusText:'Request Timeout'}});
                return;
            }
            
            let inv_message = SIP.Builder.SIPMessageObject({
                isResponse: false,
                method: 'INVITE',
                requestUri: `sip:${props.to}@${props.ip}:${props.port}`,
                headers: h,
                challenge_data: challenge_headers,
                proxy_auth: proxy_auth,
                username: this.username,
                password: this.register_password,
                body: props.body
            })

            let responses = (response) => {
                if(response.statusCode == 400){
                    console.log('400 Bad Request');
                    return;
                }else if (response.statusCode == 401 || response.statusCode == 407) {
                    let challenge_data = (response.statusCode == 401) ? SIP.Parser.ParseHeaders(response.headers)['WWW-Authenticate'] : SIP.Parser.ParseHeaders(response.headers)['Proxy-Authenticate'];
                    sendInvite(challenge_data, false);
                }else{
                    props.client_callback({type: response.statusCode || response.method, message: response, generated_branch: h.branchId, generated_tag: h.from_tag, sdp: response.body});
                }
            }

            if(this.server_uac == true){
                this.server_send(inv_message, props.ip, props.port, (response) => {
                    responses(response)
                });
            }else{
                this.send(inv_message, (response) => {
                    responses(response)
                });
            }
        }

        sendInvite();
    }

    response(props){
        let nonce = SIP.Builder.generateChallengeNonce();
        let opaque = SIP.Builder.generateChallengeOpaque();
        let ret = {
            isResponse: props.isResponse,
            statusCode: (props.isResponse) ? props.statusCode : undefined,
            statusText: (props.isResponse) ? props.statusText : undefined,
            method: (props.isResponse) ? undefined : props.method,
            requestUri: (props.isResponse) ? undefined : props.requestUri,
            protocol: 'SIP/2.0',
            headers: {
                'Via': `SIP/2.0/UDP ${props.headers.Via.uri.ip}:${props.headers.Via.uri.port};branch=${props.headers.Via.branch || SIP.Builder.generateBranch()}`,
                'To': `<sip:${props.headers.To.contact.username}@${props.headers.To.contact.ip}${props.headers.To.contact.port ? `:${props.headers.To.contact.port}` : ''}>${(props.headers.To.tag) ? `;tag=${props.headers.To.tag}` : ``}`,
                'From': `<sip:${props.headers.From.contact.username}@${props.headers.From.contact.ip}${props.headers.From.contact.port ? `:${props.headers.From.contact.port}` : ''}>;tag=${props.headers.From.tag || SIP.Builder.generateTag()}`,
                'Call-ID': props.headers['Call-ID'] || `1-${props.headers.From.contact.username}-1@${this.transport.ip}-${this.transport.port}${Math.floor(Math.random() * 100000000)}`,
                'CSeq': `${props.headers.CSeq.count} ${props.headers.CSeq.method}`,
                'Max-Forwards': SIP.Builder.max_forwards,
                'User-Agent': SIP.Builder.user_agent,
                'Content-Length': '0',
            },
            body: props.body || ''
        }   
        if(props.headers.Contact){
            ret.headers.Contact = `<sip:${props.headers.Contact.contact.username}@${props.headers.Contact.contact.ip}:${props.headers.Contact.contact.port}>`
        }

        if(props.headers['Content-Type']){
            ret.headers['Content-Type'] = props.headers['Content-Type'];
            if(props.body){
                ret.headers['Content-Length'] = props.body.length;
            }
        }
        if (props.challenge_data) {
            var cnonce = SIP.Builder.generateBranch();
            if(props.proxy_auth == true){
                ret.headers['Proxy-Authorization'] = `Digest username="${props.username}", realm="${props.challenge_data.realm}", nonce="${props.challenge_data.nonce}", uri="${ret.requestUri}", response="${SIP.Builder.DigestResponse(props.username, props.password, props.challenge_data.realm, props.challenge_data.nonce, ret.method, ret.requestUri, props.challenge_data.qop, cnonce, '00000001')}", qop="${props.challenge_data.qop}", cnonce="${cnonce}", nc="00000001", algorithm="MD5"`;
            }else{
                ret.headers['Authorization'] = `Digest username="${props.username}", realm="${props.challenge_data.realm}", nonce="${props.challenge_data.nonce}", uri="${ret.requestUri}", response="${SIP.Builder.DigestResponse(props.username, props.password, props.challenge_data.realm, props.challenge_data.nonce, ret.method, ret.requestUri, props.challenge_data.qop, cnonce, '00000001')}", qop="${props.challenge_data.qop}", cnonce="${cnonce}", nc="00000001", algorithm="MD5"`;
            }
        }

        if(props.auth_required == true){
            ret.headers['WWW-Authenticate'] = `Digest realm="node.js-sip",nonce="${nonce}",opaque="${opaque}",algorithm=md5,qop="auth"`
        }

        if(props.expires){
            ret.headers.Contact = ret.headers.Contact + `;expires=${props.expires}`;
        }

        console.log(ret)
        return ret;

    }
}

module.exports = VOIP;