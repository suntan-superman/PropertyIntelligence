import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadDiscovery,addDiscoveryEvidence,parseCountySitus} from '../src/discovery/model.js';
import {createDiscoveryStore} from '../src/discovery/store.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {workspaceReportHtml} from '../src/investment-workspace/report-html.js';
import {FIELDS} from '../src/investment-workspace/analysis.js';
import {parseLocalCsv} from '../apps/web/src/features/discovery/csv.js';

const root=process.cwd();
const discovery=await loadDiscovery(root);
const base=await addPropertyDetails(await loadEvidence(root),root);
const evidence=addDiscoveryEvidence(base,discovery);
const scenario=p=>({id:'11111111-1111-4111-8111-111111111111',propertyRef:p.ref,name:'V1.5 discovery QA',revision:1,evidenceFingerprint:p.evidenceFingerprint,
  inputs:{...Object.fromEntries(Object.keys(FIELDS).map(k=>[k,'0'])),purchasePrice:'150000',rehabCost:'30000',exitValue:'250000',renovationDays:'90',marketingDays:'30',targetRate:'15',targetProfit:''},
  targetType:'RETURN_ON_TOTAL_PROJECT_COST',risk:{variables:{},seed:'',iterations:1000,rationale:''},compReviews:{},notes:'Preliminary county candidate test.',demonstration:true,riskRequested:false,savedAt:'2026-10-14T12:00:00.000Z'});

test('deterministic pilot contains exactly 80 real retained non-excluded county records',()=>{
  assert.equal(discovery.candidates.length,80);assert.equal(discovery.selection.eligibleBeforeExclusion,81);assert.equal(discovery.selection.excludedFixtures,1);
  assert.equal(new Set(discovery.candidates.map(c=>c.id)).size,80);assert.equal(new Set(discovery.candidates.map(c=>c.sourceIdentity.atn)).size,80);assert.equal(new Set(discovery.candidates.map(c=>c.sourceIdentity.apn9)).size,80);
  assert.ok(discovery.candidates.every(c=>c.source.name==='Kern County Power-to-Sell'&&c.source.observedDate==='2026-09-15'&&c.address.rawCountySitus));
});

test('Bakersfield and unsupported ZIP/NOD coverage remain honest',()=>{
  assert.equal(discovery.counts.bakersfield,24);assert.equal(discovery.counts.zipPresent,0);assert.equal(discovery.counts.zip93312,0);assert.equal(discovery.filterSupport.zip.supported,false);assert.match(discovery.filterSupport.zip.label,/cannot be evaluated/i);
  assert.equal(discovery.filterSupport.recordedNod.supported,false);assert.equal(discovery.counts.currentNodCoverage,0);assert.ok(discovery.candidates.every(c=>c.currentEvidence.nod==='NOT_AVAILABLE_IN_RETAINED_COHORT'));
});

test('source-universe address states are separate from canonical workflow status',()=>{
  assert.deepEqual(discovery.universe,{total:11316,countySitusPresent:1270,countySitusMissing:9990,countySitusMalformed:3,assessorUnmatched:53,geometryAvailable:11263,canonicalOrDurable:'NOT_MEASURED_BY_RETAINED_CROSSWALK'});
  assert.ok(discovery.candidates.every(c=>c.address.evidenceState==='COUNTY_SITUS_PARSED'&&c.address.confidence==='SOURCE_PARSED_NOT_POSTAL_VALIDATED'));
});

test('cannabis-production counterexample is excluded from residential flip suitability without losing geometry',()=>{
  const c=discovery.counterexamples[0];assert.equal(c.propertyType.description,'CANNABIS PRODUCTION');assert.equal(c.addressState,'NO_COUNTY_SITUS');assert.equal(c.geometryState,'GEOMETRY_EXACT');assert.equal(c.strategySuitability.status,'EXCLUDED_NONRESIDENTIAL');assert.match(c.geometryContext.label,/no street address may be inferred/i);
});

test('typed historical signals never become current default, foreclosure or payoff claims',()=>{
  for(const c of discovery.candidates){assert.equal(c.discoveryReason.type,'HISTORICAL_POWER_TO_SELL');assert.equal(c.discoveryReason.status,'historical');assert.match(c.discoveryReason.explanation,/not current/i);assert.ok(c.timeline.length>=1);assert.ok(c.timeline.every(x=>x.status==='historical'&&x.documentReference===null));assert.equal(c.currentEvidence.mortgage,'NOT_CHECKED');assert.equal(c.currentEvidence.lien,'NOT_CHECKED');}
});

test('ATN and APN9 remain separate source identifiers and raw county situs parsing does not invent ZIP',()=>{
  for(const c of discovery.candidates){assert.match(c.sourceIdentity.atn,/^\d{11}$/);assert.match(c.sourceIdentity.apn9,/^\d{9}$/);assert.notEqual(c.sourceIdentity.atn,c.sourceIdentity.apn9);assert.equal(c.address.postalCode,null);assert.equal(c.address.stateBasis,'KERN_COUNTY_JURISDICTION');}
  assert.deepEqual(parseCountySitus('100 MAIN ST, BAKERSFIELD'),{rawCountySitus:'100 MAIN ST, BAKERSFIELD',street:'100 MAIN ST',city:'BAKERSFIELD',state:'CA',postalCode:null,postalCodeExtension:null,formatted:'100 MAIN ST, BAKERSFIELD, CA',stateBasis:'KERN_COUNTY_JURISDICTION',postalStatus:'NOT_PRESENT'});
});

test('discovery candidates join the existing workflow without changing Haven or six Gabe subjects',()=>{
  assert.equal(base.properties.length,7);assert.equal(evidence.properties.length,87);assert.equal(evidence.propertyDetails.length,87);
  const haven=evidence.properties.find(p=>p.subjectKind==='DURABLE_SAVED');assert.ok(haven);assert.equal(haven.discovery,undefined);assert.equal(haven.historicalTrigger.amount,null);
  assert.equal(evidence.properties.filter(p=>p.subjectKind==='DISCOVERY_CANDIDATE').length,80);
});

test('candidate report carries county discovery reason and unknown financial evidence without false RentCast attribution',()=>{
  const p=evidence.properties.find(x=>x.subjectKind==='DISCOVERY_CANDIDATE'),html=workspaceReportHtml(p,scenario(p),evidence,'full');
  assert.match(html,/Historical Power-to-Sell amount/);assert.match(html,/Not current delinquency/i);assert.match(html,/Valuation not checked \/ not available/);assert.match(html,/Mortgage, encumbrance, release and current-balance evidence: <b>not checked \/ not acquired<\/b>/);
  assert.doesNotMatch(html,new RegExp(`RentCast ${p.propertyRef.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));assert.match(html,/County Candidate · KERN-PILOT-001/);
});

test('local shortlist persists at six, rejects a seventh and keeps statuses subject-bound',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'pi-discovery-v1-5-')),store=createDiscoveryStore(directory,discovery),ids=discovery.candidates.slice(0,7).map(c=>c.id);
  const saved=await store.save({version:'PI_DISCOVERY_V1_5_LOCAL_STATE',shortlist:ids.slice(0,6),candidateStatus:Object.fromEntries(ids.slice(0,6).map(id=>[id,'SHORTLISTED']))});assert.deepEqual((await store.read()).shortlist,saved.shortlist);
  await assert.rejects(()=>store.save({...saved,shortlist:ids}),/Invalid local discovery shortlist/);assert.equal((await store.read()).shortlist.length,6);
});

test('CSV import parser preserves raw APN and ATN columns independently',()=>{
  const parsed=parseLocalCsv('street,city,state,zip,apn,atn,source,source_date\r\n"1 Main St",Bakersfield,CA,,123456789,12345678901,Authorized Local File,2026-10-14\r\n');
  assert.deepEqual(parsed.headers,['street','city','state','zip','apn','atn','source','source_date']);assert.equal(parsed.rows.length,1);assert.equal(parsed.rows[0][4],'123456789');assert.equal(parsed.rows[0][5],'12345678901');
});

test('browser discovery implementation is local-only and exposes disabled unsupported filters',async()=>{
  const source=await readFile('apps/web/src/features/discovery/Discovery.jsx','utf8'),server=await readFile('src/investment-workspace/server.js','utf8');
  for(const text of ['Discover Opportunities','Analyze a Property','Why flagged?','Working shortlist','Import CSV','Coverage unavailable','no durable Property','Residential Fix & Flip','11,316 candidates'])assert.ok(source.includes(text),text);
  assert.ok(server.includes('/api/discovery/bootstrap'));assert.ok(server.includes('/api/discovery/state'));assert.doesNotMatch(source,/api\.rentcast|attomdata|supabase\.co/i);
});
