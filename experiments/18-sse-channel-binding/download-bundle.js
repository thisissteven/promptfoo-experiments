const {ProxyAgent, fetch}=require('undici');
const fs=require('fs'),path=require('path');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const out=path.join(__dirname,'bundle'); fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(u){for(let i=0;i<3;i++){try{return await fetch(u,{headers:{'user-agent':UA},dispatcher:d,signal:AbortSignal.timeout(40000)});}catch(e){if(i===2)throw e;await sleep(800);}}}
(async()=>{
 const r=await get('https://support.bambulab.com/liveChat');
 const t=await r.text();
 const urls=[...new Set([...t.matchAll(/(?:src|href)="([^"]+\.js[^"]*)"/g)].map(x=>x[1]))];
 for(const u of urls){
   const name=u.split('/').pop();
   for(const [suffix,ext] of [['','.js'],['.map','.js.map']]){
     try{
       const rr=await get(u+suffix);
       if(!rr.ok){console.log(rr.status,name+ext);continue;}
       const b=Buffer.from(await rr.arrayBuffer());
       fs.writeFileSync(path.join(out,name+ext),b);
       console.log(b.length,name+ext);
     }catch(e){console.log('ERR',name+ext,e.message)}
   }
 }
})();
