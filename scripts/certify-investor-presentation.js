import {offlineStatus} from '../src/analysis/offline.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {ROOT,OUTPUT_ROOT,freezeReport,verifyPackage,verifyCertifiedSource,sha,sourceBundle} from '../src/reports/investor-v1/frozenPackage.js';
import {PRESENTATION_VERSION,priceComparison} from '../src/reports/investor-v1/presentation.js';
import {investorReportHtml} from '../src/reports/investor-v1/html.js';
import {renderInvestorPdf} from '../src/reports/investor-v1/pdf.js';
import {investorFixtures} from '../src/reports/investor-v1/fixtures.js';
import {inspectPdf} from './investor-mc-pdf-qa.js';

const runId=new Date().toISOString().replace(/[:.]/g,'-'),out=join(OUTPUT_ROOT,'presentation-v1.1',runId);
await mkdir(out,{recursive:true});
const save=(name,v)=>writeFile(join(out,name),JSON.stringify(v,null,2)+'\n',{flag:'wx',mode:0o600});
const relativePath=p=>relative(ROOT,p).replaceAll('\\','/');
const baseline=JSON.parse(await readFile(join(ROOT,'data/validation/investor-report-v1/presentation-v1.1/task-preservation-before.json'),'utf8'));
const authorized=['src/reports/investor-v1/monteCarloAdapter.js','src/reports/investor-v1/monteCarloHtml.js','src/reports/investor-v1/frozenPackage.js','scripts/investor-mc-pdf-qa.js'];
async function preservation(){const changed=[];for(const [path,hash] of Object.entries(baseline)){if(sha(await readFile(join(ROOT,path)))!==hash)changed.push(path);}assert.deepEqual(changed.filter(p=>!authorized.includes(p)),[],'UNAUTHORIZED_PRESERVATION_CHANGE');return {status:'PASS',paths:Object.keys(baseline).length,authorizedChanged:changed,unexpectedChanges:0};}
const summary={runId,scope:'LOCAL_SYNTHETIC_ONLY',runtime:process.version,reports:[],legacyReports:[],providerCalls:0,databaseConnections:0,databaseWrites:0,realPropertyAnalyses:0,round1Selections:0,deployments:0,visualReview:'PENDING'};
try{
  await verifyCertifiedSource();summary.preservationBefore=await preservation();summary.reportSource=await sourceBundle();
  const files=['tests/investor-presentation.test.js','tests/investor-mc-integration.test.js','tests/monte-carlo-v1.test.js','tests/acquisition-linkage.test.js','tests/investment-report.test.js','tests/investor-report-v1.test.js'];
  const tests=spawnSync(process.execPath,['--import','./src/analysis/offline.js','--test',...files],{cwd:ROOT,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  await writeFile(join(out,'tests.tap'),tests.stdout??'',{flag:'wx'});await writeFile(join(out,'tests.stderr.txt'),tests.stderr??'',{flag:'wx'});
  const count=k=>Number(tests.stdout.match(new RegExp(`^# ${k} (\\d+)$`,'m'))?.[1]??0);
  summary.tests={files,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),cancelled:count('cancelled')};
  assert.equal(tests.status,0,'REGRESSION_FAILURE');assert.equal(summary.tests.skipped,0);assert.equal(summary.tests.cancelled,0);console.log(JSON.stringify({phase:'tests',...summary.tests}));
  for(const name of ['A_STRONG_MARGIN','B_MARGINAL','C_RENOVATION_OVERRUN']){
    const result=JSON.parse(await readFile(join(ROOT,'data/validation/monte-carlo-v1/2026-10-09T17-55-37-247Z',`${name}.json`),'utf8'));
    const packaged=await freezeReport(result,{outputRoot:join(out,'packages'),reportVersion:PRESENTATION_VERSION});
    await mkdir(join(out,'receipts'),{recursive:true});const receiptFile=join(out,'receipts',`${packaged.manifest.packageId}.json`);await writeFile(receiptFile,JSON.stringify(packaged.receipt,null,2)+'\n',{flag:'wx',mode:0o600});
    const row={name,package:relativePath(packaged.directory),receipt:relativePath(receiptFile),manifestSha256:packaged.receipt.manifestSha256,resultFingerprint:result.provenance.resultFingerprint,reportFingerprint:packaged.model.modelFingerprint,documents:[],decisionSnapshot:priceComparison(result.inputs.economics.purchasePrice,result.mao.deterministic.purchasePrice),diagnostics:packaged.documentDiagnostics};
    summary.reports.push(row);
    for(const [document,kind] of [['report','full'],['appendix','appendix']]){
      const visual=join(out,'visual',name,document),html=await readFile(join(packaged.directory,`${document}.html`),'utf8'),bytes=await readFile(join(packaged.directory,`${document}.pdf`));
      const qa=await inspectPdf(bytes,{model:packaged.model,html,outputDir:visual,kind});row.documents.push({document,pages:qa.pages,automatedQa:qa.status,visual:relativePath(visual)});
      console.log(JSON.stringify({phase:'pdf',name,document,pages:qa.pages}));
    }
    row.verification=await verifyPackage(packaged.directory,{receipt:packaged.receipt});
  }
  for(let i=0;i<investorFixtures.length;i++)for(const kind of ['brief','full']){
    const model=investorFixtures[i],name=`legacy-${i+1}-${kind}`,html=investorReportHtml(model,{kind}),rendered=await renderInvestorPdf(model,{kind});
    assert.equal(rendered.diagnostics.requests,0);assert.deepEqual(rendered.diagnostics.consoleErrors,[]);assert.deepEqual(rendered.diagnostics.pageErrors,[]);
    const dir=join(out,'legacy',name);await mkdir(dir,{recursive:true});await writeFile(join(dir,'report.pdf'),rendered.bytes,{flag:'wx'});
    const qa=await inspectPdf(rendered.bytes,{model,html,outputDir:dir,calculated:false});summary.legacyReports.push({name,pages:qa.pages,automatedQa:qa.status,visual:relativePath(dir)});console.log(JSON.stringify({phase:'legacy',name,pages:qa.pages}));
  }
  summary.preservation=await preservation();await verifyCertifiedSource();assert.deepEqual(summary.reportSource,await sourceBundle());assert.equal(offlineStatus().networkAttempts,0);summary.network=offlineStatus();
  summary.status='AUTOMATED PRESENTATION CERTIFIED — VISUAL REVIEW PENDING';
}catch(e){summary.status='MORE DEVELOPMENT REQUIRED';summary.failure=e.message;process.exitCode=1;}
summary.completedAt=new Date().toISOString();await save('summary.json',summary);console.log(JSON.stringify({status:summary.status,artifact:relativePath(out),failure:summary.failure,preservation:summary.preservation}));
