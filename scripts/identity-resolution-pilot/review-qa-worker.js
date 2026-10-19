// QA-only IPC worker. Synthetic storage supplied by the QA harness, never CLI data.
import {offlineStatus} from '../../src/analysis/offline.js';
import {startReviewServer} from './review-http.js';
import {randomBytes} from 'node:crypto';
if(!process.send)throw new Error('IPC_QA_ONLY');
let app;
process.on('message',async message=>{
  try{
    if(message.action==='start'){
      if(!/[/\\]data[/\\]runtime[/\\]identity-review-qa[/\\]synthetic-/.test(message.directory))throw new Error('SYNTHETIC_DIRECTORY_REQUIRED');
      const token=randomBytes(32).toString('hex');app=await startReviewServer({directory:message.directory,reviewer:'Synthetic Reviewer',token,port:0});process.send({ready:true,origin:app.origin,token});
    }else if(message.action==='stop'){await app?.close();process.send({stopped:true,offline:offlineStatus()});process.disconnect();}
  }catch{process.send({error:'QA_WORKER_FAILED'});process.exitCode=1;}
});
