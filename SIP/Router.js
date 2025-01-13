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
    }

    removeRoute(name){
        delete this.routes[name];
    }

    route(message){
        console.log(`Router.route()`)
        let desired_endpoint = Parser.ParseHeaders(message.headers).To.contact.username;
        console.log(`desired_endpoint: ${desired_endpoint}`)
        var ret = null;

        for(var route in this.routes){
            console.log(`route: ${route}`)
            console.log(`this.routes[route].match: ${this.routes[route].match}`)
            if(desired_endpoint.match(this.routes[route].match)){
                console.log(`matched route: ${route}`)
                console.log(`this.routes[route].endpoint: ${this.routes[route].endpoint}`)
                console.log(`this.routes[route]:`)
                console.log(this.routes[route])
                ret = this.routes[route].endpoint;
            }
        }

        return ret;


    }
}

module.exports = Router;