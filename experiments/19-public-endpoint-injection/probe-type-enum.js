const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
async function get(p){try{const r=await fetch(B+p,{headers:{'user-agent':UA,origin:B,referer:B+'/liveChat','x-bbl-official-site-region':'EN'},dispatcher:d,signal:AbortSignal.timeout(15000)});return {status:r.status,text:await r.text()};}catch(e){return {error:e.message}}}
(async()=>{
 const out={guide:[],roster:[],aikey:[]};
 for(let t=0;t<=20;t++){
  const r=await get(`/gw/robot/guide/show?type=${t}&languageCode=en`);
  out.guide.push({type:t,status:r.status,len:r.text?r.text.length:0,head:(r.text||r.error||'').slice(0,120).replace(/\s+/g,' ')});
 }
 for(let t=0;t<=10;t++){
  const r=await get(`/gw/robot/duty/roster/show?languageCode=en&type=${t}`);
  out.roster.push({type:t,status:r.status,len:r.text?r.text.length:0,head:(r.text||r.error||'').slice(0,120).replace(/\s+/g,' ')});
 }
 for(let t=0;t<=20;t++){
  const r=await get(`/gw/robot/ai/key/list?languageCode=en&type=${t}`);
  out.aikey.push({type:t,status:r.status,len:r.text?r.text.length:0,head:(r.text||r.error||'').slice(0,120).replace(/\s+/g,' ')});
 }
 console.log(JSON.stringify(out,null,2));
})();
