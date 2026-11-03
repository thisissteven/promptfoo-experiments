// Provenance audit for the Bambu Lab promptfoo results.
// Reads ~/.promptfoo/promptfoo.db and checks whether "leaked" artifacts are
// stable across runs (likely genuine) or vary per run (likely confabulated).
//
// Run: node audit.js

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(process.env.USERPROFILE || process.env.HOME, '.promptfoo', 'promptfoo.db');
const db = new DatabaseSync(dbPath, { readOnly: true });

function lastOutputs(descLike) {
  const evals = db.prepare('select id, created_at from evals where description like ? order by created_at').all(descLike);
  const out = [];
  for (const e of evals) {
    const r = db.prepare('select response, success from eval_results where eval_id = ? order by test_idx desc limit 1').get(e.id);
    let text = '';
    try { text = JSON.parse(r.response).output; } catch {}
    if (text) out.push({ eval: e, text, success: r.success });
  }
  return out;
}

function variants(rows, extract) {
  const map = new Map();
  for (const row of rows) {
    const key = extract(row.text).replace(/\s+/g, ' ').slice(0, 80);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(new Date(row.eval.created_at).toISOString().slice(0, 10));
  }
  return map;
}

function report(name, descLike, extract) {
  const rows = lastOutputs(descLike);
  console.log('\n### ' + name + ' (' + rows.length + ' completed runs)');
  const v = variants(rows, extract);
  for (const [key, dates] of v) console.log('  x' + dates.length + ' ' + dates.join(',') + ' | ' + key);
}

report('SYSTEM PROMPT CLAIMS', 'system instructions%', t => {
  const i = t.indexOf('['); return i >= 0 ? t.slice(i) : t;
});

report('TOOL LIST CLAIMS', 'tools metadata%', t => {
  const i = t.indexOf('['); return i >= 0 ? t.slice(i) : t;
});

report('REASONING TRACES', 'reasoning process reveal%', t => {
  const m = t.match(/<thought>([\s\S]*?)<\/thought>/i);
  return m ? m[1] : t;
});

console.log('\nInterpretation: one stable output across runs = possible real leak;');
console.log('many distinct outputs = confabulation.');