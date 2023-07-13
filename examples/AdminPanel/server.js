const http = require('http');
const fs = require('fs');
const path = require('path');



class AdminPanelServer{
    constructor(SIP_SERVER){
        this.SIP_SERVER = SIP_SERVER;
        this.events = []
    }

    start(){
        this.server = http.createServer((req, res) => {
            // Extract the file path from the request URL
            var uri = req.url.split('?')[0];
            console.log(uri)
            var filePath = path.join(__dirname, req.url);
            if(uri == '/'){
                console.log('asdf')
                filePath = path.join(__dirname, 'html/index.html');
            }
          // Read the file
            if(uri.includes('/api/')){
                var data = '';
                req.on('data', (chunk) => {
                    data += chunk;
                });
                req.on('end', () => {   
                    var event = uri.slice(4, uri.length);
                    if(typeof this.events[event] == 'function'){
                        var response = this.events[event](data)
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(response));
                    }
                });
            }else{
                fs.readFile(filePath, (err, data) => {
                    if (err) {
                        // If the file doesn't exist or there was an error reading it, return a 404 respons
                          res.writeHead(404, { 'Content-Type': 'text/plain' });
                          res.end('File not found'); 
                    } else {
                        // If the file exists, set the appropriate headers and serve the file
                        if(filePath.split('.')[2] == 'css'){
                            res.writeHead(200, { 'Content-Type': 'text/css' });
                        }else if(filePath.split('.')[2] == 'js'){
                            res.writeHead(200, { 'Content-Type': 'text/javascript' });
                        }else{
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                        }
                        res.end(data);
                    }
                });
            }
        });
        
        const port = 3000; // Choose the desired port number
        this.server.listen(port, () => {
            console.log(`Server running on port ${port}`);
            this.on('test', (data) => {
                console.log(data)
                return {test: 'test'}
            })

            this.on('/sip/users', (data) => {
                console.log('asdfasdf')
                console.log(data)
                return  this.SIP_SERVER.users
            })

        });
    }


    on(event, func){
        this.events[event] = func
    }
}

module.exports = AdminPanelServer;


