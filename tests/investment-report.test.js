import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {buildInvestmentModel,fingerprint} from '../src/reports/investment/model.js';
import {investmentHtml} from '../src/reports/investment/html.js';
import {investmentReportModel} from '../src/services/investmentReportService.js';
import {createApi} from '../src/workbench/api/router.js';
import {investmentFixture,fixtureNames,fixtureDatabase,ids} from './fixtures/investment.js';

for(const name of fixtureNames)test(`investment fixture ${name}: exact persisted values, immutable model and reproducible fingerprint`,()=>{
  const f=investmentFixture(name),before=fingerprint(f),m=buildInvestmentModel(f),d=f.decision.outputs_payload,a=f.analysis.outputs_payload;
  assert.equal(m.maoDecision.calculatedMao,d.calculatedMao);assert.equal(m.maoDecision.effectiveWalkawayPrice,d.effectiveWalkawayPrice);assert.equal(m.maoDecision.targetOffer,d.targetOffer);assert.deepEqual(m.maoDecision.hurdle,d.hurdle);
  assert.equal(m.encumbrances.knownTotal,d.knownEncumbranceTotal);assert.equal(m.encumbrances.unknownCount,d.unknownEncumbranceCount);assert.deepEqual(m.economics.base,a.base);assert.deepEqual(m.economics.breakEven,a.breakEven);assert.deepEqual(m.valuation,f.evidence.valuation_payload);assert.equal(m.comparables.all.length,f.comps.length);
  assert.equal(m.reportMeta.reportModelFingerprint,buildInvestmentModel(f,'2099-01-01').reportMeta.reportModelFingerprint);assert.equal(fingerprint(f),before);assert.ok(Object.isFrozen(m.maoDecision));
  const html=investmentHtml(m);assert.doesNotMatch(html,/NaN|\[object Object\]|Recommended Buy/);if(name==='explicit-zero')assert.match(html,/\$0\.00/);if(name==='no-condition')assert.match(html,/Property condition has not been assessed/);
});
test('linkage and reconciliation mismatches STOP; missing historical links never select latest',()=>{
  for(const field of ['analysis_snapshot_id','evidence_snapshot_id','deal_id']){const f=investmentFixture();f.decision[field]=null;assert.throws(()=>buildInvestmentModel(f),/REPORT_HISTORICAL_LINK_REQUIRED|REPORT_LINKAGE_STOP/);}
  const f=investmentFixture();f.analysis.evidence_snapshot_id='other';assert.throws(()=>buildInvestmentModel(f),/REPORT_LINKAGE_STOP/);
  for(const field of ['calculated_mao','target_offer','known_encumbrance_total','unknown_encumbrance_count','hurdle_rate']){const v=investmentFixture();v.decision[field]=999;assert.throws(()=>buildInvestmentModel(v),/REPORT_RECONCILIATION_STOP/);}
  const a=investmentFixture();a.analysis.modeled_profit=999;assert.throws(()=>buildInvestmentModel(a),/REPORT_RECONCILIATION_STOP/);
});
test('Decision #1 report is unchanged after #2 and newer evidence across separate service/API instances',async()=>{
  const f=investmentFixture('historical'),db=fixtureDatabase([f]),first=await investmentReportModel({db,decisionId:ids.decision,generatedAt:'2026-01-01'});
  const second=investmentFixture();second.decision.id='50000000-0000-4000-8000-000000000002';second.evidence.id='30000000-0000-4000-8000-000000000002';second.analysis.id='40000000-0000-4000-8000-000000000002';second.analysis.evidence_snapshot_id=second.evidence.id;second.decision.evidence_snapshot_id=second.evidence.id;second.decision.analysis_snapshot_id=second.analysis.id;db.add(second);
  const regenerated=await investmentReportModel({db:{transaction:db.transaction},decisionId:ids.decision,generatedAt:'2026-01-01'});assert.deepEqual(regenerated,first);assert.equal(regenerated.valuation.price,190000);assert.ok(db.queries.every(q=>!q.includes('latest')&&!q.includes('DESC')));
});
test('ID-only API supports cold report model, blocks payloads and keeps cloud binary rendering explicit',async()=>{
  const db=fixtureDatabase([investmentFixture()]);let calls=0;const api=createApi({runtime:'netlify',persistence:db,live:{configured:true,analyze:()=>{calls++;throw new Error('Provider forbidden');}}});const base='https://example.test';
  const r=await api(new Request(`${base}/api/acquisition-decisions/${ids.decision}/investment-report`));assert.equal(r.status,200);assert.equal((await r.json()).report.comparables.all.length,15);
  const post=body=>api(new Request(`${base}/api/reports/investment`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)}));
  const cloud=await post({decisionId:ids.decision});assert.equal(cloud.status,503);assert.equal((await cloud.json()).error,'PDF_LOCAL_ONLY');assert.equal((await post({decisionId:ids.decision,analysis:{profit:999}})).status,400);assert.equal(calls,0);
});
test('escaped business text, secret filtering and no runtime dependency on reference project',async()=>{
  const f=investmentFixture();f.evidence.property_payload.address='<script>window.BAD=true</script>';f.evidence.provenance_payload=[{apiKey:'SYNTHETIC_SECRET',source:'Synthetic'}];const m=buildInvestmentModel(f);assert.doesNotMatch(JSON.stringify(m),/SYNTHETIC_SECRET/);assert.doesNotMatch(investmentHtml(m),/<script>/);
  f.evidence.provenance_payload=[{notes:'postgresql://user:synthetic@host/db'}];assert.throws(()=>buildInvestmentModel(f),/REPORT_SECURITY_STOP/);
  async function scan(dir){for(const item of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${item.name}`;if(item.isDirectory())await scan(p);else if(/\.(js|jsx|mjs)$/.test(p))assert.doesNotMatch(await readFile(p,'utf8'),/HomeAdvisor|Home[ /_-]Advisor/);}}
  await scan('src');await scan('apps/web/src');await scan('netlify/functions');
});
