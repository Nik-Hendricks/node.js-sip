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

    split_channels(data, channels){
      //split stereo mp3 data into 2 channels
      var left = []
      var right = []
      for(var i = 0; i < data.length; i+=2){
        left.push(data[i])
        right.push(data[i+1])
      }
      return {left:left, right:right}
    }
}

module.exports = UTILS;