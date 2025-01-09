//Nik Hendricks 10/13/23
const SIP = require('../../SIP')
const VOIP = require('../../')
const utils = require('../../utils')

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
})

console.log(server)