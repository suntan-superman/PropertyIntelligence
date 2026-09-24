import assert from 'node:assert/strict';
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
// Exact opaque-value comparisons only. Never parse/echo connection credentials.
try{process.loadEnvFile('.env');}catch(e){if(e.code!=='ENOENT')throw new Error('ENV_LOAD_STOP');}
const secrets=[process.env.DATABASE_URL,process.env.RENTCAST_API_KEY,process.env.MARKET_DATA_API_KEY,process.env.SUPABASE_SERVICE_ROLE_KEY].filter(v=>typeof v==='string'&&v.length>10);
const variants=[...new Set(secrets.flatMap(s=>[s,encodeURIComponent(s),Buffer.from(s).toString('base64'),JSON.stringify(s).slice(1,-1)]))];
const files=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())await walk(p);else files.push(p);}}
await walk('apps/web/dist');
for(const p of ['src/persistence/assessorImport.js','src/persistence/assessorOpportunityRepository.js','src/workbench/api/router.js','netlify/functions/api.js'])files.push(p);
for(const p of ['production-gates.js','production-certification.js','production-qa.js','production-failure-readonly.js'])files.push(`scripts/sprint6_3/${p}`);
for(const p of await readdir('data/validation'))if(p.startsWith('sprint6_3-')&&p.endsWith('.json'))files.push(`data/validation/${p}`);
for(const p of await readdir('docs'))if(p.startsWith('SPRINT6_3_'))files.push(`docs/${p}`);
const qa=JSON.parse(await readFile('data/validation/sprint6_3-regressions.json'));
assert.match(qa.workspace,/^data\/runtime\/sprint6_3\/regression-[a-f0-9-]{36}$/);
for(const p of await readdir(qa.workspace))if(p.endsWith('.log'))files.push(`${qa.workspace}/${p}`);
const bundle=await build({entryPoints:['netlify/functions/api.js'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,logLevel:'silent'});
await mkdir('data/runtime/sprint6_3/security',{recursive:true});await writeFile('data/runtime/sprint6_3/security/function-review.mjs',bundle.outputFiles[0].contents);files.push('data/runtime/sprint6_3/security/function-review.mjs');
for(const p of files){const body=await readFile(p),text=body.toString('utf8');for(const secret of variants)assert.equal(body.includes(Buffer.from(secret)),false,`CREDENTIAL_SCAN_STOP ${p}`);
  assert.doesNotMatch(text,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|postgres(?:ql)?:\/\/[^\s"'<>]+:[^\s"'<>]+@/i,`CREDENTIAL_PATTERN_STOP ${p}`);
  if(p.startsWith('apps/web/dist/'))assert.doesNotMatch(text,/DATABASE_URL|RENTCAST_API_KEY|MARKET_DATA_API_KEY|SUPABASE_SERVICE_ROLE_KEY|X-Api-Key|426054/);
}
assert.doesNotMatch(bundle.outputFiles[0].text,/KernCountyAssessor_GisParcels_2026final\.zip|TaxRoll_Land_2026final\.dbf|scripts\/sprint6_3\/source-plan/);
const result={status:'PASS',filesScanned:files.length,opaqueCredentialVariantsChecked:true,credentialValuesPrinted:false,privateKeyAndConnectionLiteralPatterns:true,browserBundle:true,functionSourceAndLocalReviewBundle:true,localRegressionLogs:true,hostedFunctionArtifactOrLogs:'NOT_APPLICABLE_NO_DEPLOYMENT_AUTHORIZED',providerCalls:0,networkCalls:0};
await writeFile('data/validation/sprint6_3-security.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
