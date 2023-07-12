const http = require('http');
const fs = require('fs');
const path = require('path');



class AdminPanelServer{
    constructor(SIP_SERVER){
        this.SIP_SERVER = SIP_SERVER;
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

        

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    // If the file doesn't exist or there was an error reading it, return a 404 respons
                      res.writeHead(404, { 'Content-Type': 'text/plain' });
                      res.end('File not found');
                } else {
                    // If the file exists, set the appropriate headers and serve the file
                    console.log(filePath.split('.')[2])
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
        });
        
        const port = 3000; // Choose the desired port number
        this.server.listen(port, () => {
          console.log(`Server running on port ${port}`);
        });

    }
}

module.exports = AdminPanelServer;


