const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'bundle');
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js'))){
 const c=fs.readFileSync(path.join(dir,f),'utf8');
 for(const m of c.matchAll(/NEXT_PUBLIC_API_HUB_HOST[^,;]{0,120}/g)) console.log(f,m[0]);
}
