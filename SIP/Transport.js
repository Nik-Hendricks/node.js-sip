//Nik Hendricks 10/13/23
const dgram = require('dgram')
const utils = require('../utils.js')


const Transports = {
    socket: null,
    type: null,
    port: null,
    new: (props) => {
        Transports[props.transport.type](props)
        Transports.port = props.transport.port;
        Transports.ip = utils.getLocalIpAddress();
        return Transports;
    },

    UDP: (props) => {
        Transports.type = 'UDP';
        Transports.socket = dgram.createSocket('udp4');
        Transports.socket.bind(props.transport.port, Transports.ip);
    },

    TCP: (props) => {
        Transports.type = 'TCP';
        Transports.socket = dgram.createSocket('tcp4');
        Transports.socket.bind(props.transport.port, Transports.ip);
    },


    send: (message, ip, port) => {
        console.log('Sending Message')
        console.log(message.toString())
        Transports.socket.send(message, port, ip)
    },

    on: (callback) => {
        Transports.socket.on('message', (msg, rinfo) => {
            console.log('Received Message')
            console.log(msg.toString())
            callback(msg);
        })
    }
}

module.exports = Transports;