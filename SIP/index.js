//Nik Hendricks 10/13/23
//Nik Hendricks 1/15/25
const SIP = {
    Builder: require('./Builder.js'),
    Transport: require('./Transport.js'),
    Parser: require('./Parser.js').Parser,
    HeaderParser: require('./Parser.js').HeaderParser,
    TrunkManager: require('./TrunkManager.js'),
    UserManager: require('./UserManager.js'),
    Router: require('./Router.js')
}

module.exports = SIP;