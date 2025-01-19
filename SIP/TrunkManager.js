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
        return {
            name: props.name,
            type: props.type,
            ip: props.ip,
            port: props.port,
            username: props.username,
            password: props.password,
            uac: new this.VOIP({
                type:'client',
                transport:{
                    type: 'udp4',
                    port: Math.floor(Math.random() * 65535) + 1,
                },
                username: props.username,
                register_password: props.password,
                register_ip: props.ip,
                register_port: props.port,
                callId: Math.floor(Math.random() * 100000000),
    
            }, (d) => {
                if(d.type == 'REGISTERED'){
                    console.log(`Trunk ${props.name} Registered`)
                }else if(d.type == 'REGISTER_FAILED'){
                    console.log(`REGISTER_FAILED`)
                    console.log(d.message)
                }
            })
        }
    }
}

module.exports = TrunkManager;