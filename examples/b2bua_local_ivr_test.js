#!/usr/bin/env node
'use strict';

// In-process B2BUA-style style test: one VOIP UAS hosts an IVR endpoint and
// one local UAC calls that endpoint. This removes NAT, PSTN, carrier, and
// handset variables, then shows whether the library stays up past 4 seconds.
const { test } = require('node:test');
const assert = require('node:assert');
const SIP = require('../SIP');
const VOIP = require('../index.js');

const PORT = 15181;
const CALLING_USER = '1000';
const CALLING_PASS = 'rootPassword';
const CALL_ID = 'b2bua-local-call';

test('local B2BUA IVR call stays up for 10 seconds', { timeout: 20000 }, (t, done) => {
    let finished = false;
    let acked = false;
    let elapsedTimer = null;

    const server = new VOIP({
        type: 'server',
        transport: { type: 'udp4', port: PORT, ip: '127.0.0.1' }
    }, (d) => {
        if (!d) return;
        if (d.type === 'REGISTER' && d.message) return server.uas_handle_registration(d.message, () => {});
        if (d.type === 'INVITE' && d.message) return server.uas_handle_invite(d.message, () => {});
        if (d.type === 'ACK' && d.message) return server.uas_handle_ack(d.message, () => {});
        if (d.type === 'BYE' && d.message) {
            console.log('LOCAL SERVER RECEIVED BYE');
            return server.uas_handle_bye(d.message, () => {});
        }
    });
    server.UserManager.addUser({ name: 'tester', extension: CALLING_USER, username: CALLING_USER, password: CALLING_PASS });
    server.IVRManager.addIVR({ name: 'ivr' });
    server.Router.addRoute({ name: 'ivr route', type: 'VOIP/IVR', match: '^ivr$', endpoint: 'ivr' });

    const startedAt = Date.now();
    elapsedTimer = setInterval(() => {
        console.log(JSON.stringify({ event: 'local_call_alive', elapsed_ms: Date.now() - startedAt, acked }));
    }, 1000);

    const caller = new VOIP({
        type: 'client',
        username: CALLING_USER,
        register_password: CALLING_PASS,
        register_ip: '127.0.0.1',
        register_port: PORT,
        transport: { type: 'udp4', port: 0, ip: '127.0.0.1' }
    }, (d) => {
        if (d && d.type === 'REGISTERED') {
            console.log('LOCAL CLIENT REGISTERED');
            setTimeout(() => {
                caller.uac_init_call({
                    to: 'ivr',
                    ip: '127.0.0.1',
                    port: PORT,
                    username: CALLING_USER,
                    callId: CALL_ID,
                    from_tag: SIP.Builder.generateTag(),
                    branch: SIP.Builder.generateBranch(),
                    body: 'v=0\r\no=b2bua 0 1 IN IP4 127.0.0.1\r\ns=b2bua\r\nc=IN IP4 127.0.0.1\r\nt=0 0\r\nm=audio 16000 RTP/AVP 0\r\na=rtpmap:0 PCMU/8000\r\n',
                    client_callback: (m) => {
                        if (m && (m.message && m.message.statusCode === 200)) {
                            acked = true;
                            const headers = SIP.Parser.ParseHeaders(m.message.headers);
                            const contact = headers.Contact.contact;
                            caller.ack({
                                to: 'ivr',
                                ip: contact.ip,
                                port: contact.port,
                                from: CALLING_USER,
                                to_tag: headers.To.tag,
                                from_tag: headers.From.tag,
                                branch: headers.Via.branch,
                                callId: CALL_ID,
                                cseq: 1,
                                requestUri: `sip:ivr@${contact.ip}:${contact.port}`
                            });
                            console.log('LOCAL CLIENT ACKED IVR');
                        } else if (m && m.message && m.message.method === 'BYE') {
                            console.log('LOCAL CLIENT RECEIVED BYE');
                        }
                    }
                });
                console.log('LOCAL CLIENT INVITE SENT');
            }, 500);
        }
        if (d && d.type === 'REGISTER_FAILED') {
            done(new Error('local registration failed'));
        }
    });

    setTimeout(() => {
        clearInterval(elapsedTimer);
        try { caller.transport.close(); } catch (e) {}
        try { server.transport.close(); } catch (e) {}
        try { server.internal_uac.transport.close(); } catch (e) {}
        assert.ok(acked, 'expected local IVR INVITE 200 OK');
        try { caller.transport.close(); } catch (e) {}
        try { server.transport.close(); } catch (e) {}
        try { server.internal_uac.transport.close(); } catch (e) {}
        done();
        setImmediate(() => process.exit(0));
    }, 10000);
});
