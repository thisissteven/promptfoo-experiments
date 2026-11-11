const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'bundle');
const want=process.argv.slice(2);
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js.map'))){
 let j; try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch(e){continue;}
 if(!j.sourcesContent)continue;
 j.sources.forEach((s,i)=>{ if(want.some(w=>s.includes(w))){ console.log('\n===== '+s+' =====\n'); console.log(j.sourcesContent[i]); } });
}
