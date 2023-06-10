var fs = require('fs'), udp = require('dgram'), Buffer = require('buffer').Buffer, RtpPacket = require('../lib/rtppacket').RtpPacket,
	fd, sock, rtp, intvl, buf, bytesRead, ip, port,
	writeData = function() {
		if ((bytesRead = fs.readSync(fd, buf, 0, buf.length)) > 0) {
			if (!rtp)
				rtp = new RtpPacket(buf);
			else
				rtp.payload = buf;
			rtp.time += buf.length;
			rtp.seq++;
			if (!sock)
				sock = udp.createSocket('udp4');
			sock.send(rtp.packet, 0, rtp.packet.length, port, ip);
		} else {
			if (intvl)
				clearInterval(intvl);
			fs.closeSync(fd);
			if (sock)
				sock.close(); // dgram module automatically listens on the port even if we only wanted to send... -_-
		}
	};
ip = "10.1.1.243";
port = 20480;
buf = new Buffer(160);
fd = fs.openSync('audio.g711', 'r');
intvl = setInterval(writeData, 20);