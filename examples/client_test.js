const VOIP = require('../index.js')
const utils = require('../utils')

var v = new VOIP({
    type:'client',
    transport:{
        type: 'UDP',
        port: 5060,
    },
    username:'17778021863101',
    register_password:'@5S4i8702a43',
    register_ip:'sip.callcentric.com',
    register_port:5060,
    callId:'1234567890'
}, (d) => {
    console.log(`client_test.js > d.type: ${d.type}`)
    if(d.type == 'REGISTERED'){
        console.log(`REGISTERED`)
        v.call({
            to:'14173620296',
            ip:'sip.callcentric.com',
            port:'5060',
            callId:'1234567890',
            username:'1001',
            client_callback:(m) => {
                console.log(`client_callback`)
                console.log(m)
            }
        })
    }else if(d.type == 'REGISTER_FAILED'){
        console.log(`REGISTER_FAILED`)
        console.log(d.message)
    }
})
