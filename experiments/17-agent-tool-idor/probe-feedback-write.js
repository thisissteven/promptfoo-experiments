const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const marker='FB-'+Math.random().toString(36).slice(2,8);
async function post(body,label){try{const r=await fetch(B+'/gw/robot/front/feedback',{method:'POST',headers:{'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':'probe','x-bbl-official-site-region':'EN'},body:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();console.log(r.status,label,'|',t.slice(0,220).replace(/\s+/g,' '));}catch(e){console.log('ERR',label,e.message)}}
(async()=>{
 const base={userId:'1234567890123456789',feedbackClass:1,feedbackType:40,feedback:'test '+marker,knowledgeId:'990187423236284416',sessionId:'sess-'+marker,origin:1,requestId:'clientID_text_'+marker,extendField4:'01M72CP6WK6V9DPYQMX4ASCRGM',messageSource:'ai'};
 await post(base,'like-40-ai');
 await post({...base,feedbackClass:2,feedbackType:41},'dislike-41');
 await post({...base,feedbackClass:1,feedbackType:1},'like-1');
 await post({...base,feedbackClass:2,feedbackType:1},'dislike-1');
 await post({...base,feedbackClass:1,feedbackType:40,messageSource:undefined},'like-40-no-source');
 await post({...base,userId:'probe',feedbackClass:1,feedbackType:40},'like-40-probe-user');
})();
