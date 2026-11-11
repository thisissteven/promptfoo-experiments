const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'bundle');
let found=0;
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js.map'))){
 let j; try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch(e){continue;}
 if(!j.sources)continue;
 j.sources.forEach((s,i)=>{ if(/middleware/i.test(s)){ console.log('###',s); found++; } });
}
console.log('found',found);
