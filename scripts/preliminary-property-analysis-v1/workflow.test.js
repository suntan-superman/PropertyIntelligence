import '../../src/analysis/offline.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sha} from '../rentcast-controlled-pilot/core.js';
import {loadRetained,financialInventory} from './local.js';
import {preliminaryIdentity,assertIdentity,financialReadiness,realReadinessResult,missingInventory,syntheticResult,validateResultSeal,REQUIRED,DISABLED,SYNTHETIC_LABEL} from './core.js';
import {readinessHtml,demonstrationHtml} from './view.js';
import {fixture,syntheticRiskRule} from '../../tests/fixtures/monteCarlo.js';
import {runMonteCarlo} from '../../src/analysis/monteCarlo/index.js';
import {fingerprint} from '../../src/analysis/monteCarlo/contract.js';
import {executionFor} from '../../src/reports/investor-v1/analysisTrust.js';
import {monteCarloReport} from '../../src/reports/investor-v1/monteCarloAdapter.js';
import {investorReportHtml} from '../../src/reports/investor-v1/html.js';
import {offlineStatus} from '../../src/analysis/offline.js';

const original=await loadRetained(),identity=original.identities[1];
const base=()=>({input:structuredClone(original.items[1]),savedRuleC:structuredClone(original.rules[1]),rights:structuredClone(original.rights),exclusion:{round1Permanent:true,technicalUsePermitted:true,preliminaryExcluded:false}});
const reconstruct=changes=>{const x=base();changes(x);return preliminaryIdentity(x);};
test('real source-bound RC-P2 is preliminary eligible with current activity unknown',()=>{assertIdentity(identity);assert.equal(identity.preliminaryAnalysisAuthorization.eligible,true);assert.equal(identity.currentParcelActivity,'UNVERIFIED');assert.equal(identity.historicalCountyIdentity.status,'PASS');});
for(const [name,mutate] of [
  ['missing county provenance',x=>delete x.input.source.fingerprints.archive],
  ['changed original candidate binding',x=>x.input.candidate.candidateId='CHANGED_TEST_ONLY'],
  ['invalid Rule C fingerprint',x=>x.savedRuleC.reconciliationFingerprint='0'.repeat(64)],
  ['missing RentCast rights',x=>x.rights.rentcastAnalysis=false],
  ['missing county rights',x=>x.rights.countyLocalAnalysis=false],
  ['incomplete address',x=>x.input.evidence.providerRecord.zipCode=null],
  ['conflicting parcel identity',x=>x.input.candidate.county.apn9='TEST_CONFLICT'],
  ['altered provider response',x=>x.input.evidence.providerRecord.id='TEST_CONFLICT'],
  ['unknown authority',x=>x.authority='UNAUTHORIZED'],
  ['technical use prohibited',x=>x.exclusion.technicalUsePermitted=false],
  ['preliminary exclusion',x=>x.exclusion.preliminaryExcluded=true],
  ['Round 1 exclusion removal',x=>x.exclusion.round1Permanent=false],
  ['original conflict overwritten',x=>x.input.evidence.reconciliation.matchClassification='VERIFIED'],
  ['rehashed historical result with approval',x=>x.savedRuleC.persistenceAuthorization=true]
])test(name+' blocks',()=>assert.equal(reconstruct(mutate).preliminaryAnalysisAuthorization.eligible,false));
for(const n of [0,2])test(`RC-P${n+1} remains blocked`,()=>{assert.equal(original.identities[n].preliminaryAnalysisAuthorization.eligible,false);assert.equal(original.identities[n].identityConfidence,'UNRESOLVED_PRELIMINARY_IDENTITY');});
test('historical crosswalk does not promote final identity, investment, offer, persistence or MLS',()=>{assert.deepEqual(identity.authorizations,DISABLED);assert.equal(identity.finalIdentityApprovalStatus,'NOT_AUTHORIZED');assert.equal(identity.exclusion.round1Permanent,true);assert.equal(identity.originalClassification,'APN_CONFLICT');});
test('mutated identity fingerprint rejected',()=>{const i=structuredClone(identity);i.currentParcelActivity='ACTIVE';assert.throws(()=>financialReadiness(i,missingInventory()));});
test('caller cannot add final authorization even with recomputed checksum',()=>{const i=structuredClone(identity);i.authorizations.durablePersistence=true;delete i.identityFingerprint;i.identityFingerprint=fingerprint(i);assert.throws(()=>assertIdentity(i),/FINAL_AUTHORITY/);});
test('real retained evidence inventory blocks economics with explicit missing costs',async()=>{const x=await financialInventory(original.items[1],identity);assert.equal(x.readiness.financialReadiness.status,'FINANCIAL_INPUTS_INSUFFICIENT');assert.equal(x.readiness.analysis,null);assert.equal(x.readiness.realFinancialAnalysisExecuted,false);assert.equal(x.readiness.financialReadiness.missing.length,REQUIRED.length);assert.equal(x.evidenceInventory.comparableEvidence.arv,'UNVERIFIED');});

// Mock evidence descriptors below exercise the gate, not empirical evidence.
// They are never saved, rendered, or sent to the real-evidence runner.
function mockEvidence(){
  const input=fixture('A_STRONG_MARGIN',100),inventory=missingInventory();
  input.scenarioId='UNIT_TEST_MOCK_NOT_A_REAL_PROPERTY';
  for(const key of REQUIRED){const value=key==='condition'?'UNIT_TEST_MOCK_SCOPE':key==='comparableSales'?[{reference:'unit-test:mock-comp',price:1,saleDate:'2026-01-01'}]:key==='valuationDate'?'2026-01-01':key.split('.').reduce((v,k)=>v[k],input);
    inventory[key]={value,classification:'INVESTOR_ASSUMPTION',providedBy:'UNIT_TEST_MOCK_REVIEWER',sourceRef:`unit-test:${key}`,sourceSha256:'1'.repeat(64),asOf:'2026-01-01',rightsPermitted:true,subjectReference:identity.preliminaryCandidateId,rationale:'MOCK evidence solely for unit validation, not an RC-P2 assumption.'};
    if(input.provenance[key])input.provenance[key]={classification:'INVESTOR_ASSUMPTION',reference:inventory[key].sourceRef,asOf:inventory[key].asOf,rationale:inventory[key].rationale};
  }
  return {input,inventory};
}
test('complete internally consistent mock contract can pass financial gate without calculation',()=>{const x=mockEvidence();assert.equal(financialReadiness(identity,x.inventory,x.input).status,'FINANCIAL_INPUTS_SUFFICIENT');});
for(const [name,key] of [['ARV','economics.exitValue'],['renovation','economics.rehabCost'],['condition','condition'],['comps','comparableSales'],['valuation date','valuationDate'],['holding','economics.renovationDays'],['acquisition','economics.purchasePrice'],['selling costs','economics.sellerClosingFixed']])test('missing '+name+' prevents real calculations',()=>{const x=mockEvidence();x.inventory[key]=missingInventory()[key];const r=realReadinessResult(identity,x.inventory,x.input);assert.equal(r.analysis,null);assert.equal(r.realFinancialAnalysisExecuted,false);assert(r.missingEvidence.includes(key));});
for(const [name,mutate] of [
  ['invalid financing',x=>x.input.economics.financing.ltv=2],
  ['absent financing',x=>delete x.input.economics.financing.fees],
  ['NaN cost',x=>x.input.economics.rehabCost=NaN],
  ['value does not match evidence',x=>x.input.economics.purchasePrice++],
  ['subject mismatch',x=>x.inventory['economics.exitValue'].subjectReference='OTHER_SUBJECT'],
  ['undated input',x=>x.inventory['economics.exitValue'].asOf=null],
  ['unsupported rights',x=>x.inventory['economics.exitValue'].rightsPermitted=false],
  ['missing assumption author',x=>delete x.inventory['economics.exitValue'].providedBy],
  ['unbound provenance',x=>x.input.provenance['economics.exitValue'].reference='different'],
  ['synthetic relabeling prohibited',x=>x.inventory['economics.exitValue'].classification='SYNTHETIC_TEST'],
  ['empty comp evidence',x=>x.inventory.comparableSales.value=[]]
])test(name+' rejected',()=>{const x=mockEvidence();mutate(x);assert.equal(financialReadiness(identity,x.inventory,x.input).analysisPermitted,false);});
test('available partial evidence is not sufficient and missing zeros remain unknown',()=>{const x=mockEvidence(),inventory=missingInventory();inventory['economics.purchasePrice']=x.inventory['economics.purchasePrice'];const r=realReadinessResult(identity,inventory);assert.equal(r.financialReadiness.status,'FINANCIAL_INPUTS_PARTIAL');assert.equal(r.analysis,null);assert.equal(r.assumptions['economics.rehabCost'].value,null);});
test('synthetic model provenance cannot be passed as real evidence',()=>{const x=mockEvidence();x.input=fixture('A_STRONG_MARGIN',100);assert.equal(financialReadiness(identity,x.inventory,x.input).analysisPermitted,false);});
const syntheticInput=fixture(),analysis=runMonteCarlo(syntheticInput,{riskRule:syntheticRiskRule()}),synthetic=syntheticResult(syntheticInput,analysis);
const report=monteCarloReport(analysis,executionFor(analysis),{packageId:'SYNTHETIC-PRELIMINARY-QA-0001',generatedAt:'2026-10-12T12:00:00.000Z',reportVersion:'investor-presentation-v1.1'});
test('synthetic model executes certified deterministic MC sensitivity and MAO',()=>{assert.equal(analysis.simulation.iterations,10000);assert.equal(analysis.sensitivity.stresses.length,4);assert(Number.isFinite(analysis.mao.deterministic.purchasePrice));assert(Number.isFinite(analysis.riskAdjustedMao.purchasePrice));assert.equal(analysis.provenance.resultFingerprint,'b854e2c29320e50adda00c821763922bef9a22d51fb03253416176a99c82266f');});
test('synthetic result always remains separate from real identity and authorization',()=>{assert.equal(synthetic.label,SYNTHETIC_LABEL);assert(synthetic.preliminaryCandidateReference.startsWith('DEMO-'));assert.equal(synthetic.realFinancialAnalysisExecuted,false);assert.deepEqual(synthetic.authorizations,DISABLED);const s=JSON.stringify(synthetic);for(const value of [original.items[1].candidate.candidateId,original.items[1].candidate.county.atn,original.items[1].evidence.providerRecord.id])assert(!s.includes(value));});
test('result integrity rejects tampering',()=>{validateResultSeal(synthetic);const changed=structuredClone(synthetic);changed.authorizations.offer=true;assert.throws(()=>validateResultSeal(changed));});
test('two views do not juxtapose real identity and synthetic economics',()=>{const real=realReadinessResult(identity,missingInventory()),a=readinessHtml(identity,real),b=demonstrationHtml(investorReportHtml(report,{kind:'full'}));assert(!a.includes('<iframe'));assert(a.includes('No real investment projections'));assert(b.includes('SYNTHETIC FINANCIAL DEMONSTRATION'));assert(b.includes('sandbox'));for(const v of [original.items[1].evidence.providerRecord.addressLine1,original.items[1].candidate.county.apn9])assert(!a.includes(v)&&!b.includes(v));assert(!/<script|https?:\/\//.test(a+b));});
test('HTML escaping rejects script-like report content and escapes evidence text',()=>{assert.throws(()=>demonstrationHtml('<script>SYNTHETIC DEMONSTRATION</script>'));const r=structuredClone(realReadinessResult(identity,missingInventory()));r.assumptions.condition.rationale='<img src=x onerror=alert(1)>';delete r.resultFingerprint;r.resultFingerprint=fingerprint(r);assert(!readinessHtml(identity,r).includes('<img'));});
test('source packets and real decisions are never written by assessment',async()=>{const p=original.items[1].binding.evidencePath;assert.equal(sha(await readFile(p)),original.items[1].binding.evidenceFileSha256);});
test('offline execution has zero network/provider attempts and no database or MLS adapter',async()=>{assert.deepEqual(offlineStatus(),{networkDisabled:true,networkAttempts:0,providerCalls:0});for(const f of ['core','local','run','view']){const t=await readFile(`scripts/preliminary-property-analysis-v1/${f}.js`,'utf8');assert(!/localCredential\(|loadLocalEnvironment\(|new (?:Pool|Client)\(|\.connect\(|fetch\(|db:migrate|netlify deploy/.test(t));}});
