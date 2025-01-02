const Listener = require('../RTP').Listener
const Listener_old = require('../RTP').Listener_old

const udp = require('dgram')

console.log('starting')
var s = udp.createSocket('udp4')


var listen1 = new Listener_old(11714, 'g711a', (data) => {
    console.log(data)
})

