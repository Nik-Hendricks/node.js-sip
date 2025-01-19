//Nik Hendricks 10/13/23
const dgram = require('dgram')


const ___Transports = {     //sometimes i am a complete moron. Overcomplicating things for no reason. and in the end the design was flawed as the transport system was stateless and basically changed ports and ips every time a new transport was created.  Secnerily - Nik Hendricks 1/19/25
    socket: null,
    type: null,
    port: null,
    ip: null,
    unique_debug_id: null,
    new: (props) => {
        Transports[props.type](props)
        Transports.port = props.port;
        Transports.ip = utils.getLocalIpAddress();
        Transports.unique_debug_id = props.unique_debug_id || Math.floor(Math.random() * 100000000);
        return Transports;
    },

    UDP: (props) => {
        Transports.type = 'UDP';
        Transports.socket = dgram.createSocket('udp4');
        Transports.socket.bind(Transports.port, Transports.ip);
    },

    TCP: (props) => {
        Transports.type = 'TCP';
        Transports.socket = dgram.createSocket('tcp4');
        Transports.socket.bind(Transports.port, Transports.ip);
    },


    send: (message, ip, port) => {
        console.log(`${Transports.unique_debug_id} Sending Message To: ${ip}:${port}`)
        console.log(message.toString())
        Transports.socket.send(message, port, ip)
    },

    on: (callback) => {
        Transports.socket.on('message', (msg, rinfo) => {
            console.log(`${Transports.unique_debug_id} Received Message From: ${rinfo.address}:${rinfo.port}`)
            console.log(msg.toString())
            callback(msg);
        })
    }
}

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