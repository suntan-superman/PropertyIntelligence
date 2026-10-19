// Parent remains network-neutral; the child unconditionally disables networking.
import {spawn} from 'node:child_process';
import {check,Stop} from '../rentcast-financial-controlled-client-v1/contract.js';
import {REPO,CODE,abs,cleanEnvironment} from './paths.js';
export function worker(input){return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[abs(`${CODE}/worker.js`)],{cwd:REPO,env:cleanEnvironment(),windowsHide:true,stdio:['pipe','pipe','pipe']});
  const chunks=[];let size=0,done=false;const timer=setTimeout(()=>{child.kill();finish(new Stop('OFFLINE_WORKER_TIMEOUT'));},120000);
  function finish(error,value){if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);}
  child.on('error',()=>finish(new Stop('OFFLINE_WORKER_START_STOP')));
  child.stderr.on('data',()=>{}); // Never echo child exceptions or private rows.
  child.stdout.on('data',b=>{size+=b.length;if(size>4*1024*1024){child.kill();finish(new Stop('OFFLINE_WORKER_SIZE_STOP'));}else chunks.push(b);});
  child.on('close',()=>{try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));check(value.ok===true&&Object.hasOwn(value,'result'),value.code&&/^[A-Z_]+$/.test(value.code)?value.code:'OFFLINE_WORKER_STOP');finish(null,value.result);}catch(e){finish(e instanceof Stop?e:new Stop('OFFLINE_WORKER_STOP'));}});
  child.stdin.on('error',()=>finish(new Stop('OFFLINE_WORKER_INPUT_STOP')));child.stdin.end(JSON.stringify(input));
});}
