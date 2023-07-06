const os = require('os');

const UTILS = {
    getLocalIpAddress() {
        const interfaces = os.networkInterfaces();
        
        for (const interfaceName in interfaces) {
          const _interface = interfaces[interfaceName];
          
          for (const interfaceInfo of _interface) {
            if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
              return interfaceInfo.address;
            }
          }
        }
        
        return null; // Return null if no IP address is found
    },
}

module.exports = UTILS;