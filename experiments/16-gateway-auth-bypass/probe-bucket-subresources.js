const {ProxyAgent, fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const UA='Mozilla/5.0';
const hosts=['https://sz-csm-private-prod.oss-cn-shenzhen.aliyuncs.com','https://or-csm-private-prod.s3.us-west-2.amazonaws.com'];
const qs=['?acl','?policy','?cors','?website','?logging','?versioning','?tagging','?encryption','?lifecycle','?replication','?notification','?inventory','?analytics','?metrics','?object-lock','?legal-hold','?retention','?uploads','?list-type=2&max-keys=1','?prefix=csm/&max-keys=1'];
(async()=>{
 for(const h of hosts){
  console.log('###',h);
  for(const q of qs){
   try{const r=await fetch(h+'/'+q,{headers:{'user-agent':UA},dispatcher:d,signal:AbortSignal.timeout(15000)});const t=await r.text();console.log(r.status,q,'|',t.slice(0,180).replace(/\s+/g,' '));}catch(e){console.log('ERR',q,e.message)}
  }
 }
})();
