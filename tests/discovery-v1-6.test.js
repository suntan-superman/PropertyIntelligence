import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {loadDiscovery} from '../src/discovery/model.js';
import {scoreResidentialScreening} from '../src/discovery/screening.js';
import {planBatchEnrichment} from '../src/discovery/enrichment.js';
import {batchSummaryHtml,discoveryBriefHtml} from '../src/discovery/reports.js';
import {createDiscoveryStore} from '../src/discovery/store.js';

const discovery=await loadDiscovery(),residential=discovery.records.filter(record=>record.isResidentialOpportunity),pilot=discovery.records.filter(record=>record.underwritingReady);

test('V1.6 indexes the complete retained cohort while preserving the 80-property underwriting subset',()=>{
  assert.equal(discovery.version,'PI_DISCOVERY_V1_6');assert.equal(discovery.records.length,11316);assert.equal(discovery.viewCounts.residential,472);assert.equal(discovery.viewCounts.allCountyRecords,11316);assert.equal(pilot.length,80);
  assert.equal(new Set(discovery.records.map(record=>record.id)).size,11316);assert.equal(discovery.candidates.length,80);
});

test('residential screening is transparent, reproducible and excludes historical amount from scoring',()=>{
  const record=residential.find(item=>item.underwritingReady),first=scoreResidentialScreening(record),changed=scoreResidentialScreening({...record,historicalAmount:999999999});
  assert.deepEqual(first,changed);assert.equal(Object.keys(first.components).length,6);assert.match(first.boundary,/profitability are not scored/i);assert.ok(first.score>=0&&first.score<=100);
});

test('Taft address uses county street/city and Kern jurisdiction without inventing ZIP',()=>{
  const record=discovery.records.find(item=>item.address.rawCountySitus==='130 KERN ST, TAFT');assert.ok(record);assert.equal(record.address.street,'130 KERN ST');assert.equal(record.address.city,'TAFT');assert.equal(record.address.state,'CA');assert.equal(record.address.postalCode,null);assert.equal(record.address.stateBasis,'KERN_COUNTY_JURISDICTION');
});

test('no-situs parcel exposes exact geometry metadata but no coordinates or fabricated address',()=>{
  const record=discovery.records.find(item=>item.address.evidenceState==='NO_COUNTY_SITUS'&&item.geometry.status==='GEOMETRY_EXACT');assert.ok(record.sourceIdentity.atn);assert.equal(record.address.street,'');assert.equal(record.address.formatted,'No county situs');assert.equal(record.geometry.coordinates,null);assert.equal(record.geometry.payloadIncluded,false);assert.ok(Number.isFinite(record.geometry.squareFeet));
});

test('cannabis and motel records remain in all-county evidence but not residential opportunities',()=>{
  for(const description of ['CANNABIS PRODUCTION','MOTEL']){const record=discovery.records.find(item=>item.propertyType.description===description);assert.ok(record,description);assert.equal(record.isResidentialOpportunity,false);assert.equal(record.screening.components.residentialUse.points,0);}
});

test('named batches enforce 80 candidates, prevent duplicates, isolate shortlists and support persistent undo',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'pi-v16-batches-')),store=createDiscoveryStore(dir,discovery),ids=residential.slice(0,81).map(item=>item.id),created='2026-10-14T12:00:00.000Z';
  const first={id:'batch-one',name:'Residential 80',candidateIds:ids.slice(0,80),shortlist:ids.slice(0,6),createdAt:created,updatedAt:created};
  let state=await store.save({version:'PI_DISCOVERY_V1_6_LOCAL_STATE',batches:[first],activeBatchId:first.id,shortlist:first.shortlist,candidateStatus:Object.fromEntries(first.shortlist.map(id=>[id,'SHORTLISTED']))});
  assert.equal((await store.read()).batches[0].candidateIds.length,80);assert.equal(state.shortlist.length,6);
  await assert.rejects(()=>store.save({...state,batches:[{...first,id:'bad-duplicate',candidateIds:[ids[0],ids[0]]}]}),/distinct retained candidates/);
  await assert.rejects(()=>store.save({...state,batches:[{...first,id:'bad-81',candidateIds:ids}]}),/1 to 80/);
  const second={id:'batch-two',name:'Second isolated batch',candidateIds:ids.slice(75,80),shortlist:[ids[79]],createdAt:created,updatedAt:created};state=await store.save({...state,batches:[first,second],activeBatchId:second.id,shortlist:second.shortlist});
  assert.deepEqual(state.batches[0].shortlist,first.shortlist);assert.deepEqual(state.shortlist,second.shortlist);
  state=await store.save({action:'UNDO'});assert.equal(state.activeBatchId,first.id);assert.equal(state.batches.length,1);assert.equal(state.shortlist.length,6);
});

test('enrichment preview counts caches, quotas and conservative exposure without executing providers',()=>{
  const records=residential.filter(item=>item.address.street).slice(0,30),plan=planBatchEnrichment(records,{cachedAddressIds:[records[0].id],cachedRentCastIds:[records[1].id]});
  assert.equal(plan.providerCallsMade,0);assert.equal(plan.liveExecutionEnabled,false);assert.equal(plan.totals.cacheHits,2);assert.equal(plan.totals.googleRequests,29);assert.equal(plan.totals.rentCastRequests,87);assert.equal(plan.totals.rentCastMaximumOverageExposure,17.4);assert.ok(plan.blockers.some(item=>item.includes('25/day')));
});

test('batch and individual PDF HTML retain evidence boundaries and the complete county disclaimer',async()=>{
  const county=(await readFile('docs/SPRINT6_2_SOURCE_DISCLAIMER.md','utf8')).replaceAll('\r\n','\n').split('SUMMARY:\n\n')[1].trim(),records=residential.slice(0,6),batch={id:'batch-report',name:'Six-property research shortlist'};
  const brief=discoveryBriefHtml(records[0],county),summary=batchSummaryHtml(batch,records,county);for(const html of [brief,summary]){assert.match(html,/Kern County source disclaimer/);assert.match(html,/This disclaimer statement requires/);assert.match(html,/B\. The Recipient hereby agrees/);assert.match(html,/current delinquency|not current/i);assert.doesNotMatch(html,/investment approved|verified payoff/i);}
});

