const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const bases=['https://support.bambulab.com','https://support.bambulab.cn','https://oepa.bblops.com/csm/gateway'];
const paths=['/api/proxy/api/v1/get_app_config_preview','/api/proxy/api/v1/chat_query','/api/proxy/api/v1/create_conversation','/api/proxy/api/v1/trigger/webhook','/api/proxy/api/v1/v1/check','/api/proxy/api/v1/run_app_workflow','/api/proxy/api/v1','/proxy/api/v1/get_app_config_preview','/trigger/webhook','/v1/check','/api/v1/check','/api/proxy/api/v1/trigger','/csm/gateway/api/proxy/api/v1/get_app_config_preview','/csm/gateway/v1/check','/csm/gateway/trigger/webhook'];
const body={AppKey:'test',UserID:'test',content:'hello',content_type:1,Query:'hello',AppConversationID:'conv-1',ResponseMode:'blocking'};
(async()=>{
 for(const B of bases){console.log('###',B);for(const p of paths){for(const m of ['GET','POST']){try{const r=await fetch(B+p,{method:m,headers:{'user-agent':UA,origin:'https://support.bambulab.com',referer:'https://support.bambulab.com/liveChat','content-type':'application/json',Apikey:'test',Authorization:'Bearer test'},body:m==='POST'?JSON.stringify(body):undefined,redirect:'manual',dispatcher:d,signal:AbortSignal.timeout(12000)});const t=await r.text();console.log(r.status,m,p,'|',t.slice(0,120).replace(/\s+/g,' '));}catch(e){console.log('ERR',m,p,e.message)}}}}
})();
