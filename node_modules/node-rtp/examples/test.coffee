#!/usr/bin/env coffee
RtpPacket = require(__dirname + '/../lib/RtpPacket').RtpPacket

buf = new Buffer 4
buf[0] = 0
buf[1] = 0
buf[2] = 0
buf[3] = 0

rtp1 = new RtpPacket buf
rtp2 = new RtpPacket rtp1

console.log rtp1.packet
console.log rtp2.packet

console.log rtp1.marker
rtp1.marker = true
console.log rtp1.marker

console.log rtp1.packet
console.log rtp2.packet