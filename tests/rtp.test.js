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

test('RTP session supports re-INVITE-style update', async () => {
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
  const session = manager.new_session({ call_id: 'rtp-update-test', sdp, callback: () => {} });
  const result = session.update(sdp);
  assert.ok(result && result.type === 'SESSION_UPDATED');
  session.stop();
  manager.remove_session('rtp-update-test');
});

test('Session detects RFC2833 DTMF events', async () => {
  const manager = new RTP.SessionManager();
  const sdp = [
    'v=0',
    'o=z 0 1 IN IP4 127.0.0.1',
    's=z',
    'c=IN IP4 127.0.0.1',
    't=0 0',
    'm=audio 9999 RTP/AVP 98',
    'a=rtpmap:98 telephone-event/8000',
  ].join('\n');
  const session = manager.new_session({ call_id: 'rtp-dtmf-test', sdp, callback: () => {} });
  let detected = null;
  session.dtmf((event) => { detected = event; });
  session.start();

  await new Promise((resolve) => setTimeout(resolve, 500));
  const packet = Buffer.from([
    0x80, 0x62, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x01,
    0x01, 0x8a, 0x00, 0xa0,
  ]);
  const socket = require('node:dgram').createSocket('udp4');
  socket.send(packet, session.listen_port, session.listen_ip, () => {});
  await new Promise((resolve) => setTimeout(resolve, 300));

  assert.ok(detected, 'expected DTMF event');
  assert.strictEqual(detected.digit, '1');
  assert.strictEqual(detected.end, true);
  assert.ok(session.dtmf_events.length >= 1);

  session.stop();
  manager.remove_session('rtp-dtmf-test');
  socket.close();
});

test('Session deduplicates repeated RFC2833 DTMF events', async () => {
  const manager = new RTP.SessionManager();
  const sdp = [
    'v=0',
    'o=z 0 1 IN IP4 127.0.0.1',
    's=z',
    'c=IN IP4 127.0.0.1',
    't=0 0',
    'm=audio 9999 RTP/AVP 98',
    'a=rtpmap:98 telephone-event/8000',
  ].join('\n');
  const session = manager.new_session({ call_id: 'rtp-dedupe-test', sdp, callback: () => {} });
  const events = [];
  session.dtmf((event) => events.push(event));
  session.start();

  const packet = (timestampHighByte) => Buffer.from([
    0x80, 0x62, 0x00, 0x01,
    0x00, 0x00, timestampHighByte, 0x01,
    0x00, 0x00, 0x00, 0x01,
    0x01, 0x8a, 0x00, 0xa0,
  ]);
  const dgram = require('node:dgram');

  await new Promise((resolve) => setTimeout(resolve, 500));
  const first = dgram.createSocket('udp4');
  first.send(packet(1), session.listen_port, session.listen_ip, () => {});
  first.send(packet(1), session.listen_port, session.listen_ip, () => {});
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.strictEqual(events.length, 1, 'expected duplicate RFC2833 packet to be suppressed');
  assert.strictEqual(events[0].digit, '1');

  // A different event timestamp represents a separate button press.
  const second = dgram.createSocket('udp4');
  second.send(packet(2), session.listen_port, session.listen_ip, () => {});
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.strictEqual(events.length, 2, 'expected separate DTMF press to be reported');

  session.stop();
  manager.remove_session('rtp-dedupe-test');
  first.close();
  second.close();
});
