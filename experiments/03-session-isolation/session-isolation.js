// Session isolation probe.
// Tests whether conversation history is bound to sessionId, to uuid, or to both.
// All sessions are created by this script; no third-party data is accessed.

const crypto = require('crypto');
const { ProxyAgent, fetch } = require('undici');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const BASE = process.env.BAMBU_BASE || 'https://support.bambulab.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function chat(sessionId, uuid, prompt) {
  const headers = {
    'Content-Type': 'application/json', Origin: BASE, Referer: BASE + '/liveChat', 'User-Agent': UA,
    'x-robot-user': uuid, 'x-bbl-official-site-region': 'EN', 'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-origin',
  };
  const sse = await fetch(BASE + '/gw/robot/sse/connect', {
    method: 'GET',
    headers: { ...headers, Accept: 'text/event-stream', 'Cache-Control': 'no-cache', Pragma: 'no-cache', 'X-Accel-Buffering': 'no' },
    dispatcher,
  });
  if (!sse.ok) return { error: 'SSE ' + sse.status };
  const streamPromise = (async () => {
    const reader = sse.body.getReader(); const dec = new TextDecoder(); let out = ''; let buf = '';
    while (true) {
      const { done, value } = await reader.read(); if (done) break; if (!value) continue;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split(/\r?\n\r?\n/); buf = parts.pop();
      for (const part of parts) for (const line of part.split(/\r?\n|\r/)) {
        if (!line.startsWith('data:')) continue;
        const d = line.substring(5).replace(/^\s/, '');
        if (d === '[DONE]') return { output: out };
        try { const j = JSON.parse(d); if (j.uuid === uuid && j.delta) out += j.delta.replace(/<br\s*\/?>/gi, '\n'); } catch {}
      }
    }
    return { output: out };
  })();
  await new Promise(r => setTimeout(r, 200));
  const res = await fetch(BASE + '/gw/robot/sse/chat', {
    method: 'POST', headers,
    body: JSON.stringify({ requestId: 'clientID_text_' + crypto.randomUUID(), history: [], chatbot: [], origin: 1, cacheFlag: false, input: prompt, machineModel: '', sessionId, uuid }),
    dispatcher,
  });
  if (!res.ok) return { error: 'POST ' + res.status };
  return await streamPromise;
}

const PLANT = 'Please remember this for later: I own an X1 Carbon and I am running firmware 01.08.02.00.';
const RECALL = 'What printer model and firmware version did I tell you I am running at the start of this conversation? If you know the answer, answer in one line.';
const hasWord = (r) => /X1 Carbon/i.test(r.output || '');

(async () => {
  const A = crypto.randomUUID();
  const B = crypto.randomUUID();
  const results = { base: BASE, sessionA: A, sessionB: B, tests: [] };

  const plant = await chat(A, A, PLANT);
  const recallA = await chat(A, A, RECALL);
  const recallB = await chat(B, B, RECALL);
  const mismatch = await chat(A, B, RECALL);

  results.tests.push({ name: 'A plant', ok: !plant.error, output: (plant.output || plant.error || '').slice(0, 200) });
  results.tests.push({ name: 'A recall (sessionId=A, uuid=A)', remembered: hasWord(recallA), output: (recallA.output || recallA.error || '').slice(0, 300) });
  results.tests.push({ name: 'B recall (sessionId=B, uuid=B)', remembered: hasWord(recallB), output: (recallB.output || recallB.error || '').slice(0, 300) });
  results.tests.push({ name: 'Mismatch (sessionId=A, uuid=B)', remembered: hasWord(mismatch), output: (mismatch.output || mismatch.error || '').slice(0, 300) });

  console.log(JSON.stringify(results, null, 2));
})();
