// bambuProvider.js
const crypto = require('crypto');
const { ProxyAgent, fetch } = require('undici');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';
const proxyAgent = new ProxyAgent(proxyUrl);

const SSE_CONNECT_TIMEOUT = 15000;
const CHAT_POST_TIMEOUT = 15000;
const TOTAL_STREAM_TIMEOUT = 60000;

// Session cache: keeps the same sessionId across calls within the same test case
// so multi-turn strategies (Hydra, Crescendo, GOAT) build a real conversation.
const sessionCache = new Map();

function getConversationKey(context, prompt) {
  // Try every plausible location for a stable per-test-case identifier.
  // If Promptfoo calls the provider multiple times for the same test case
  // (multi-turn), these values stay constant across turns.
  const candidates = [
    context?.test?.id,
    context?.test?.vars?.testcaseId,
    context?.test?.metadata?.testcaseId,
    context?.vars?.testcaseId,
    context?.vars?.conversationId,
    context?.metadata?.testcaseId,
    context?.metadata?.conversationId,
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && c !== '') return String(c);
  }
  // Fallback: key by prompt (works for single-turn, breaks multi-turn).
  // If you see multi-turn breaking, run with --verbose and log `context` to find the right key.
  return `prompt:${prompt}`;
}

module.exports = class BambuProvider {
  constructor(options) {
    this.providerId = options.id || 'bambu-customer-service';
    this.config = options.config;
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt, context, options) {
    // --- Session management ---
    const cacheKey = getConversationKey(context, prompt);
    let session = sessionCache.get(cacheKey);
    const isNewSession = !session;
    if (!session) {
      session = { sessionId: crypto.randomUUID() };
      session.uuid = session.sessionId;
      sessionCache.set(cacheKey, session);
    }
    const { sessionId, uuid } = session;

    console.error(
      `[Bambu] ▶ ${isNewSession ? 'NEW' : 'CONT'} | key=${cacheKey.substring(0, 40)} | session=${sessionId}`
    );

    const sseController = new AbortController();
    const totalTimeout = setTimeout(() => {
      console.error(`[Bambu] ⏰ Total timeout (${TOTAL_STREAM_TIMEOUT}ms).`);
      sseController.abort();
    }, TOTAL_STREAM_TIMEOUT);

    try {
      // 1. SSE Connect
      const sseUrl = `${this.config.baseUrl}/gw/robot/sse/connect`;
      const sseResponse = await fetch(sseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Accel-Buffering': 'no',
          'Origin': this.config.origin,
          'Referer': `${this.config.origin}/liveChat`,
          'User-Agent': this.config.userAgent,
          'x-robot-user': uuid,
          'x-bbl-official-site-region': 'EN',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          ...(this.config.headers || {}),
        },
        signal: sseController.signal,
        dispatcher: proxyAgent,
      });

      if (!sseResponse.ok) {
        clearTimeout(totalTimeout);
        sseController.abort();
        return { error: `SSE connection failed: ${sseResponse.status}` };
      }

      const streamPromise = this._readSSEStream(sseResponse.body, uuid, totalTimeout);
      await new Promise((r) => setTimeout(r, 200));

      // 2. POST chat
      const chatUrl = `${this.config.baseUrl}/gw/robot/sse/chat`;
      const chatPayload = {
        requestId: `clientID_text_${crypto.randomUUID()}`,
        history: [],
        chatbot: [],
        origin: 1,
        cacheFlag: false,
        input: prompt,
        machineModel: '',
        sessionId,
        uuid,
      };

      const chatResponse = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': this.config.origin,
          'Referer': `${this.config.origin}/liveChat`,
          'User-Agent': this.config.userAgent,
          'x-robot-user': uuid,
          'x-bbl-official-site-region': 'EN',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          ...(this.config.headers || {}),
        },
        body: JSON.stringify(chatPayload),
        signal: AbortSignal.timeout(CHAT_POST_TIMEOUT),
        dispatcher: proxyAgent,
      });

      if (!chatResponse.ok) {
        clearTimeout(totalTimeout);
        sseController.abort();
        return { error: `Chat POST failed: ${chatResponse.status}` };
      }

      // 3. Wait for stream
      const fullResponse = await streamPromise;
      clearTimeout(totalTimeout);
      sseController.abort();

      if (fullResponse === null) {
        return { error: `Stream timeout after ${TOTAL_STREAM_TIMEOUT}ms` };
      }

      return { output: fullResponse };

    } catch (error) {
      clearTimeout(totalTimeout);
      sseController.abort();
      console.error(`[Bambu] ❌ ${error.name} - ${error.message}`);
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return { error: `Timeout/Abort: ${error.message}` };
      }
      return { error: error.message };
    }
  }

  async _readSSEStream(body, uuid, totalTimeout) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';
    let eventCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop();

        for (const part of parts) {
          const lines = part.split(/\r?\n|\r/);
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const dataStr = line.substring(5).replace(/^\s/, '');

            if (dataStr === '[DONE]') {
              return fullResponse;
            }

            eventCount++;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.uuid === uuid && parsed.delta) {
                fullResponse += parsed.delta.replace(/<br\s*\/?>/gi, '\n');
              }
            } catch (e) {}
          }
        }
      }

      if (fullResponse.length > 0) return fullResponse;
      return null;
    } catch (err) {
      if (err.name === 'AbortError') {
        if (fullResponse.length > 0) return fullResponse;
        return null;
      }
      throw err;
    }
  }
};