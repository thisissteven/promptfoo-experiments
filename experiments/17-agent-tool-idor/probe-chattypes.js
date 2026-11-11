const crypto=require('crypto');
const {ProxyAgent,fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function H(u){return {'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':u,'x-bbl-official-site-region':'EN'};}
async function run(label,extra){const u=crypto.randomUUID();const body={requestId:'clientID_text_'+crypto.randomUUID(),history:[],chatbot:[],origin:1,cacheFlag:false,input:'Test',machineModel:'',sessionId:u,uuid:u,...extra};const ctl=new AbortController();let out='';try{const s=await fetch(B+'/gw/robot/sse/connect',{headers:{...H(u),accept:'text/event-stream'},dispatcher:d,signal:ctl.signal});if(!s.ok){console.log(label,'SSE',s.status);return}const rd=s.body.getReader(),dec=new TextDecoder();let buf='';(async()=>{try{while(true){const {done,value}=await rd.read();if(done)break;if(!value)continue;buf+=dec.decode(value,{stream:true});const parts=buf.split(/\r?\n\r?\n/);buf=parts.pop();for(const p of parts)for(const l of p.split(/\r?\n|\r/)){if(!l.startsWith('data:'))continue;const x=l.slice(5).replace(/^ /,'');if(x==='[DONE]')return;try{const j=JSON.parse(x);if(j.delta)out+=j.delta}catch(e){}}}}catch(e){}})();await sleep(250);const r=await fetch(B+'/gw/robot/sse/chat',{method:'POST',headers:H(u),body:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();await sleep(7000);ctl.abort();console.log(label,'HTTP',r.status,'POST',t.slice(0,120),'| OUT',out.replace(/\s+/g,' ').slice(0,300));}catch(e){console.log(label,'ERR',e.name,e.message)}}
(async()=>{
 await run('interaction-1',{chatType:'interactionCardSubmitted',input:'Test',interactionCardClientId:'1',selectedIndex:0});
 await run('interaction-ulid',{chatType:'interactionCardSubmitted',input:'Test',interactionCardClientId:'01M72CP6WK6V9DPYQMX4ASCRGM',selectedIndex:0});
 await run('interaction-json',{chatType:'interactionCardSubmitted',input:'Test',interactionCardClientId:'{"a":1}',selectedIndex:0});
 await run('logistics-1',{chatType:'sellingLogisticsSubmitted',submissionId:'1'});
 await run('orders-1',{chatType:'sellingOrdersSubmitted',submissionId:'1'});
 await run('orders-snowflake',{chatType:'sellingOrdersSubmitted',submissionId:'998632961666826240'});
 await run('chattype-unknown',{chatType:'x',submissionId:'1'});
})();
