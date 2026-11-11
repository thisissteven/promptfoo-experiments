const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'bundle');
const pats=[/new WebSocket/,/wss:/,/WebSocketService/,/getSocketTicket/,/socketUrl/,/ws\?ticket/,/ticket=/];
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js.map'))){
 let j; try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch(e){continue;}
 if(!j.sourcesContent)continue;
 j.sources.forEach((s,i)=>{const c=j.sourcesContent[i]||''; if(pats.some(p=>p.test(c))){console.log('\n###',s); c.split(/\r?\n/).forEach((l,n)=>{if(pats.some(p=>p.test(l)))console.log(n+1,l.trim().slice(0,240));});}});
}
