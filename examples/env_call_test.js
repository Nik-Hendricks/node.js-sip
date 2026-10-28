#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function loadDotEnv(file) {
  try {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (Object.prototype.hasOwnProperty.call(process.env, key) === false) {
        process.env[key] = value;
      }
    }
  } catch (e) {
    // A missing .env file is normal.
  }
}

loadDotEnv(path.join(process.cwd(), '.env'));
loadDotEnv(path.join(__dirname, '..', '.env'));

const VOIP = require('../index.js');
const SIP = require('../SIP');
const RTP = require('../RTP');
const utils = require('../utils.js');

const cfg = {
  username: process.env.SIP_USERNAME,
  password: process.env.SIP_PASSWORD,
  server: process.env.SIP_SERVER,
  port: Number(process.env.SIP_PORT || 5060),
  localIp: process.env.SIP_LOCAL_IP || utils.getLocalIpAddress(),
  localPort: Number(process.env.SIP_LOCAL_PORT || 0),
  target: process.env.SIP_TARGET || process.env.PHONE_NUMBER,
  timeout: Number(process.env.SIP_TIMEOUT_MS || 30000),
  audioPort: Number(process.env.SIP_AUDIO_PORT || 16000),
  hangupAfterMs: Number(process.env.SIP_HANGUP_AFTER_MS || 0),
};

const required = ['username', 'password', 'server', 'target'];
for (const key of required) {
  if (!cfg[key]) {
    console.error('Missing required environment variable for ' + key);
    console.error('Required: SIP_USERNAME, SIP_PASSWORD, SIP_SERVER, SIP_TARGET or PHONE_NUMBER');
    process.exit(2);
  }
}

let acknowledged = false;
let finished = false;

function finish(code) {
  if (finished) return;
  finished = true;
  try { rtpSession.stop(); } catch (e) {}
  console.log('Exiting with code ' + code);
  process.exit(code);
}

function makeSdp(callId) {
  return [
    'v=0',
    'o=' + cfg.username + ' 0 ' + callId + ' IN IP4 ' + cfg.localIp,
    's=node.js-sip env test',
    'c=IN IP4 ' + cfg.localIp,
    't=0 0',
    'm=audio ' + rtpSession.listen_port + ' RTP/AVP 0 8 101',
    'a=rtpmap:0 PCMU/8000',
    'a=rtpmap:8 PCMA/8000',
    'a=rtpmap:101 telephone-event/8000',
    'a=sendrecv',
  ].join('\r\n') + '\r\n';
}

const callId = 'env-test-' + Date.now();
let hangupTimer = null;

const rtpSession = new RTP.SessionManager().new_session({
  call_id: 'env-rtp-test',
  sdp: 'v=0\r\no=rtp 0 0 IN IP4 127.0.0.1\r\ns=rtp\r\nc=IN IP4 127.0.0.1\r\nt=0 0\r\nm=audio 9999 RTP/AVP 0\r\na=rtpmap:0 PCMU/8000\r\n',
  dtmf_callback: (event) => {
    console.log('DTMF detected:', event.digit, 'duration:', event.duration, 'end:', event.end);
  },
  callback: () => {},
});
rtpSession.start();
rtpSession.dtmf((event) => {
  console.log('DTMF event:', event.digit, 'end:', event.end);
});


const client = new VOIP({
  type: 'client',
  username: cfg.username,
  register_password: cfg.password,
  register_ip: cfg.server,
  register_port: cfg.port,
  transport: {
    type: 'udp4',
    port: cfg.localPort,
    ip: cfg.localIp,
  },
}, (event) => {
  console.log('SIP event:', event && event.type, event && event.message && event.message.statusCode);

  if (event && event.type === 'REGISTERED') {
    console.log('Registered successfully');

    setTimeout(() => {
      client.uac_init_call({
        to: cfg.target,
        ip: cfg.server,
        port: cfg.port,
        username: cfg.username,
        callId,
        from_tag: SIP.Builder.generateTag(),
        branch: SIP.Builder.generateBranch(),
        body: makeSdp(callId),
        client_callback: (response) => {
          const statusCode = response && response.message && response.message.statusCode;
          const method = response && response.message && response.message.method;
          console.log('Call event:', statusCode || method);

          if (statusCode === 200 && !acknowledged) {
            acknowledged = true;
            const headers = SIP.Parser.ParseHeaders(response.message.headers);
            const contact = headers.Contact && headers.Contact.contact;
            const ip = (contact && contact.ip) || cfg.server;
            const port = (contact && contact.port) || cfg.port;
            client.ack({
              to: cfg.target,
              ip,
              port,
              from: cfg.username,
              to_tag: headers.To.tag,
              from_tag: headers.From.tag,
              branch: headers.Via.branch,
              callId,
              cseq: 1,
              requestUri: 'sip:' + cfg.target + '@' + ip + ':' + port,
            });
            console.log('ACK sent to ' + ip + ':' + port);

            if (cfg.hangupAfterMs > 0) {
              hangupTimer = setTimeout(() => {
                const byeHeaders = {
                  'Via': { uri: { ip: cfg.localIp, port: client.transport.port }, branch: SIP.Builder.generateBranch() },
                  'To': { contact: { username: cfg.target, ip, port }, tag: headers.To.tag },
                  'From': { contact: { username: cfg.username, ip: cfg.localIp, port: client.transport.port }, tag: headers.From.tag },
                  'CSeq': { count: 2, method: 'BYE' },
                  'Call-ID': callId,
                  'Contact': { contact: { username: cfg.username, ip: cfg.localIp, port: client.transport.port } },
                };
                client.server_send(
                  SIP.Builder.SIPMessageObject({
                    method: 'BYE',
                    requestUri: 'sip:' + cfg.target + '@' + ip + ':' + port,
                    headers: byeHeaders,
                  }),
                  ip,
                  port
                );
                console.log('BYE sent');
              }, cfg.hangupAfterMs);
            }
          }
        },
      });
    }, 250);
  }

  if (event && event.type === 'REGISTER_FAILED') {
    console.error('Registration failed:', event.message && event.message.statusCode, event.message && event.message.statusText);
    finish(1);
  }
});

setTimeout(() => {
  console.error('Test timed out');
  try { rtpSession.stop(); } catch (e) {}
  finish(1);
}, cfg.timeout + 5000);

process.on('SIGINT', () => {
  console.log('Interrupted by user');
  if (hangupTimer) clearTimeout(hangupTimer);
  try { rtpSession.stop(); } catch (e) {}
  finish(0);
});
