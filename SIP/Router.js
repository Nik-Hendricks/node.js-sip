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
        var ret = null;
        for(var route in this.routes){
            if(desired_endpoint.match(this.routes[route].match)){
                ret = {...this.routes[route]}
                ret.endpoint_type = this.endpoint_types[ret.type];
                var key = ret.endpoint;
                var items = (ret.endpoint_type && ret.endpoint_type.manager) ? ret.endpoint_type.manager.items : null;
                if(items && items[key] === undefined && typeof key === 'string' && key.indexOf(':') !== -1){
                    key = key.slice(key.lastIndexOf(':') + 1);
                }
                if(items){
                    ret.endpoint = items[key];
                }
            }
        }
        return ret;
    }
}

module.exports = Router;