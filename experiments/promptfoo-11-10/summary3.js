const fs=require('fs');const j=JSON.parse(fs.readFileSync('experiments/promptfoo-11-10/phase1-results.json','utf8'));
const r=j.results;
console.log('prompts',r.prompts.map(p=>({label:p.provider,metrics:p.metrics})));
const arr=r.results||[];
console.log('result count',arr.length);
const by={};
for(const x of arr){const label=x.provider?.label||x.provider||'unknown';by[label]=by[label]||{total:0,pass:0,fail:0,error:0};by[label].total++;if(x.error)by[label].error++;else if(x.success)by[label].pass++;else by[label].fail++;}
console.log(JSON.stringify(by,null,2));
for(const x of arr){if(x.error)console.log('ERR',x.provider?.label||x.provider,'|',String(x.error).slice(0,200));}
