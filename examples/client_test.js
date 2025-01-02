const VOIP = require('../index.js')
const utils = require('../utils')

var v = new VOIP({
    type:'client',
    transport:{
        type: 'UDP',
        ip: utils.getLocalIpAddress(),
        port: 5060,
    },
    username:'17778021863101',
    register_password:'@5S4i8702a43',
    register_ip:'sip.callcentric.net',
    register_port:5060,
    callId:'1234567890'
}, (d) => {
    console.log(`client_test.js > d.type: ${d.type}`)
    if(d.type == 'REGISTERED'){
        //v.message('1001', 'Hello World')
       v.call('14173620296', 'sip.callcentric.net', 5060, (m) => {
            console.log(`call callback`)
            console.log(m)
            //initiate rtp stream

            
       });
    }
})
