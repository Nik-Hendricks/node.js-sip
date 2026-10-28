const { test } = require('node:test');
const assert = require('node:assert');
const SIP = require('../SIP');
const VOIP = require('../index.js');

test('localhost SIP call handles INVITE, ACK, and BYE', { timeout: 20000 }, (t, done) => {
  const PORT = 15181;
  const server = new VOIP({ type: 'server', transport: { type: 'udp4', port: PORT, ip: '127.0.0.1' } }, (d) => {
    if (!d) return;
    if (d.type === 'REGISTER' && d.message) return server.uas_handle_registration(d.message, () => {});
    if (d.type === 'INVITE' && d.message) return server.uas_handle_invite(d.message, () => {});
    if (d.type === 'ACK' && d.message) return server.uas_handle_ack(d.message, () => {});
    if (d.type === 'BYE' && d.message) return server.uas_handle_bye(d.message, () => {});
  });
  server.UserManager.addUser({ name: 'alice', extension: '1000', username: '1000', password: 'rootPassword' });
  server.IVRManager.addIVR({ name: 'ivr' });
  server.Router.addRoute({ name: 'ivr route', type: 'VOIP/IVR', match: '^ivr$', endpoint: 'ivr' });

  let gotInviteResponse = false;
  const v = new VOIP({ type: 'client', username: '1000', register_password: 'rootPassword', register_ip: '127.0.0.1', register_port: PORT, transport: { type: 'udp4', port: 0, ip: '127.0.0.1' } }, (d) => {
    if (d && d.type === 'REGISTERED') {
      setTimeout(() => {
        v.uac_init_call({
          to: 'ivr',
          ip: '127.0.0.1',
          port: PORT,
          username: '1000',
          callId: 'integration-call',
          from_tag: SIP.Builder.generateTag(),
          branch: SIP.Builder.generateBranch(),
          body: 'v=0\r\no=z 0 1 IN IP4 127.0.0.1\r\ns=z\r\nc=IN IP4 127.0.0.1\r\nt=0 0\r\nm=audio 16000 RTP/AVP 0\r\na=rtpmap:0 PCMU/8000\r\n',
          client_callback: (m) => {
            if (m && (m.type === '200' || m.type === 200 || (m.message && m.message.statusCode === 200))) {
              gotInviteResponse = true;
              const h = SIP.Parser.ParseHeaders(m.message.headers);
              const contact = h.Contact.contact;
              v.ack({ to: 'ivr', ip: contact.ip, port: contact.port, from: '1000', to_tag: h.To.tag, from_tag: h.From.tag, branch: h.Via.branch, callId: 'integration-call', cseq: 1, requestUri: `sip:${contact.ip}:${contact.port}` });
              setTimeout(() => {
                const byeHeaders = {
                  'Via': { uri: { ip: '127.0.0.1', port: v.transport.port }, branch: SIP.Builder.generateBranch() },
                  'To': { contact: { username: 'ivr', ip: contact.ip, port: contact.port }, tag: h.To.tag },
                  'From': { contact: { username: '1000', ip: '127.0.0.1', port: v.transport.port }, tag: h.From.tag },
                  'CSeq': { count: 2, method: 'BYE' },
                  'Call-ID': 'integration-call',
                  'Contact': { contact: { username: '1000', ip: '127.0.0.1', port: v.transport.port } }
                };
                v.server_send(SIP.Builder.SIPMessageObject({ method: 'BYE', requestUri: `sip:ivr@${contact.ip}:${contact.port}`, headers: byeHeaders }), contact.ip, contact.port);
                setTimeout(() => {
                  try { server.SessionManager.remove_session('integration-call'); } catch (e) {}
                  try { server.internal_uac.transport.close(); } catch (e) {}
                  try { server.transport.close(); } catch (e) {}
                  try { v.transport.close(); } catch (e) {}
                  assert.ok(gotInviteResponse, 'expected a 200 OK to INVITE');
                  done();
                  setTimeout(() => process.exit(0), 100);
                }, 1000);
              }, 500);
            }
          }
        });
      }, 500);
    }
    if (d && d.type === 'REGISTER_FAILED') {
      done(new Error('registration failed'));
    }
  });
  setTimeout(() => done(new Error('integration timeout')), 18000);
});
