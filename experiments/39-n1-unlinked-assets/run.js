// 39 - Unlinked "n1" product asset folder exposed before any public N1 page.
//
// Public Wiki.js assets.folders lists product folders. The "n1" folder contains
// five component images. The images are directly downloadable, but no public
// N1 page exists in the wiki. This is a pre-release/product-asset exposure
// candidate; whether N1 is announced elsewhere is outside this harness.
//
// No image bytes are saved. Only filenames/status/content-type/size.
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
    signal: AbortSignal.timeout(45000),
  });
  return { status: r.status, text: await r.text() };
}

async function headOrGet(p) {
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
      'A public Wiki.js asset folder exposes downloadable product images for an N1 model that has no public wiki page.',
    n1Folder: null,
    assets: [],
    pageChecks: [],
    searchHits: 0,
    downloads: [],
  };

  const f = await gql('{ assets { folders(parentFolderId:0){ id name } } }');
  let folders = [];
  try { folders = JSON.parse(f.text).data?.assets?.folders || []; } catch {}
  const n1 = folders.find((x) => String(x.name).toLowerCase() === 'n1');
  results.n1Folder = n1 || null;
  console.log('n1Folder', JSON.stringify(n1));

  if (n1) {
    const a = await gql(`{ assets { list(folderId:${n1.id}, kind:ALL){ filename } } }`);
    try { results.assets = (JSON.parse(a.text).data?.assets?.list || []).map((x) => x.filename); } catch {}
    console.log('assets', JSON.stringify(results.assets));

    for (const p of ['/en/n1', '/zh/n1', '/en/n1/manual', '/zh/n1/manual']) {
      const r = await headOrGet(p);
      results.pageChecks.push({ path: p, status: r.status, type: r.type, bytes: r.bytes });
      console.log('PAGE', p, '=>', r.status, r.type, r.bytes);
    }

    const s = await gql('{ pages { search(query:"N1"){ results { id path title } } } }');
    try { results.searchHits = (JSON.parse(s.text).data?.pages?.search?.results || []).length; } catch {}
    console.log('searchHits', results.searchHits);

    for (const fn of results.assets) {
      const u = '/n1/' + encodeURIComponent(fn);
      const r = await headOrGet(u);
      results.downloads.push({ file: fn, path: u, status: r.status, type: r.type, bytes: r.bytes });
      console.log('ASSET', u, '=>', r.status, r.type, r.bytes);
    }
  }

  results.summary = {
    n1FolderExposed: !!n1,
    assets: results.assets.length,
    publicN1Page: results.pageChecks.some((p) => p.status === 200),
    downloadable: results.downloads.filter((d) => d.status === 200).length,
  };
  console.log('SUMMARY', JSON.stringify(results.summary));

  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(__dirname, 'results.txt'),
    [
      'n1Folder ' + JSON.stringify(results.n1Folder),
      'assets ' + JSON.stringify(results.assets),
      ...results.pageChecks.map((p) => `PAGE ${p.path} => ${p.status} ${p.type} ${p.bytes}`),
      'searchHits ' + results.searchHits,
      ...results.downloads.map((d) => `ASSET ${d.path} => ${d.status} ${d.type} ${d.bytes}`),
      'SUMMARY ' + JSON.stringify(results.summary),
    ].join('\n') + '\n'
  );
  process.exit(0);
})();
