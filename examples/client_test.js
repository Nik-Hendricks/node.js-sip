const VOIP = require('../index.js')
const utils = require('../utils')

var v = new VOIP({
    type:'client',
    transport:{
        type: 'UDP',
        ip: utils.getLocalIpAddress(),
        port: 5060,
    },
    username:USERNAME HERE,
    register_password: PASSWORD HERE,
    register_ip: IP HERE,
    register_port:5060,
    callId:'1234567890'
}, (d) => {
    console.log(`client_test.js > d.type: ${d.type}`)
    if(d.type == 'REGISTERED'){
        //v.message('1001', 'Hello World')
        console.log(`REGISTERED`)
        v.call(CALL NUMBER HERE, IP HERE, 5060, (m) => {
             console.log(`call callback`)
             console.log(m)
        });
    }else if(d.type == 'REGISTER_FAILED'){
        console.log(`REGISTER_FAILED`)
        console.log(d.message)
    }
})
