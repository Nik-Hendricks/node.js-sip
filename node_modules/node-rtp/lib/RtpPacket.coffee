Buffer = require('buffer').Buffer

Number::toUnsigned = ->
  return ((@ >>> 1) * 2 + (@ & 1))

RTP_HEADER_SIZE = 12
MARKER_BIT = 0x80
TYPE_MASK = 0x7F

isSet = (where, mask) ->
    return (mask is (where & mask))

class RtpPacket
  constructor: (bufPayload, fullPacket) ->

    # copy constructor
    if bufPayload instanceof RtpPacket
      @_bufpkt = new Buffer bufPayload.packet.length
      bufPayload.packet.copy @_bufpkt
      return

    throw new Error 'not a buffer' if not Buffer.isBuffer bufPayload

    ###
    See RFC3550 for more details: http://www.ietf.org/rfc/rfc3550.txt
    V = 2, // version. always 2 for this RFC (2 bits)
    P = 0, // padding. not supported yet, so always 0 (1 bit)
    X = 0, // header extension (1 bit)
    CC = 0, // CSRC count (4 bits)
    M = 0, // marker (1 bit)
    PT = 0, // payload type. see section 6 in RFC3551 for valid types: http://www.ietf.org/rfc/rfc3551.txt (7 bits)
    SN = Math.floor(1000 * Math.random()), // sequence number. SHOULD be random (16 bits)
    TS = 1, // timestamp in the format of NTP (# sec. since 0h UTC 1 January 1900)? (32 bits)
    SSRC = 1; // synchronization source (32 bits)
    //CSRC = 0, // contributing sources. not supported yet (32 bits)
    //DP = 0, // header extension, 'Defined By Profile'. not supported yet (16 bits)
    //EL = 0; // header extension length. not supported yet (16 bits)
    ###

    fullPacket = false if `fullPacket === undefined || fullPacket === null`

    if fullPacket
      @_bufpkt = bufPayload
    else
      # just payload data (for outgoing/sending)
      @_bufpkt = new Buffer(RTP_HEADER_SIZE + bufPayload.length) # V..SSRC + payload
      @_bufpkt[0] = 0x80
      @_bufpkt[1] = 0
      SN = Math.floor(1000 * Math.random())
      @_bufpkt[2] = (SN >>> 8)
      @_bufpkt[3] = (SN & 0xFF)
      @_bufpkt[4] = 0
      @_bufpkt[5] = 0
      @_bufpkt[6] = 0
      @_bufpkt[7] = 1
      @_bufpkt[8] = 0
      @_bufpkt[9] = 0
      @_bufpkt[10] = 0
      @_bufpkt[11] = 1
      bufPayload.copy @_bufpkt, 12, 0 # append payload data

RtpPacket::__defineGetter__ 'marker', -> isSet @_bufpkt[1], MARKER_BIT
RtpPacket::__defineSetter__ 'marker', (set) ->
  if set
    @_bufpkt[1] |= MARKER_BIT
  else
    @_bufpkt[1] &= ~MARKER_BIT

RtpPacket::__defineGetter__ 'type', -> return (@_bufpkt[1] & TYPE_MASK)
RtpPacket::__defineSetter__ 'type', (val) ->
  val = val.toUnsigned()
  if val <= 127
    @_bufpkt[1] -= (@_bufpkt[1] & TYPE_MASK)
    @_bufpkt[1] |= val

RtpPacket::__defineGetter__ 'seq', -> return (@_bufpkt[2] << 8 | @_bufpkt[3])
RtpPacket::__defineSetter__ 'seq', (val) ->
  val = val.toUnsigned()
  if val <= 65535
    @_bufpkt[2] = (val >>> 8)
    @_bufpkt[3] = (val & 0xFF)

RtpPacket::__defineGetter__ 'time', -> return (@_bufpkt[4] << 24 | @_bufpkt[5] << 16 | @_bufpkt[6] << 8 | @_bufpkt[7])
RtpPacket::__defineSetter__ 'time', (val) ->
  val = val.toUnsigned()
  if val <= 4294967295
    @_bufpkt[4] = (val >>> 24)
    @_bufpkt[5] = (val >>> 16 & 0xFF)
    @_bufpkt[6] = (val >>> 8 & 0xFF)
    @_bufpkt[7] = (val & 0xFF)

RtpPacket::__defineGetter__ 'source', -> return (@_bufpkt[8] << 24 | @_bufpkt[9] << 16 | @_bufpkt[10] << 8 | @_bufpkt[11])
RtpPacket::__defineSetter__ 'source', (val) ->
  val = val.toUnsigned()
  if val <= 4294967295
    @_bufpkt[8] = (val >>> 24)
    @_bufpkt[9] = (val >>> 16 & 0xFF)
    @_bufpkt[10] = (val >>> 8 & 0xFF)
    @_bufpkt[11] = (val & 0xFF)

RtpPacket::__defineGetter__ 'payload', -> return (@_bufpkt.slice RTP_HEADER_SIZE, @_bufpkt.length)
RtpPacket::__defineSetter__ 'payload', (val) ->
  if (Buffer.isBuffer val && val.length <= 512) # FIXME: magic number
    newsize = RTP_HEADER_SIZE + val.length
    if newsize is @_bufpkt.length
      val.copy @_bufpkt, RTP_HEADER_SIZE, 0
    else
      newbuf = new Buffer newsize
      @_bufpkt.copy newbuf, 0, 0, RTP_HEADER_SIZE
      val.copy newbuf, RTP_HEADER_SIZE, 0
      @_bufpkt = newbuf

RtpPacket::__defineGetter__ 'packet', -> return @_bufpkt

exports.RtpPacket = RtpPacket

# vim:set ts=2 sw=2 et: