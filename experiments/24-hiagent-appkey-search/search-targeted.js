const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..','18-sse-channel-binding','bundle');
const pats=[/APPID/,/apiKey/,/api_key/,/proxy\/api\/v1/,/trigger\/webhook/i,/SYS_USERID/,/SYS_USERNAME/,/webhook/i,/X-App-Key/i,/AppKey/,/Bearer /,/X-Api-Key/i];
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js.map'))){
 let j; try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch(e){continue;}
 if(!j.sourcesContent)continue;
 j.sources.forEach((s,i)=>{
  if(/node_modules/.test(s))return;
  const c=j.sourcesContent[i]||'';
  c.split(/\r?\n/).forEach((l,n)=>{ if(pats.some(p=>p.test(l))) console.log(`${s}:${n+1}: ${l.trim().slice(0,300)}`); });
 });
}
