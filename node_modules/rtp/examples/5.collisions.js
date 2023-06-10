#!/usr/bin/env node

/**
 * This example builds on Example4 by demonstrating how to handle source id
 * collisions.
 */

const { RemoteInfo } = require('dgram');

const {
    PacketType,
    parse
} = require('../index.js');

const Example4 = require('./4.timeouts');

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
class Example5 extends Example4 {
    constructor(args={}) {
        super(args);

        // This will be used to track source transport addresses.
        this.rinfo = {};

        // This will be used to record any conflicts. We want to use the source
        // transport address as our key, so the structure will look something
        // like this:
        //
        // this.conflicts = {
        //     'example.com': {
        //         5002: /* timestamp of last collision */
        //    }
        // };
        this.conflicts = {};
    }

    /**
     * Extension of Example3 so that we can add an rinfo entry.
     *
     * @param {number} id - source identifier.
     */
    addSource(id) {
        super.addSource(id);
        this.rinfo[id] = { rtp: null, rtcp: null };
    }

    /**
     * Extension of Example3 so that we can remove our rinfo entry.
     *
     * @param {number} id - source identifier
     */
    removeSource(id) {
        super.removeSource(id);
        delete this.rinfo[id]
    }

    /**
     * Start sending packets.
     */
    start() {
        super.start();

        // Set our source transport address
        this.rinfo[this.ssrc].rtp = this.rtp_socket.address();
        this.rinfo[this.ssrc].rtcp = this.rtcp_socket.address();
    }

    /**
     * Called on receiving a new RTP packet.
     *
     * @param {Buffer} data - packet data.
     * @param {RemoteInfo} rinfo - source transport address.
     */
    onRtp(data, rinfo) {
        const packet = parse(data);

        if(!this.sources[packet.ssrc]) {
            console.log('New source with ID', packet.ssrc, '(RTP)');
            this.addSource(packet.ssrc);
        }
        else if(this.rinfo[packet.ssrc].rtp === null) {
            this.rinfo[packet.ssrc].rtp = rinfo;
        }
        else {
            let old = this.rinfo[packet.ssrc].rtp;
            if(old.port != rinfo.port || old.address != rinfo.address) {
                if(packet.ssrc != this.ssrc) {
                    // This collision is from a third-party and likely contains
                    // duplicate information. Just discard the packet.
                    return;
                }
                else {
                    // This is a collision on our source id. First we check to
                    // see if we have a record of this collision already. If so,
                    // then this is probably a loop and we don't want to keep
                    // changing our SSRC over and over again.
                    for(let [ address, ports ] of Object.entries(this.conflicts)) {
                        // First find this address
                        if(address != rinfo.address)
                            continue;

                        for(let port of Object.keys(ports)) {
                            // Next find this port
                            if(port != rinfo.port)
                                continue;

                            // Update the timestamp
                            this.conflicts[address][port] = Date.now();
                            return;
                        }
                    }

                    // No record exists, we will add one and change our source
                    // address to resolve the collision.
                    if(!this.conflicts[rinfo.address])
                        this.conflicts[rinfo.address] = {};

                    this.conflicts[rinfo.address][rinfo.port] = Date.now();

                    // Choose another (random) SSRC address.
                    this.rtp_packet.ssrc = Math.random() * Math.pow(2, 32);
                    this.addSource(this.ssrc);

                    console.log("SSRC changed to", this.ssrc);

                    // Associate our old id with the new address
                    this.rinfo[packet.ssrc].rtp = rinfo;
                }
            }
        }

        // Update timestamps (from Example4)
        this.timestamps[packet.ssrc].rtp = Date.now();

        // Process packet (From Example3)
        this.sources[packet.ssrc].updateSeq(packet.seq);
    }

    /**
     * Called on receiving a new RTCP packet.
     *
     * @param {Buffer} data - packet data.
     * @param {RemoteInfo} rinfo - source transport address.
     */
    onRtcp(data, rinfo) {
        const packet = parse(data);
        this.updateAvgSize(packet.size);

        if(!packet.ssrc)
            return;

        if(!this.sources[packet.ssrc]) {
            console.log('New source with ID', packet.ssrc, '(RTCP)');
            this.addSource(packet.ssrc);
        }
        else if(this.rinfo[packet.ssrc].rtcp === null) {
            this.rinfo[packet.ssrc].rtcp = rinfo;
        }
        else {
            let old = this.rinfo[packet.ssrc].rtcp;
            if(old.port != rinfo.port || old.address != rinfo.address) {
                if(packet.ssrc != this.ssrc) {
                    // This collision is from a third-party and likely contains
                    // duplicate information. Just discard the packet.
                    return;
                }
                else {
                    // This is a collision on our source id. First we check to
                    // see if we have a record of this collision already. If so,
                    // then this is probably a loop and we don't want to keep
                    // changing our SSRC over and over again.
                    for(let [ address, ports ] of Object.entries(this.conflicts)) {
                        // First find this address
                        if(address != rinfo.address)
                            continue;

                        for(let port of Object.keys(ports)) {
                            // Next find this port
                            if(port != rinfo.port)
                                continue;

                            // Update the timestamp
                            this.conflicts[address][port] = Date.now();
                            return;
                        }
                    }

                    // No record exists, we will add one and change our source
                    // address to resolve the collision.
                    if(!this.conflicts[rinfo.address])
                        this.conflicts[rinfo.address] = {};

                    this.conflicts[rinfo.address][rinfo.port] = Date.now();

                    // Choose another (random) SSRC address.
                    this.rtp_packet.ssrc = Math.random() * Math.pow(2, 32);
                    this.addSource(this.ssrc);

                    console.log("SSRC changed to", this.ssrc);

                    // Associate our old id with the new address
                    this.rinfo[packet.ssrc].rtcp = rinfo;
                }
            }
        }

        // Update timestamps (from Example 4)
        this.timestamps[packet.ssrc].rtcp = Date.now();

        // Process payload (from Example 3)
        switch(packet.type) {
            case PacketType.SR:
                this.processSr(packet);
                break;
        }
    }
};

if(require.main === module) {
    // The following allows for this example to be run up to twice so that the
    // user can observe the two processes exchanging data.
    async function main() {
        try {
            const example = new Example5({
                rtp_port: 5002,
                rtcp_port: 5003,
                name: "Example5"
            });

            // Set the ssrc to something known to guarentee a collision
            example.rtp_packet.ssrc = 1;

            await example.bind(6002, 6003);

            console.log("Sending on ports 5002/5003");
            console.log("Listening on ports 6002/6003");
            example.start();
        }
        catch(e) {
            if(e.errno == -98) {
                // EADDRINUSE
                const example = new Example5({
                    rtp_port: 6002,
                    rtcp_port: 6003,
                    name: "Example5"
                });

                // Set the ssrc to something known to guarentee a collision
                example.rtp_packet.ssrc = 1;

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

module.exports=exports=Example5;
