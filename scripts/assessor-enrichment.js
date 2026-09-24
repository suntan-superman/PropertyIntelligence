import {writeFile} from 'node:fs/promises';
const command=process.argv[2];
if(command==='dry-run'){
  await import('./sprint6_2/offline.js');const {buildPlan}=await import('./sprint6_3/source-plan.js');const {manifest}=await buildPlan();
  await writeFile('data/validation/sprint6_3-enrichment-dry-run.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
}else if(command==='apply'){
  // Gate 13 remains an explicit operator approval, not an environment toggle.
  console.log(JSON.stringify({status:'STOP',reason:'PRODUCTION_IMPORT_AUTHORIZATION_REQUIRED',providerCalls:0,databaseConnections:0}));process.exitCode=2;
}else if(command==='status'){
  const {createDatabase,safeDatabaseError}=await import('../src/persistence/db.js');try{process.loadEnvFile('.env');}catch{}const db=createDatabase();
  try{if(!db)throw new Error('DATABASE_NOT_CONFIGURED');const r=(await db.query("SELECT to_regclass('public.opportunity_assessor_import_batches') IS NOT NULL AS migration004Present")).rows[0];console.log(JSON.stringify({status:'READ_ONLY',...r,providerCalls:0,databaseConnections:1}));}catch(e){console.log(JSON.stringify(safeDatabaseError(e)));process.exitCode=1;}finally{await db?.close();}
}else{console.log(JSON.stringify({status:'STOP',reason:'INVALID_COMMAND'}));process.exitCode=2;}
