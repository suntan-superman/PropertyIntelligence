import '../sprint6_2/offline.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileHash} from '../sprint6_2/io.js';
const sql=await readFile('netlify/database/migrations/004_kern_assessor_opportunity_enrichment.sql','utf8');
test('004 is additive and never writes existing candidates or rewrites previous migrations',()=>{
  assert.equal((sql.match(/CREATE TABLE /g)??[]).length,2);
  assert.doesNotMatch(sql,/\b(?:DROP|TRUNCATE)\b|UPDATE\s+opportunity_candidates|ALTER\s+TABLE\s+(?:properties|opportunity_candidates|discovery_records)/i);
  assert.ok((sql.match(/ON DELETE RESTRICT/g)??[]).length>=3);
});
test('ATN, APN9 and official/research interpretation remain separate',()=>{
  for(const f of ['pts_atn_raw','pts_atn_normalized','assessor_atn_raw','assessor_atn_normalized','apn9','use_code','use_description','research_use_category','mapping_version','mapping_reason'])assert.ok(sql.includes(f));
  assert.match(sql,/CREATE INDEX opportunity_assessor_apn9_idx/);
  assert.doesNotMatch(sql,/UNIQUE\s*\(apn9\)/);
});
test('assessment decimals and null/zero constraints are explicit',()=>{
  for(const f of ['land_assessment','improvement_assessment','net_assessment','base_year_value'])assert.match(sql,new RegExp(`${f} numeric\\(19,5\\)`));
  assert.match(sql,/base_year_status='EXPLICIT_ZERO' AND base_year_value IS NOT NULL AND base_year_value=0/);
  assert.match(sql,/county_acres_status='EXPLICIT_ZERO' AND county_acres IS NOT NULL AND county_acres=0/);
});
test('historical constraints, batch reconciliation and active uniqueness are present',()=>{
  for(const token of ['ASSESSOR_HISTORY_IMMUTABLE','ASSESSOR_BATCH_COUNTS_MISMATCH','ASSESSOR_SOURCE_CANDIDATE_MISMATCH','ASSESSOR_PTS_HASH_MISMATCH','UNIQUE (candidate_id, import_batch_id)','WHERE superseded_at IS NULL'])assert.ok(sql.includes(token));
});
test('no owner/contact/geometry payload columns and public data API denied',()=>{
  assert.doesNotMatch(sql,/\b(?:owner_name|assessee|billing|care_of|dba|phone|email|vertices|polygon|raw_payload)\s+(?:text|jsonb|geometry)/i);
  assert.equal((sql.match(/ENABLE ROW LEVEL SECURITY/g)??[]).length,2);
  assert.match(sql,/REVOKE ALL ON opportunity_assessor_import_batches, opportunity_assessor_enrichments FROM PUBLIC/);
});
test('protected pre-work baseline unchanged except four explicitly scoped integration files',async()=>{
  const b=JSON.parse(await readFile('data/runtime/sprint6_3/baseline.json'));
  const scoped=new Set(['package.json','src/workbench/api/router.js','apps/web/src/app/App.jsx','apps/web/src/features/opportunities/Opportunities.jsx']);
  for(const f of b.files)if(!scoped.has(f.path))assert.equal(await fileHash(f.path),f.sha256,f.path);
});
