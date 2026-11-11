const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
(async()=>{
 for(const B of ['https://bambulab.cn','https://support.bambulab.cn','https://bambulab.com']){
  console.log('###',B);
  for(const p of ['/','/zh-cn','/en','/_next/image?url=%2Ffavicon.ico&w=64&q=75','/_next/image?url=https%3A%2F%2Fexample.com%2F&w=64&q=75']){
   for(const h of [{},{'x-middleware-subrequest':'middleware:middleware:middleware:middleware:middleware'}]){
    try{const r=await fetch(B+p,{headers:{'user-agent':UA,accept:'text/html',...h},redirect:'manual',dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();console.log(r.status,p,JSON.stringify(h),'loc=',r.headers.get('location'),'ct=',r.headers.get('content-type'),'|',t.slice(0,80).replace(/\s+/g,' '));}catch(e){console.log('ERR',p,e.message)}
   }
  }
 }
})();
