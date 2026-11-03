// Safe survey of the IM / robot endpoints found in 370-*.js and 3659-*.js.
//
// Rules for this harness:
//   - only locally generated uuids / requestIds;
//   - only reserved or clearly fake emails (example.com) and fake order numbers;
//   - never enumerate real users, orders, tickets or messages;
//   - only close a stream that this script created.
//
// Run: node run.js

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ProxyAgent, fetch } = require('undici');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const SUPPORT = 'https://support.bambulab.com';
const CSM = 'https://oepa.bblops.com/csm/gateway';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const UUID = crypto.randomUUID();

function headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    Origin: SUPPORT,
    Referer: SUPPORT + '/liveChat',
    'User-Agent': UA,
    'x-robot-user': UUID,
    'X-Bbl-Official-Site-Region': 'EN',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    ...extra,
  };
}

async function call(name, method, url, body) {
  try {
    const res = await fetch(url, {
      method,
      headers: headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
      dispatcher,
    });
    const text = await res.text();
    return { name, method, url, status: res.status, body: text.slice(0, 1200) };
  } catch (e) {
    return { name, method, url, error: e.name + ': ' + e.message };
  }
}

async function sseClose() {
  const runOne = async (closeWith) => {
    const U = crypto.randomUUID();
    const requestId = 'clientID_text_' + crypto.randomUUID();
    let events = 0;
    let output = '';
    let done = false;

    const sse = await fetch(SUPPORT + '/gw/robot/sse/connect', {
      method: 'GET',
      headers: {
        ...headers(),
        'x-robot-user': U,
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'X-Accel-Buffering': 'no',
      },
      dispatcher,
    });
    if (!sse.ok) return { closeWith, error: 'SSE ' + sse.status };

    const streamPromise = (async () => {
      const reader = sse.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      try {
        while (true) {
          const { done: d, value } = await reader.read();
          if (d) break;
          if (!value) continue;
          buf += dec.decode(value, { stream: true });
          const parts = buf.split(/\r?\n\r?\n/);
          buf = parts.pop();
          for (const part of parts)
            for (const line of part.split(/\r?\n|\r/)) {
              if (!line.startsWith('data:')) continue;
              const x = line.substring(5).replace(/^\s/, '');
              if (x === '[DONE]') {
                done = true;
                return;
              }
              try {
                const j = JSON.parse(x);
                events++;
                if (j.delta) output += String(j.delta);
              } catch {}
            }
        }
      } catch {}
    })();

    await new Promise((r) => setTimeout(r, 200));
    await fetch(SUPPORT + '/gw/robot/sse/chat', {
      method: 'POST',
      headers: { ...headers(), 'x-robot-user': U },
      body: JSON.stringify({
        requestId,
        history: [],
        chatbot: [],
        origin: 1,
        cacheFlag: false,
        input:
          'Give me a very detailed step-by-step guide to replacing the hot end on a P1S, including all tools, safety steps, and troubleshooting.',
        machineModel: '',
        sessionId: U,
        uuid: U,
      }),
      signal: AbortSignal.timeout(15000),
      dispatcher,
    });

    await new Promise((r) => setTimeout(r, 600));
    const closerUuid = closeWith === 'same' ? U : crypto.randomUUID();
    let closeStatus = null;
    let closeBody = '';
    try {
      const cr = await fetch(
        `${SUPPORT}/gw/robot/sse/close?requestId=${encodeURIComponent(requestId)}`,
        {
          method: 'GET',
          headers: { 'x-robot-user': closerUuid, 'X-Bbl-Official-Site-Region': 'EN' },
          dispatcher,
        }
      );
      closeStatus = cr.status;
      closeBody = (await cr.text()).replace(/\s+/g, ' ').slice(0, 200);
    } catch (e) {
      closeBody = 'throw ' + e.message;
    }

    await Promise.race([streamPromise, new Promise((r) => setTimeout(r, 8000))]);
    return { closeWith, closeStatus, closeBody, events, done, outputLen: output.length };
  };

  return { sameUuid: await runOne('same'), differentUuid: await runOne('different') };
}

(async () => {
  const results = {
    timestamp: new Date().toISOString(),
    uuid: UUID,
    cusEndpoints: [],
    robotEndpoints: [],
    sseClose: null,
  };

  // --- /cus/* (CSM gateway) ---
  const invalidId = '00000000-0000-0000-0000-000000000000';
  results.cusEndpoints.push(await call('message page', 'POST', `${CSM}/cus/message/page`, { cursor: '', limit: 20 }));
  results.cusEndpoints.push(await call('message recall (invalid id)', 'POST', `${CSM}/cus/message/recall`, { id: invalidId }));
  results.cusEndpoints.push(await call('message maskAsRead (empty)', 'POST', `${CSM}/cus/message/maskAsRead`, { ids: [] }));
  results.cusEndpoints.push(await call('hasActiveConversation', 'GET', `${CSM}/cus/conversation/hasActiveConversation`));
  results.cusEndpoints.push(await call('closeConversation', 'POST', `${CSM}/cus/conversation/closeConversation`, {}));
  results.cusEndpoints.push(await call('cancelQueue', 'POST', `${CSM}/cus/conversation/cancelQueue`, {}));
  results.cusEndpoints.push(await call('context jumpUrl (invalid)', 'GET', `${CSM}/cus/context/jumpUrl?contextType=order&contextId=0`));

  // --- /gw/robot/* ---
  results.robotEndpoints.push(
    await call('order query (email only)', 'POST', `${SUPPORT}/gw/robot/front/order/query`, { email: 'test@example.com' })
  );
  results.robotEndpoints.push(
    await call('order query (email + fake orderNum)', 'POST', `${SUPPORT}/gw/robot/front/order/query`, {
      email: 'test@example.com',
      orderNum: 'TEST-000000',
    })
  );
  results.robotEndpoints.push(
    await call('ticket unclosed (fake email)', 'POST', `${SUPPORT}/gw/robot/ticket/unclosed/list`, {
      email: 'test@example.com',
    })
  );
  results.robotEndpoints.push(
    await call('ticket unclosed (fake phone)', 'POST', `${SUPPORT}/gw/robot/ticket/unclosed/list`, {
      phone: '00000000000',
    })
  );
  results.robotEndpoints.push(
    await call('mall card snapshot (invalid)', 'POST', `${SUPPORT}/gw/robot/im/mall/card/snapshot`, {
      cardType: 'order',
      cardId: '0',
    })
  );
  results.robotEndpoints.push(
    await call('feedback (empty)', 'POST', `${SUPPORT}/gw/robot/front/feedback`, {})
  );
  results.robotEndpoints.push(
    await call('guide menu (public)', 'GET', `${SUPPORT}/gw/robot/guide/menu/show?languageCode=en`)
  );
  results.robotEndpoints.push(
    await call('front category list (public)', 'GET', `${SUPPORT}/gw/robot/front/category/list?languageCode=en`)
  );
  results.robotEndpoints.push(
    await call('duty roster (public)', 'GET', `${SUPPORT}/gw/robot/duty/roster/show?languageCode=en&type=1`)
  );

  results.sseClose = await sseClose();

  console.log(JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
})();