const { test } = require('node:test');
const assert = require('node:assert');
const SIP = require('../SIP');

test('parser parses 200 OK', () => {
  const msg = "SIP/2.0 200 OK\r\nVia: x\r\nTo: <sip:bob@x>;tag=t2\r\nFrom: <sip:alice@y>;tag=t1\r\nCall-ID: c1\r\nCSeq: 1 INVITE\r\nContent-Length: 0\r\n\r\n";
  const p = SIP.Parser.parse(msg);
  assert.strictEqual(p.statusCode, 200);
  assert.strictEqual(SIP.Parser.ParseHeaders(p.headers)['Call-ID'], 'c1');
});

test('builder round-trips status line', () => {
  const obj = SIP.Builder.SIPMessageObject({
    isResponse: true,
    statusCode: 200,
    statusText: 'OK',
    headers: { Via: { uri: { ip: '1.2.3.4', port: 5060 }, branch: 'abc' },
      To: { contact: { username: 'bob', ip: 'x' }, tag: 't2' },
      From: { contact: { username: 'alice', ip: 'y' }, tag: 't1' },
      CSeq: { count: 1, method: 'INVITE' },
      'Call-ID': 'c1' }
  });
  const built = SIP.Builder.Build(obj);
  assert.match(built, /^SIP\/2\.0 200 OK\r\n/);
});

test('router resolves mapped endpoint', () => {
  const Router = new SIP.Router({ context: {} });
  Router.addRoute({ name: 'ext', type: 't', match: '^1000$', endpoint: '1000' });
  const mgr = { items: { '1000': { foo: 'bar' } } };
  Router.addEndpointType({ type: 't', manager: mgr, behavior: () => {} });
  const r = Router.route('1000');
  assert.ok(r && r.endpoint && r.endpoint.foo === 'bar');
});

test('router strips endpoint type prefix', () => {
  const Router = new SIP.Router({ context: {} });
  Router.addRoute({ name: 'trunk', type: 't', match: '^[0-9]{11}$', endpoint: 'trunk:trunk1' });
  const mgr = { items: { trunk1: { name: 'trunk1' } } };
  Router.addEndpointType({ type: 't', manager: mgr, behavior: () => {} });
  const r = Router.route('12345678901');
  assert.ok(r && r.endpoint && r.endpoint.name === 'trunk1');
});

test('contact expires parsed', () => {
  const h = SIP.Parser.ParseHeaders({ Contact: '<sip:user@1.2.3.4:5060>;expires=3600' });
  assert.strictEqual(h.Contact.expires, 3600);
});

test('utils local IP is string or null', () => {
  const ip = require('../utils').getLocalIpAddress();
  assert.ok(ip === null || typeof ip === 'string');
});
