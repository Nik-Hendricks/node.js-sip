#!/usr/bin/env node

/**
 * This example shows how to send a simple audio signal using RTP.
 */

const dgram = require('dgram');
const { RtpPacket } = require('../index.js');

// Unpack Math
const { sin, pow, PI } = Math;

const DEFAULT_SAMPLE_RATE = 48000;  // Hz
const DEFAULT_FREQUENCY = 261.63;   // Hz
const DEFAULT_DURATION = 20;        // ms
const DEFAULT_VOLUME = 0.1;         // 10%

/**
 * Generates a pure tone and sends it using RTP.
 *
 * Catch using gstreamer or a similar tool:
 * gst-launch-1.0 udpsrc port=5002 ! "application/x-rtp,payload=96,clock-rate=48000" ! rtpL16depay ! autoaudiosink sync=false
 *
 * @param {object} args - additional arguments.
 * @param {number} args.rtp_port - port to send RTP packets.
 * @param {string} [args.address] - address to send packets.
 * @param {number} [args.sample_rate] - audio sample rate in Hz.
 * @param {number} [args.frequency] - tone frequency in Hz.
 * @param {number} [args.duration] - frame duration in ms.
 * @param {number} [args.volume] - output volume [0.0, 1.0].
 */
class Example1 {
    constructor(args={}) {
        if(args.rtp_port === undefined)
            throw TypeError("Must provide rtp_port");

        this.rtp_port = args.rtp_port;

        // Optional arguments
        this.address = args.address;
        this.sample_rate = args.sample_rate || DEFAULT_SAMPLE_RATE;
        this.frequency = args.frequency || DEFAULT_FREQUENCY;
        this.duration = args.duration || DEFAULT_DURATION;
        this.volume = args.volume || DEFAULT_VOLUME;

        // The number of samples per audio frame
        this.frame_samples = (this.sample_rate * this.duration) / 1000;

        // The size of an audio frame in bytes
        this.frame_size = this.frame_samples * 2; // int16_t

        // The buffer to use when constructing our tone
        this.frame_buffer = Buffer.alloc(this.frame_size);

        // This value will be incremented for each sample so that we can
        // maintain our sine wave through subsequent frames.
        this.sample_index = 0;

        // True if we have sent an RTP packet
        this.we_sent = false;

        // Our RTP packet. It's important to keep this allocated so that we
        // can maintain our sequence/ssrc between frames.
        this.rtp_packet = new RtpPacket(96, Math.random() * Math.pow(2, 32));

        // The number of packets that have been sent.
        this.rtp_pkt_count = 0;

        // The number of octets that have been sent.
        this.rtp_byte_count = 0;

        // The handle for our RTP timer
        this.rtp_timer = null;

        // The handle for our RTP socket
        this.rtp_socket = dgram.createSocket('udp4');

    }

    /**
     * Get the RTP ssrc.
     */
    get ssrc() {
        return this.rtp_packet.ssrc;
    }

    /**
     * Get the RTP timestamp.
     */
    get ts() {
        return this.rtp_packet.ts;
    }

    /**
     * Construct and send an audio frame.
     */
    sendFrame() {
        for(let j = 0; j < this.frame_samples; ++j) {
            const f = 2 * PI * this.frequency / this.sample_rate;
            const A = (pow(2, 15) - 1) * this.volume;
            const sample = A * sin(f * this.sample_index++);
            this.frame_buffer.writeInt16BE(sample, 2 * j);
        }

        this.rtp_packet.seq += 1;
        this.rtp_packet.ts += this.frame_samples;
        this.rtp_packet.payload = this.frame_buffer;

        const data = this.rtp_packet.serialize();
        this.rtpSend(data);

        this.rtp_pkt_count += 1;
        this.rtp_byte_count += data.length;

        // Set the 'we_sent' flag
        this.we_sent = true;
    }

    /**
     * Begin sending RTP packets.
     */
    startRtp() {
        this.rtp_timer = setInterval(() => this.sendFrame(), this.duration);
    }

    /**
     * Stop sending RTP packets.
     */
    stopRtp() {
        clearInterval(this.rtp_timer);
        this.rtp_timer = null;
        this.we_sent = false;
    }

    /**
     * Begin sending packets.
     */
    start() {
        console.log("SSRC set to", this.ssrc);
        this.startRtp();
    }

    /**
     * Stop sending packets.
     */
    stop() {
        this.stopRtp();
    }

    /**
     * Send data through the RTP socket.
     *
     * @param {Buffer} data - buffer to send.
     */
    rtpSend(data) {
        this.rtp_socket.send(data, this.rtp_port, this.address, () => {
            // Ignore errors
        });
    }
};

if(require.main === module) {
    const example = new Example1({
        rtp_port: 5002,
    });
    example.start();
}

module.exports=exports=Example1;