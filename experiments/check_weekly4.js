const fs=require('fs');const s=fs.readFileSync('weekly-findings/findings_11_10_2026.md','utf8');
console.log('bad runs',([...s.matchAll(/\?{2,}/g)]).length);
const i=s.indexOf('## User ID');console.log(s.slice(i,i+900));
console.log('--- tail ---');console.log(s.slice(-500));
