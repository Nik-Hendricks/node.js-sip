const VOIP = require('../index.js')
const utils = require('../utils')

var v = new VOIP({
    type:'client',
    transport:{
        type: 'UDP',
        ip: utils.getLocalIpAddress(),
        port: 5060,
    },
    username:'1001',
    register_password:'rootPassword',
    register_ip:'192.168.1.12',
    register_port:5060,
    callId:'1234567890'
}, (d) => {
    console.log(`client_test.js > d.type: ${d.type}`)
    if(d.type == 'REGISTERED'){
        //v.message('1001', 'Hello World')
        console.log(`REGISTERED`)
        //v.call('14173620296', '192.168.1.12', 5060, (m) => {
        //     console.log(`call callback`)
        //     console.log(m)
        //});

        v.call2({
            to:'1000',
            ip:'192.168.1.12',
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
