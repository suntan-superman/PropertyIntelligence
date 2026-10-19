import {test,before,beforeEach,afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {localConfig,preflight,prepareSchema,testDatabase,inventory,quote,root,network,requireThat} from './local-postgres.js';
import {postgresFixture,runPostgresSequence,seedThroughRepositories} from './postgres-fixtures.js';
import {digest,TEST_NOW} from './fixture.js';
import {insertOrReuseProperty,archiveProperty} from '../../src/persistence/propertiesRepository.js';
import {saveAddressResolution} from '../../src/persistence/addressResolutionRepository.js';
import {createOpportunityPropertyLink} from '../../src/persistence/opportunityPropertyLinkRepository.js';
import {insertEvidenceSnapshot} from '../../src/persistence/evidenceRepository.js';
import {addressKey} from '../../src/sources/rentcast/propertyLookup.js';
import {persistSyntheticSequence} from './sequence.js';
requireThat(process.env.PI_IDENTITY_V2_TEST==='LOCAL_SYNTHETIC_ONLY','EXPLICIT_LOCAL_CERTIFICATION_ENTRY_REQUIRED');
const runId=randomUUID().replaceAll('-',''),schema=`qa_sprint6_3_${runId}`,dir=`${root}/v2-${runId}`,marker=`PI_DURABLE_IDENTITY_V2:${runId}`;
let db,adapter,setupClient,config,first,concurrent,inputs,pre,initialInventory,otherSchemaState;
const report={mode:'ACTUAL_LOCAL_POSTGRESQL',status:'STARTED',schema,runAt:new Date().toISOString(),node:process.version,tests:[],sqlSnapshots:0,productionConnections:0,productionWrites:0,realPropertiesCreated:0,providerCalls:0,mlsAccess:0,roundOneSelected:0};
async function record(name,fn){try{await fn();report.tests.push({name,result:'PASS'});}catch(e){report.tests.push({name,result:'FAIL',code:e.code??'ASSERTION_OR_GUARD_FAILURE'});throw e;}}
function it(name,fn){test(name,()=>record(name,fn));}
async function snapshot(){return adapter.read(async c=>{
  report.sqlSnapshots++;
  const names=(await c.query("SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename",[schema])).rows.map(r=>r.tablename),out={};
  for(const name of names){requireThat(/^[a-z_]+$/.test(name),'TABLE_NAME_GUARD');out[name]=(await c.query(`SELECT count(*)::int AS count,md5(COALESCE(string_agg(h,'' ORDER BY h),'')) AS fingerprint FROM (SELECT md5(row_to_json(t)::text) AS h FROM ${quote(schema)}."${name}" t) x`)).rows[0];}
  return out;
});}
async function protectedSchemas(c){
  const result={};for(const s of initialInventory.schemas.filter(s=>s.name!=='public')){
    result[s.name]={};for(const o of initialInventory.objects.filter(o=>o.schema===s.name&&o.kind==='r')){
      requireThat(/^[a-z_]+$/.test(o.name),'TABLE_NAME_GUARD');result[s.name][o.name]=(await c.query(`SELECT count(*)::int AS count,md5(COALESCE(string_agg(h,'' ORDER BY h),'')) AS fingerprint FROM (SELECT md5(row_to_json(t)::text) AS h FROM ${quote(s.name)}."${o.name}" t) x`)).rows[0];
    }
  }return result;
}
async function rejected(work,error){const a=await snapshot();await assert.rejects(work,error);assert.deepEqual(await snapshot(),a);}
const propertyInput=(f,overrides={})=>({normalizedAddress:addressKey(`${f.packet.address.street}, ${f.packet.address.city}, CA 99999`),addressLine1:f.packet.address.street,city:f.packet.address.city,state:'CA',postalCode:'99999',county:f.packet.county.jurisdiction,atn:f.packet.county.atn,apn:f.packet.county.apn9,identityStatus:'UNCONFIRMED',...overrides});
const localSequence=(f,options)=>runPostgresSequence(db,f,options);
before(async()=>{
  await mkdir(dir,{recursive:true});config=await localConfig();pre=await preflight(config);setupClient=pre.client;initialInventory=pre.before;
  otherSchemaState=await protectedSchemas(setupClient);
  report.isolation={identity:pre.identity,role:pre.role,otherSessions:pre.otherSessions,priorSchemas:pre.before.schemas.map(s=>s.name),priorObjectCount:pre.before.objects.length};
  // Records exactly which schema this invocation owns before any DDL.
  await writeFile(`${dir}/ownership.json`,JSON.stringify({schema,marker,syntheticOnly:true},null,2)+'\n',{flag:'wx'});
  inputs=await prepareSchema(setupClient,schema,marker);report.migrations=inputs;
  await setupClient.end();setupClient=null;report.perTestIsolationGates=0;
});
beforeEach(async()=>{const gate=await preflight(config);try{assert.ok(gate.before.schemas.some(s=>s.name===schema&&s.marker===marker));report.perTestIsolationGates++;}finally{await gate.client.end();}adapter=testDatabase(config,schema);db=adapter.db;});
afterEach(async()=>{await adapter?.close();adapter=null;db=null;});

it('unchanged migrations initialize exact schema, restrictive FKs, active uniqueness and RLS',async()=>{
  await adapter.read(async c=>{
    assert.deepEqual((await c.query('SELECT filename,checksum FROM property_intelligence_schema_migrations ORDER BY filename')).rows,inputs);
    const foreign=(await c.query("SELECT c.conname,c.confdeltype,n.nspname AS referenced_schema FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_class other ON other.oid=c.confrelid JOIN pg_namespace n ON n.oid=other.relnamespace WHERE t.relnamespace=$1::regnamespace AND c.contype='f'",[schema])).rows;
    assert.ok(foreign.length>0);assert.ok(foreign.every(f=>f.referenced_schema===schema&&f.confdeltype==='r'));
    const indexes=(await c.query('SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=$1',[schema])).rows;
    for(const name of ['candidate_address_resolutions_active_candidate_idx','opportunity_property_links_active_candidate_idx','opportunity_property_links_active_property_idx','opportunity_property_links_idempotency_idx'])assert.ok(indexes.some(i=>i.indexname===name&&/UNIQUE/.test(i.indexdef)));
    const rls=(await c.query("SELECT relname,relrowsecurity FROM pg_class WHERE relnamespace=$1::regnamespace AND relname IN ('candidate_address_resolutions','opportunity_assessor_enrichments','opportunity_assessor_import_batches','opportunity_property_links')",[schema])).rows;
    assert.equal(rls.length,4);assert.ok(rls.every(t=>t.relrowsecurity));
    const grants=(await c.query("SELECT count(*)::int AS n FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE c.relnamespace=$1::regnamespace AND c.relname IN ('candidate_address_resolutions','opportunity_assessor_enrichments','opportunity_assessor_import_batches','opportunity_property_links') AND (a.grantee=0 OR r.rolname IN ('anon','authenticated'))",[schema])).rows[0].n;assert.equal(grants,0);
    report.schemaChecks={foreignKeys:foreign.length,allFkTargetsLocal:true,allRestrictive:true,activeUniqueIndexes:true,rlsTables:4,publicApiGrants:0};
  });
});
it('approved synthetic workflow commits source, Opportunity, canonical, Property, evidence and lineage',async()=>{
  first=await localSequence(postgresFixture(1));const s=await snapshot();
  for(const t of ['properties','opportunity_candidates','candidate_address_resolutions','opportunity_property_links','evidence_snapshots','opportunity_assessor_enrichments'])assert.equal(s[t].count,1);
  await adapter.read(async c=>{
    const r=(await c.query('SELECT c.atn,c.apn,c.candidate_status,c.priority_band,c.screening_score,p.identity_status,a.analyst_confirmed,l.origin,l.link_method,l.link_status,e.provenance_payload FROM opportunity_candidates c JOIN opportunity_property_links l ON l.candidate_id=c.id JOIN properties p ON p.id=l.property_id JOIN candidate_address_resolutions a ON a.id=l.address_resolution_id JOIN evidence_snapshots e ON e.property_id=p.id WHERE c.id=$1',[first.candidateId])).rows[0];
    assert.equal(r.atn,first.fixture.packet.county.atn);assert.equal(r.apn,first.fixture.packet.county.apn9);assert.equal(r.candidate_status,'NEEDS_ADDRESS');assert.equal(r.priority_band,'INSUFFICIENT_DATA');assert.equal(r.screening_score,null);assert.equal(r.identity_status,'UNCONFIRMED');assert.equal(r.analyst_confirmed,true);assert.equal(r.link_status,'ACTIVE');assert.equal(r.origin,'OPPORTUNITY_ANALYSIS_WORKFLOW');assert.equal(r.link_method,'EXPLICIT_WORKFLOW_CONTEXT');assert.equal(r.provenance_payload.evidenceSha256,digest(first.fixture.evidence));
  });report.afterFirst=s;
});
it('second committed execution has stable identities and zero additional records',async()=>{
  const before=await snapshot(),second=await localSequence(postgresFixture(1)),after=await snapshot();assert.equal(second.idempotentReplay,true);
  for(const k of ['propertyId','candidateId','canonicalResolutionId','linkId','evidenceSnapshotId','assessorId'])assert.equal(second[k],first[k]);
  for(const t of Object.keys(before)){assert.equal(after[t].count,before[t].count);if(t!=='opportunity_candidates')assert.equal(after[t].fingerprint,before[t].fingerprint);}
  report.replay={stableIdentities:true,additionalRows:0,unchangedHistoricalTables:true,candidateLastSeenMayAdvance:true};
});
it('eight simultaneous new requests on actual PostgreSQL connections create one identity',async()=>{
  const results=await Promise.all(Array.from({length:8},()=>localSequence(postgresFixture(2))));concurrent=results[0];
  assert.equal(new Set(results.map(r=>r.propertyId)).size,1);assert.equal(new Set(results.map(r=>r.candidateId)).size,1);assert.equal(results.filter(r=>r.idempotentReplay).length,7);assert.ok(adapter.backendIds.size>=2);
  const s=await snapshot();for(const t of ['properties','opportunity_candidates','candidate_address_resolutions','opportunity_property_links'])assert.equal(s[t].count,2);
  report.concurrency={requests:8,writerBackendCount:adapter.backendIds.size,distinctProperties:1,distinctCandidates:1,replays:7};
});
it('missing approval rejects without partial records',async()=>{const f=postgresFixture(3);f.approval=null;await rejected(()=>localSequence(f),/ANALYST_APPROVAL_REQUIRED/);});
it('stale or expired approval rejects without partial records',async()=>{for(const stale of [true,false]){const f=postgresFixture(4);if(stale)f.approval.packetSha256='0'.repeat(64);else f.approval.expiresAt='2020-01-01';await rejected(()=>localSequence(f),/APPROVAL_PACKET_BINDING_MISMATCH|ANALYST_APPROVAL_EXPIRED_OR_INVALID/);}});
it('conflicting county identity cannot reuse same-address Property',async()=>{await rejected(()=>localSequence(postgresFixture(5),{beforePersistence:(tx,f)=>insertOrReuseProperty(tx,propertyInput(f,{atn:'90099999999'}))}),/PROPERTY_COUNTY_IDENTITY_CONFLICT/);});
it('conflicting active canonical address rolls back the whole transaction',async()=>{await rejected(()=>localSequence(postgresFixture(6),{beforePersistence:(tx,f)=>saveAddressResolution({db:{transaction:work=>work(tx)},candidateId:f.packet.candidateId,input:{...f.packet.address,street:'999 Synthetic Conflict Lane',analystConfirmed:true,countyEnrichmentId:f.packet.assessor.id}})}),/ADDRESS_ACTIVE_EXISTS/);});
it('duplicate Property repository insertion returns existing physical row',async()=>{
  await rejected(()=>db.transaction(async tx=>{const a=await insertOrReuseProperty(tx,propertyInput(first.fixture)),b=await insertOrReuseProperty(tx,propertyInput(first.fixture));assert.equal(a.id,first.propertyId);assert.equal(b.id,a.id);throw new Error('EXPECTED_TEST_ROLLBACK');}),/EXPECTED_TEST_ROLLBACK/);
});
it('inactive existing Property is rejected and archive change rolls back',async()=>{await rejected(()=>localSequence(postgresFixture(1),{beforePersistence:tx=>archiveProperty(tx,first.propertyId,true)}),/PROPERTY_INACTIVE/);});
it('wrong-property evidence binding rejects despite synthetic reapproval',async()=>{const f=postgresFixture(7);f.evidence[3].candidateId=randomUUID();f.approval.evidenceSha256=digest(f.evidence);await rejected(()=>localSequence(f),/EVIDENCE_PROPERTY_BINDING_MISMATCH/);});
it('expired provider evidence rejects despite synthetic reapproval',async()=>{const f=postgresFixture(8);f.evidence[3].expiresAt='2020-01-01';f.approval.evidenceSha256=digest(f.evidence);await rejected(()=>localSequence(f),/EVIDENCE_EXPIRED_OR_UNAVAILABLE/);});
it('Google and restricted shared-use evidence reject despite approval',async()=>{for(const google of [true,false]){const f=postgresFixture(9);if(google)f.evidence[3].sourceSystem='GOOGLE_GEOCODING';else f.evidence[3].sharedCanonicalAllowed=false;f.approval.evidenceSha256=digest(f.evidence);await rejected(()=>localSequence(f),/TEMPORARY_PROVIDER_EVIDENCE_FORBIDDEN|SHARED_CANONICAL_USE_NOT_AUTHORIZED/);}});
it('injected linkage failure rolls back actual candidate, source, canonical and Property inserts',async()=>{await rejected(()=>localSequence(postgresFixture(10),{txQuery:(tx,sql,v)=>{if(sql.includes('INSERT INTO opportunity_property_links'))throw new Error('SYNTHETIC_LINKAGE_FAILURE');return tx.query(sql,v);}}),/SYNTHETIC_LINKAGE_FAILURE/);});
it('PostgreSQL error after linkage insertion rolls back all partial records',async()=>{await rejected(()=>localSequence(postgresFixture(11),{txQuery:(tx,sql,v)=>sql.includes('INSERT INTO evidence_snapshots')?tx.query('SELECT 1/0'):tx.query(sql,v)}),{code:'22012'});});
it('readback failure rolls back all inserts including lineage and evidence',async()=>{await rejected(()=>localSequence(postgresFixture(12),{txQuery:(tx,sql,v)=>sql.includes('FROM evidence_snapshots WHERE id = $1')?Promise.resolve({rows:[]}):tx.query(sql,v)}),/RETRIEVAL_EVIDENCE_CONFLICT/);});
it('real foreign key rejects evidence for a nonexistent Property',async()=>{await rejected(()=>db.transaction(tx=>insertEvidenceSnapshot(tx,{propertyId:randomUUID(),source:'SYNTHETIC',retrievedAt:new Date(TEST_NOW).toISOString(),snapshotType:'IDENTITY_ONLY',status:'SYNTHETIC_QA'})),{code:'23503'});});
it('same candidate cannot be linked to a different Property',async()=>{await rejected(()=>db.transaction(tx=>createOpportunityPropertyLink(tx,{candidateId:first.candidateId,propertyId:concurrent.propertyId})),/OPPORTUNITY_PROPERTY_CONFLICT/);});
it('another candidate cannot link to the existing Property',async()=>{await rejected(()=>db.transaction(async tx=>{const f=await seedThroughRepositories(tx,postgresFixture(13));await createOpportunityPropertyLink(tx,{candidateId:f.packet.candidateId,propertyId:first.propertyId});}),/OPPORTUNITY_PROPERTY_CONFLICT/);});
it('database history guards reject link and canonical mutation',async()=>{
  for(const [sql,id,pattern]of [
    ["UPDATE opportunity_property_links SET created_by_context='SYNTHETIC_ILLEGAL_CHANGE' WHERE id=$1",first.linkId,/OPPORTUNITY_PROPERTY_LINK_IMMUTABLE/],
    ["UPDATE candidate_address_resolutions SET city='SYNTHETIC_ILLEGAL_CHANGE' WHERE id=$1",first.canonicalResolutionId,/ADDRESS_RESOLUTION_HISTORY_IMMUTABLE/]
  ])await rejected(()=>db.transaction(tx=>tx.query(sql,[id])),pattern);
});
it('real unique index rejects a duplicate normalized address',async()=>{
  // Negative constraint probe only, not the positive persistence workflow.
  await rejected(()=>db.transaction(tx=>tx.query('UPDATE properties SET normalized_address=(SELECT normalized_address FROM properties WHERE id=$1) WHERE id=$2',[first.propertyId,concurrent.propertyId])),{code:'23505'});
});
it('read-only SQL proves no orphans, exact relationships and two active links',async()=>{
  await adapter.read(async c=>{
    const r=(await c.query("SELECT count(*)::int AS links,count(DISTINCT l.candidate_id)::int AS candidates,count(DISTINCT l.property_id)::int AS properties,count(*) FILTER (WHERE c.id IS NULL OR p.id IS NULL OR a.id IS NULL OR e.id IS NULL OR a.candidate_id<>c.id OR e.candidate_id<>c.id OR a.county_enrichment_id<>e.id OR c.atn<>p.atn OR c.apn<>p.apn OR p.atn<>e.pts_atn_normalized OR p.apn<>e.apn9)::int AS broken FROM opportunity_property_links l LEFT JOIN opportunity_candidates c ON c.id=l.candidate_id LEFT JOIN properties p ON p.id=l.property_id LEFT JOIN candidate_address_resolutions a ON a.id=l.address_resolution_id LEFT JOIN opportunity_assessor_enrichments e ON e.id=l.assessor_enrichment_id WHERE l.link_status='ACTIVE'")).rows[0];
    assert.deepEqual(r,{links:2,candidates:2,properties:2,broken:0});
    const counts=(await c.query('SELECT (SELECT count(*) FROM properties)::int AS properties,(SELECT count(*) FROM opportunity_candidates)::int AS opportunities,(SELECT count(*) FROM candidate_address_resolutions)::int AS canonical,(SELECT count(*) FROM opportunity_property_links)::int AS links,(SELECT count(*) FROM evidence_snapshots)::int AS evidence,(SELECT count(*) FROM deals)::int AS deals')).rows[0];assert.deepEqual(counts,{properties:2,opportunities:2,canonical:2,links:2,evidence:2,deals:0});
    report.independentSql={...counts,brokenRelationships:0,readOnly:true,separateConnection:true};
  });
  report.finalSnapshot=await snapshot();
});
after(async()=>{
  try{
    if(adapter)await adapter.close();report.finalNetwork=network;assert.equal(network.blockedAttempts,0);
    if(config&&initialInventory){const finalGate=await preflight(config);setupClient=finalGate.client;}
    if(setupClient&&initialInventory){
      const final=await inventory(setupClient);assert.deepEqual({...final,schemas:final.schemas.filter(s=>s.name!==schema),objects:final.objects.filter(s=>s.schema!==schema),routines:final.routines.filter(s=>s.schema!==schema)},initialInventory);
      assert.deepEqual(await protectedSchemas(setupClient),otherSchemaState);report.unrelatedSchemaPreservation='PASS';
    }
    report.status=report.tests.length===22&&report.tests.every(t=>t.result==='PASS')?'ISOLATED POSTGRESQL CERTIFIED':'MORE DEVELOPMENT REQUIRED';
    report.cleanup='FAILED TRANSACTIONS ROLLED BACK; TEST-OWNED SCHEMA AND TWO SYNTHETIC IDENTITIES RETAINED; NO DROP OR TRUNCATE';
    report.sourceHashes={};
    const files=[...(await readdir('scripts/durable-identity-pilot')).filter(n=>n.endsWith('.js')).map(n=>`scripts/durable-identity-pilot/${n}`),...['db','addressResolutionRepository','propertiesRepository','opportunityRepository','opportunityPropertyLinkRepository','assessorImport','assessorOpportunityRepository','evidenceRepository'].map(n=>`src/persistence/${n}.js`)];
    for(const file of files)report.sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
  }finally{
    await setupClient?.end();report.completedAt=new Date().toISOString();await writeFile(`${dir}/certification.json`,JSON.stringify(report,null,2)+'\n');console.log(`LOCAL_CERTIFICATION_ARTIFACT=${dir}/certification.json`);
  }
});
