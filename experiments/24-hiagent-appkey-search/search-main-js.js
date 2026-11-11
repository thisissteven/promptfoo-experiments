const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const html=fs.readFileSync(path.join(process.env.TEMP,'bambu_zh.html'),'utf8');
const urls=[...new Set([...html.matchAll(/["'](\/_next\/static\/[^"']+\.js)["']/g)].map(m=>m[1]))];
console.log('scripts',urls.length);
const pats=['hiagent','app_key','appKey','AppKey','volcengine','get_app_config_preview','TracingJsonStr','UserID','workspace_id','custom_app_id','X-App-Key'];
let hits=0;
for(const u of urls.slice(0,80)){
 try{
  const body=execFileSync('curl.exe',['-sS','-m','30','-A','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36','https://bambulab.com'+u],{maxBuffer:20*1024*1024}).toString('utf8');
  for(const p of pats){const i=body.indexOf(p);if(i>=0){hits++;console.log('\nMATCH',p,u,'len',body.length);console.log(body.slice(Math.max(0,i-200),i+300).replace(/\s+/g,' '));}}
 }catch(e){console.log('ERR',u,e.message)}
}
console.log('hits',hits);
