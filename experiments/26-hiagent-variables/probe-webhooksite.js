const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
(async()=>{try{const r=await fetch('https://webhook.site/token',{method:'POST',headers:{'content-type':'application/json'},body:'{}',dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();console.log(r.status,t.slice(0,500));}catch(e){console.log('ERR',e.message)}})();
