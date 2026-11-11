const fs=require('fs');
const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const SRC='experiments/FINDINGS_REPORT_2026-11-10.md';
const OUT='experiments/FINDINGS_REPORT_2026-11-10.md';
const EN='experiments/FINDINGS_REPORT_2026-11-10_en.md';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let src=fs.readFileSync(SRC,'utf8');
fs.writeFileSync(EN,src,'utf8');
// decode numeric/HTML entities
src=src.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n))
       .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
       .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
// drop the CJK note block
src=src.replace(/> Note: the English body is authoritative[\s\S]*?\n\n/,'');
const cjk=/[\u3400-\u9fff]/;
function protect(text){const p=[];let t=text.replace(/`[^`]+`/g,m=>{p.push(m);return `ZXQ${p.length-1}ZXQ`;});t=t.replace(/https?:\/\/[^\s)]+/g,m=>{p.push(m);return `ZXQ${p.length-1}ZXQ`;});return {t,p};}
function restore(text,p){return text.replace(/ZXQ\s*(\d+)\s*ZXQ/g,(_,n)=>p[+n]??'');}
async function gtx(text){for(let attempt=0;attempt<3;attempt++){try{const u='https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q='+encodeURIComponent(text);const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0'},dispatcher:d,signal:AbortSignal.timeout(20000)});if(!r.ok){if(r.status===429){await sleep(2500);continue;}return null;}const j=await r.json();return (j&&j[0]?j[0].map(x=>x&&x[0]?x[0]:'').join(''):null);}catch(e){await sleep(1000);}}return null;}
function splitChunks(s,max=1200){if(s.length<=max)return [s];const parts=[];let cur='';for(const sent of s.split(/(?<=[.!?。！？])\s+/)){if((cur+' '+sent).length>max&&cur){parts.push(cur);cur=sent;}else{cur=cur?cur+' '+sent:sent;}}if(cur)parts.push(cur);return parts;}
async function translate(text){const {t,p}=protect(text);const chunks=splitChunks(t);const out=[];for(const c of chunks){const tr=await gtx(c);if(!tr){return null;}out.push(tr);await sleep(350);}return restore(out.join(''),p);}
(async()=>{
 const blocks=src.split(/\n\n/);
 const out=[];
 for(const b of blocks){
  const trimmed=b.trim();
  if(!trimmed){continue;}
  if(trimmed.startsWith('```')||trimmed.includes('```')||trimmed.startsWith('|')||trimmed.startsWith('http')||trimmed.startsWith('- `experiments/')){
   out.push(b);continue;
  }
  if(trimmed.startsWith('#')){
   const m=trimmed.match(/^(#+)\s+(.*)$/);
   if(!m){out.push(b);continue;}
   const [,hashes,text]=m;
   if(cjk.test(text)){out.push(b);continue;}
   const tr=await translate(text);
   out.push(b);
   if(tr&&tr.trim()&&!cjk.test(tr)===false){out.push(`${hashes} ${tr}`);}
   else if(tr&&tr.trim()){out.push(`${hashes} ${tr}`);}
   continue;
  }
  // prose / list / blockquote
  if(cjk.test(trimmed)){out.push(b);continue;}
  let prefix='';
  let text=trimmed;
  const lm=text.match(/^((?:[-*]|\d+\.)\s+)([\s\S]*)$/);
  if(lm){prefix=lm[1];text=lm[2];}
  const tr=await translate(text);
  out.push(b);
  if(tr&&tr.trim()){out.push(prefix+tr);}
 }
 fs.writeFileSync(OUT,out.join('\n\n')+'\n','utf8');
 console.log('written',OUT,'bytes',fs.statSync(OUT).size);
})();
