const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const B='https://support.bambulab.com';
const paths=['/en/v1/check','/en/api/v1/check','/en/trigger/webhook','/en/api/proxy/api/v1/v1/check','/en/api/proxy/api/v1/trigger/webhook','/en/proxy/api/v1/get_app_config_preview','/en/csm/gateway/v1/check'];
(async()=>{for(const p of paths){for(const m of ['GET','POST']){try{const r=await fetch(B+p,{method:m,headers:{'user-agent':UA,origin:B,referer:B+'/liveChat','content-type':'application/json'},body:m==='POST'?JSON.stringify({content:'hello',content_type:1,AppKey:'test',UserID:'test'}):undefined,redirect:'manual',dispatcher:d,signal:AbortSignal.timeout(15000)});const t=await r.text();console.log(r.status,m,p,'loc=',r.headers.get('location'),'|',t.slice(0,120).replace(/\s+/g,' '));}catch(e){console.log('ERR',m,p,e.message)}}}})();
