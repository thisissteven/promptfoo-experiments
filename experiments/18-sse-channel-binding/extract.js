const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'bundle');
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js.map'))){
 let j; try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch(e){continue;}
 if(!j.sourcesContent)continue;
 j.sources.forEach((s,i)=>{
   const c=j.sourcesContent[i]||'';
   if(/handoff_context|current_intent|im_action|sse\/connect|x-robot-user/.test(c)){
     console.log('\n### FILE',f,'SOURCE',s);
     const lines=c.split(/\r?\n/);
     lines.forEach((l,n)=>{ if(/handoff_context|current_intent|im_action|sse\/connect|x-robot-user/.test(l)) console.log((n+1)+': '+l.trim().slice(0,300)); });
   }
 });
}
