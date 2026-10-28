//Nik Hendricks 10/13/23
//Nik Hendricks 1/19/25
const dgram = require('dgram')

class Transports {
    constructor(props){
        this.type = props.type;
        this.port = props.port;
        this.ip = props.ip;
        this.unique_debug_id = props.unique_debug_id || Math.floor(Math.random() * 100000000);
        this.socket = dgram.createSocket(this.type);
        this.socket.on('error', (err) => {
            console.error(`${this.unique_debug_id} Socket error:`, err && err.message ? err.message : err);
        });
        this.socket.bind(this.port, this.ip, () => {
            // Binding is complete; socket is ready for send/receive.
        });
    }

    close(callback){
        if(this.socket){
            try { this.socket.close(callback); } catch (e) { if (callback) callback(e); }
            this.socket = null;
        } else if (callback) {
            callback();
        }
    }

    send(message, ip, port, callback){
        console.log(`${this.unique_debug_id} Sending Message To: ${ip}:${port}`)
        if(this.socket === null){
            const err = new Error('Transport socket is closed');
            console.error(err.message);
            if(callback) callback(err);
            return;
        }
        this.socket.send(message, port, ip, (err) => {
            if(err){
                console.error(`${this.unique_debug_id} Send error:`, err && err.message ? err.message : err);
            }
            if(callback) callback(err);
        })
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