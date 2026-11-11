const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://oepa.bblops.com/csm/gateway';
const UA='Mozilla/5.0';
const refresh=process.env.BBL_REFRESH_TOKEN||'';
(async()=>{
 for(const [label,body,headers] of [
  ['refresh-body',{refreshToken:refresh},{'content-type':'application/json'}],
  ['refresh-bearer',undefined,{authorization:'Bearer '+refresh}],
  ['refresh-raw',undefined,{authorization:refresh}],
 ]){
  try{const r=await fetch(B+'/cus/auth/token/refresh',{method:'POST',headers:{'user-agent':UA,origin:'https://support.bambulab.cn',referer:'https://support.bambulab.cn/liveChat',...headers},body:body?JSON.stringify(body):undefined,dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();console.log(label,r.status,t.slice(0,300));}catch(e){console.log(label,'ERR',e.message)}
 }
})();
