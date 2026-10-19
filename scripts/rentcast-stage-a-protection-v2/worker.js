import '../../src/analysis/offline.js';
import {prepareSource,evaluate} from '../rentcast-live-stage-a-v1/source.js';
import {implementationHashes,preservation,certificate} from './guard.js';
import {offlineStatus} from '../../src/analysis/offline.js';
import {check} from '../rentcast-financial-controlled-client-v1/contract.js';
try{
  let length=0;const chunks=[];for await(const chunk of process.stdin){length+=chunk.length;check(length<=4*1024*1024,'WORKER_INPUT_BOUND');chunks.push(chunk);}
  const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));let result;
  if(input.action==='certificate')result=await certificate();
  else if(input.action==='source')result=await prepareSource();
  else if(input.action==='evaluate')result=evaluate(input.context,input.body,input.headers);
  else if(input.action==='hashes')result=await implementationHashes();
  else if(input.action==='certified-state')result={implementationHashes:await implementationHashes(),preservation:await preservation()};
  else throw Error('WORKER_ACTION_STOP');
  check(offlineStatus().networkAttempts===0,'WORKER_NETWORK_STOP');
  process.stdout.write(JSON.stringify({ok:true,result}));
}catch(e){process.stdout.write(JSON.stringify({ok:false,code:/^[A-Z_]+$/.test(e.code??e.message)?e.code??e.message:'OFFLINE_WORKER_STOP'}));process.exitCode=1;}
