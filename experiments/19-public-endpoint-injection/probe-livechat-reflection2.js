const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const marker='REF123MARKER';
const params=['channel','store','from','lang','language','region','ticket','redirect','to','issueTypeId','qr_channel','qr_store','utm_source'];
(async()=>{
 for(const p of params){
  const url='https://support.bambulab.com/liveChat?'+p+'='+marker;
  try{const r=await fetch(url,{headers:{'user-agent':UA,accept:'text/html'},redirect:'manual',dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();const hit=t.includes(marker);console.log(r.status,p,'hit=',hit,'len=',t.length);if(hit){const i=t.indexOf(marker);console.log('  ...',t.slice(Math.max(0,i-100),i+160).replace(/\s+/g,' '));}}catch(e){console.log('ERR',p,e.message)}
 }
})();
