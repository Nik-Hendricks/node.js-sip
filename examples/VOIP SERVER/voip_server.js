//Nik Hendricks 10/13/23
const SIP = require('../../SIP')
const VOIP = require('../../')
const utils = require('../../utils')

class Server{
    constructor(){
        var server = new VOIP({
            type:'server',
            transport:{
                type: 'UDP',
                ip: utils.getLocalIpAddress(),
                port: 5060,
            },
        })

        console.log(server)

        
    }
}

new Server()