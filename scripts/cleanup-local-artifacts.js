import {lstat,readdir,rm} from 'node:fs/promises';
import path from 'node:path';

const workspace=path.resolve(import.meta.dirname,'..');
const targets=[
  '.netlify',
  'apps/web/dist',
  'data/runtime/versioned-baseline-reconciliation',
  'data/runtime/sprint6_3',
  'data/runtime/sprint6_2-kern-assessor',
  'data/runtime/investment-workspace-v1-1',
  'data/runtime/pi-v2-investor-report-quality',
  'data/validation/investor-report-v1',
  'data/validation/sprint3-visual',
  'data/validation/sprint3_2-visual',
  'data/reports/fantasia',
  'data/reports/synthetic-many-comps',
  'data/reports/synthetic-long',
  'data/reports/bass',
  'data/reports/joyce',
  'firebase-debug.log'
];

const exists=async target=>lstat(target).then(()=>true,error=>error.code==='ENOENT'?false:Promise.reject(error));

const temporaryDirectory=path.resolve(workspace,'.tmp');
if(await exists(temporaryDirectory)){
  for(const entry of await readdir(temporaryDirectory)){
    const absolute=path.join(temporaryDirectory,entry);
    try{await rm(absolute,{recursive:true,force:false,maxRetries:0});console.log(`REMOVED .tmp/${entry}`);}
    catch(error){
      if(['EBUSY','EPERM'].includes(error.code)){console.log(`PRESERVED_ACTIVE .tmp/${entry}`);continue;}
      throw error;
    }
  }
  if((await readdir(temporaryDirectory)).length===0)await rm(temporaryDirectory);
}

for(const relative of targets){
  const absolute=path.resolve(workspace,relative),boundary=path.relative(workspace,absolute);
  if(!boundary||boundary.startsWith('..')||path.isAbsolute(boundary))throw new Error(`UNSAFE_CLEANUP_TARGET:${absolute}`);
  if(!await exists(absolute)){console.log(`SKIPPED_MISSING ${relative}`);continue;}
  await rm(absolute,{recursive:true,force:false,maxRetries:0});
  if(await exists(absolute))throw new Error(`CLEANUP_VERIFICATION_FAILED:${absolute}`);
  console.log(`REMOVED ${relative}`);
}
