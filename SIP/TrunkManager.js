const Transports = require('./Transport.js')

console.log(Transports)
class TrunkManager {
    constructor(VOIP) {
        this.trunks = {};
        this.VOIP = VOIP;
    }

    addTrunk(props) {
        this.trunks[props.name] = this.Trunk(props);
    }

    removeTrunk(name) {
        delete this.trunks[name];
    }

    Trunk(props){
        let ret = {
            name: props.name,
            type: props.type,
            ip: props.ip,
            port: props.port,
            username: props.username,
            password: props.password,
            uac: null,
            register: (e) => {
                this.register_trunk(ret);
            }
        }

        return ret;
    }

    register_trunk(props){
        let uac = new this.VOIP({
            type:'client',
            transport:{
                type: 'UDP',
                //random port < 0 > 65535
                port: Math.floor(Math.random() * 65535) + 1,
            },
            username: props.username,
            register_password: props.password,
            register_ip: props.ip,
            register_port: props.port,
            callId: Math.floor(Math.random() * 100000000),

        }, (d) => {
            console.log(`client_test.js > d.type: ${d.type}`)
            if(d.type == 'REGISTERED'){
                console.log(`REGISTERED`)
                
            }else if(d.type == 'REGISTER_FAILED'){
                console.log(`REGISTER_FAILED`)
                console.log(d.message)
            }
        })

        props.uac = uac;
    }
        

    registerAll(){
        for (const trunk in this.trunks) {
            this.trunks[trunk].register();
        }
    }

}

module.exports = TrunkManager;