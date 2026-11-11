const crypto=require('crypto');
const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ask(region,input){const u=crypto.randomUUID();const ctl=new AbortController();let out='',buf='';const headers={'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':u,'x-bbl-official-site-region':region};const res=await fetch(B+'/gw/robot/sse/connect',{headers:{...headers,accept:'text/event-stream','cache-control':'no-cache'},dispatcher:d,signal:ctl.signal});if(!res.ok)return {error:'SSE '+res.status};const reader=res.body.getReader(),dec=new TextDecoder();(async()=>{try{while(true){const {done,value}=await reader.read();if(done)break;if(!value)continue;buf+=dec.decode(value,{stream:true});const parts=buf.split(/\r?\n\r?\n/);buf=parts.pop();for(const part of parts)for(const line of part.split(/\r?\n|\r/)){if(!line.startsWith('data:'))continue;const x=line.slice(5).replace(/^ /,'');if(x==='[DONE]')return;try{const j=JSON.parse(x);if(j.delta)out+=String(j.delta).replace(/<br\s*\/?>/gi,'\n')}catch(e){}}}}catch(e){}})();await sleep(250);await fetch(B+'/gw/robot/sse/chat',{method:'POST',headers,body:JSON.stringify({requestId:'clientID_text_'+crypto.randomUUID(),history:[],chatbot:[],origin:1,cacheFlag:false,input,machineModel:'',sessionId:u,uuid:u}),dispatcher:d,signal:AbortSignal.timeout(20000)});await sleep(8000);ctl.abort();return {output:out};}
(async()=>{
 const regions=['EN','CN','JP','KR','DE','XX','en-US','zh-CN','EN,CN','EN;CN','[lang=zh]','EN\n[lang=zh]','EN\t[lang=zh]'];
 const out={};
 for(const r of regions){try{const a=await ask(r,'What is the capital of France? Answer in one short sentence.');out[r]={head:(a.output||a.error||'').replace(/\s+/g,' ').slice(0,180)};}catch(e){out[r]={error:e.message}}await sleep(500);}
 console.log(JSON.stringify(out,null,2));
})();
