//Nik Hendricks 10/13/23

const SIP = {
    Builder: require('./Builder.js'),
    Transport: require('./Transport.js'),
    Parser: require('./Parser.js').Parser,
    HeaderParser: require('./Parser.js').HeaderParser,
    TrunkManager: require('./TrunkManager.js'),
    Router: require('./Router.js')
}

//create sip message
function create_message(type, headers){
    
}

module.exports = SIP;