const {
    AppPacket,
    ByePacket,
    RrPacket,
    RtpPacket,
    SdesPacket,
    SrPacket,
    Source,
    rtcpInterval,
} = require("bindings")("node_rtp");;

/**
 * RTCP packet types.
 *
 * @enum {number}
 */
const PacketType = {
    SR: 200,
    RR: 201,
    SDES: 202,
    BYE: 203,
    APP: 204
};

/**
 * Parse an RTP/RTCP packet from a buffer.
 *
 * @param {Buffer} buffer - buffer to parse.
 * @returns {object} packet object.
 */
function parse(buffer) {
    if(!Buffer.isBuffer(buffer))
        throw TypeError("Input must be a Buffer");

    switch(buffer[1]) {
        case PacketType.SR:
            return new SrPacket(buffer);
        case PacketType.RR:
            return new RrPacket(buffer);
        case PacketType.SDES:
            return new SdesPacket(buffer);
        case PacketType.BYE:
            return new ByePacket(buffer);
        case PacketType.APP:
            return new AppPacket(buffer);
        default:
            return new RtpPacket(buffer);
    }
}

module.exports=exports= {
    AppPacket,
    ByePacket,
    RrPacket,
    RtpPacket,
    SdesPacket,
    SrPacket,
    Source,
    PacketType,
    rtcpInterval,
    parse,
};
