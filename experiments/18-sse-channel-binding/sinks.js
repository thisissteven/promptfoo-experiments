const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'bundle');
const pats=[/dangerouslySetInnerHTML/,/innerHTML/,/new Function/,/\beval\(/,/postMessage/,/location\.href/,/window\.open/,/JSON\.parse\([^)]*content/,/\.extension\b/,/TransferCreateOrderLink/];
const hits={};
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js.map'))){
 let j; try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch(e){continue;}
 if(!j.sourcesContent)continue;
 j.sources.forEach((s,i)=>{const c=j.sourcesContent[i]||''; for(const p of pats){ if(p.test(c)){ (hits[s]=hits[s]||new Set()).add(p.source.replace(/\\/g,'')); } }});
}
for(const s of Object.keys(hits).sort()) console.log([...hits[s]].join(','),'::',s);
