const crypto=require('crypto');
const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://oepa.bblops.com/csm/gateway';
const UA='Mozilla/5.0';
const mall=process.env.BBL_MALL_TOKEN||'';
const mallRefresh=process.env.BBL_MALL_REFRESH||'';
const support=process.env.BBL_ACCESS_TOKEN||'';
const key=Buffer.from('5WIuvjCRLf8DyALsXGhbUfvlvLf1xt043I02_YGmPOY','base64url');
function aes(plain){const iv=crypto.randomBytes(12);const c=crypto.createCipheriv('aes-256-gcm',key,iv);const ct=Buffer.concat([c.update(plain,'utf8'),c.final()]);return Buffer.concat([iv,ct,c.getAuthTag()]).toString('base64url');}
async function post(path,body,headers,label){try{const r=await fetch(B+path,{method:'POST',headers:{'user-agent':UA,origin:'https://support.bambulab.cn',referer:'https://support.bambulab.cn/liveChat','content-type':'application/json',...headers},body:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();console.log(label,r.status,t.slice(0,220));}catch(e){console.log(label,'ERR',e.message)}}
(async()=>{
 for(const [label,tok] of [['mall-token',mall],['mall-refresh',mallRefresh],['support-access',support]]){
  await post('/cus/auth/ticket/login',{ticket:tok},{},'ticket '+label);
  const forged=aes(tok+'|'+(Date.now()+7776000*1000));
  await post('/cus/auth/bbl-token/login',undefined,{bbl_token:'Bearer '+forged},'bbl '+label);
 }
})();
