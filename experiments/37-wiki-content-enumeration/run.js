// 37 - Unauthenticated Wiki.js content enumeration and staging-page exposure.
//
// The wiki is the chatbot's knowledge base. Wiki.js exposes a public GraphQL
// `pages.list`; it returns all page paths/titles, including Staging-/draft/test
// pages. Some of those pages are directly reachable over HTTP.
//
// This harness stores counts and status codes only, not page content.
//
// Run: node run.js

const { ProxyAgent, fetch } = require('undici');
const fs = require('fs');
const path = require('path');

const BASE = process.env.WIKI_BASE || 'https://wiki.bambulab.com';
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';
const dispatcher = new ProxyAgent(proxy);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gql(query, timeout = 60000) {
  const r = await fetch(BASE + '/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': UA },
    body: JSON.stringify({ query }),
    dispatcher,
    signal: AbortSignal.timeout(timeout),
  });
  return { status: r.status, text: await r.text() };
}

async function pageStatus(locale, pagePath) {
  try {
    const r = await fetch(`${BASE}/${locale}/${pagePath}`, {
      headers: { 'user-agent': UA },
      dispatcher,
      signal: AbortSignal.timeout(25000),
    });
    return r.status;
  } catch (e) {
    return 'ERR:' + e.name;
  }
}

async function homeHits() {
  try {
    const r = await fetch(BASE + '/en/home', { headers: { 'user-agent': UA }, dispatcher, signal: AbortSignal.timeout(25000) });
    const t = await r.text();
    return {
      status: r.status,
      hasStaging: /Staging-/i.test(t),
      hasH2S: /H2S/i.test(t),
      hasA2L: /A2L/i.test(t),
      hasP2S: /P2S/i.test(t),
    };
  } catch (e) {
    return { status: 'ERR:' + e.name };
  }
}

const STRICT = [
  (p) => /^Staging-/i.test(p.path),
  (p) => /\bdraft\b/i.test(p.title || ''),
  (p) => /(test2|test_responsive|_test)$/i.test(p.path),
  (p) => /\b(wip|todo|unreleased|preview)\b/i.test(`${p.path} ${p.title}`),
];

(async () => {
  const results = {
    base: BASE,
    timestamp: new Date().toISOString(),
    hypothesis:
      'Unauthenticated Wiki.js pages.list exposes all page metadata, including Staging-/draft/test pages, and some are directly readable over HTTP.',
    locales: {},
    strictMatches: [],
    pageChecks: [],
    home: null,
  };

  for (const locale of ['en', 'zh']) {
    const r = await gql(`{ pages { list(locale:"${locale}"){ id path title } } }`);
    let list = [];
    try { list = JSON.parse(r.text).data?.pages?.list || []; } catch {}
    results.locales[locale] = { status: r.status, pages: list.length };
    console.log(locale, 'status', r.status, 'pages', list.length);
    for (const p of list) {
      if (STRICT.some((f) => f(p))) {
        results.strictMatches.push({ locale, id: p.id, path: p.path, titlePrefix: String(p.title || '').slice(0, 40) });
      }
    }
    await sleep(500);
  }

  // Check a small, representative set only.
  const checks = [
    ['en', 'Staging-H2S-Network-Connection-Guide'],
    ['zh', 'miniwiki/hms/p2s/troubleshooting/test2'],
    ['zh', 'a2l/manual/internal-print-files'],
    ['en', 'p2s/maintenance/replace-purge-wiper'],
  ];
  for (const [locale, p] of checks) {
    const status = await pageStatus(locale, p);
    results.pageChecks.push({ locale, path: p, status });
    console.log('PAGE', locale, p, '=>', status);
    await sleep(400);
  }

  results.home = await homeHits();
  console.log('HOME', JSON.stringify(results.home));

  results.summary = {
    enPages: results.locales.en?.pages,
    zhPages: results.locales.zh?.pages,
    strictMatches: results.strictMatches.length,
    stagingReadable: results.pageChecks.find((p) => p.path.startsWith('Staging-'))?.status === 200,
    stagingLinkedFromHome: results.home.hasStaging,
  };
  console.log('SUMMARY', JSON.stringify(results.summary));

  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(__dirname, 'results.txt'),
    [
      `en pages: ${results.locales.en?.pages} (status ${results.locales.en?.status})`,
      `zh pages: ${results.locales.zh?.pages} (status ${results.locales.zh?.status})`,
      `strict matches: ${results.strictMatches.length}`,
      ...results.strictMatches.map((p) => `  ${p.locale} ${p.path} :: ${p.titlePrefix}`),
      ...results.pageChecks.map((p) => `PAGE ${p.locale}/${p.path} => ${p.status}`),
      'HOME ' + JSON.stringify(results.home),
      'SUMMARY ' + JSON.stringify(results.summary),
    ].join('\n') + '\n'
  );
  process.exit(0);
})();
