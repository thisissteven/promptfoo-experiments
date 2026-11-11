const crypto=require('crypto');
const {chat}=require('../04-uuid-keyed-memory/bambuProvider.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const prompts=['My P1S has a first layer adhesion problem, help me troubleshoot.','My printer is not extruding properly, what should I check?'];
 for(const input of prompts){const u=crypto.randomUUID();let r;for(let i=0;i<3;i++){try{r=await chat({uuid:u,sessionId:u,input,timeoutMs:60000});break}catch(e){console.log('retry',i,e.name);await sleep(1500)}}console.log('\n===',input);console.log('OUT',(r&&(r.output||r.error)||'none').slice(0,600));console.log('EVENTS',JSON.stringify((r&&r.events)||[]).slice(0,5000));await sleep(1500);}
})();
