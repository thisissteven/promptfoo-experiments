const fs=require('fs'),path=require('path');
const dir='experiments/18-sse-channel-binding/bundle';
const want=['app/api/auth.ts','request/index.ts','app/lib/AuthProvider.tsx','app/hooks/robot/useSSESend.ts'];
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js.map'))){
 let j; try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch(e){continue;}
 if(!j.sourcesContent)continue;
 j.sources.forEach((s,i)=>{ if(want.some(w=>s.includes(w))){ const c=j.sourcesContent[i]||''; console.log('\n### '+s); c.split(/\r?\n/).forEach((l,n)=>{ if(/bigIntFields|JSON\.parse|login\(|cusId|setToken|login_info|sessionId: user/.test(l)) console.log((n+1)+': '+l.trim().slice(0,220)); }); } });
}
