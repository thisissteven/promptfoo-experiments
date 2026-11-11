const crypto=require('crypto');
const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(label,extraBody={},extraHeaders={}){const u=crypto.randomUUID();const h={'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':u,'x-bbl-official-site-region':'EN',...extraHeaders};const b={requestId:'clientID_text_'+crypto.randomUUID(),history:[],chatbot:[],origin:1,cacheFlag:false,input:'What is 2+2? Answer briefly.',machineModel:'',sessionId:u,uuid:u,...extraBody};const ctl=new AbortController();let out='',buf='';const events=[];try{const res=await fetch(B+'/gw/robot/sse/connect',{headers:{...h,accept:'text/event-stream','cache-control':'no-cache'},dispatcher:d,signal:ctl.signal});if(!res.ok){console.log(label,'SSE',res.status);return}const reader=res.body.getReader(),dec=new TextDecoder();(async()=>{try{while(true){const {done,value}=await reader.read();if(done)break;if(!value)continue;buf+=dec.decode(value,{stream:true});const parts=buf.split(/\r?\n\r?\n/);buf=parts.pop();for(const part of parts){let ev=null;const datas=[];for(const line of part.split(/\r?\n|\r/)){if(line.startsWith('event:'))ev=line.slice(6).trim();else if(line.startsWith('data:'))datas.push(line.slice(5).replace(/^ /,''))}if(datas.length){const x=datas.join('\n');events.push({ev,data:x});if(x!=='[DONE]'){try{const j=JSON.parse(x);if(j.delta)out+=String(j.delta)}catch{}}}}}}catch(e){}})();await sleep(250);const r=await fetch(B+'/gw/robot/sse/chat',{method:'POST',headers:h,body:JSON.stringify(b),dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();await sleep(7000);ctl.abort();const keys=new Set();for(const e of events){try{const j=JSON.parse(e.data);Object.keys(j).forEach(k=>keys.add(k))}catch{}}const raw=JSON.stringify(events);console.log(label,'HTTP',r.status,'keys',[...keys].join(','),'trace?',/TracingJsonStr|trace|debug/i.test(raw),'| out',out.replace(/\s+/g,' ').slice(0,150),'| post',t.slice(0,80));}catch(e){console.log(label,'ERR',e.message)}}
(async()=>{
 await run('baseline');
 await run('debug-body',{debug:true});
 await run('noDebug-false',{noDebug:false});
 await run('trace-true',{trace:true});
 await run('returnTrace',{returnTrace:true});
 await run('appKey-test',{appKey:'test'});
 await run('variables-empty',{variables:{}});
 await run('X-Debug',{}, {'x-debug':'1'});
 await run('X-HiAgent-Debug',{}, {'x-hiagent-debug':'1'});
 await run('X-Trace',{}, {'x-trace':'1'});
})();
