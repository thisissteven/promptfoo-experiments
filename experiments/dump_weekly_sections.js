const fs=require('fs');const s=fs.readFileSync('weekly-findings/findings_11_10_2026.md','utf8');
const start=s.indexOf('## Cross-user');const end=s.indexOf('## Internal instruction');console.log(s.slice(start,end));
const st2=s.indexOf('## User ID');const en2=s.indexOf('## Internal instruction');console.log('\n---SNOW---\n'+s.slice(st2,en2));
