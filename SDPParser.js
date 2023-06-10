const SDPParser = {
    parse(sdpString) {
        var parsedData = {};
        const lines = sdpString.split('\r\n');
        let sessionInfo = {};
        let mediaInfo = [];
        let currentMedia = {};
        
        lines.forEach((line) => {
            if (line.startsWith('v=')) {
                sessionInfo.version = line.substring(2);
            } else if (line.startsWith('o=')) {
                sessionInfo.origin = line.substring(2);
            } else if (line.startsWith('s=')) {
                sessionInfo.sessionName = line.substring(2);
            } else if (line.startsWith('m=')) {
                if (currentMedia.media) {
                    mediaInfo.push(currentMedia);
                    currentMedia = {};
                }
                const [mediaType, port, protocol, format] = line.substring(2).split(' ');
                currentMedia = {
                    media: mediaType,
                    port: parseInt(port),
                    protocol,
                    format,
                };
            } else if (line.startsWith('a=')) {
                const attribute = line.substring(2);
                currentMedia.attributes = currentMedia.attributes || [];
                currentMedia.attributes.push(attribute);
            }
        });
      
        if (currentMedia.media) {
            mediaInfo.push(currentMedia);
        }
      
        parsedData = {
            session: sessionInfo,
            media: mediaInfo,
        };

        return parsedData;
    }
}
module.exports = SDPParser;