import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {blankInputs} from '../src/investment-workspace/analysis.js';
import {createStore} from '../src/investment-workspace/store.js';
import {newAnalystEvidence,validateAnalystEvidence,evidenceGapSummary,safeReportEvidence} from '../src/investment-workspace/analyst-evidence.js';
import {reportModel,workspaceReportHtml} from '../src/investment-workspace/reports.js';

const evidence=await addPropertyDetails(await loadEvidence()),property=evidence.properties.find(p=>p.ref==='GABE-01');
const draft=()=>({id:randomUUID(),propertyRef:property.ref,name:'V2.0 hypothetical research',revision:0,evidenceFingerprint:property.evidenceFingerprint??evidence.fingerprint,inputs:{...blankInputs(),purchasePrice:'175000',rehabCost:'40000',exitValue:'315000',contingency:'10',acquisitionRate:'1.5',sellingCommissionRate:'5',sellerClosingRate:'1',propertyTaxes:'8',insurance:'3',utilities:'5'},targetType:'RETURN_ON_TOTAL_PROJECT_COST',risk:{seed:'',iterations:1000,variables:{},rationale:''},compReviews:{},notes:'Hypothetical analyst scenario; not observed deal terms.',demonstration:true,riskRequested:false,analystEvidence:[]});
const recordedMortgage=()=>({...newAnalystEvidence('RECORDED_MORTGAGE'),status:'PRESENT',value:'Recorded mortgage amount $117,500; current balance not established',sourceName:'Retained QA recorded-document evidence',sourceDate:'2025-02-12',retrievedAt:'2026-10-14',verificationClass:'RECORDED_DOCUMENT',notes:'Original recorded amount only.',includeInReport:true});

test('all required analyst research categories default to unknown without implying absence',()=>{
  const gaps=evidenceGapSummary([]);
  assert.equal(gaps.length,14);
  assert.ok(gaps.every(item=>item.status==='UNKNOWN'));
  assert.match(gaps.map(item=>item.label).join(' '),/mortgage.*payoff.*Lien.*delinquent property taxes.*proposed sale price.*condition/i);
});

test('evidence requires source attribution once a non-unknown status is asserted',()=>{
  const entry={...newAnalystEvidence('LIEN'),status:'PRESENT',value:'Possible recorded lien'};
  assert.throws(()=>validateAnalystEvidence([entry]),/requires a source/);
  assert.throws(()=>validateAnalystEvidence([{...entry,sourceName:'Research note',verificationClass:'UNVERIFIED_NOTE',category:'VERIFIED_PAYOFF'}]),/independently verified/);
});

test('scenario revisions preserve evidence exactly and remain isolated by property',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'pi-v2-m1-')),store=createStore(directory,evidence),first=await store.save({...draft(),analystEvidence:[recordedMortgage()]}),second=await store.save({...first,notes:'Second revision; evidence unchanged.'});
  assert.deepEqual(second.analystEvidence,first.analystEvidence);
  assert.equal(second.revision,2);
  const duplicate={...draft(),analystEvidence:structuredClone(first.analystEvidence)};
  duplicate.analystEvidence[0].value='Independent copy';
  assert.notEqual(duplicate.analystEvidence[0].value,first.analystEvidence[0].value);
});

test('sensitive entries and attachment paths do not enter reports',()=>{
  const publicEntry=recordedMortgage(),privateEntry={...newAnalystEvidence('SELLER_AGENT_NOTE'),status:'PRESENT',value:'Private contact details',sourceName:'Restricted local note',verificationClass:'UNVERIFIED_NOTE',sensitive:true,includeInReport:false,attachmentReference:'C:/private/owner-contact.pdf'};
  const scenario={...draft(),revision:1,savedAt:'2026-10-14T12:00:00.000Z',analystEvidence:[publicEntry,privateEntry]};
  assert.equal(safeReportEvidence(scenario.analystEvidence).length,1);
  const model=reportModel(property,scenario).model,html=workspaceReportHtml(property,scenario,evidence,'full');
  assert.equal(model.analystEvidence.entries.length,1);
  assert.match(html,/Recorded mortgage amount/);
  assert.doesNotMatch(html,/Private contact|owner-contact\.pdf|C:\/private/);
});

test('recorded lien and algorithmic balance wording never becomes payoff or current-status proof',()=>{
  const modeled={...newAnalystEvidence('ALGORITHMIC_BALANCE'),status:'PRESENT',value:'Estimated balance $114,181',sourceName:'Provider model',sourceDate:'2026-10-01',verificationClass:'SOURCE_REPORTED'};
  const scenario={...draft(),revision:1,savedAt:'2026-10-14T12:00:00.000Z',analystEvidence:[modeled]};
  const html=workspaceReportHtml(property,scenario,evidence,'full');
  assert.match(html,/Provider algorithmic estimated balance/i);
  assert.match(html,/not a lender-confirmed payoff|estimated balance is not a payoff/i);
  assert.match(html,/true equity is not calculated/i);
});
