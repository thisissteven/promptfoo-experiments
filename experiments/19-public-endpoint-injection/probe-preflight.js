const {ProxyAgent,fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
(async()=>{
 for(const p of ['/gw/robot/front/report','/gw/robot/ai/key/collect','/gw/robot/front/fuzzy','/gw/robot/sse/chat']){
  const r=await fetch(B+p,{method:'OPTIONS',headers:{origin:'https://evil.example','access-control-request-method':'POST','access-control-request-headers':'content-type,x-robot-user','user-agent':UA},dispatcher:d,signal:AbortSignal.timeout(15000)});
  console.log(p,r.status,'acao=',r.headers.get('access-control-allow-origin'),'acac=',r.headers.get('access-control-allow-credentials'),'acam=',r.headers.get('access-control-allow-methods'),'acah=',r.headers.get('access-control-allow-headers'));
 }
})();
