const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
(async()=>{
 for(const u of ['https://support.bambulab.com/liveChat','https://support.bambulab.cn/liveChat','https://bambulab.com/']){
  try{const r=await fetch(u,{headers:{'user-agent':UA},redirect:'manual',dispatcher:d,signal:AbortSignal.timeout(20000)});console.log('###',u,r.status);for(const k of ['referrer-policy','content-security-policy','strict-transport-security','x-frame-options','x-content-type-options','permissions-policy','set-cookie','cache-control']){console.log(k+':',r.headers.get(k));}}catch(e){console.log('ERR',u,e.message)}
 }
})();
