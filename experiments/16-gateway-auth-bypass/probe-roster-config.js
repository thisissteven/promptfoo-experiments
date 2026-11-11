const {ProxyAgent,fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://oepa.bblops.com/csm/gateway';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
(async()=>{
 const r=await fetch(B+'/cus/dutyRoster/config/list?language=en',{headers:{'user-agent':UA,origin:'https://support.bambulab.com',referer:'https://support.bambulab.com/liveChat'},dispatcher:d,signal:AbortSignal.timeout(20000)});
 const t=await r.text();console.log('status',r.status,'len',t.length);console.log(t.slice(0,4000));
})();
