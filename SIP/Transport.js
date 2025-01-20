//Nik Hendricks 10/13/23
//Nik Hendricks 1/19/25
const dgram = require('dgram')

class Transports {
    constructor(props){
        console.log(props)
        this.type = props.type;
        this.port = props.port;
        this.ip = props.ip;
        this.unique_debug_id = props.unique_debug_id || Math.floor(Math.random() * 100000000);
        this.socket = dgram.createSocket(this.type);
        this.socket.bind(this.port, this.ip);
    }

    send(message, ip, port){
        console.log(`${this.unique_debug_id} Sending Message To: ${ip}:${port}`)
        console.log(message.toString())
        this.socket.send(message, port, ip)
    }

    on(callback){
        this.socket.on('message', (msg, rinfo) => {
            console.log(`${this.unique_debug_id} Received Message From: ${rinfo.address}:${rinfo.port}`)
            console.log(msg.toString())
            callback(msg);
        })
    }
}

module.exports = Transports;