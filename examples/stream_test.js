
const Listener = require('../RTP').Listener
const Listener_old = require('../RTP').Listener_old
const RTP = require('../RTP').RTP
const socket = require('dgram').createSocket('udp4')
var r = new RTP()

var stream1 =  r.start_stream('../sounds/dtmf_test.wav', 'g711a', (data) => {
//var stream1 =  r.start_stream('../sounds/song.mp3', 'mp3', (data) => {
    //send data to local port 5005
    socket.send(data, 5005, '192.168.1.2');
    console.log(data)
})


