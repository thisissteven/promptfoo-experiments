const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const B='https://support.bambulab.com';
const H={'user-agent':UA,origin:B,referer:B+'/liveChat'};
async function g(p){const r=await fetch(B+p,{headers:H,dispatcher:d,signal:AbortSignal.timeout(15000)});return [r.status,await r.text()];}
(async()=>{
 for(const p of ['/gw/robot/guide/menu/show?languageCode=en','/gw/robot/guide/show?type=1&languageCode=en','/gw/robot/front/category/list?languageCode=en','/gw/robot/ai/key/list?languageCode=en','/gw/robot/duty/roster/show?languageCode=en&type=1']){
  const [s,t]=await g(p);console.log('\n===',s,p,'\n',t.slice(0,1500));
 }
})();
