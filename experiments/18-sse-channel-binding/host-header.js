const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const tests=[
 ['/liveChat',{}],
 ['/liveChat',{'x-forwarded-host':'evil.example'}],
 ['/liveChat',{'x-host':'evil.example'}],
 ['/liveChat',{'x-forwarded-server':'evil.example'}],
 ['/liveChat',{'x-original-url':'https://evil.example/liveChat'}],
 ['/liveChat',{'host':'evil.example'}],
 ['/',{'x-forwarded-host':'evil.example'}],
 ['/cn/liveChat',{'x-forwarded-host':'evil.example'}],
 ['https://csm-fe.bblcdn.com/im/prod/_next/static/chunks/webpack-e7ca971296b039d9.js',{}],
];
(async()=>{
 for(const [p,h] of tests){
  const url=p.startsWith('http')?p:'https://support.bambulab.com'+p;
  try{const r=await fetch(url,{headers:{'user-agent':UA,accept:'text/html,*/*',...h},redirect:'manual',dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();const evil=(t.match(/evil\.example/gi)||[]).length;console.log(r.status,p,JSON.stringify(h),'loc=',r.headers.get('location'),'evilRefs=',evil,'cache=',r.headers.get('cache-control'),'age=',r.headers.get('age'),'|',t.slice(0,80).replace(/\s+/g,' '));}catch(e){console.log('ERR',p,e.message)}
 }
})();
