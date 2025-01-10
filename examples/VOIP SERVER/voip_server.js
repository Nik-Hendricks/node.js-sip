//Nik Hendricks 10/13/23
const SIP = require('../../SIP')
const VOIP = require('../../')
const utils = require('../../utils')

const USERS = {
    '1000':{
        password:'rootPassword',
        name:'test testerson',
        ip:undefined,
        port:undefined,
        registered:false,
        call_id:undefined,  
    },
    '1001':{
        password:'rootPassword',
        name:'Bill Billerson',
        ip:undefined,
        port:undefined,
        registered:false,
        call_id:undefined,  
    }
}


var server = new VOIP({
    type:'server',
    transport:{
        type: 'UDP',
        ip: utils.getLocalIpAddress(),
        port: 5060,
    }
},
(d) => {
    console.log(d)
    if(d.message !== undefined){
        let parsed_headers = SIP.Parser.ParseHeaders(d.message.headers);
        console.log('parsed_headers')
        console.log(parsed_headers)
        if(d.type == 'REGISTER'){
            let message = server.response({
                statusCode: 401,
                statusText: 'Unauthorized',
                headers: parsed_headers,
                auth_required: true
            })
            USERS[parsed_headers.To.contact.username].nonce = message.headers['WWW-Authenticate'].nonce;
            server.server_send(message, parsed_headers.Contact.contact.ip, parsed_headers.Contact.contact.port, (d) => {
                parsed_headers = SIP.Parser.ParseHeaders(d.headers);
                if(d.isResponse == false && d.method == 'REGISTER'){
                    let auth = parsed_headers.Authorization;
                    if(auth !== undefined){
                        if(USERS[auth.username] !== undefined){
                            let client_ip = parsed_headers.Contact.contact.ip;
                            let client_port = parsed_headers.Contact.contact.port;
                            USERS[auth.username].ip = client_ip;
                            USERS[auth.username].port = client_port;

                            var response = server.response({
                                statusCode: 200,
                                statusText: 'OK',
                                headers: parsed_headers,
                                expires: 3600
                            })

                            console.log(`REGISTERED ${auth.username}`)
                            USERS[auth.username].registered = true;
                            console.log(USERS)

                        }else{
                            var response = server.response({
                                statusCode: 401,
                                statusText: 'Unauthorized',
                                headers: parsed_headers,
                                auth_required: true
                            })
                        }
                    }else{
                        var response = server.response({
                            statusCode: 401,
                            statusText: 'Unauthorized',
                            headers: parsed_headers,
                            auth_required: true
                        })
                    }
                    server.server_send(response, parsed_headers.Contact.contact.ip, parsed_headers.Contact.contact.port)
                }
            })
        }else if(d.type == 'INVITE'){
            let message = server.response({
                statusCode: 401,
                statusText: 'Unauthorized',
                headers: parsed_headers,
                auth_required: true
            })
            server.server_send(message, parsed_headers.Contact.contact.ip, parsed_headers.Contact.contact.port, (d) => {
                parsed_headers = SIP.Parser.ParseHeaders(d.headers);
                if(d.isResponse == false && d.method == 'INVITE'){
                    let auth = parsed_headers.Authorization;
                    if(auth !== undefined){
                        if(USERS[auth.username] !== undefined){


                            var response = server.response({
                                statusCode: 200,
                                statusText: 'OK',
                                headers: parsed_headers,
                                expires: 3600
                            })

                            console.log(`INVITE ${auth.username}`)
                            USERS[auth.username].registered = true;
                            console.log(USERS)

                        }else{
                            var response = server.response({
                                statusCode: 401,
                                statusText: 'Unauthorized',
                                headers: parsed_headers,
                                auth_required: true
                            })
                        }
                    }else{
                        var response = server.response({
                            statusCode: 401,
                            statusText: 'Unauthorized',
                            headers: parsed_headers,
                            auth_required: true
                        })
                    }
                    
                    server.server_send(response, parsed_headers.Contact.contact.ip, parsed_headers.Contact.contact.port)
                }
            })
            
        }
    }
})