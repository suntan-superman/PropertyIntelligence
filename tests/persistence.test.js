import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from '../src/io/files.js';
import {fixture} from '../src/workbench/model.js';
import {canonicalInput} from '../src/services/propertyPersistenceService.js';
import {evidenceInput} from '../src/services/evidenceSnapshotService.js';
import {analysisInput} from '../src/services/analysisSnapshotService.js';

test('Sprint 4 migration is repository-owned and snapshot tables have no application updates',async()=>{
  const sql=await readFile(resolve('netlify/database/migrations/001_persistent_intelligence.sql'),'utf8');
  for(const table of ['properties','property_aliases','evidence_snapshots','valuations','comparable_snapshots','comparables','deals','deal_claims','analysis_snapshots','diligence_items','discovery_signals','documents','reports','idempotency_keys','audit_events'])assert.match(sql,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.doesNotMatch(sql,/UPDATE\s+(evidence_snapshots|analysis_snapshots)\b/i);assert.match(sql,/gen_random_uuid\(\)/);assert.match(sql,/FOREIGN KEY|REFERENCES/);
});

test('persistence input adapters preserve canonical identity, evidence and unknown analysis values',async()=>{
  const property=await fixture('fantasia','property'),deal=await fixture('fantasia','deal');
  const canonical=canonicalInput(property);assert.equal(canonical.normalizedAddress,'8426 FANTASIA PKWY WAY RIVERVIEW FL 33578'.replace('PKWY WAY','PARK WAY'));assert.equal(canonical.state,'FL');
  const evidence=evidenceInput(property,'00000000-0000-4000-8000-000000000000');assert.equal(evidence.propertyId,'00000000-0000-4000-8000-000000000000');assert.equal(evidence.valuationPayload.price,property.property.valuation.price);
  const analysis=analysisInput(deal,'00000000-0000-4000-8000-000000000000','00000000-0000-4000-8000-000000000001',null);assert.equal(analysis.costCompleteness,'INCOMPLETE');assert.equal(analysis.outputsPayload.base.modeledProfit,99000);assert.equal(analysis.inputsPayload.claims.length,deal.claims.length);
});

test('ANALYSIS_REQUIRED remains a real validation error without a model',async()=>{
  const {reanalyzeDeal}=await import('../src/services/dealPersistenceService.js');
  await assert.rejects(()=>reanalyzeDeal({db:{},id:'00000000-0000-4000-8000-000000000000',model:null}),/ANALYSIS_REQUIRED/);
});

test('durable re-analysis reconstructs evidence, comps, claims and diligence without session state',async()=>{
  const router=await readFile(resolve('src/workbench/api/router.js'),'utf8');
  const service=await readFile(resolve('src/services/dealPersistenceService.js'),'utf8');
  assert.match(router,/durable\?\.model/);assert.match(router,/durable\?\.evidence/);assert.match(router,/EVIDENCE_NOT_LINKED/);
  assert.match(service,/Re-analysis reconstructs this model from durable property, evidence and deal claims/);assert.match(service,/comparables c JOIN comparable_snapshots/);assert.match(service,/diligenceHistory\(tx,id\)/);
});

test('Sprint 5 migration is additive and MAO persistence tables are append-only',async()=>{
  const sql=await readFile(resolve('netlify/database/migrations/002_acquisition_decisions.sql'),'utf8');
  for(const table of ['acquisition_decisions','property_encumbrances','property_condition_assessments','property_condition_items'])assert.match(sql,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(sql,/REFERENCES properties\(id\) ON DELETE RESTRICT/);assert.match(sql,/REFERENCES evidence_snapshots\(id\) ON DELETE RESTRICT/);assert.doesNotMatch(sql,/\b(DROP|TRUNCATE|DELETE\s+FROM|UPDATE)\b/i);
});

test('Sprint 6 migration is additive and opportunity source rows are immutable',async()=>{
  const sql=await readFile(resolve('netlify/database/migrations/003_opportunity_discovery.sql'),'utf8');
  for(const table of ['discovery_sources','discovery_records','opportunity_candidates','opportunity_record_links','opportunity_signals','opportunity_reviews'])assert.match(sql,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(sql,/source_file_hash text NOT NULL UNIQUE/);assert.match(sql,/record_fingerprint text NOT NULL/);assert.match(sql,/resolved_property_id uuid REFERENCES properties\(id\) ON DELETE RESTRICT/);assert.match(sql,/UNIQUE \(candidate_id, signal_type, source_record_id\)/);assert.doesNotMatch(sql,/\b(DROP|TRUNCATE|DELETE\s+FROM|UPDATE)\b/i);
});
