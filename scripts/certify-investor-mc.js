import {offlineStatus} from '../src/analysis/offline.js';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {runMonteCarlo} from '../src/analysis/monteCarlo/index.js';
import {fixture,syntheticRiskRule} from '../tests/fixtures/monteCarlo.js';
import {ROOT,OUTPUT_ROOT,freezeReport,verifyPackage,verifyCertifiedSource,sha,sourceBundle} from '../src/reports/investor-v1/frozenPackage.js';
import {investorReportHtml} from '../src/reports/investor-v1/html.js';
import {renderInvestorPdf} from '../src/reports/investor-v1/pdf.js';
import {investorFixtures} from '../src/reports/investor-v1/fixtures.js';
import {inspectPdf} from './investor-mc-pdf-qa.js';

const runId=new Date().toISOString().replace(/[:.]/g,'-'),out=join(OUTPUT_ROOT,runId);
await mkdir(OUTPUT_ROOT,{recursive:true});
await mkdir(out,{recursive:false});
const save=(name,value)=>writeFile(join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
async function protection(){const values={};async function walk(p){for(const e of await readdir(join(ROOT,p),{withFileTypes:true})){const f=join(p,e.name);if(e.isDirectory())await walk(f);else if(e.isFile())values[f.replaceAll('\\','/')]=sha(await readFile(join(ROOT,f)));}}
  for(const p of ['src','config','scripts/durable-identity-pilot','scripts/identity-resolution-pilot','scripts/mls-validation-round1','netlify/database','data/runtime/mls-round1','data/runtime/identity-resolution-pilot','data/runtime/identity-persistence-test','data/validation/investor-report-v1/v1.1'])await walk(p);
  for(const p of ['.gitignore','package.json','package-lock.json','netlify.toml','data/runtime/sprint6_2-kern-assessor/repository-baseline.json','data/runtime/sprint6_3/baseline.json'])values[p]=sha(await readFile(join(ROOT,p)));return values;
}
const before=await protection();await save('protected-before.json',before);
const summary={scope:'LOCAL_SYNTHETIC_ONLY',runId,runtime:process.version,tests:null,reports:[],legacyReports:[],providerCalls:0,databaseConnections:0,databaseWrites:0,realPropertyAnalyses:0,round1Selections:0,deployments:0,visualReview:'PENDING'};
try{
  await verifyCertifiedSource();summary.reportSource=await sourceBundle();
  const files=['tests/investor-mc-integration.test.js','tests/monte-carlo-v1.test.js','tests/acquisition-linkage.test.js','tests/investment-report.test.js','tests/investor-report-v1.test.js'];
  const tests=spawnSync(process.execPath,['--import','./src/analysis/offline.js','--test',...files],{cwd:ROOT,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  await writeFile(join(out,'tests.tap'),tests.stdout??'',{flag:'wx'});await writeFile(join(out,'tests.stderr.txt'),tests.stderr??'',{flag:'wx'});
  const count=k=>Number(tests.stdout.match(new RegExp(`^# ${k} (\\d+)$`,'m'))?.[1]??0);
  summary.tests={files,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),cancelled:count('cancelled')};
  assert.equal(tests.status,0,'REGRESSION_FAILURE');assert.equal(summary.tests.skipped,0);assert.equal(summary.tests.cancelled,0);console.log(JSON.stringify({phase:'tests',...summary.tests}));
  for(const name of ['A_STRONG_MARGIN','B_MARGINAL','C_RENOVATION_OVERRUN']){
    const result=runMonteCarlo(fixture(name),{riskRule:syntheticRiskRule()});
    const packaged=await freezeReport(result,{outputRoot:join(out,'packages')});await mkdir(join(out,'receipts'),{recursive:true});
    const receiptFile=join(out,'receipts',`${packaged.manifest.packageId}.json`);await writeFile(receiptFile,JSON.stringify(packaged.receipt,null,2)+'\n',{flag:'wx',mode:0o600});
    const html=await readFile(join(packaged.directory,'report.html'),'utf8'),bytes=await readFile(join(packaged.directory,'report.pdf'));
    const qa=await inspectPdf(bytes,{model:packaged.model,html,outputDir:join(out,'visual',name)});
    const verification=await verifyPackage(packaged.directory,{receipt:packaged.receipt});
    const row={name,package:relative(ROOT,packaged.directory).replaceAll('\\','/'),receipt:relative(ROOT,receiptFile).replaceAll('\\','/'),pages:qa.pages,
      resultFingerprint:result.provenance.resultFingerprint,reportFingerprint:packaged.model.modelFingerprint,manifestSha256:packaged.receipt.manifestSha256,
      diagnostics:packaged.diagnostics,verification,visual:relative(ROOT,join(out,'visual',name)).replaceAll('\\','/'),automatedQa:qa.status};
    summary.reports.push(row);console.log(JSON.stringify({phase:'calculated-pdf',...row}));
  }
  // Existing fixtures/template cases, with outputs redirected to this unique run.
  // Never invoke the old QA writer against historical v1.1 artifacts.
  for(let i=0;i<investorFixtures.length;i++)for(const kind of ['brief','full']){
    const model=investorFixtures[i],name=`legacy-${i+1}-${kind}`,html=investorReportHtml(model,{kind}),rendered=await renderInvestorPdf(model,{kind});
    assert.equal(rendered.diagnostics.requests,0);assert.equal(rendered.diagnostics.consoleErrors.length,0);assert.equal(rendered.diagnostics.pageErrors.length,0);
    const dir=join(out,'legacy',name);await mkdir(dir,{recursive:true});await writeFile(join(dir,'report.pdf'),rendered.bytes,{flag:'wx'});
    const qa=await inspectPdf(rendered.bytes,{model,html,outputDir:dir,calculated:false});summary.legacyReports.push({name,pages:qa.pages,automatedQa:qa.status,visual:relative(ROOT,dir).replaceAll('\\','/')});console.log(JSON.stringify({phase:'legacy-pdf',name,pages:qa.pages}));
  }
  assert.deepEqual(await protection(),before,'PRESERVATION_FAILURE');summary.preservation={status:'PASS',paths:Object.keys(before).length,unexpectedChanges:0};
  await verifyCertifiedSource();assert.equal(offlineStatus().networkAttempts,0);summary.network=offlineStatus();
  summary.status='ANALYSIS-TO-REPORT CONTRACT CERTIFIED';summary.note='Automated PDF checks passed; visual image inspection and separate final receipt remain required.';
}catch(e){summary.status='MORE DEVELOPMENT REQUIRED';summary.failure=e.message;process.exitCode=1;}
summary.completedAt=new Date().toISOString();await save('summary.json',summary);console.log(JSON.stringify({status:summary.status,artifact:relative(ROOT,out).replaceAll('\\','/'),failure:summary.failure,preservation:summary.preservation}));
