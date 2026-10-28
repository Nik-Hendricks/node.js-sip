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
const utils = require('../utils.js');
const RTP = require('../RTP');

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
  hangupAfterMs: Number(process.env.IVR_HANGUP_AFTER_MS || 0),
};

const required = ['username', 'password', 'server', 'target'];
for (const key of required) {
  if (!cfg[key]) {
    console.error('Missing required environment variable for ' + key);
    console.error('Required: SIP_USERNAME, SIP_PASSWORD, SIP_SERVER, SIP_TARGET or PHONE_NUMBER');
    process.exit(2);
  }
}

const PROMPTS = {
  main: path.join(__dirname, 'ivr_prompts', 'main.wav'),
  1: path.join(__dirname, 'ivr_prompts', 'sales.wav'),
  2: path.join(__dirname, 'ivr_prompts', 'support.wav'),
  3: path.join(__dirname, 'ivr_prompts', 'billing.wav'),
  4: path.join(__dirname, 'ivr_prompts', 'accounting.wav'),
  '*': path.join(__dirname, 'ivr_prompts', 'help.wav'),
  invalid: path.join(__dirname, 'ivr_prompts', 'invalid.wav'),
};

const callId = 'ivr-env-test-' + Date.now();
const rtpSession = (new RTP.SessionManager()).new_session({
  call_id: callId,
  sdp: [
    'v=0',
    'o=ivr 0 1 IN IP4 127.0.0.1',
    's=ivr',
    'c=IN IP4 127.0.0.1',
    't=0 0',
    'm=audio 9999 RTP/AVP 0 8 101',
    'a=rtpmap:0 PCMU/8000',
    'a=rtpmap:8 PCMA/8000',
    'a=rtpmap:101 telephone-event/8000',
  ].join('\r\n') + '\r\n',
  audio_file: PROMPTS.main,
  callback: (event) => {
    if (event && event.type === 'SESSION_STARTED') {
      console.log('RTP session started on', rtpSession.listen_ip + ':' + rtpSession.listen_port);
    }
  },
});
rtpSession.dtmf((event) => {
  if (!event || event.end !== true) return;
  const digit = String(event.digit);
  console.log('DTMF accepted:', digit);

  if (digit === '0') {
    console.log('Hangup requested by caller');
    hangup();
  } else if (digit === '*' || Object.prototype.hasOwnProperty.call(PROMPTS, digit)) {
    const state = (digit === '*') ? 'main' : digit;
    playState(state, digit);
  } else {
    console.log('No valid action for DTMF:', digit);
    rtpSession.setAudioFile(PROMPTS.invalid);
  }
});

rtpSession.start();

let audioState = 'main';
let acknowledged = false;
let finished = false;
let hangupTimer = null;

function playState(state, key) {
  const prompt = PROMPTS[state] || PROMPTS.main;
  audioState = state;
  rtpSession.setAudioFile(prompt);
  console.log('IVR state:', describeState(state), key ? '(pressed ' + key + ')' : '(main menu)');
}

function describeState(state) {
  return {
    '1': 'sales',
    '2': 'support',
    '3': 'billing',
    '4': 'accounting',
    '*': 'help',
  }[state] || state;
}

function makeSdp() {
  return [
    'v=0',
    'o=' + cfg.username + ' 0 ' + callId + ' IN IP4 ' + cfg.localIp,
    's=node.js-sip IVR env test',
    'c=IN IP4 ' + cfg.localIp,
    't=0 0',
    'm=audio ' + rtpSession.listen_port + ' RTP/AVP 0 8 101',
    'a=rtpmap:0 PCMU/8000',
    'a=rtpmap:8 PCMA/8000',
    'a=rtpmap:101 telephone-event/8000',
    'a=sendrecv',
  ].join('\r\n') + '\r\n';
}

const client = new VOIP({
  type: 'client',
  auto_ack: false,
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
        body: makeSdp(),
        client_callback: (response) => {
          const statusCode = response && response.message && response.message.statusCode;
          const method = response && response.message && response.message.method;
          console.log('Call event:', statusCode || method);

          if (method === 'BYE') {
            console.log('Remote BYE received');
            finish(0);
          }

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

            if (response.message && response.message.body) {
              try {
                rtpSession.update(response.message.body);
              } catch (e) {
                console.error('Could not update remote media endpoint:', e && e.message ? e.message : e);
              }
            }

            if (cfg.hangupAfterMs > 0) {
              console.log('Scheduling automatic hangup in ' + cfg.hangupAfterMs + ' ms');
              hangupTimer = setTimeout(() => {
                console.log('Automatic hangup timer fired');
                try {
                  hangup(ip, port, headers);
                } catch (e) {
                  console.error('Hangup failed:', e && e.message ? e.message : e);
                }
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

  if (event && event.type === 'BYE') {
    console.log('Remote BYE received');
    finish(0);
  }
});

function hangup(ip, port, headers) {
  if (hangupTimer) clearTimeout(hangupTimer);
  if (!ip) return;
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
}

function finish(code) {
  if (finished) return;
  finished = true;
  try { rtpSession.stop(); } catch (e) {}
  console.log('Exiting with code ' + code);
  process.exit(code);
}

setTimeout(() => {
  console.error('Test timed out');
  finish(1);
}, cfg.timeout + 5000);

process.on('SIGINT', () => {
  console.log('Interrupted by user');
  if (hangupTimer) clearTimeout(hangupTimer);
  finish(0);
});
