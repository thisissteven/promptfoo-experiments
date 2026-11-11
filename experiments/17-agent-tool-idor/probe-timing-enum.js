const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const emails=['support@bambulab.com','test@example.com','nonexistent-'+Math.random().toString(36).slice(2)+'@example.com','a@b.co','info@bambulab.com'];
async function post(path,body){const t0=Date.now();try{const r=await fetch(B+path,{method:'POST',headers:{'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':'probe','x-bbl-official-site-region':'EN'},body:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();return {ms:Date.now()-t0,status:r.status,text:t.slice(0,120)};}catch(e){return {ms:Date.now()-t0,error:e.name+': '+e.message}}}
(async()=>{
 const out={};
 for(const e of emails){
  const times=[];
  for(let i=0;i<5;i++){const r=await post('/gw/robot/ticket/unclosed/list',{email:e});times.push(r.ms);await new Promise(x=>setTimeout(x,250));}
  times.sort((a,b)=>a-b);
  out[e]={times,median:times[2]};
 }
 console.log(JSON.stringify(out,null,2));
})();
