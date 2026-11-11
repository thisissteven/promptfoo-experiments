const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const B='https://support.bambulab.com';
const paths=['/','/liveChat','/en/liveChat','/cn/liveChat','/im','/admin','/my/support/tickets','/api/health','/api/auth','/_next/image?url=https%3A%2F%2Fexample.com%2F&w=64&q=75'];
(async()=>{
 for(const p of paths){
  for(const hdr of [{},{'x-middleware-subrequest':'middleware:middleware:middleware:middleware:middleware'}]){
   try{const r=await fetch(B+p,{headers:{'user-agent':UA,...hdr},redirect:'manual',dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();console.log(r.status,p,JSON.stringify(hdr),'loc=',r.headers.get('location'),'mw=',r.headers.get('x-middleware-rewrite'),'|',t.slice(0,100).replace(/\s+/g,' '));}catch(e){console.log('ERR',p,e.message)}
  }
 }
})();
