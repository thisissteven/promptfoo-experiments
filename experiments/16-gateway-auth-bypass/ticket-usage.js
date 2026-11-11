const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..','18-sse-channel-binding','bundle');
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js.map'))){
 let j; try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch(e){continue;}
 if(!j.sourcesContent)continue;
 j.sources.forEach((s,i)=>{const c=j.sourcesContent[i]||''; if(/ticket\/login|auth\/ticket|ws\/ticket|ticketLogin|loginWithTicket/.test(c)){console.log('\n###',s); c.split(/\r?\n/).forEach((l,n)=>{if(/ticket/i.test(l))console.log(n+1,l.trim().slice(0,260));});}});
}

