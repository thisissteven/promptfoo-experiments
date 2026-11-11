const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'bundle');
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js'))){
 const c=fs.readFileSync(path.join(dir,f),'utf8');
 for(const needle of ['oepa.bblops.com','csm/gateway','NEXT_PUBLIC_API_HOST','NEXT_PUBLIC_PORTAL_URL']){
  let i=c.indexOf(needle);
  if(i>=0){console.log('###',f,needle);console.log(c.slice(Math.max(0,i-400),i+300));}
 }
}
