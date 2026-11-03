// Minimal Bambu chatbot client used by this experiment.
//
// Sends one turn to a server-side conversation identified by `uuid`
// (`x-robot-user`). See experiment 04 for why `uuid`, not `sessionId`, is the
// conversation key.
//
// No third-party data is read: every id used by run.js is generated locally.

const crypto = require('crypto');
const { ProxyAgent, fetch } = require('undici');

const BASE = process.env.BAMBU_BASE || 'https://support.bambulab.com';
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function chat(opts = {}) {
  const {
    sessionId = crypto.randomUUID(),
    uuid = sessionId,
    input,
    history = [],
    chatbot = [],
    machineModel = '',
    origin = 1,
    cacheFlag = false,
    region = 'EN',
    extraBody = {},
    timeoutMs = 45000,
  } = opts;

  const headers = {
    'Content-Type': 'application/json',
    Origin: BASE,
    Referer: BASE + '/liveChat',
    'User-Agent': UA,
    'x-robot-user': uuid,
    'x-bbl-official-site-region': region,
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
  };

  const sse = await fetch(BASE + '/gw/robot/sse/connect', {
    method: 'GET',
    headers: {
      ...headers,
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'X-Accel-Buffering': 'no',
    },
    dispatcher,
  });
  if (!sse.ok) return { error: 'SSE ' + sse.status };

  const events = [];
  const streamPromise = (async () => {
    const reader = sse.body.getReader();
    const dec = new TextDecoder();
    let out = '';
    let buf = '';
    const deadline = Date.now() + timeoutMs;
    try {
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
            const data = line.substring(5).replace(/^\s/, '');
            if (data === '[DONE]') return { output: out, events };
            try {
              const j = JSON.parse(data);
              events.push(j);
              if (j.delta) out += String(j.delta).replace(/<br\s*\/?>/gi, '\n');
            } catch {}
          }
        }
      }
    } catch (e) {
      return { output: out, events, streamError: e.name + ': ' + e.message };
    }
    return { output: out, events };
  })();

  await new Promise((r) => setTimeout(r, 200));

  const body = {
    requestId: 'clientID_text_' + crypto.randomUUID(),
    history,
    chatbot,
    origin,
    cacheFlag,
    input,
    machineModel,
    sessionId,
    uuid,
    ...extraBody,
  };

  const res = await fetch(BASE + '/gw/robot/sse/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
    dispatcher,
  });
  if (!res.ok) return { error: 'POST ' + res.status + ' ' + (await res.text()).slice(0, 200) };

  const result = await streamPromise;
  const convIds = [...new Set(result.events.map((e) => e.aiConversationId).filter(Boolean))];
  const msgIds = [...new Set(result.events.map((e) => e.messageId).filter(Boolean))];
  return { ...result, aiConversationId: convIds[0], msgIds, requestId: body.requestId };
}

class BambuReplayProvider {
  constructor(options) {
    this.providerId = options.id || 'bambu-replay';
    this.config = options.config || {};
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt, context) {
    const vars = context?.vars || {};
    const r = await chat({
      sessionId: vars.sessionId,
      uuid: vars.uuid || vars.sessionId,
      input: vars.input || prompt,
      history: vars.history || [],
      chatbot: vars.chatbot || [],
      machineModel: vars.machineModel || '',
      origin: vars.origin ?? 1,
      cacheFlag: vars.cacheFlag ?? false,
      region: vars.region || 'EN',
      extraBody: vars.extraBody || {},
    });
    if (r.error) return { error: r.error };
    return { output: r.output, metadata: { aiConversationId: r.aiConversationId, msgIds: r.msgIds } };
  }
}

module.exports = BambuReplayProvider;
module.exports.chat = chat;
module.exports.BASE = BASE;