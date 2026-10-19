// Explicit isolated certification entry point; no npm lifecycle or production configuration.
import {spawnSync,execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
if(process.argv.length!==2)throw new Error('NO_TARGET_OVERRIDE_SUPPORTED');
const root='data/runtime/identity-persistence-test';execFileSync('git',['check-ignore','--quiet',`${root}/v3-summary.json`],{stdio:'pipe'});
await mkdir(root,{recursive:true});const dir=await mkdtemp(`${root}/v3-test-run-`);
const files=['scripts/sprint6_3_1/address.test.js','scripts/sprint6_3_3/linkage.test.js','tests/persistence.test.js','scripts/mls-validation-round1/harness.test.js','scripts/mls-validation-round1/gate1b-identity-audit.test.js','scripts/identity-resolution-pilot/pilot.test.js','scripts/durable-identity-pilot/pilot.test.js','scripts/identity-resolution-pilot/review.test.js','scripts/identity-resolution-pilot/suggestion.test.js','scripts/identity-resolution-pilot/streamlined.test.js','scripts/durable-identity-pilot/trusted-review.test.js'];
const totals=s=>Object.fromEntries(['tests','pass','fail','skipped','cancelled'].map(k=>[k,Number(s.match(new RegExp(`^# ${k} (\\d+)$`,'m'))?.[1]??-1)]));
const summary={node:process.version,runAt:new Date().toISOString(),offlineFiles:files,productionConnections:0,productionWrites:0,realPropertiesCreated:0,providerCalls:0,mlsAccess:0,roundOneSelected:0};
const env={...process.env};for(const k of Object.keys(env))if(/^(PG|DATABASE_|SUPABASE_)/.test(k))delete env[k];
for(const [name,args,flag]of [
  ['offline',['--import','./src/analysis/offline.js','--test','--test-reporter=tap',...files],null],
  ['postgresV2',['--test','--test-reporter=tap','scripts/durable-identity-pilot/postgres.integration.js'],'PI_IDENTITY_V2_TEST'],
  ['postgresV3',['--test','--test-reporter=tap','scripts/durable-identity-pilot/v3-postgres.integration.js'],'PI_IDENTITY_V3_TEST']
]){
  const result=spawnSync(process.execPath,args,{env:{...env,...(flag?{[flag]:'LOCAL_SYNTHETIC_ONLY'}:{})},encoding:'utf8',timeout:180000,maxBuffer:8e6,windowsHide:true});
  await writeFile(`${dir}/${name}.tap`,result.stdout??'');await writeFile(`${dir}/${name}.stderr`,result.stderr??'');
  summary[name]={...totals(result.stdout??''),exitCode:result.status,artifact:result.stdout?.match(/LOCAL_CERTIFICATION_ARTIFACT=([^\r\n]+)/)?.[1]??null};console.log(JSON.stringify({suite:name,...summary[name]}));
  // The stale assertion is reconciled. Any new failure stops subsequent suites.
  if(result.status!==0){process.exitCode=1;break;}
}
const baseline=JSON.parse(await readFile(`${root}/v3-preservation-before.json`,'utf8'));
const allowed=new Set(['scripts/durable-identity-pilot/sequence.js','scripts/durable-identity-pilot/postgres-fixtures.js','scripts/durable-identity-pilot/local-postgres.js','scripts/durable-identity-pilot/postgres.integration.js']);
// Exact user-authorized regression reconciliation, not a baseline rewrite or a
// path/directory exemption. Any other content in this test still fails protection.
const reconciliation={path:'scripts/identity-resolution-pilot/streamlined.test.js',before:'b94f46e69897392b087bc88cf71b1757661b57822f37d2e00344805d3502b72f',after:'cca18e7af1b15e9e91da99361d30e2d7d8776e0cfcdbffe2cd69f059762ceaa9',authorization:'PI DURABLE IDENTITY V3 — FINAL REGRESSION RECONCILIATION'};
const comparisonPath=value=>value.replaceAll('\\','/');
const changed=[];for(const [path,hash]of Object.entries(baseline)){const current=createHash('sha256').update(await readFile(path)).digest('hex');if(current!==hash){const exactReconciliation=comparisonPath(path)===comparisonPath(reconciliation.path)&&hash===reconciliation.before&&current===reconciliation.after;changed.push({path,expectedNarrowChange:allowed.has(path)||exactReconciliation,before:hash,after:current,...(exactReconciliation?{authorization:reconciliation.authorization}:{})});}}
summary.regressionReconciliation=reconciliation;
summary.preservation={checked:Object.keys(baseline).length,changed,unexpectedChanges:changed.filter(c=>!c.expectedNarrowChange).length};
if(summary.preservation.unexpectedChanges)process.exitCode=1;
summary.completedAt=new Date().toISOString();summary.status=process.exitCode?'MORE DEVELOPMENT REQUIRED':'V3 ISOLATED INTEGRATION CERTIFIED';
await writeFile(`${dir}/summary.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({summary:`${dir}/summary.json`,status:summary.status,preservation:summary.preservation.unexpectedChanges}));
