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
        extension: '1000'
    },
    '1001':{
        password:'rootPassword',
        name:'Bill Billerson',
        ip:undefined,
        port:undefined,
        registered:false,
        call_id:undefined,  
        extension: '1001'
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
    if(d.message !== undefined){
        let parsed_headers = SIP.Parser.ParseHeaders(d.message.headers);
        console.log('parsed_headers')
        console.log(parsed_headers)
        if(d.type == 'REGISTER'){
            server.uas_handle_registration(d.message, USERS, (response) => {
                console.log('response')
                console.log(response)
            })
        }else if(d.type == 'INVITE'){
            server.uas_handle_invite(d.message, USERS, (response) => {
                console.log('response')
                console.log(response)
            })
            
        }
    }
})