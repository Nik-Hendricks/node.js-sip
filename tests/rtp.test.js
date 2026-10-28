const { test } = require('node:test');
const assert = require('node:assert');
const dgram = require('node:dgram');
const RTP = require('../RTP');

test('RTP session receives packets and reports stats', async () => {
  const manager = new RTP.SessionManager();
  const sdp = [
    'v=0',
    'o=z 0 1 IN IP4 127.0.0.1',
    's=z',
    'c=IN IP4 127.0.0.1',
    't=0 0',
    'm=audio 9999 RTP/AVP 0',
    'a=rtpmap:0 PCMU/8000',
  ].join('\n');
  const session = manager.new_session({ call_id: 'rtp-test', sdp, callback: () => {} });
  session.start();

  await new Promise((resolve) => setTimeout(resolve, 500));
  const socket = dgram.createSocket('udp4');
  socket.send(Buffer.from([0x80, 0x7f, 0, 1, 0, 0, 0, 1]), session.listen_port, session.listen_ip, () => {});
  await new Promise((resolve) => setTimeout(resolve, 300));

  const stats = session.rtpStats();
  session.stop();
  manager.remove_session('rtp-test');
  assert.ok(stats.received_packets >= 1, 'expected at least one RTP packet');
  socket.close();
});
