#!/usr/bin/env node

/**
 * This example builds upon Example1 by adding rotating SDES packet generation.
 * SDES packets are bandwidth expensive and care should be taken to prioritize
 * more important source information such as the CNAME or NAME fields.
 */

const dgram = require('dgram');

const { SdesPacket, rtcpInterval } = require('../index.js');
const Example1 = require('./1.tone_generator');

const DEFAULT_BANDWIDTH = 64000; // 64 kbit/s

/**
 * Sends RTP data and generates RTCP SDES packets.
 *
 * @param {object} args - class arguments.
 * @param {number} args.rtp_port - port to send RTP packets.
 * @param {number} args.rtcp_port - port to send RTCP packets.
 * @param {string} [args.address] - address to send packets.
 * @param {number} [args.sample_rate] - audio sample rate in Hz.
 * @param {number} [args.frequency] - tone frequency in Hz.
 * @param {number} [args.duration] - frame duration in ms.
 * @param {number} [args.volume] - output volume [0.0, 1.0].
 * @param {number} [args.bandwidth] - target audio bandwidth.
 * @param {number} [args.cname] - canonical name.
 * @param {number} [args.name] - user name.
 */
class Example2 extends Example1 {
    constructor(args={}) {
        super(args);

        if(args.rtcp_port === undefined)
            throw TypeError("Must provide rtcp_port");

        this.rtcp_port = args.rtcp_port;

        // Optional arguments
        this.bandwidth = args.bandwidth || DEFAULT_BANDWIDTH;
        this.cname = args.cname;
        this.name =args.name;

        if(this.cname === undefined) {
            // Set cname to a random number. Ideally this would be some sort of
            // unique per-user key such as a UUID.
            this.cname = Math.random().toString().split('.')[1];
        }

        // True if we have not yet sent an RTCP packet
        this.initial = true;

        // Average calculated RTCP packet size both sent and received
        this.avg_rtcp_size = 0;

        // RTCP packet sizes used to calculate avg_rtcp_size
        this.rtcp_size_data = [];

        // The handle for our RTCP timer
        this.sdes_timer = null;

        // Used to select which SDES items to send
        this.sdes_index = 0;

        // The handle for our RTCP socket
        this.rtcp_socket = dgram.createSocket('udp4');

    }

    get members() {
        // Assume that we are one of two session members
        return 2;
    }

    get senders() {
        // Assume we are the only sender
        return 1;
    }

    /**
     * Get the RTCP report interval.
     */
    get interval() {
        return rtcpInterval({
            // Assume that we are one of two session members
            members: this.members,

            // Assume we are the only sender
            senders: this.senders,

            // Suggested value is 5% of RTP bandwidth
            rtcp_bw: this.bandwidth * 0.5,

            // This flag will be set when we send an RTP packet
            we_sent: this.we_sent,

            // The average size of RTCP packets (both sent and received)
            avg_rtcp_size: this.avg_rtcp_size,

            // This flag will be cleared on our first send
            initial: this.initial,
        });
    }

    /**
     * Update the avg_rtcp_size.
     *
     * @param {Number} size - size of an incoming/outgoing RTCP packet.
     */
    updateAvgSize(size) {
        size += 28; // Estimated size of IPv4 + UDP headers

        this.rtcp_size_data.push(size);
        if(this.rtcp_size_data.length > 16)
            this.rtcp_size_data.shift();

        let total = 0;
        for(let i = 0; i < this.rtcp_size_data.length; ++i)
            total += this.rtcp_size_data[i];

        this.avg_rtcp_size = total / this.rtcp_size_data.length;
    }

    cycleSdes() {
        const packet = new SdesPacket();

        // Send CNAME every cycle and NAME every 3 cycles
        if(this.name && (this.sdes_index++ % 3) == 0) {
            console.log("Send CNAME,NAME");
            packet.addSource({
                ssrc: this.ssrc,
                cname: this.cname,
                name: this.name,
            });
        }
        else {
            console.log("Send CNAME");
            packet.addSource({
                ssrc: this.ssrc,
                cname: this.cname,
            });
        }

        const data = packet.serialize();
        this.rtcpSend(data);

        // Clear 'initial' flag
        this.initial = false;

        this.sr_timer = setTimeout(() => this.cycleSdes(), this.interval);
    }

    /**
     * Start sending packets.
     */
    start() {
        super.start();
        this.sr_timer = setTimeout(() => this.cycleSdes(), this.interval);
    }

    /**
     * Disconnect the sockets.
     */
    stop() {
        super.stop();
        clearTimeout(this.sr_timer);
    }

    /**
     * Send data through the RTCP socket.
     *
     * @param {Buffer} data - buffer to send.
     */
    rtcpSend(data) {
        this.rtcp_socket.send(data, this.rtcp_port, this.address, () => {
            // Ignore errors
        });
        this.updateAvgSize(data.length);
    }
};

if(require.main === module) {
    const example = new Example2({
        rtp_port: 5002,
        rtcp_port: 5003,
        name: 'Example2',
    });

    example.start();
}

module.exports=exports=Example2;
