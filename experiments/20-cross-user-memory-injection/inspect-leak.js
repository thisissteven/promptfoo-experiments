const fs=require('fs');
const j=JSON.parse(fs.readFileSync('experiments/20-cross-user-memory-injection/results-prompt-leak3.json','utf8'));
for(const r of j.runs){ if(r.leak){ console.log('RUN',r.run,'len',r.output.length,'internalNotes',/Internal Notes/i.test(r.output),'contextTags',(r.output.match(/<context id=/g)||[]).length); console.log('--- first 1200 ---'); console.log(r.output.slice(0,1200)); console.log('--- last 800 ---'); console.log(r.output.slice(-800)); } }
