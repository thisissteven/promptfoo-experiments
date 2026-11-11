const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'bundle');
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js.map'))){
 let j; try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch(e){continue;}
 if(!j.sourcesContent)continue;
 j.sources.forEach((s,i)=>{
  const c=j.sourcesContent[i]||'';
  if(/NEXT_PUBLIC_API_HUB_HOST|NEXT_PUBLIC_ROBOT_API_HOST|baseUrl/.test(c) && /request|env|config/i.test(s)){
   console.log('\n###',s);
   console.log(c.slice(0,3000));
  }
 });
}
