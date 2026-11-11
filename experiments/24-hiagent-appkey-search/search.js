const {ProxyAgent, fetch}=require('undici');
const fs=require('fs'),path=require('path');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const pages=['https://bambulab.com/zh','https://bambulab.com/en','https://bambulab.cn/zh-cn'];
const pats=[/app[_-]?key/i,/x-app-key/i,/hiagent/i,/volcengine/i,/get_app_config_preview/i,/TracingJsonStr/i,/AppKey/i,/UserID/i,/workspace[_-]?id/i,/custom[_-]?app[_-]?id/i];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(u){for(let i=0;i<3;i++){try{const r=await fetch(u,{headers:{'user-agent':UA,accept:'text/html,application/javascript,*/*'},redirect:'follow',dispatcher:d,signal:AbortSignal.timeout(30000)});return r;}catch(e){if(i===2)throw e;await sleep(800)}}}
(async()=>{
 const seen=new Set();const matches=[];
 for(const page of pages){
  let html;try{const r=await get(page);html=await r.text();console.log('PAGE',page,r.status,html.length);}catch(e){console.log('PAGE ERR',page,e.message);continue;}
  const urls=[...html.matchAll(/(?:src|href)="([^"]+\.js[^"]*)"/g)].map(x=>x[1]);
  for(const u of urls){
   const abs=u.startsWith('http')?u:(u.startsWith('//')?'https:'+u:new URL(u,page).href);
   if(seen.has(abs))continue;seen.add(abs);
   try{const r=await get(abs);if(!r.ok){console.log('JS',r.status,abs);continue;}const t=await r.text();for(const p of pats){const re=new RegExp(p.source,'gi');let m;while((m=re.exec(t))){const i=m.index;matches.push({url:abs,pattern:p.source,context:t.slice(Math.max(0,i-180),i+260).replace(/\s+/g,' ')});}}console.log('JS OK',abs,t.length);}catch(e){console.log('JS ERR',abs,e.message)}
  }
 }
 fs.writeFileSync(path.join(__dirname,'matches.json'),JSON.stringify(matches,null,2));
 console.log('\nMATCHES',matches.length);
 for(const m of matches.slice(0,80))console.log('\n',m.pattern,m.url,'\n ',m.context);
})();
