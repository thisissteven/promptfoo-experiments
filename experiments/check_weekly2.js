const fs=require('fs');const s=fs.readFileSync('weekly-findings/findings_11_10_2026.md','utf8');
console.log('bad runs',([...s.matchAll(/\?{2,}/g)]).length);
for(const m of s.matchAll(/\?{2,}/g))console.log(JSON.stringify(s.slice(Math.max(0,m.index-60),m.index+80)));
console.log('--- table area ---');
const i=s.indexOf('| Test |');console.log(s.slice(i,i+400));
console.log('--- headings ---');
for(const line of s.split('\n'))if(line.startsWith('#'))console.log(line);
