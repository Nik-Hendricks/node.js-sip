//Nik Hendricks 10/13/23
const SIP = require('../SIP')
const VOIP = require('../')
const utils = require('../utils')

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
        port: 5060,
    },
},
(d) => {
    if(d.type == 'UAS_READY'){
    }else if(d.message !== undefined){
        let parsed_headers = SIP.Parser.ParseHeaders(d.message.headers);
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

server.TrunkManager.addTrunk({
    name:'trunk1',
    type:'SIP',
    username:'1001',
    password:'rootPassword',
    ip:'192.168.1.2',
    port:5060,
    callId:'1234567890'
})

server.Router.addRoute({
    name: 'Main Trunk Route',
    type: 'trunk',
    match: '^[0-9]{11}$',
    endpoint: 'trunk:trunk1',
})

setTimeout(() => {
    server.TrunkManager.trunks['trunk1'].register();
}, 1000)