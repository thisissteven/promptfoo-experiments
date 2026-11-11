const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0';
const B='https://oepa.bblops.com';
const paths=['/apisix/admin/routes','/apisix/admin/consumers','/apisix/admin/plugins/list','/kong/admin','/actuator','/actuator/health','/swagger-ui/index.html','/v3/api-docs','/csm/gateway/apisix/admin/routes','/csm/gateway/kong/admin','/csm/apisix/admin/routes','/csm/actuator/health'];
(async()=>{for(const p of paths){try{const r=await fetch(B+p,{headers:{'user-agent':UA,origin:'https://support.bambulab.com'},dispatcher:d,signal:AbortSignal.timeout(15000)});const t=await r.text();console.log(r.status,p,'|',t.slice(0,160).replace(/\s+/g,' '));}catch(e){console.log('ERR',p,e.message)}}})();
