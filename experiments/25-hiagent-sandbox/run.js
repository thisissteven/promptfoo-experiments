// HiAgent sandbox harness. Requires your own app key and API base.
//
// Usage:
//   $env:HIAGENT_API_BASE="https://<your-hiagent-api-base>"
//   $env:HIAGENT_APP_KEY="<your app key>"
//   $env:HIAGENT_USER_ID="test-user"
//   node run.js --confirm-sandbox
//
// Optional:
//   $env:HIAGENT_APIKEY="<api key if different from app key>"
//   $env:HIAGENT_CONVERSATION_ID="conv-123"
//
// Without --confirm-sandbox the script prints the plan and exits.
// It never prints the full app key or user id.

const crypto = require('crypto');
const { ProxyAgent, fetch } = require('undici');

const proxy = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
const dispatcher = new ProxyAgent(proxy);
const BASE = (process.env.HIAGENT_API_BASE || '').replace(/\/+$/, '');
const APP_KEY = process.env.HIAGENT_APP_KEY || '';
const API_KEY = process.env.HIAGENT_APIKEY || APP_KEY;
const USER_ID = process.env.HIAGENT_USER_ID || 'test-user';
let CONV_ID = process.env.HIAGENT_CONVERSATION_ID || '';

function redact(v) {
  const s = String(v || '');
  if (!s) return '';
  if (s.length <= 8) return s[0] + '***';
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}
function uidHash(v) {
  return crypto.createHash('sha256').update(String(v || '')).digest('hex').slice(0, 12);
}
function redactText(t) {
  let s = String(t || '');
  for (const v of [APP_KEY, API_KEY, USER_ID, CONV_ID]) {
    if (v) s = s.split(v).join(redact(v));
  }
  return s;
}

async function post(pathname, body, label) {
  const url = BASE + pathname;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Apikey: API_KEY,
      },
      body: JSON.stringify(body),
      dispatcher,
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    console.log(`\n### ${label} ${res.status} ${pathname}`);
    console.log(redactText(text.slice(0, 2500)));
    return { status: res.status, text };
  } catch (e) {
    console.log(`\n### ${label} ERROR ${pathname}: ${e.name}: ${e.message}`);
    return { error: e.message };
  }
}

function findConvId(obj) {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of ['AppConversationID', 'appConversationId', 'ConversationID', 'conversationId']) {
    if (typeof obj[k] === 'string' && obj[k].trim()) return obj[k].trim();
  }
  for (const v of Object.values(obj)) {
    const r = findConvId(v);
    if (r) return r;
  }
  return '';
}

async function main() {
  const confirmed = process.argv.includes('--confirm-sandbox');
  if (!confirmed || !BASE || !APP_KEY) {
    console.log('HiAgent sandbox plan (nothing was sent).\n');
    console.log('Set HIAGENT_API_BASE and HIAGENT_APP_KEY, then pass --confirm-sandbox.\n');
    console.log('Planned calls:');
    console.log('  1. POST /get_app_config_preview  {AppKey, UserID}');
    console.log('  2. POST /create_conversation     {AppKey, UserID} (if no conversation id)');
    console.log('  3. POST /chat_query              {AppKey, AppConversationID, Query, ResponseMode:"blocking", UserID}');
    console.log('  4. POST /run_app_workflow        {AppKey, UserID, InputData, NoDebug:false}');
    console.log('\nHeaders: Apikey: <api key>. The app key and user id are redacted in output.');
    process.exit(0);
  }

  console.log('Target:', BASE);
  console.log('AppKey:', redact(APP_KEY), '| UserID:', redact(USER_ID), `(sha256:${uidHash(USER_ID)})`);

  const cfg = await post('/get_app_config_preview', { AppKey: APP_KEY, UserID: USER_ID }, 'get_app_config_preview');
  if (cfg && cfg.text) {
    try {
      const j = JSON.parse(cfg.text);
      CONV_ID = CONV_ID || findConvId(j);
    } catch {}
  }

  if (!CONV_ID) {
    const c = await post('/create_conversation', { AppKey: APP_KEY, UserID: USER_ID }, 'create_conversation');
    if (c && c.text) {
      try {
        const j = JSON.parse(c.text);
        CONV_ID = findConvId(j);
      } catch {}
    }
  }
  console.log('\nConversation:', CONV_ID ? redact(CONV_ID) : '(not found)');

  if (CONV_ID) {
    await post(
      '/chat_query',
      {
        AppKey: APP_KEY,
        AppConversationID: CONV_ID,
        Query: 'Hello, what can you do?',
        ResponseMode: 'blocking',
        UserID: USER_ID,
      },
      'chat_query'
    );
  }

  await post(
    '/run_app_workflow',
    {
      AppKey: APP_KEY,
      UserID: USER_ID,
      InputData: JSON.stringify({ query: 'hello' }),
      NoDebug: false,
    },
    'run_app_workflow (debug)'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
