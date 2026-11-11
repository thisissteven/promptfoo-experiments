const fs=require('fs');const {ProxyAgent,fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let src=fs.readFileSync('experiments/FINDINGS_REPORT_2026-11-10_en.md','utf8');
src=src.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
 .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
src=src.replace(/> Note: the English body is authoritative[\s\S]*?\n\n/,'');
const cjk=/[\u3400-\u9fff]/;
async function gtx(text){for(let a=0;a<3;a++){try{const u='https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q='+encodeURIComponent(text);const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0'},dispatcher:d,signal:AbortSignal.timeout(25000)});if(!r.ok){if(r.status===429){await sleep(2500);continue;}return null;}const j=JSON.parse(Buffer.from(await r.arrayBuffer()).toString("utf8"));return j&&j[0]?j[0].map(x=>x&&x[0]?x[0]:'').join(''):null;}catch(e){await sleep(1000);}}return null;}
function chunks(s,max=1000){if(s.length<=max)return [s];const out=[];let cur='';for(const p of s.split(/(?<=[.!?])\s+/)){if((cur+' '+p).length>max&&cur){out.push(cur);cur=p;}else{cur=cur?cur+' '+p:p;}}if(cur)out.push(cur);return out;}
async function tr(text){const cs=chunks(text);const out=[];for(const c of cs){const x=await gtx(c);if(!x)return null;out.push(x);await sleep(400);}return out.join('');}
(async()=>{
 const blocks=src.split(/\n\n/);const out=[];
 for(const b of blocks){
  const t=b.trim();if(!t)continue;
  if(t.startsWith('```')||t.includes('```')||t.startsWith('|')||t.startsWith('http')||t.startsWith('- `experiments/')||t==='---'){out.push(b);continue;}
  if(t.startsWith('#')){out.push(b);continue;}
  if(cjk.test(t)){out.push(b);continue;}
  let prefix='';let text=t;const lm=text.match(/^((?:[-*]|\d+\.)\s+)([\s\S]*)$/);if(lm){prefix=lm[1];text=lm[2];}
  const zh=await tr(text);
  out.push(b);
  if(zh&&zh.trim()){out.push(prefix+zh);}else{console.log('translate failed:',text.slice(0,80));}
 }
 fs.writeFileSync('experiments/FINDINGS_REPORT_2026-11-10.md',out.join('\n\n')+'\n','utf8');
 console.log('written bytes',fs.statSync('experiments/FINDINGS_REPORT_2026-11-10.md').size);
})();

