const chai = require('chai');
const { RrPacket, PacketType, parse } = require('..');

const expect = chai.expect;

describe('RrPacket', function() {
    it('should be constructable', function() {
        const pkt = new RrPacket();
        expect(pkt.version).to.equal(2);
        expect(pkt.type).to.equal(PacketType.RR);
    });

    it('should be parsable', function() {
        const pkt1 = new RrPacket();
        const pkt2 = parse(pkt1.serialize());
        expect(pkt2 instanceof RrPacket).to.be.true;
        expect(pkt2.type).to.equal(PacketType.RR);
    });

    it('should add reports', function() {
        const pkt = new RrPacket();

        pkt.addReport({
            ssrc: 0x1234,
            lost: 1.0,
        });

        expect(pkt.reports.length).to.equal(1);
        expect(pkt.reports[0].ssrc).to.equal(0x1234);
    });

    it('should remove reports', function() {
        const pkt = new RrPacket();

        pkt.addReport({ ssrc: 0x1234 });
        pkt.addReport({ ssrc: 0x5678 });
        pkt.addReport({ ssrc: 0x9ABC });

        expect(pkt.reports.length).to.equal(3);

        pkt.removeReport(0x1234);
        expect(pkt.reports.length).to.equal(2);

        for(let i = 0; i < pkt.reports.length; ++i)
            expect(pkt.reports[i].ssrc).to.not.equal(0x1234);
    });

    it('should support arbitrary extension data', function() {
        const pkt = new RrPacket();
        const start_size = pkt.size;

        const buffer = Buffer.from([1, 2, 3, 4]);

        pkt.ext = buffer;
        expect(pkt.ext).to.equalBytes(buffer);
        expect(pkt.size).to.be.greaterThan(start_size);

        const data = pkt.serialize();
        expect(buffer.compare(data, start_size, start_size + buffer.length)).to.equal(0);
    });
});