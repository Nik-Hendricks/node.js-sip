const chai = require('chai');
const { AppPacket, PacketType, parse } = require('..');

const expect = chai.expect;
chai.use(require('chai-bytes'));

describe('AppPacket', function() {
    it('should be constructable', function() {
        const pkt = new AppPacket();
        expect(pkt.version).to.equal(2);
        expect(pkt.type).to.equal(PacketType.APP);
    });

    it('should be parsable', function() {
        const pkt1 = new AppPacket();
        const pkt2 = parse(pkt1.serialize());
        expect(pkt2 instanceof AppPacket).to.be.true;
        expect(pkt2.type).to.equal(PacketType.APP);
    });

    it('should support arbitrary app data', function() {
        const pkt = new AppPacket();
        const start_size = pkt.size;

        const buffer = Buffer.from([1, 2, 3, 4, 5]);

        pkt.data = buffer;
        expect(pkt.data).to.equalBytes(buffer);
        expect(pkt.size).to.be.greaterThan(start_size);

        const data = pkt.serialize();
        expect(buffer.compare(data, start_size, start_size + buffer.length)).to.equal(0);
    });

    it('should not add extra padding', function() {
        let pkt = new AppPacket();
        pkt.data = Buffer.from([1]);
        expect(parse(pkt.serialize()).data.length).to.equal(4);

        pkt = new AppPacket();
        pkt.data = Buffer.from([1, 2]);
        expect(parse(pkt.serialize()).data.length).to.equal(4);

        pkt = new AppPacket();
        pkt.data = Buffer.from([1, 2, 3]);
        expect(parse(pkt.serialize()).data.length).to.equal(4);

        pkt = new AppPacket();
        pkt.data = Buffer.from([1, 2, 3, 4]);
        expect(parse(pkt.serialize()).data.length).to.equal(4);
    });
});