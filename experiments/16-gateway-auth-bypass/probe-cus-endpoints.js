const {ProxyAgent,fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const B='https://oepa.bblops.com/csm/gateway';
function H(){return {'content-type':'application/json',origin:'https://support.bambulab.com',referer:'https://support.bambulab.com/liveChat','user-agent':UA,'x-bbl-official-site-region':'EN'};}
async function req(method,path,body,label){try{const r=await fetch(B+path,{method,headers:H(),body:body===undefined?undefined:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();console.log(r.status,method,label,'|',t.slice(0,300).replace(/\s+/g,' '));}catch(e){console.log('ERR',label,e.message)}}
(async()=>{
 const tests=[
  ['GET','/cus/auth/cusInfo',undefined,'cusInfo'],
  ['POST','/cus/auth/ticket/login',{ticket:'1'},'ticket-login-1'],
  ['POST','/cus/auth/ticket/login',{ticket:'TEST-TICKET'},'ticket-login-test'],
  ['POST','/cus/auth/ticket/login',{},'ticket-login-empty'],
  ['GET','/cus/auth/ws/ticket',undefined,'ws-ticket'],
  ['GET','/cus/dutyRoster/canCreateConversation?language=en',undefined,'canCreate'],
  ['GET','/cus/dutyRoster/show?language=en',undefined,'roster-show'],
  ['GET','/cus/issueType/list?language=en',undefined,'issueType'],
  ['GET','/cus/dutyRoster/config/list?language=en',undefined,'roster-config'],
  ['POST','/cus/form/submit',{formId:'1',data:{}}, 'form-submit'],
  ['POST','/cus/identity/verify',{orderNo:'1',email:'test@example.com'},'identity-verify'],
  ['POST','/cus/identity/verify',{orderNo:'TEST-000000',email:'test@example.com'},'identity-verify-test'],
  ['GET','/cus/logistics/order/page?page=1&pageSize=1',undefined,'logistics-page'],
  ['GET','/cus/logistics/order/fulfillment/list?orderId=1',undefined,'fulfillment'],
  ['GET','/cus/minorProtection/ai?language=en',undefined,'minor-ai'],
  ['GET','/cus/minorProtection/human?language=en',undefined,'minor-human'],
  ['GET','/cus/storeReception?code=TEST&channel=TEST&language=en',undefined,'storeReception'],
  ['POST','/cus/survey/addRecord',{surveyId:'1',record:{}}, 'survey-add'],
  ['POST','/cus/survey/reportPush',{surveyId:'1'},'survey-report'],
 ];
 for(const [m,p,b,l] of tests){await req(m,p,b,l);}
})();
