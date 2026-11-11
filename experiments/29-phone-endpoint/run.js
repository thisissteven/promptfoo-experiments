const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const PHONE=process.env.BBL_PHONE||'';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const red=(s)=>{s=String(s||'');return s.length>6?s.slice(0,3)+'***'+s.slice(-2):'***';};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function variants(p){return [
 ['own',p],
 ['own+86','86'+p],
 ['own+plus86','+86'+p],
 ['own-spaces',p.slice(0,3)+' '+p.slice(3,7)+' '+p.slice(7)],
 ['own-dashes',p.slice(0,3)+'-'+p.slice(3,7)+'-'+p.slice(7)],
 ['own-leading0','0'+p],
 ['own-last-digit',p.slice(0,-1)+(p.endsWith('0')?'1':'0')],
 ['fake','19900000000'],
 ['empty',''],
];}
async function post(base,phone){const t0=Date.now();try{const r=await fetch(base+'/gw/robot/ticket/unclosed/list',{method:'POST',headers:{'content-type':'application/json',origin:base,referer:base+'/liveChat','user-agent':UA,'x-robot-user':'probe','x-bbl-official-site-region':base.includes('.cn')?'CN':'EN'},body:JSON.stringify({phone}),dispatcher:d,signal:AbortSignal.timeout(20000)});const t=await r.text();const ms=Date.now()-t0;let j;try{j=JSON.parse(t)}catch{};const data=j&&j.data;return {status:r.status,ms,code:j&&j.code,dataType:data===null?'null':Array.isArray(data)?'array':typeof data,count:Array.isArray(data)?data.length:(data&&typeof data==='object'?Object.keys(data).length:null),keys:data&&typeof data==='object'&&!Array.isArray(data)?Object.keys(data).slice(0,12):null};}catch(e){return {error:e.name+': '+e.message,ms:Date.now()-t0};}}
(async()=>{
 const out={phone:red(PHONE),tests:[]};
 for(const base of ['https://support.bambulab.com','https://support.bambulab.cn']){
  for(const [label,v] of variants(PHONE)){
   const r=await post(base,v);
   out.tests.push({base,label,phone:red(v),...r});
   console.log(base.split('//')[1],label,JSON.stringify(r));
   await sleep(500);
  }
 }
 // timing: own vs fake, 3 each
 const timing={};
 for(const [label,v] of [['own',PHONE],['fake','19900000000']]){
  const arr=[];for(let i=0;i<3;i++){const r=await post('https://support.bambulab.com',v);arr.push(r.ms);await sleep(400);}arr.sort((a,b)=>a-b);timing[label]=arr;
 }
 out.timing=timing;
 require('fs').writeFileSync(require('path').join(__dirname,'results.json'),JSON.stringify(out,null,2));
 console.log('timing',JSON.stringify(timing));
})();
