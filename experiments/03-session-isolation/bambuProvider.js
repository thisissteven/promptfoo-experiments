// bambuReplayProvider.js
// Minimal provider: send one prompt to a specific Bambu chatbot session.
// sessionId comes from context.vars.sessionId (or config.sessionId).
// No caching, no conversation key derivation, no multi-turn logic.

const crypto = require('crypto');
const { ProxyAgent, fetch } = require('undici');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

const TOTAL_STREAM_TIMEOUT = 60000;

module.exports = class BambuReplayProvider {
  constructor(options) {
    this.providerId = options.id || 'bambu-replay';
    this.config = options.config || {};
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt, context) {
    const sessionId = context?.vars?.sessionId || this.config.sessionId;
    if (!sessionId) {
      return { error: 'Missing sessionId in vars or config.' };
    }

    console.error(`[Bambu-Replay] session=${sessionId} | prompt=${prompt.substring(0, 80)}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TOTAL_STREAM_TIMEOUT);

    try {
      // 1. SSE connect
      const sseUrl = `${this.config.baseUrl}/gw/robot/sse/connect`;
      const sseResponse = await fetch(sseUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          'X-Accel-Buffering': 'no',
          Origin: this.config.origin,
          Referer: `${this.config.origin}/liveChat`,
          'User-Agent': this.config.userAgent,
          'x-robot-user': sessionId,
          'x-bbl-official-site-region': 'EN',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          ...(this.config.headers || {}),
        },
        signal: controller.signal,
        dispatcher: proxyAgent,
      });

      if (!sseResponse.ok) {
        clearTimeout(timeout);
        controller.abort();
        return { error: `SSE connect failed: ${sseResponse.status}` };
      }

      const streamPromise = this._readStream(sseResponse.body, sessionId);

      await new Promise((r) => setTimeout(r, 200));

      // 2. POST /chat
      const chatUrl = `${this.config.baseUrl}/gw/robot/sse/chat`;
      const chatResponse = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: this.config.origin,
          Referer: `${this.config.origin}/liveChat`,
          'User-Agent': this.config.userAgent,
          'x-robot-user': sessionId,
          'x-bbl-official-site-region': 'EN',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          ...(this.config.headers || {}),
        },
        body: JSON.stringify({
          requestId: `clientID_text_${crypto.randomUUID()}`,
          history: [],
          chatbot: [],
          origin: 1,
          cacheFlag: false,
          input: prompt,
          machineModel: '',
          sessionId,
          uuid: sessionId,
        }),
        signal: AbortSignal.timeout(15000),
        dispatcher: proxyAgent,
      });

      if (!chatResponse.ok) {
        clearTimeout(timeout);
        controller.abort();
        return { error: `Chat POST failed: ${chatResponse.status}` };
      }

      // 3. Await stream
      const output = await streamPromise;
      clearTimeout(timeout);
      controller.abort();

      if (output === null) {
        return { error: 'No response received.' };
      }

      return { output };
    } catch (err) {
      clearTimeout(timeout);
      controller.abort();
      console.error(`[Bambu-Replay] ❌ ${err.name} - ${err.message}`);
      return { error: err.message };
    }
  }

  async _readStream(body, sessionId) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let output = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop();

        for (const part of parts) {
          for (const line of part.split(/\r?\n|\r/)) {
            if (!line.startsWith('data:')) continue;
            const data = line.substring(5).replace(/^\s/, '');
            if (data === '[DONE]') return output;
            try {
              const parsed = JSON.parse(data);
              if (parsed.uuid === sessionId && parsed.delta) {
                output += parsed.delta.replace(/<br\s*\/?>/gi, '\n');
              }
            } catch {}
          }
        }
      }
      return output.length > 0 ? output : null;
    } catch (err) {
      if (err.name === 'AbortError') return output.length > 0 ? output : null;
      throw err;
    }
  }
};