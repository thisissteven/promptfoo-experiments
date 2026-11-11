const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'bundle');
const hosts=new Set();
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js'))){
 const c=fs.readFileSync(path.join(dir,f),'utf8');
 for(const m of c.matchAll(/https?:\/\/[a-zA-Z0-9.\-]+/g)) hosts.add(m[0]);
}
console.log([...hosts].sort().join('\n'));
