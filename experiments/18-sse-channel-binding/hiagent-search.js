const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..','18-sse-channel-binding','bundle');
const pats=[/app[_-]?key/i,/x-app-key/i,/hiagent/i,/get_app_config_preview/i,/TracingJsonStr/i,/long[_-]?term/i,/userid/i,/workspace[_-]?id/i,/agent[_-]?id/i,/workflow/i,/memory/i,/variable/i];
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js.map'))){
 let j; try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch(e){continue;}
 if(!j.sourcesContent)continue;
 j.sources.forEach((s,i)=>{
  const c=j.sourcesContent[i]||'';
  if(/node_modules/.test(s)) return;
  const lines=c.split(/\r?\n/);
  lines.forEach((l,n)=>{ if(pats.some(p=>p.test(l))){ console.log(`${s}:${n+1}: ${l.trim().slice(0,260)}`); } });
 });
}
