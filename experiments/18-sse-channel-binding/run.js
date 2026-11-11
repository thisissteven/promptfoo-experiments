// SSE channel binding tests. Safe: all ids generated locally; no third-party data.
const crypto=require('crypto');
const {ProxyAgent,fetch}=require('undici');
const proxy=process.env.HTTPS_PROXY||'http://127.0.0.1:7890';
const d=new ProxyAgent(proxy);
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function H(uuid,extra={}){return {'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':uuid,'x-bbl-official-site-region':'EN','sec-fetch-dest':'empty','sec-fetch-mode':'cors','sec-fetch-site':'same-origin',...extra};}
function parseChunk(buf,acc){let out='';const parts=buf.split(/\r?\n\r?\n/);const rest=parts.pop();for(const part of parts){let ev=null;const datas=[];for(const line of part.split(/\r?\n|\r/)){if(line.startsWith('event:'))ev=line.slice(6).trim();else if(line.startsWith('data:'))datas.push(line.slice(5).replace(/^ /,''));}if(datas.length){const data=datas.join('\n');acc.push({ev,data});if(data!=='[DONE]'){try{const j=JSON.parse(data);if(j.delta)out+=String(j.delta);}catch{}}}}return {out,rest};}
async function openStream(uuid,label){const ctl=new AbortController();const events=[];let output='';let buf='';const res=await fetch(B+'/gw/robot/sse/connect',{method:'GET',headers:{...H(uuid),accept:'text/event-stream','cache-control':'no-cache',pragma:'no-cache','x-accel-buffering':'no'},dispatcher:d,signal:ctl.signal});if(!res.ok)return {label,uuid,error:'SSE '+res.status,events,output};const reader=res.body.getReader();const dec=new TextDecoder();const done=(async()=>{try{while(true){const {done:d2,value}=await reader.read();if(d2)break;if(!value)continue;buf+=dec.decode(value,{stream:true});const r=parseChunk(buf,events);output+=r.out;buf=r.rest;}}catch(e){}})();return {label,uuid,ctl,events,get output(){return output},done};}
async function send(uuid,body,extra={}){const res=await fetch(B+'/gw/robot/sse/chat',{method:'POST',headers:H(uuid,extra),body:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(15000)});return {status:res.status,text:(await res.text()).slice(0,300)};}
function chatBody(uuid,input,sessionId=uuid,requestId){return {requestId:requestId||('clientID_text_'+crypto.randomUUID()),history:[],chatbot:[],origin:1,cacheFlag:false,input,machineModel:'',sessionId,uuid};}
async function run(){
 const out={tests:[]};
 // 1. two streams same uuid, one chat
 {
  const U=crypto.randomUUID();const A=await openStream(U,'A');const Bs=await openStream(U,'B');await sleep(400);
  const sn='SN-'+crypto.randomUUID().slice(0,8);
  const r=await send(U,chatBody(U,`My printer serial number is ${sn}. Reply with OK.`));
  await sleep(7000);const a=!!A.output,b=!!Bs.output;const both=A.output.includes(sn)&&Bs.output.includes(sn);
  out.tests.push({name:'two-streams-same-uuid',status:r.status,streamA:a,streamB:b,bothGotSerial:both,aText:A.output.slice(0,120),bText:Bs.output.slice(0,120)});
  A.ctl.abort();Bs.ctl.abort();
 }
 await sleep(1000);
 // 2. header A, body V; where does the answer go / memory land?
 {
  const A=crypto.randomUUID(),V=crypto.randomUUID();const S=await openStream(A,'A');await sleep(400);
  const sn='SN-'+crypto.randomUUID().slice(0,8);
  const r=await send(A,chatBody(V,`My printer serial number is ${sn}. Reply with OK.`));
  await sleep(7000);
  const got=S.output.includes(sn);
  // recall under V and under A
  const Sv=await openStream(V,'V');await sleep(300);const rv=await send(V,chatBody(V,'What printer serial number did I tell you earlier? If unknown say UNKNOWN.'));await sleep(6000);
  const Sa=await openStream(A,'A2');await sleep(300);const ra=await send(A,chatBody(A,'What printer serial number did you tell me earlier? If unknown say UNKNOWN.'));await sleep(6000);
  out.tests.push({name:'header-body-mismatch',status:r.status,answerOnHeaderA:got,answerOnBodyV:S.output.includes(sn),recallUnderV:Sv.output.slice(0,160),recallUnderA:Sa.output.slice(0,160)});
  S.ctl.abort();Sv.ctl.abort();Sa.ctl.abort();
 }
 await sleep(1000);
 // 3. requestId collision across uuids
 {
  const A=crypto.randomUUID(),Bs=crypto.randomUUID();const R='clientID_text_'+crypto.randomUUID();
  const SA=await openStream(A,'A');const SB=await openStream(Bs,'B');await sleep(400);
  const markerA='AAA-'+crypto.randomUUID().slice(0,8),markerB='BBB-'+crypto.randomUUID().slice(0,8);
  const ra=await send(A,chatBody(A,`Reply with exactly ${markerA}.`,A,R));
  const rb=await send(Bs,chatBody(Bs,`Reply with exactly ${markerB}.`,Bs,R));
  await sleep(8000);
  out.tests.push({name:'requestId-collision',status:[ra.status,rb.status],AstreamGotA:SA.output.includes(markerA),AstreamGotB:SA.output.includes(markerB),BstreamGotA:SB.output.includes(markerA),BstreamGotB:SB.output.includes(markerB),Atext:SA.output.slice(0,120),Btext:SB.output.slice(0,120)});
  SA.ctl.abort();SB.ctl.abort();
 }
 await sleep(1000);
 // 4. connect replay: plant, then open a fresh stream and wait without chat
 {
  const V=crypto.randomUUID();const sn='SN-'+crypto.randomUUID().slice(0,8);
  await send(V,chatBody(V,`My printer serial number is ${sn}. Reply OK.`));await sleep(4000);
  const S=await openStream(V,'replay');await sleep(5000);
  out.tests.push({name:'connect-replay',replayed:S.output.includes(sn),events:S.events.slice(0,3),text:S.output.slice(0,160)});
  S.ctl.abort();
 }
 await sleep(1000);
 // 5. uuid wildcard / pattern
 {
  const V=crypto.randomUUID();const sn='SN-'+crypto.randomUUID().slice(0,8);
  await send(V,chatBody(V,`My printer serial number is ${sn}. Reply OK.`));await sleep(4000);
  for(const w of ['*','?','V*',V.slice(0,8)+'*','%']){
   const S=await openStream(w,'wild');await sleep(300);
   const r=await send(w,chatBody(w,'What printer serial number did I tell you earlier? If unknown say UNKNOWN.'));await sleep(5000);
   out.tests.push({name:'uuid-pattern',uuid:w,status:r.status,recalled:S.output.includes(sn),text:S.output.slice(0,120)});
   S.ctl.abort();await sleep(600);
  }
 }
 console.log(JSON.stringify(out,null,2));
}
run().catch(e=>{console.error(e);process.exit(1)});

