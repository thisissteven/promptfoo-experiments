const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const paths=['/api/health','/api/robot','/api/upload','/api/auth','/api/config','/api/proxy','/api/ssr','/api/locale','/api/track','/api/event','/api/csrf','/api/user','/api/order','/api/ticket','/api/feedback','/api/report','/api/chat','/api/sse','/api/file','/api/hub','/api/gateway','/api/status','/api/version','/api/debug','/api/test','/api/metrics'];
(async()=>{
 for(const p of paths){for(const m of ['GET','POST']){try{const r=await fetch(B+p,{method:m,headers:{'user-agent':UA,origin:B,referer:B+'/liveChat','content-type':'application/json'},body:m==='POST'?'{}':undefined,redirect:'manual',dispatcher:d,signal:AbortSignal.timeout(12000)});const t=await r.text();console.log(r.status,m,p,'|',t.slice(0,100).replace(/\s+/g,' '));}catch(e){console.log('ERR',m,p,e.message)}}}
})();
