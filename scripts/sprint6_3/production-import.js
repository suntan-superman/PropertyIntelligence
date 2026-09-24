// Gate 13 only: certified Kern Assessor 2026 Final production enrichment import.
// This script deliberately does not run migrations, deployments, or providers.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createDatabase } from '../../src/persistence/db.js';
import { buildPlan } from './source-plan.js';
import { applyAssessorPlan } from '../../src/persistence/assessorImport.js';
import { migrationInputs, digest } from './certification.js';
import { existingFingerprint, enrichmentTables } from './production-certification.js';

const reportPath = 'data/validation/sprint6_3-production-import.json';
const expected = Object.freeze({
  zip: '7954771690266e4f54402b4889ef5a9ae69dfdb04f9e34a6d822f115550c92ae',
  member: '3f96888125baad5525b1791d2e2ab56b5403b14d10f489378059341c0d17fbd5',
  pts: '89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3',
  high: '3d1d7be5c8d84cd0c63834d45f278efbbeb174bec0f59e383831c61416cc8dd3',
  candidates: 'bbd74e59e42fa212956de444f99c53a748f9b0ef25586818d2cb525a2138a74e',
  payload: '1b234fc477a7ffef433c293bb824b721e4c4ba2eb18afea78c04197101ec0feb'
});
const migrationChecksums = Object.freeze({
  '001_persistent_intelligence.sql': '10388d31537f8f65cfadc1b8c6ab590d84707a65ea6ff18e886f23147b85ebfe',
  '002_acquisition_decisions.sql': '3ef7649d10f76297d74c12b8e8527e936407f39a7b195482014b545dbeda6ce7',
  '003_opportunity_discovery.sql': 'd7ac242d9ff2230a5ffe78290ccbedcd6bb002e73a99cd325baa6ef56901ed77',
  '004_kern_assessor_opportunity_enrichment.sql': 'df557e0aec7d276e628ebced3c1fcc43e743f974d60c51290e3b369bd4e08c18'
});
const expectedSitus = { SITUS_MISSING: 9990, SITUS_PRESENT: 1270, NOT_APPLICABLE: 53, SITUS_MALFORMED: 3 };
const expectedCategories = { OTHER: 5581, VACANT_OTHER: 4786, UNKNOWN: 226, NOT_APPLICABLE: 53, COMMERCIAL: 45, RESIDENTIAL_SINGLE_FAMILY: 324, INDUSTRIAL: 11, AGRICULTURAL: 135, RESIDENTIAL_MULTI_FAMILY: 37, MANUFACTURED_MOBILE: 97, GOVERNMENT_EXEMPT: 3, VACANT_RESIDENTIAL: 14, MINERAL: 4 };
const expectedFlags = { SITUS_MISSING: 9990, USE_CATEGORY_REVIEW: 5807, ROLL_ACRES_EXPLICIT_ZERO: 6860, BASE_YEAR_VALUE_MISSING: 8130, ACREAGE_DELTA_GT_0_01: 4397, ASSESSOR_UNMATCHED: 53, SITUS_MALFORMED: 3 };
const equal = (a, b, label) => assert.deepEqual(a, b, label);
const sortedObject = rows => Object.fromEntries(rows.map(r => [r.key, Number(r.n)]).sort(([a], [b]) => a.localeCompare(b)));

const result = { status: 'STOP', gate: 13, mode: 'AUTHORIZED_PRODUCTION_IMPORT', migrationInvocations: 0, providerCalls: 0, googleCalls: 0, countyNetworkCalls: 0, databaseConnections: 0, databaseQueryCalls: 0, productionDeployment: false };
let db, client, inTransaction = false, stage = 'REVALIDATION';
const q = async (sql, values = []) => { result.databaseQueryCalls++; return client.query(sql, values); };
async function openFresh() {
  const fresh = createDatabase();
  if (!fresh) throw new Error('DATABASE_NOT_CONFIGURED');
  result.databaseConnections++;
  const c = await fresh.getPool().connect();
  if (!c.connection?.stream?.encrypted || c.connection.stream.authorized !== true) { c.release(); await fresh.close(); throw new Error('VERIFIED_TLS_REQUIRED'); }
  return { fresh, c };
}
async function closeFresh(fresh, c) { try { c.release(); } finally { await fresh.close(); } }
function mapRows(rows) { return rows.map(r => ({ key: String(r.key), n: Number(r.n) })); }

try {
  try { process.loadEnvFile('.env'); } catch (e) { if (e.code !== 'ENOENT') throw new Error('ENV_LOAD_STOP'); }
  const plan = await buildPlan();
  result.sourcePlan = plan.manifest;
  equal(plan.manifest.countyZipSha256, expected.zip, 'ZIP_HASH_STOP');
  equal(plan.manifest.countyMemberSha256, expected.member, 'MEMBER_HASH_STOP');
  equal(plan.manifest.ptsSha256, expected.pts, 'PTS_HASH_STOP');
  equal(plan.manifest.highPopulationSha256, expected.high, 'HIGH_HASH_STOP');
  equal(plan.manifest.candidatePopulationSha256, expected.candidates, 'CANDIDATE_HASH_STOP');
  equal(plan.manifest.payloadSha256, expected.payload, 'PAYLOAD_HASH_STOP');
  equal(plan.manifest.candidateCount, 11316, 'CANDIDATE_COUNT_STOP');
  equal(plan.manifest.exactCount, 11263, 'EXACT_COUNT_STOP');
  equal(plan.manifest.unmatchedCount, 53, 'UNMATCHED_COUNT_STOP');
  equal(plan.manifest.situsCounts, expectedSitus, 'SITUS_COUNT_STOP');
  equal(plan.manifest.categoryCounts, expectedCategories, 'CATEGORY_COUNT_STOP');
  equal(plan.manifest.reviewFlagCounts, expectedFlags, 'REVIEW_FLAG_COUNT_STOP');
  equal(plan.manifest.high, { total: 312, exact: 309, unmatched: 3, situs: 258, residential: 118, singleFamily: 81, singleFamilySitus: 81 }, 'HIGH_RECONCILIATION_STOP');

  const cert = JSON.parse(await readFile('data/validation/sprint6_3-production-schema-certification.json', 'utf8'));
  assert.equal(cert.migrationApplied, true); assert.equal(cert.migrationInvocations, 1); assert.equal(cert.migrationResult?.status, 'PASS');
  const migrations = await migrationInputs();
  equal(migrations.map(({ filename, checksum }) => ({ filename, checksum })), Object.entries(migrationChecksums).map(([filename, checksum]) => ({ filename, checksum })), 'MIGRATION_CHECKSUM_STOP');
  equal(cert.ledgerAfter?.map(({ filename, checksum }) => ({ filename, checksum })), migrations.map(({ filename, checksum }) => ({ filename, checksum })), 'CERTIFIED_LEDGER_STOP');
  result.migration = { invocations: 0, ledger: migrations.map(({ filename, checksum }) => ({ filename, checksum })), alreadyApplied: true };

  db = createDatabase(); if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
  result.databaseConnections++;
  client = await db.getPool().connect();
  if (!client.connection?.stream?.encrypted || client.connection.stream.authorized !== true) throw new Error('VERIFIED_TLS_REQUIRED');
  result.tls = { encrypted: true, authorized: true };
  stage = 'PRE_IMPORT_GATES';
  await q('BEGIN READ ONLY'); inTransaction = true;
  await q("SET LOCAL statement_timeout='120000'");
  await q("SELECT set_config('search_path', 'public,pg_catalog', true)");
  const ns = (await q('SELECT current_schema() AS namespace,current_schemas(false) AS namespaces')).rows[0];
  equal(ns.namespace, 'public', 'PUBLIC_SCHEMA_STOP'); assert.ok(ns.namespaces.includes('public'), 'PUBLIC_NAMESPACE_STOP'); result.namespace = ns;
  const ledger = (await q('SELECT filename,checksum FROM public.property_intelligence_schema_migrations ORDER BY filename')).rows;
  equal(ledger.map(({ filename, checksum }) => ({ filename, checksum })), migrations.map(({ filename, checksum }) => ({ filename, checksum })), 'LEDGER_STOP'); result.ledger = ledger;
  const tables = (await q("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY tablename", [enrichmentTables])).rows;
  equal(tables.map(r => r.tablename), enrichmentTables, 'ENRICHMENT_TABLES_STOP'); assert.ok(tables.every(r => r.rowsecurity), 'ENRICHMENT_RLS_STOP');
  const empty = (await q('SELECT (SELECT count(*)::int FROM public.opportunity_assessor_import_batches) AS batches,(SELECT count(*)::int FROM public.opportunity_assessor_enrichments) AS observations')).rows[0];
  equal(empty, { batches: 0, observations: 0 }, 'ENRICHMENT_NOT_EMPTY_STOP'); result.preImportCounts = empty;
  result.existingBefore = await existingFingerprint(q, cert.existingTables); equal(result.existingBefore, cert.existingAfterMigration, 'PROTECTED_DATA_CHANGED_STOP');
  const source = (await q('SELECT id,record_count FROM public.discovery_sources WHERE source_file_hash=$1', [expected.pts])).rows[0];
  assert.ok(source, 'PTS_SOURCE_MISSING'); equal(Number(source.record_count), 11321, 'PTS_SOURCE_COUNT_STOP'); result.source = { recordCount: Number(source.record_count) };
  const scoreRows = (await q(`SELECT c.atn,c.screening_score,c.priority_band,c.score_version,c.candidate_status,c.identity_status FROM public.opportunity_candidates c WHERE EXISTS (SELECT 1 FROM public.opportunity_record_links l JOIN public.discovery_records r ON r.id=l.discovery_record_id WHERE l.candidate_id=c.id AND r.discovery_source_id=$1) ORDER BY c.atn`, [source.id])).rows;
  equal(scoreRows.length, 11316, 'REMOTE_CANDIDATE_COUNT_STOP'); const scoreFingerprint = digest(JSON.stringify(scoreRows)); equal(scoreFingerprint, 'fc883cf777b35b966d5fdd84d44d2005739e200fea0a19e0497641e50a7a0a17', 'SCORE_STATUS_FINGERPRINT_STOP');
  const priority = (await q(`SELECT priority_band AS key,count(*)::int AS n FROM public.opportunity_candidates c WHERE EXISTS (SELECT 1 FROM public.opportunity_record_links l JOIN public.discovery_records r ON r.id=l.discovery_record_id WHERE l.candidate_id=c.id AND r.discovery_source_id=$1) GROUP BY priority_band`, [source.id])).rows;
  equal(sortedObject(mapRows(priority)), { HIGH_REVIEW_PRIORITY: 312, LOW_REVIEW_PRIORITY: 10303, MEDIUM_REVIEW_PRIORITY: 701 }, 'PRIORITY_STOP');
  const statuses = (await q(`SELECT candidate_status AS key,count(*)::int AS n FROM public.opportunity_candidates c WHERE EXISTS (SELECT 1 FROM public.opportunity_record_links l JOIN public.discovery_records r ON r.id=l.discovery_record_id WHERE l.candidate_id=c.id AND r.discovery_source_id=$1) GROUP BY candidate_status`, [source.id])).rows;
  equal(sortedObject(mapRows(statuses)), { NEEDS_ADDRESS: 11316 }, 'STATUS_STOP'); result.scoreStatusFingerprint = scoreFingerprint;
  const prior = (await q('SELECT count(*)::int AS n FROM public.opportunity_assessor_import_batches WHERE discovery_source_id=$1 AND assessor_source_edition=$2 AND county_zip_sha256=$3', [source.id, plan.manifest.sourceEdition, expected.zip])).rows[0];
  equal(Number(prior.n), 0, 'PRIOR_IMPORT_STOP');
  await q('ROLLBACK'); inTransaction = false;

  stage = 'AUTHORIZED_IMPORT_TRANSACTION';
  result.import = await applyAssessorPlan(db, plan, { productionAuthorized: true });
  assert.equal(result.import.replay, false); equal(result.import.inserts, 11316, 'IMPORT_INSERT_COUNT_STOP'); equal(result.import.supersessions, 0, 'IMPORT_SUPERSESSION_STOP'); equal(result.import.rejections, 0, 'IMPORT_REJECTION_STOP');

  stage = 'POST_IMPORT_RECONCILIATION';
  const post = await openFresh(); const postDb = post.fresh; const postClient = post.c;
  const pq = async (sql, values = []) => { result.databaseQueryCalls++; return postClient.query(sql, values); };
  await pq('BEGIN READ ONLY'); await pq("SELECT set_config('search_path', 'public,pg_catalog', true)");
  const batchRows = (await pq('SELECT id,discovery_source_id,assessor_source_edition,county_zip_sha256,status,candidate_count,exact_count,unmatched_count,summary,completed_at FROM public.opportunity_assessor_import_batches WHERE discovery_source_id=$1 AND assessor_source_edition=$2 AND county_zip_sha256=$3 ORDER BY imported_at', [source.id, plan.manifest.sourceEdition, expected.zip])).rows;
  equal(batchRows.length, 1, 'BATCH_COUNT_STOP'); const batch = batchRows[0]; assert.equal(batch.status, 'COMPLETE'); equal(Number(batch.candidate_count), 11316, 'BATCH_CANDIDATE_COUNT_STOP'); equal(Number(batch.exact_count), 11263, 'BATCH_EXACT_COUNT_STOP'); equal(Number(batch.unmatched_count), 53, 'BATCH_UNMATCHED_COUNT_STOP'); equal(batch.summary.payloadSha256, expected.payload, 'BATCH_PAYLOAD_STOP');
  result.batch = { id: batch.id, committedAt: batch.completed_at, summary: { payloadSha256: batch.summary.payloadSha256, candidatePopulationSha256: batch.summary.candidatePopulationSha256, highPopulationSha256: batch.summary.highPopulationSha256 } };
  const count = (await pq('SELECT count(*)::int AS n FROM public.opportunity_assessor_enrichments WHERE import_batch_id=$1 AND superseded_at IS NULL', [batch.id])).rows[0]; equal(Number(count.n), 11316, 'ACTIVE_OBSERVATION_COUNT_STOP');
  const crosswalk = (await pq('SELECT crosswalk_status AS key,count(*)::int AS n FROM public.opportunity_assessor_enrichments WHERE import_batch_id=$1 AND superseded_at IS NULL GROUP BY crosswalk_status', [batch.id])).rows; equal(sortedObject(mapRows(crosswalk)), { MATCHED_EXACT: 11263, UNMATCHED: 53 }, 'CROSSWALK_COUNT_STOP');
  const geometry = (await pq('SELECT geometry_status AS key,count(*)::int AS n FROM public.opportunity_assessor_enrichments WHERE import_batch_id=$1 AND superseded_at IS NULL GROUP BY geometry_status', [batch.id])).rows; equal(sortedObject(mapRows(geometry)), { GEOMETRY_EXACT: 11263, NOT_APPLICABLE: 53 }, 'GEOMETRY_COUNT_STOP');
  const situs = (await pq('SELECT situs_status AS key,count(*)::int AS n FROM public.opportunity_assessor_enrichments WHERE import_batch_id=$1 AND superseded_at IS NULL GROUP BY situs_status', [batch.id])).rows; equal(sortedObject(mapRows(situs)), expectedSitus, 'POST_SITUS_STOP');
  const cats = (await pq("SELECT COALESCE(research_use_category,'NOT_APPLICABLE') AS key,count(*)::int AS n FROM public.opportunity_assessor_enrichments WHERE import_batch_id=$1 AND superseded_at IS NULL GROUP BY research_use_category", [batch.id])).rows; equal(sortedObject(mapRows(cats)), expectedCategories, 'POST_CATEGORY_STOP');
  const flags = (await pq("SELECT flag AS key,count(*)::int AS n FROM public.opportunity_assessor_enrichments e CROSS JOIN LATERAL jsonb_array_elements_text(e.review_flags) flag WHERE e.import_batch_id=$1 AND e.superseded_at IS NULL GROUP BY flag", [batch.id])).rows; equal(sortedObject(mapRows(flags)), expectedFlags, 'POST_REVIEW_FLAG_STOP');
  const high = (await pq(`SELECT count(*)::int AS total,count(*) FILTER (WHERE e.crosswalk_status='MATCHED_EXACT')::int AS exact,count(*) FILTER (WHERE e.crosswalk_status='UNMATCHED')::int AS unmatched,count(*) FILTER (WHERE e.situs_status='SITUS_PRESENT')::int AS situs,count(*) FILTER (WHERE e.research_use_category IN ('RESIDENTIAL_SINGLE_FAMILY','RESIDENTIAL_MULTI_FAMILY','MANUFACTURED_MOBILE'))::int AS residential,count(*) FILTER (WHERE e.research_use_category='RESIDENTIAL_SINGLE_FAMILY')::int AS single_family,count(*) FILTER (WHERE e.research_use_category='RESIDENTIAL_SINGLE_FAMILY' AND e.situs_status='SITUS_PRESENT')::int AS single_family_situs FROM public.opportunity_assessor_enrichments e JOIN public.opportunity_candidates c ON c.id=e.candidate_id WHERE e.import_batch_id=$1 AND e.superseded_at IS NULL AND c.priority_band='HIGH_REVIEW_PRIORITY'`, [batch.id])).rows[0];
  equal(Object.fromEntries(Object.entries(high).map(([k, v]) => [k, Number(v)])), { total: 312, exact: 309, unmatched: 3, situs: 258, residential: 118, single_family: 81, single_family_situs: 81 }, 'POST_HIGH_STOP');
  const sfMissing = (await pq("SELECT count(*)::int AS n FROM public.opportunity_assessor_enrichments e JOIN public.opportunity_candidates c ON c.id=e.candidate_id WHERE e.import_batch_id=$1 AND e.research_use_category='RESIDENTIAL_SINGLE_FAMILY' AND c.priority_band='HIGH_REVIEW_PRIORITY' AND e.situs_status<>'SITUS_PRESENT'", [batch.id])).rows[0]; equal(Number(sfMissing.n), 0, 'HIGH_SF_SITUS_STOP');
  const statusAfter = (await pq(`SELECT c.atn,c.screening_score,c.priority_band,c.score_version,c.candidate_status,c.identity_status FROM public.opportunity_candidates c WHERE EXISTS (SELECT 1 FROM public.opportunity_record_links l JOIN public.discovery_records r ON r.id=l.discovery_record_id WHERE l.candidate_id=c.id AND r.discovery_source_id=$1) ORDER BY c.atn`, [source.id])).rows; equal(digest(JSON.stringify(statusAfter)), 'fc883cf777b35b966d5fdd84d44d2005739e200fea0a19e0497641e50a7a0a17', 'POST_SCORE_STATUS_STOP');
  const forbidden = (await pq("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) AND (column_name ~* '(owner|contact|assessee|billing|care|dba|polygon|filegdb|raw_geometry)' OR data_type IN ('USER-DEFINED'))", [enrichmentTables])).rows; equal(forbidden, [], 'SAFE_FIELD_STOP');
  const statusCounts = (await pq('SELECT base_year_status AS key,count(*)::int AS n FROM public.opportunity_assessor_enrichments WHERE import_batch_id=$1 GROUP BY base_year_status', [batch.id])).rows; const expectedBase = {}; for (const r of plan.rows) expectedBase[r.base_year_status] = (expectedBase[r.base_year_status] ?? 0) + 1; equal(sortedObject(mapRows(statusCounts)), expectedBase, 'BASE_YEAR_STATE_STOP');
  const acresCounts = (await pq('SELECT county_acres_status AS key,count(*)::int AS n FROM public.opportunity_assessor_enrichments WHERE import_batch_id=$1 GROUP BY county_acres_status', [batch.id])).rows; const expectedAcres = {}; for (const r of plan.rows) expectedAcres[r.county_acres_status] = (expectedAcres[r.county_acres_status] ?? 0) + 1; equal(sortedObject(mapRows(acresCounts)), expectedAcres, 'ACRES_STATE_STOP');
  result.postCounts = { observations: 11316, crosswalk: { MATCHED_EXACT: 11263, UNMATCHED: 53 }, geometry: { GEOMETRY_EXACT: 11263, NOT_APPLICABLE: 53 }, situs: expectedSitus, categories: expectedCategories, reviewFlags: expectedFlags, high: { total: 312, exact: 309, unmatched: 3, situs: 258, residential: 118, singleFamily: 81, singleFamilySitus: 81 }, highSingleFamilyWithoutCountySitus: 0 };
  result.scoreStatusUnchanged = true; result.safeInventory = { forbiddenColumns: 0, rawPolygons: 0, ownerContactData: 0, countyAssessmentStates: { baseYear: expectedBase, countyAcres: expectedAcres } };
  const existingAfter = await existingFingerprint(pq, cert.existingTables); equal(existingAfter, cert.existingAfterMigration, 'EXISTING_APPLICATION_CHANGED_STOP'); result.existingAfter = existingAfter; result.existingDataUnchanged = true;
  await pq('ROLLBACK'); await closeFresh(postDb, postClient);

  stage = 'IDEMPOTENT_REPLAY';
  const replayDb = createDatabase(); if (!replayDb) throw new Error('DATABASE_NOT_CONFIGURED'); result.databaseConnections++;
  const replay = await applyAssessorPlan(replayDb, plan, { productionAuthorized: true }); await replayDb.close();
  assert.equal(replay.replay, true); equal(replay.inserts, 0, 'REPLAY_INSERT_STOP'); equal(replay.supersessions, 0, 'REPLAY_SUPERSESSION_STOP'); equal(replay.rejections, 0, 'REPLAY_REJECTION_STOP'); result.replay = replay;
  result.batchCountAfterReplay = 1; result.observationCountAfterReplay = 11316;
  result.providerAccounting = { rentCastCalls: 0, googleCalls: 0, countyNetworkCalls: 0, supabaseDatabaseTraffic: 'recorded_query_calls_not_zero', databaseQueryCalls: result.databaseQueryCalls };
  result.status = 'PASS'; result.stage = 'GATE_13_IMPORT_COMPLETE_STOP'; result.nextAction = 'STOP_NO_PREVIEW_OR_DEPLOYMENT';
} catch (e) {
  result.stage = stage; result.status = 'STOP'; result.error = /^[A-Z0-9_]+$/.test(e.message ?? '') ? e.message : 'SANITIZED_PRODUCTION_IMPORT_FAILURE'; result.sqlState = /^[0-9A-Z]{5}$/.test(e.code ?? '') ? e.code : null;
  if (inTransaction) { try { await q('ROLLBACK'); } catch {} result.failureRollback = true; }
  process.exitCode = 1;
} finally { try { client?.release(); } catch {} try { await db?.close(); } catch {} }
await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, stage: result.stage, error: result.error, batch: result.batch, postCounts: result.postCounts, replay: result.replay, providerAccounting: result.providerAccounting, databaseConnections: result.databaseConnections, databaseQueryCalls: result.databaseQueryCalls }, null, 2));
