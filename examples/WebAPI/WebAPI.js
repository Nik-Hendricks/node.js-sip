const http = require('http');
const fs = require('fs');
const path = require('path');



class WebAPI{
    constructor(SIP_SERVER){
        this.SIP_SERVER = SIP_SERVER;
        this.events = []
    }

    start(){
        this.server = http.createServer((req, res) => {
            var uri = req.url.split('?')[0];
            console.log(uri)
            var filePath = path.join(__dirname, req.url);
            if(uri.includes('/api/')){
                var data = '';
                req.on('data', (chunk) => {
                    data += chunk;
                });
                req.on('end', () => {   
                    var event = uri.slice(4, uri.length);
                    if(typeof this.events[event] == 'function'){
                        var response = this.events[event](data)
                        res.setHeader('Access-Control-Allow-Origin', '*'); // Allow requests from any origin
                        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Allow specific HTTP methods
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(response);
                    }
                });
            }
            
        });
        
        const port = 3000; // Choose the desired port number
        this.server.listen(port, () => {
            console.log(`Web API listening on port: ${port}`);
            this.on('/test', (data) => {
                return {test: 'test'}
            })

            this.on('/sip/users', (data) => {
                var ret = []
                Object.entries(this.SIP_SERVER.users).forEach(user => {
                    ret.push(user[1].toJSON())
                })
                return  JSON.stringify(ret);
            })

            this.on('/sip/dialogs', (data) => {
                return JSON.stringify(this.SIP_SERVER.SIP.dialog_stack)
            })

        });
    }


    on(event, func){
        this.events[event] = func
    }
}

module.exports = WebAPI;


