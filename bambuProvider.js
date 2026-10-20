// bambuProvider.js
const crypto = require('crypto');
const { ProxyAgent, fetch } = require('undici');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';
const proxyAgent = new ProxyAgent(proxyUrl);

const SSE_CONNECT_TIMEOUT = 15000;
const CHAT_POST_TIMEOUT = 15000;
const TOTAL_STREAM_TIMEOUT = 60000;

module.exports = class BambuProvider {
  constructor(options) {
    this.providerId = options.id || 'bambu-customer-service';
    this.config = options.config;
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt, context, options) {
    const sessionId = crypto.randomUUID();
    const uuid = sessionId;
    const history = [];
    const chatbot = [];

    console.error(`[Bambu] ▶ START | session=${sessionId}`);

    const sseController = new AbortController();
    const totalTimeout = setTimeout(() => {
      console.error(`[Bambu] ⏰ Total timeout hit (${TOTAL_STREAM_TIMEOUT}ms).`);
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
      console.error(`[Bambu] ← SSE ${sseResponse.status}`);

      // 2. Start stream reader
      const streamPromise = this._readSSEStream(sseResponse.body, uuid, totalTimeout);

      await new Promise((r) => setTimeout(r, 200));

      // 3. POST chat
      const chatUrl = `${this.config.baseUrl}/gw/robot/sse/chat`;
      const chatPayload = {
        requestId: `clientID_text_${crypto.randomUUID()}`,
        history,
        chatbot,
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
      console.error(`[Bambu] ← POST ${chatResponse.status}`);

      // 4. Wait for stream
      const fullResponse = await streamPromise;
      clearTimeout(totalTimeout);
      sseController.abort();

      if (fullResponse === null) {
        return { error: `Stream timeout after ${TOTAL_STREAM_TIMEOUT}ms` };
      }

      console.error(`[Bambu] ✅ SUCCESS | length: ${fullResponse.length}`);
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
    let rawDump = false;

    console.error(`[Bambu] 📡 reader started`);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });

        // One-time raw dump so we can see the actual SSE format
        if (!rawDump && buffer.length > 100) {
          rawDump = true;
          const preview = buffer.substring(0, 400).replace(/\r/g, '\\r').replace(/\n/g, '\\n');
          console.error(`[Bambu] 🔎 RAW DUMP (first 400 chars): ${preview}`);
        }

        // Robust SSE event splitter: handle \r\n\r\n, \n\n, or \r\r
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop(); // keep incomplete trailing part

        for (const part of parts) {
          // Split event into lines (handles \r\n, \n, \r)
          const lines = part.split(/\r?\n|\r/);
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            // Allow both "data: x" and "data:x"
            const dataStr = line.substring(5).replace(/^\s/, '');

            if (dataStr === '[DONE]') {
              console.error(`[Bambu] ✅ [DONE] after ${eventCount} events, ${fullResponse.length} chars`);
              return fullResponse;
            }

            eventCount++;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.uuid === uuid && parsed.delta) {
                fullResponse += parsed.delta.replace(/<br\s*\/?>/gi, '\n');
              }
            } catch (e) {
              // Non-JSON event, ignore
            }
          }
        }
      }

      console.error(`[Bambu] 📡 stream ended. events=${eventCount}, chars=${fullResponse.length}`);
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