class IVRManager{
    constructor(){
        this.items = {};
    }

    addIVR(props){
        this.items[String(props.name)] = this.IVR(props);
        console.log(this.items)
    }

    removeIVR(name){
        delete this.items[name];
    }

    IVR(props){
        return {
            name: String(props.name),
            start_stream: this.start_stream,
        }
    }

    start_stream(){
        console.log('Starting Stream')
    }
}

module.exports = IVRManager;