import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,newJson,newText,verifyPreservation} from './guard.js';
import {loadRetained,financialInventory} from './local.js';
import {syntheticResult,SYNTHETIC_LABEL} from './core.js';
import {readinessHtml,demonstrationHtml} from './view.js';
import {runMonteCarlo} from '../../src/analysis/monteCarlo/index.js';
import {fixture,syntheticRiskRule} from '../../tests/fixtures/monteCarlo.js';
import {verifyCertifiedSource} from '../../src/reports/investor-v1/frozenPackage.js';
import {executionFor} from '../../src/reports/investor-v1/analysisTrust.js';
import {monteCarloReport} from '../../src/reports/investor-v1/monteCarloAdapter.js';
import {investorReportHtml} from '../../src/reports/investor-v1/html.js';
import {offlineStatus} from '../../src/analysis/offline.js';

export async function execute(){
  await verifyPreservation();await verifyCertifiedSource();
  const retained=await loadRetained(),identity=retained.identities[1];
  assert(identity.preliminaryAnalysisAuthorization.eligible,'RC_P2_PRELIMINARY_BLOCKED');
  const real=await financialInventory(retained.items[1],identity);
  assert.equal(real.readiness.realFinancialAnalysisExecuted,false,'REAL_ANALYSIS_REQUIRES_NEW_EVIDENCE_REVIEW');
  const directory=await mkdtemp(`${ROOT}/run-`);
  await newJson(`${directory}/identity.private.json`,identity);
  await newJson(`${directory}/real-readiness.private.json`,real);
  await newText(`${directory}/real-readiness.html`,readinessHtml(identity,real.readiness));
  await newText(`${directory}/COUNTY_SOURCE_DISCLAIMER.md`,await readFile('docs/SPRINT6_2_SOURCE_DISCLAIMER.md','utf8'));
  await mkdir(`${directory}/synthetic`);
  // No real identity or financial inputs are passed into this branch.
  const input=fixture('A_STRONG_MARGIN'),analysis=runMonteCarlo(input,{riskRule:syntheticRiskRule()}),result=syntheticResult(input,analysis);
  const report=monteCarloReport(analysis,executionFor(analysis),{packageId:'SYNTHETIC-PRELIMINARY-DEMO-V1',generatedAt:new Date().toISOString(),reportVersion:'investor-presentation-v1.1'});
  await newJson(`${directory}/synthetic/result.json`,result);await newJson(`${directory}/synthetic/report-model.json`,report);
  await newText(`${directory}/synthetic/demo.html`,demonstrationHtml(investorReportHtml(report,{kind:'full'})));
  assert.equal(offlineStatus().networkAttempts,0);
  const receipt={schemaVersion:'PI_PRELIMINARY_RUN_V1',clientDate:'2026-10-12',completedAt:new Date().toISOString(),runtime:process.version,directory,
    preliminaryEligibility:retained.identities.map((i,n)=>({pilotCode:retained.items[n].candidate.pilotCode,eligible:i.preliminaryAnalysisAuthorization.eligible})),
    historicalCrosswalk:retained.rules[1].historicalSourceCrosswalk.status,financialReadiness:real.readiness.financialReadiness.status,missingInputs:real.readiness.financialReadiness.missing,
    realFinancialAnalysisExecuted:false,synthetic:{status:'PASS',label:SYNTHETIC_LABEL,iterations:analysis.simulation.iterations,resultFingerprint:analysis.provenance.resultFingerprint,
      deterministicProfit:analysis.deterministic.modeledProfit,deterministicMao:analysis.mao.deterministic.purchasePrice,meanProfit:analysis.results.profit.mean,lossFrequency:analysis.results.probabilityOfLoss,riskMao:analysis.riskAdjustedMao.purchasePrice},
    network:offlineStatus(),databaseConnections:0,databaseWrites:0,analystApprovals:0,durableProperties:0,round1Selections:0,preservation:await verifyPreservation()};
  await newJson(`${directory}/receipt.json`,receipt);return receipt;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{assert.equal(process.argv.length,2);const r=await execute();console.log(JSON.stringify({status:'COMPLETE',directory:r.directory,identity:r.preliminaryEligibility,financialReadiness:r.financialReadiness,realFinancialAnalysisExecuted:false,synthetic:r.synthetic.status,network:r.network,preservation:r.preservation}));}
  catch(e){console.error(JSON.stringify({status:'STOP',code:/^[A-Z0-9_]+$/.test(e.message)?e.message:'SANITIZED_PRELIMINARY_FAILURE'}));process.exitCode=1;}
}
