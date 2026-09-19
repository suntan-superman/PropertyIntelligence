import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDatabase} from '../src/persistence/db.js';
import {hash,resolve,writeJson} from '../src/io/files.js';

try { process.loadEnvFile(resolve('.env')); } catch { /* Netlify injects DATABASE_URL */ }
const db=createDatabase({connectionString:process.env.DATABASE_URL});
if(!db) throw new Error('DATABASE_URL is required for Supabase schema certification.');

const expected={
  properties:['id','normalized_address','address_line1','city','state','postal_code','county','latitude','longitude','property_type','apn','atn','provider_property_id','identity_status','created_at','updated_at','archived_at'],
  property_aliases:['id','property_id','alias_type','address_text','normalized_address','source','created_at'],
  evidence_snapshots:['id','property_id','source','source_record_id','retrieved_at','snapshot_type','status','property_payload','valuation_payload','tax_payload','assessment_payload','sale_history_payload','features_payload','legal_payload','provenance_payload','raw_reference','created_at'],
  valuations:['id','property_id','evidence_snapshot_id','source','valuation_type','estimated_value','low_value','high_value','effective_at','created_at'],
  comparable_snapshots:['id','property_id','evidence_snapshot_id','source','created_at'],
  comparables:['id','comparable_snapshot_id','provider_comp_id','address','latitude','longitude','property_type','status','price','price_label','bedrooms','bathrooms','square_feet','lot_size','year_built','distance_miles','days_on_market','correlation','land_tenure_status','provider_payload','created_at'],
  deals:['id','property_id','name','deal_status','origin','sponsor_name','created_at','updated_at','archived_at'],
  deal_claims:['id','deal_id','field_key','value_numeric','value_text','value_json','unit','origin','status','cash_timing','source_description','created_at','superseded_at'],
  analysis_snapshots:['id','deal_id','property_id','evidence_snapshot_id','analysis_version','model_fingerprint','created_at','cost_completeness','modeled_proceeds','cash_invested','modeled_profit','cash_on_cash','break_even_sale_price','inputs_payload','outputs_payload','warnings_payload'],
  diligence_items:['id','deal_id','analysis_snapshot_id','category','question_key','question_text','materiality','status','related_fields','answer_text','resolved_at','created_at','updated_at'],
  discovery_signals:['id','property_id','source','signal_type','source_date','external_identifier','amount_numeric','signal_payload','provenance_payload','created_at'],
  documents:['id','property_id','deal_id','document_type','filename','storage_reference','source','status','created_at'],
  reports:['id','property_id','deal_id','analysis_snapshot_id','report_type','storage_reference','generated_at','status','created_at'],
  idempotency_keys:['id','request_key','operation','response_status','response_payload','created_at'],
  audit_events:['id','aggregate_type','aggregate_id','event_type','event_payload','request_key','created_at']
  ,acquisition_decisions:['id','property_id','deal_id','evidence_snapshot_id','analysis_snapshot_id','strategy','decision_version','created_at','hurdle_type','hurdle_rate','selected_exit_basis','selected_exit_value','calculated_mao','manual_walkaway_cap','effective_walkaway_price','target_offer','target_policy_payload','seller_asking_price','auction_minimum','known_encumbrance_total','unknown_encumbrance_count','encumbrance_gap','cost_completeness','inputs_payload','outputs_payload','warnings_payload','model_fingerprint']
  ,property_encumbrances:['id','property_id','evidence_snapshot_id','type','amount','amount_status','source','as_of_date','payoff_verified','priority_known','notes','created_at','superseded_at']
  ,property_condition_assessments:['id','property_id','deal_id','assessment_date','source','created_at']
  ,property_condition_items:['id','assessment_id','category','condition_status','estimated_cost','source','notes','created_at']
};
const expectedIndexes=['properties_state_county_idx','properties_apn_jurisdiction_idx','property_aliases_normalized_idx','evidence_property_retrieved_idx','valuation_property_effective_idx','comp_snapshot_property_created_idx','deals_property_status_idx','analysis_deal_created_idx','discovery_source_type_date_idx','diligence_deal_status_idx','audit_aggregate_created_idx','acquisition_decisions_property_created_idx','acquisition_decisions_deal_created_idx','property_encumbrances_property_created_idx','condition_assessments_property_created_idx','condition_items_assessment_created_idx'];
const tables=Object.keys(expected);
try {
  const migration=await readFile(resolve('netlify/database/migrations/001_persistent_intelligence.sql'),'utf8');
  const migration002=await readFile(resolve('netlify/database/migrations/002_acquisition_decisions.sql'),'utf8');
  const ledger=(await db.query('SELECT filename,checksum,applied_at FROM property_intelligence_schema_migrations WHERE filename=ANY($1::text[]) ORDER BY filename',[ ['001_persistent_intelligence.sql','002_acquisition_decisions.sql'] ])).rows;
  assert.equal(ledger.length,2,'migration ledger must contain exactly one applied 001 and 002 row');
  assert.equal(ledger.find(row=>row.filename==='001_persistent_intelligence.sql').checksum,hash(migration),'migration 001 checksum must match repository authority');
  assert.equal(ledger.find(row=>row.filename==='002_acquisition_decisions.sql').checksum,hash(migration002),'migration 002 checksum must match repository authority');
  const tableRows=(await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name=ANY($1::text[]) ORDER BY table_name",[tables])).rows.map(row=>row.table_name);
  assert.deepEqual(tableRows,[...tables].sort(),'all expected application tables must exist');
  const columns=(await db.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[])",[tables])).rows;
  const missing=[];for(const [table,names] of Object.entries(expected)){const present=new Set(columns.filter(row=>row.table_name===table).map(row=>row.column_name));for(const name of names)if(!present.has(name))missing.push(`${table}.${name}`);}
  assert.deepEqual(missing,[],'expected columns must exist');
  const indexes=(await db.query("SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname=ANY($1::text[])",[expectedIndexes])).rows.map(row=>row.indexname);
  assert.deepEqual(indexes.sort(),expectedIndexes.sort(),'expected indexes must exist');
  const restrict=(await db.query("SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND c.contype='f' AND c.confdeltype='r' AND t.relname=ANY($1::text[])",[tables])).rows[0].n;
  assert.ok(restrict>=16,'foreign keys must remain ON DELETE RESTRICT');
  const report={at:new Date().toISOString(),status:'PASS',provider:'supabase-postgresql',migrations:ledger,expectedTableCount:tables.length,expectedIndexCount:expectedIndexes.length,foreignKeysOnDeleteRestrict:restrict,checks:['repository checksum ledger for 001 and 002','all application tables','all required columns','expected indexes','restrictive foreign keys','no schema mutation'],providerCalls:0};
  await writeJson('data/validation/sprint4-1-supabase-schema-certification.json',report);console.log(JSON.stringify(report,null,2));
} finally { await db.closePoolForTests(); }
