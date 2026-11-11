const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const base='https://oepa.bblops.com';
const paths=['/csm/gateway/actuator','/csm/gateway/actuator/health','/csm/gateway/swagger-ui/index.html','/csm/gateway/v3/api-docs','/csm/gateway/v2/api-docs','/csm/gateway/health','/csm/gateway/metrics','/csm/gateway/','/csm/gateway/cus/conversation/hasActiveConversation','/csm/gateway/cus/message/page'];
(async()=>{for(const p of paths){try{const r=await fetch(base+p,{headers:{'user-agent':UA,'origin':'https://support.bambulab.com','accept':'*/*'},dispatcher:d,signal:AbortSignal.timeout(15000)});const t=await r.text();console.log(r.status,p,'|',t.slice(0,180).replace(/\s+/g,' '));}catch(e){console.log('ERR',p,e.message)}}})();
