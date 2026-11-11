const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'bundle');
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js'))){
 const c=fs.readFileSync(path.join(dir,f),'utf8');
 let i=c.indexOf('uploadWithName');
 if(i>=0){console.log('###',f);console.log(c.slice(Math.max(0,i-600),i+300));}
}
