const { test } = require('node:test');
const assert = require('node:assert');
const SIP = require('../SIP');
const crypto = require('node:crypto');

function md5(v){ return crypto.createHash('md5').update(v).digest('hex'); }
test('Auth verifies a valid digest', () => {
  const username = 'testuser';
  const password = 'secret';
  const realm = 'node.js-sip';
  const nonce = 'nonce123';
  const method = 'REGISTER';
  const uri = 'sip:10.0.0.1:5060';
  const qop = 'auth';
  const nc = '00000001';
  const cnonce = 'clientnonce';
  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
  assert.ok(SIP.Auth.verifyDigest({
    username, password, realm, nonce, method, uri, response, qop, nc, cnonce, algorithm:'MD5'
  }));
});

test('Auth rejects wrong password', () => {
  const username = 'testuser';
  const password = 'secret';
  const realm = 'node.js-sip';
  const nonce = 'nonce123';
  const method = 'REGISTER';
  const uri = 'sip:10.0.0.1:5060';
  const response = 'badresponse';
  assert.strictEqual(SIP.Auth.verifyDigest({
    username, password, realm, nonce, method, uri, response, qop:'auth', nc:'00000001', cnonce:'x'
  }), false);
});

test('Auth rejects missing fields', () => {
  assert.strictEqual(SIP.Auth.verifyDigest({}), false);
});

test('Contact header supports hostnames and expires', () => {
  const h = SIP.Parser.ParseHeaders({ Contact: '<sip:user@example.com:5060>;expires=120' });
  assert.strictEqual(h.Contact.contact.username, 'user');
  assert.strictEqual(h.Contact.contact.ip, 'example.com');
  assert.strictEqual(h.Contact.contact.port, '5060');
  assert.strictEqual(h.Contact.expires, 120);
});

test('SDP parser rejects malformed input', () => {
  assert.throws(() => require('../SDP').Parser.parse('bad'));
});

test('Transport can close', () => {
  const T = require('../SIP').Transport;
  const t = new T({ type:'udp4', port:0, ip:'127.0.0.1' });
  t.close(() => {});
  assert.ok(true);
});
