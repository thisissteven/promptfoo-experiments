const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://oepa.bblops.com/csm/gateway';
const UA='Mozilla/5.0';
(async()=>{
 for(const [m,p] of [['GET','/cus/dutyRoster/config/list?language=en'],['POST','/cus/auth/ticket/login']]){
  for(const origin of ['https://evil.example','null']){
   try{const r=await fetch(B+p,{method:m,headers:{'user-agent':UA,origin,'content-type':'application/json'},body:m==='POST'?JSON.stringify({ticket:'TEST'}):undefined,dispatcher:d,signal:AbortSignal.timeout(15000)});console.log(m,p,'origin=',origin,'status',r.status,'acao=',r.headers.get('access-control-allow-origin'),'acac=',r.headers.get('access-control-allow-credentials'),'|',(await r.text()).slice(0,80).replace(/\s+/g,' '));}catch(e){console.log('ERR',m,p,e.message)}
  }
 }
})();
