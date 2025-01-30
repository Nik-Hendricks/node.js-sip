const Parser = require('./Parser.js').Parser

class Router{
    constructor(props){
        this.context = props.context;
        this.routes = {};
        this.endpoint_types = {

        }
    }

    addRoute(props){
        this.routes[props.name] = {
            name: String(props.name),
            type: String(props.type),
            match: String(props.match),
            endpoint: String(props.endpoint),
        }

        console.log(this.routes)
    }

    addEndpointType(props){
        this.endpoint_types[props.type] = {
            type: props.type,
            manager: props.manager,
            behavior: props.behavior,
        }
    }

    removeRoute(name){
        delete this.routes[name];
    }

    route(desired_endpoint){
        console.log({desired_endpoint})
        var ret = null;

        for(var route in this.routes){
            if(desired_endpoint.match(this.routes[route].match)){
                ret = {...this.routes[route]}
                ret.endpoint_type = this.endpoint_types[ret.type];
                ret.endpoint =  ret.endpoint_type.manager.items[ret.endpoint];
            }
        }

        return ret;


    }
}

module.exports = Router;