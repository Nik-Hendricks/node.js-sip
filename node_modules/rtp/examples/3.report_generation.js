#!/usr/bin/env node

/**
 * This example builds on Example2 by adding RTCP report generation. A typical
 * application will choose whether to send an SR or RR packet based on if it
 * has sent an RTP packet in the last two report intervals.
 */

const {
    RtpPacket,
    RrPacket,
    SrPacket,
    Source,
    PacketType,
    parse
} = require('../index.js');

const Example2 = require('./2.source_description');

/**
 * Sends/receives RTP data and generates RTCP SR/RR packets.
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
class Example3 extends Example2 {
    constructor(args={}) {
        super(args);

        // Holds information about session sources
        this.sources = {};

        // The handle for our report timer
        this.report_timer = null;

        // The handle for our RTP on/off cycle timer
        this.on_off_timer = null;
    }

    get members() {
        // Now that we are receving packets we no longer have to assume the
        // count of session members.
        return Object.keys(this.sources).length;
    }

    /**
     * Add a new source to the sources table.
     *
     * @param {number} id - source identifier.
     */
    addSource(id) {
        if(this.sources[id] !== undefined)
            throw ReferenceError('Source already exists');

        this.sources[id] = new Source(id);
    }

    /**
     * Remove a source from the sources table.
     *
     * @param {number} id - source identifier.
     */
    removeSource(id) {
        delete this.sources[id];
    }

    /**
     * Send an RTCP SR packet.
     */
    sendSr() {
        const packet = new SrPacket();
        packet.ssrc = this.ssrc;
        packet.rtp_ts = this.ts;
        packet.pkt_count = this.rtp_pkt_count;
        packet.byte_count = this.rtp_byte_count;

        packet.updateNtpTime(new Date());

        for(let source of Object.values(this.sources)) {
            if(source.id == this.ssrc)
                continue;  // Skip ourselves

            // Update the lost packet count
            source.updateLost();

            // Generate a report
            const report = source.toReport(new Date());
            if(report)
                packet.addReport(report);
        }

        console.log("Send SR");
        const data = packet.serialize();
        this.rtcpSend(data);

        // Reset counts for next report
        this.rtp_pkt_count = 0;
        this.rtp_byte_count = 0;

        // Clear 'initial' flag
        this.initial = false;
    }

    /**
     * Send an RTCP RR packet.
     */
    sendRr() {
        const packet = new RrPacket();
        packet.ssrc = this.ssrc;

        for(let source of Object.values(this.sources)) {
            if(source.id == this.ssrc)
                continue;  // Skip ourselves

            // Update the lost packet count
            source.updateLost();

            // Generate a report
            const report = source.toReport(new Date());
            if(report)
                packet.addReport(report);
        }

        // Send our reports
        console.log("Sending RR");
        const data = packet.serialize();
        this.rtcpSend(data);

        // Clear 'initial' flag
        this.initial = false;
    }

    /**
     * Process received SR packets.
     *
     * @param {SrPacket} packet - packet to process.
     */
    processSr(packet) {
        // Update our LSR timestamp
        this.sources[packet.ssrc].updateLsr(packet.ntp_sec, packet.ntp_frac);
    }

    /**
     * Chooses whether to send an SR or RR packet.
     */
    cycleReports() {
        // If we have sent in the last cycle send an SR packet, otherwise
        // send an RR packet.
        if(this.we_sent)
            this.sendSr();
        else
            this.sendRr();

        this.report_timer = setTimeout(() => this.cycleReports(), this.interval);
    }

    /**
     * Start sending packets.
     */
    start() {
        super.start();

        // Add ourselves to the sender table
        this.addSource(this.ssrc);

        this.report_timer = setTimeout(() => this.cycleReports(), this.interval);

        this.on_off_timer = setInterval(() => {
            // Every 20 seconds stop sending RTP packets to switch which report
            // type we are sending.
            if(this.rtp_timer) {
                console.log("Stop tone");
                this.stopRtp();
            }
            else {
                console.log("Start tone");
                this.startRtp();
            }

        }, 20000);
    }

    /**
     * Stop sending packets.
     */
    stop() {
        super.stop();
        clearTimeout(this.report_timer);
        clearInterval(this.on_off_timer);
    }

    /**
     * Begin listening for packets.
     *
     * @param {number} rtp_port - RTP receive port.
     * @param {number} rtcp_port - RTCP receive port.
     * @param {string} address - receive address.
     * @returns {Promise}
     */
    bind(rtp_port, rtcp_port, address) {
        return Promise.all([
            new Promise((resolve, reject) => {
                this.rtp_socket.on('error', (e) => reject(e));
                this.rtp_socket.bind(rtp_port, address, () => {
                    this.rtp_socket.on('message', this.onRtp.bind(this));
                    resolve();
                });
            }),
            new Promise((resolve, reject) => {
                this.rtcp_socket.on('error', (e) => reject(e));
                this.rtcp_socket.bind(rtcp_port, address, () => {
                    this.rtcp_socket.on('message', this.onRtcp.bind(this));
                    resolve();
                });
            }),
        ]);
    }

    /**
     * Called on receiving a new RTP packet.
     *
     * @param {Buffer} data - packet data.
     */
    onRtp(data) {
        const packet = parse(data);

        if(packet.ssrc !== undefined && !this.sources[packet.ssrc]) {
            console.log('New source with ID', packet.ssrc, '(RTP)');
            this.addSource(packet.ssrc);
        }

        // Process packet
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

        // Process packet
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
            const example = new Example3({
                rtp_port: 5002,
                rtcp_port: 5003,
                name: "Example3"
            });

            await example.bind(6002, 6003);

            console.log("Sending on ports 5002/5003");
            console.log("Listening on ports 6002/6003");
            example.start();
        }
        catch(e) {
            if(e.errno == -98) {
                // EADDRINUSE
                const example = new Example3({
                    rtp_port: 6002,
                    rtcp_port: 6003,
                    name: "Example3"
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

module.exports=exports=Example3;