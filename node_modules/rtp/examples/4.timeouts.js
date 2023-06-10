#!/usr/bin/env node

/**
 * This example builds on Example3 by demonstrating how to maintain your member
 * table by timing out old entries.
 */

const {
    PacketType,
    parse
} = require('../index.js');

const Example3 = require('./3.report_generation');

/**
 * Maintains a member table and times out old sources.
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
class Example4 extends Example3 {
    constructor(args={}) {
        super(args);

        // The handle for our pruning timer
        this.prune_timer = null;

        // Packet receive timestamps
        this.timestamps = {};

        // Session sender count
        this._senders;
    }

    get senders() {
        // Now that we are tracking timeouts we can provide an accurate count
        // of the number of session senders.
        return this._senders;
    }

    /**
     * Extension of Example3 so that we can add a timestamps entry.
     *
     * @param {number} id - source identifier.
     */
    addSource(id) {
        super.addSource(id);
        this.timestamps[id] = { rtp: 0, rtcp: 0 };
    }

    /**
     * Extension of Example3 so that we can remove our timestamps entry.
     *
     * @param {number} id - source identifier
     */
    removeSource(id) {
        super.removeSource(id);
        delete this.timestamps[id]
    }

    pruneSources() {
        const interval = this.interval;
        const now = Date.now();
        const to_prune = [];

        let senders = 0;
        for(let [ id, ts ] of Object.entries(this.timestamps)) {
            const last_rtp = now - ts.rtp;
            const last_rtcp = now - ts.rtcp;
            if((last_rtp > (interval * 5)) && last_rtcp > (interval * 5)) {
                // If we haven't received *any* packet within 5 intervals
                // then delete this member from the sources table.
                console.log('Timed out source', id);
                to_prune.push(id);
            }
            else if(last_rtp < interval * 2) {
                // else if we have recieved an RTP packet in the last two cycles
                // count this as a sender.
                senders++;
            }
        }
        // Prune the table
        for(let id of to_prune) {
            delete this.sources[id];
            delete this.timestamps[id];
        }

        // Update sender count
        this._senders = senders;

        this.prune_timer = setTimeout(() => this.pruneSources(), interval);
    }

    /**
     * Start sending packets.
     */
    start() {
        super.start();
        this.prune_timer = setTimeout(() => this.pruneSources(), this.interval);
    }

    /**
     * Disconnect the sockets.
     */
    stop() {
        super.stop();
        clearTimeout(this.sr_timer);
    }

    /**
     * Called on receiving a new RTP packet.
     *
     * @param {Buffer} data - packet data.
     */
    onRtp(data) {
        const packet = parse(data);

        if(!this.sources[packet.ssrc]) {
            console.log('New source with ID', packet.ssrc, '(RTP)');
            this.addSource(packet.ssrc);
        }

        // Update timestamp
        this.timestamps[packet.ssrc].rtp = Date.now();

        // Process packet (from Example3)
        this.sources[packet.ssrc].updateSeq(packet.seq);
    }

    /**
     * Called on receiving a new RTCP packet.
     *
     * @param {Buffer} data - packet data.
     */
    onRtcp(data) {
        const packet = parse(data);
        this.updateAvgSize(packet.size);

        if(!packet.ssrc)
            return;

        if(!this.sources[packet.ssrc]) {
            console.log('New source with ID', packet.ssrc, '(RTCP)');
            this.addSource(packet.ssrc);
        }

        // Update timestamp
        this.timestamps[packet.ssrc].rtcp = Date.now();

        // Process packet (from Example3)
        switch(packet.type) {
            case PacketType.SR:
                this.processSr(packet);
                break;
        }
    }

    /**
     * Extension of Example1 so we can track our own timestamp.
     *
     * @param {Buffer} data - data to send.
     */
    rtpSend(data) {
        super.rtpSend(data);
        this.timestamps[this.ssrc].rtp = Date.now();
    }

    /**
     * Extension of Example2 so we can track our own timestamp.
     *
     * @param {Buffer} data - data to send.
     */
    rtcpSend(data) {
        super.rtcpSend(data);
        this.timestamps[this.ssrc].rtcp = Date.now();
    }
};

if(require.main === module) {
    // The following allows for this example to be run up to twice so that the
    // user can observe the two processes exchanging data.
    async function main() {
        try {
            const example = new Example4({
                rtp_port: 5002,
                rtcp_port: 5003,
                name: "Example4"
            });

            await example.bind(6002, 6003);

            console.log("Sending on ports 5002/5003");
            console.log("Listening on ports 6002/6003");
            example.start();
        }
        catch(e) {
            if(e.errno == -98) {
                // EADDRINUSE
                const example = new Example4({
                    rtp_port: 6002,
                    rtcp_port: 6003,
                    name: "Example4"
                });

                await example.bind(5002, 5003);

                console.log("Sending on ports 6002/6003");
                console.log("Listening on ports 5002/5003");
                example.start();
            }
            else {
                throw e;
            }
        }
    }

    main();
}

module.exports=exports=Example4;
