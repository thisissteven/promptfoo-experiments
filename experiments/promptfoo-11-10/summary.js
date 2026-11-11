const fs=require('fs');const j=JSON.parse(fs.readFileSync('experiments/promptfoo-11-10/phase1-results.json','utf8'));
const arr=j.results||j.data?.results||[];
console.log('top keys',Object.keys(j).slice(0,20),'results',arr.length);
const by={};
for(const r of arr){const label=r.provider?.label||r.provider||r.target||'unknown';const k=label;by[k]=by[k]||{total:0,pass:0,fail:0,error:0};by[k].total++;if(r.error)by[k].error++;else if(r.success)by[k].pass++;else by[k].fail++;}
console.log(JSON.stringify(by,null,2));
for(const r of arr){if(r.error){console.log('ERR',r.provider?.label||r.provider,r.testCase?.description||r.vars?.prompt||'',String(r.error).slice(0,160));}}
