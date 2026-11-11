const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'bundle');
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js.map'))){
 let j; try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch(e){continue;}
 if(!j.sourcesContent)continue;
 j.sources.forEach((s,i)=>{const c=j.sourcesContent[i]||''; if(/INTERACTION_CARD_CHAT_TYPE/.test(c)){console.log('\n###',s); console.log(c.slice(0,4000));}});
}
