class Router{
    constructor(){

    }

    add_route(route, callback){
        this.routes[route] = callback
    }

    route(message){
        
    }
}