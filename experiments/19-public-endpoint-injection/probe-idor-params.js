const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
async function get(p,label){try{const r=await fetch(B+p,{headers:{'user-agent':UA,origin:B,referer:B+'/liveChat','x-bbl-official-site-region':'EN'},dispatcher:d,signal:AbortSignal.timeout(15000)});const t=await r.text();console.log(r.status,label,'len',t.length,'|',t.slice(0,160).replace(/\s+/g,' '));}catch(e){console.log('ERR',label,e.message)}}
async function post(p,b,label){try{const r=await fetch(B+p,{method:'POST',headers:{'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':'probe','x-bbl-official-site-region':'EN'},body:JSON.stringify(b),dispatcher:d,signal:AbortSignal.timeout(15000)});const t=await r.text();console.log(r.status,label,'len',t.length,'|',t.slice(0,160).replace(/\s+/g,' '));}catch(e){console.log('ERR',label,e.message)}}
(async()=>{
 const ids=['990187423236284416','903701347565338624','757680753145765888','1043286820722434048'];
 for(const id of ids){
  await post('/gw/robot/front/fuzzy',{content:'',id},'fuzzy id='+id);
  await post('/gw/robot/front/fuzzy',{content:'',questionId:id},'fuzzy qid='+id);
  await post('/gw/robot/front/fuzzy',{content:'',knowledgeId:id},'fuzzy kid='+id);
  await get('/gw/robot/guide/show?type=1&id='+id,'guide id='+id);
  await get('/gw/robot/guide/show?type=1&docId='+id,'guide doc='+id);
  await get('/gw/robot/knowledge/tag/list?type=1&id='+id,'tag id='+id);
 }
})();
