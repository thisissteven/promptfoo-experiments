const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..','18-sse-channel-binding','bundle');
const eps=new Set();
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js.map'))){
 let j; try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch(e){continue;}
 if(!j.sourcesContent)continue;
 for(const c of j.sourcesContent){ if(!c)continue; for(const m of c.matchAll(/["'`](\/(?:gw|file|cus)\/[A-Za-z0-9_\-{}\/$.:?=&]+)/g)) eps.add(m[1]); }
}
console.log([...eps].sort().join('\n'));

