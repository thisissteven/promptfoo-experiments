const WS = globalThis.WebSocket;
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
function test(label,url){return new Promise((resolve)=>{let done=false;const finish=(r)=>{if(done)return;done=true;try{ws.close()}catch{};resolve({label,...r})};let ws;try{ws=new WS(url,{headers:{Origin:'https://support.bambulab.com','User-Agent':UA}});}catch(e){return finish({error:e.message})}const t=setTimeout(()=>finish({timeout:true}),8000);ws.onopen=()=>{finish({open:true})};ws.onerror=(e)=>{finish({error:'error',message:e.message})};ws.onclose=(e)=>{finish({close:true,code:e.code,reason:e.reason})};ws.onmessage=(e)=>{finish({open:true,message:String(e.data).slice(0,200)})};});}
(async()=>{
 const base='wss://oepa.bblops.com/csm/gateway/ws/cus';
 const cases=[
  ['no-ticket',base],
  ['empty-ticket',base+'?ticket='],
  ['fake-ticket',base+'?ticket=TEST'],
  ['num-ticket',base+'?ticket=1'],
  ['fake+channel',base+'?ticket=TEST&channel=web&language=en&terminal=web'],
  ['jwt-ticket',base+'?ticket='+encodeURIComponent('eyJhbGciOiJub25lIn0.eyJjdXNJZCI6IjEifQ.')],
 ];
 for(const [l,u] of cases){const r=await test(l,u);console.log(JSON.stringify(r));await new Promise(x=>setTimeout(x,500));}
})();
