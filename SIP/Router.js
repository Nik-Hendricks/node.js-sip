const Parser = require('./Parser.js').Parser

class Router{
    constructor(props){
        this.routes = {};
        this.enpoint_types = [
            'trunk',
            'extension',
        ]
    }

    addRoute(props){
        this.routes[props.name] = {
            name: props.name,
            type: props.type,
            match: props.match,
            endpoint: props.endpoint,
        }

        console.log(this.routes)
    }

    removeRoute(name){
        delete this.routes[name];
    }

    route(desired_endpoint){
        var ret = null;

        for(var route in this.routes){
            if(desired_endpoint.match(this.routes[route].match)){
                ret = this.routes[route];
            }
        }

        return ret;


    }
}

module.exports = Router;