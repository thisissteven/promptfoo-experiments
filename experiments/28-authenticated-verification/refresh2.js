const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://oepa.bblops.com/csm/gateway';
const UA='Mozilla/5.0';
const refresh=process.env.BBL_REFRESH_TOKEN||'';
const access=process.env.BBL_ACCESS_TOKEN||'';
(async()=>{
 const tests=[
  ['body+rawaccess',{refreshToken:refresh},{authorization:access}],
  ['body+beareraccess',{refreshToken:refresh},{authorization:'Bearer '+access}],
  ['body+refreshheader',{refreshToken:refresh},{refreshToken:refresh}],
  ['body+cookie',{refreshToken:refresh},{cookie:'bbl_im_token='+access}],
  ['body+refreshcookie',{refreshToken:refresh},{cookie:'bbl_im_token='+refresh}],
 ];
 for(const [label,body,headers] of tests){
  try{const r=await fetch(B+'/cus/auth/token/refresh',{method:'POST',headers:{'user-agent':UA,origin:'https://support.bambulab.cn',referer:'https://support.bambulab.cn/liveChat','content-type':'application/json',...headers},body:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();console.log(label,r.status,t.slice(0,300));}catch(e){console.log(label,'ERR',e.message)}
 }
})();
