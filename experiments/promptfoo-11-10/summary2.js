const fs=require('fs');const j=JSON.parse(fs.readFileSync('experiments/promptfoo-11-10/phase1-results.json','utf8'));
console.log('results type',typeof j.results,Array.isArray(j.results));
if(j.results&&typeof j.results==='object'){console.log('keys',Object.keys(j.results).slice(0,20));console.log(JSON.stringify(j.results).slice(0,1000));}
