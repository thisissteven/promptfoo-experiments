const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
(async()=>{
 const r=await fetch('https://support.bambulab.com/liveChat',{headers:{'user-agent':UA},dispatcher:d});
 const t=await r.text();
 console.log('len',t.length);
 console.log([...t.matchAll(/(?:src|href)="([^"]+)"/g)].map(x=>x[1]).join('\n'));
 const bi=t.match(/buildId":"([^"]+)/); console.log('buildId',bi&&bi[1]);
})();
