import {test,before,beforeEach,afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {localConfig,preflight,prepareSchema,testDatabase,inventory,quote,root,network,requireThat} from './local-postgres.js';
import {v3Fixture} from './v3-fixtures.js';
import {createTrustedReviewGate} from './trusted-review.js';
import {persistTrustedReview} from './trusted-persistence.js';
import {digest} from './fixture.js';
import {insertOrReuseProperty,archiveProperty} from '../../src/persistence/propertiesRepository.js';
import {saveAddressResolution} from '../../src/persistence/addressResolutionRepository.js';
import {addressKey} from '../../src/sources/rentcast/propertyLookup.js';
requireThat(process.env.PI_IDENTITY_V3_TEST==='LOCAL_SYNTHETIC_ONLY','EXPLICIT_LOCAL_CERTIFICATION_ENTRY_REQUIRED');
const id=randomUUID().replaceAll('-',''),schema=`qa_sprint6_3_${id}`,dir=`${root}/v3-${id}`,marker=`PI_DURABLE_IDENTITY_V3:${id}`;
let config,adapter,db,initialInventory,priorState,first,firstFixture,firstGate;
const report={mode:'V3_ACTUAL_LOCAL_POSTGRESQL',status:'STARTED',schema,node:process.version,runAt:new Date().toISOString(),tests:[],isolationGates:0,sqlSnapshots:0,productionConnections:0,productionWrites:0,realPropertiesCreated:0,providerCalls:0,mlsAccess:0,roundOneSelected:0};
async function fingerprint(c,s){const out={};for(const {tablename:n}of(await c.query('SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename',[s])).rows){requireThat(/^[a-z_]+$/.test(n),'TABLE_NAME_GUARD');out[n]=(await c.query(`SELECT count(*)::int AS count,md5(COALESCE(string_agg(h,'' ORDER BY h),'')) AS fingerprint FROM (SELECT md5(row_to_json(t)::text) AS h FROM ${quote(s)}."${n}" t) x`)).rows[0];}return out;}
async function protectedState(c){const out={};for(const s of initialInventory.schemas.filter(s=>s.name!=='public'))out[s.name]=await fingerprint(c,s.name);return out;}
const snapshot=()=>adapter.read(async c=>{assert.equal((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'on');report.sqlSnapshots++;return fingerprint(c,schema);});
async function rejects(work,pattern){const initial=await snapshot();await assert.rejects(work,pattern);assert.deepEqual(await snapshot(),initial);}
const persist=(f,gate=f.gate(),testHooks={})=>persistTrustedReview({db,decisions:gate,request:f.currentRequest(),testHooks});
function it(name,fn){test(name,{timeout:60000},async()=>{try{await fn();report.tests.push({name,result:'PASS'});}catch(e){report.tests.push({name,result:'FAIL',code:e.code??'ASSERTION_OR_GUARD_FAILURE'});throw e;}});}
before(async()=>{
  await mkdir(dir,{recursive:true});config=await localConfig();const p=await preflight(config);
  try{initialInventory=p.before;await p.client.query('BEGIN READ ONLY');priorState=await protectedState(p.client);await p.client.query('ROLLBACK');report.isolation={identity:p.identity,role:p.role,otherSessions:p.otherSessions};await writeFile(`${dir}/ownership.json`,JSON.stringify({schema,marker,syntheticOnly:true},null,2)+'\n',{flag:'wx'});report.migrations=await prepareSchema(p.client,schema,marker);}finally{await p.client.end();}
});
beforeEach(async()=>{const p=await preflight(config);try{assert.ok(p.before.schemas.some(s=>s.name===schema&&s.marker===marker));report.isolationGates++;}finally{await p.client.end();}adapter=testDatabase(config,schema);db=adapter.db;});
afterEach(async()=>{await adapter?.close();adapter=null;db=null;});
it('trusted review commits exact canonical Property Opportunity evidence and audit',async()=>{
  firstFixture=await v3Fixture(401);firstGate=firstFixture.gate();first=await persist(firstFixture,firstGate);const s=await snapshot();
  for(const t of ['properties','opportunity_candidates','candidate_address_resolutions','opportunity_property_links','evidence_snapshots','opportunity_assessor_enrichments'])assert.equal(s[t].count,1);
  await adapter.read(async c=>{const e=(await c.query('SELECT provenance_payload FROM evidence_snapshots WHERE id=$1',[first.evidenceSnapshotId])).rows[0];assert.equal(e.provenance_payload.trustedAuthorization.decisionSha256,firstFixture.request.decisionRevision);assert.equal(e.provenance_payload.trustedAuthorization.attestationSource,'ANALYST_ATTESTATION');const a=(await c.query("SELECT event_payload FROM audit_events WHERE aggregate_id=$1 AND event_type='SYNTHETIC_IDENTITY_LINKED'",[first.propertyId])).rows[0];assert.equal(a.event_payload.trustedAuthorization.identitySha256,e.provenance_payload.trustedAuthorization.identitySha256);});
  report.firstCommit={properties:1,canonical:1,opportunities:1,links:1,evidence:1,trustedProvenanceInEvidenceAndAudit:true};
});
it('sequential replay revalidates trusted proof with stable IDs and no additional records',async()=>{
  const a=await snapshot(),b=await persist(firstFixture,firstGate),z=await snapshot();assert.equal(b.idempotentReplay,true);
  for(const k of ['propertyId','candidateId','canonicalResolutionId','linkId','evidenceSnapshotId','assessorId'])assert.equal(b[k],first[k]);
  for(const t of Object.keys(a)){assert.equal(z[t].count,a[t].count);if(t!=='opportunity_candidates')assert.equal(z[t].fingerprint,a[t].fingerprint);}
  report.replay={additionalRows:0,stableIds:true,currentAuthorityChecked:true,candidateLastSeenMayAdvance:true};
});
it('eight simultaneous fresh trusted requests commit exactly one identity',async()=>{
  const f=await v3Fixture(402),gate=f.gate();await gate.resolve(f.request);const initial=await snapshot();
  const results=await Promise.all(Array.from({length:8},()=>persist(f,gate)));
  for(const k of ['propertyId','candidateId','canonicalResolutionId','linkId','evidenceSnapshotId','assessorId'])assert.equal(new Set(results.map(r=>r[k])).size,1);
  assert.equal(results.filter(r=>r.idempotentReplay).length,7);assert.equal(adapter.backendIds.size,8);
  const end=await snapshot();for(const t of ['properties','opportunity_candidates','candidate_address_resolutions','opportunity_property_links','evidence_snapshots'])assert.equal(end[t].count-initial[t].count,1);
  report.concurrency={requests:8,writerBackends:adapter.backendIds.size,newProperties:1,newCanonical:1,newOpportunities:1,newLinks:1,newEvidence:1,replays:7,stableIds:true};
});
it('two approved conflicting-address requests permit only one committed outcome',async()=>{
  const key=randomBytes(32),a=await v3Fixture(403,{key}),b=await v3Fixture(403,{key,variant:'b'}),gate=createTrustedReviewGate({records:[a.record,b.record],key,authorizedReviewers:['Synthetic Reviewer'],clock:()=>Math.max(a.clock.now,b.clock.now)}),initial=await snapshot();
  const result=await Promise.allSettled([persist(a,gate),persist(b,gate)]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);const failure=result.find(r=>r.status==='rejected');assert.match(failure.reason.message,/ASSESSOR_REPLAY_CONFLICT|PROPERTY_COUNTY_IDENTITY_CONFLICT|RETRIEVAL_AUTHORIZATION_CONFLICT/);
  const end=await snapshot();for(const t of ['properties','opportunity_candidates','candidate_address_resolutions','opportunity_property_links','evidence_snapshots'])assert.equal(end[t].count-initial[t].count,1);
  report.conflictingConcurrency={requests:2,committed:1,rejected:1,newProperties:1,rejection:failure.reason.message};
});
it('replay with revoked permission fails despite existing idempotency record',async()=>{await firstFixture.edit('permissions',p=>p[3].status='REVOKED');await rejects(()=>persist(firstFixture,firstGate),/EVIDENCE_REVOKED_OR_UNAVAILABLE/);});
it('restored but changed authority does not silently reuse stale persisted proof',async()=>{await firstFixture.edit('permissions',p=>p[3].status='ACTIVE');await rejects(()=>persist(firstFixture,firstGate),/RETRIEVAL_AUTHORIZATION_CONFLICT/);});
it('expired current approval rejects replay',async()=>{await firstFixture.edit('authority',a=>a.expiresAt='2020-01-01');await rejects(()=>persist(firstFixture,firstGate),/APPROVAL_EXPIRED/);});
it('Google-only ZIP and expired Google evidence fail without writes',async()=>{for(const expired of [false,true]){const f=await v3Fixture(expired?405:404);await f.edit('evidence',e=>{e[3].sourceType='GOOGLE_TEMPORARY_SUGGESTION';if(expired)e[3].expiresAt='2020-01-01';});await rejects(()=>persist(f),/GOOGLE_DURABLE_USE_FORBIDDEN/);}});
it('wrong-property and superseded approvals fail without writes',async()=>{const f=await v3Fixture(406);await f.edit('authority',a=>a.binding.apn9='900999999');await rejects(()=>persist(f),/APPROVAL_PROPERTY_BINDING_MISMATCH/);const g=await v3Fixture(407);await g.edit('decision',d=>d.notes+=' Superseded synthetic review.');await rejects(()=>persistTrustedReview({db,decisions:g.gate(),request:g.request}),/DECISION_SUPERSEDED_OR_STALE/);});
it('unverified state and missing ZIP fail without writes',async()=>{for(const field of ['state','postalCode']){const f=await v3Fixture(field==='state'?408:409);await f.edit('decision',d=>{if(field==='state')d.componentVerification.state='UNVERIFIED';else d.confirmedAddress.postalCode='';});await rejects(()=>persist(f),/REVIEW_COMPONENT_OR_IDENTITY_INVALID/);}});
it('conflicting Assessor relationship rolls back newly seeded source rows',async()=>{const f=await v3Fixture(410);await rejects(()=>persist(f,f.gate(),{beforePersistence:async(tx,input)=>{input.packet.assessor.id=first.assessorId;input.packetSha256=digest(input.packet);for(const e of input.evidence)e.packetSha256=input.packetSha256;input.approval.packetSha256=input.packetSha256;input.approval.evidenceSha256=digest(input.evidence);}}),/ASSESSOR_COUNTY_IDENTITY_CONFLICT/);});
it('conflicting active canonical identity rolls back new source and candidate',async()=>{const f=await v3Fixture(411);await rejects(()=>persist(f,f.gate(),{beforePersistence:(tx,input)=>saveAddressResolution({db:{transaction:work=>work(tx)},candidateId:input.packet.candidateId,input:{...input.packet.address,street:'999 Synthetic Conflict Lane',analystConfirmed:true,countyEnrichmentId:input.packet.assessor.id}})}),/ADDRESS_ACTIVE_EXISTS/);});
it('same-address different county identity is not merged',async()=>{const f=await v3Fixture(412);await rejects(()=>persist(f,f.gate(),{beforePersistence:(tx,input)=>insertOrReuseProperty(tx,{normalizedAddress:addressKey(`${input.packet.address.street}, ${input.packet.address.city}, CA 99999`),addressLine1:input.packet.address.street,city:input.packet.address.city,state:'CA',postalCode:'99999',county:input.packet.county.jurisdiction,atn:'90099999999',apn:input.packet.county.apn9})}),/PROPERTY_COUNTY_IDENTITY_CONFLICT/);});
it('archived durable Property is never revived by replay',async()=>{const f=await v3Fixture(413),gate=f.gate(),saved=await persist(f,gate);await rejects(()=>persist(f,gate,{beforePersistence:tx=>archiveProperty(tx,saved.propertyId,true)}),/PROPERTY_INACTIVE/);});
it('revocation immediately before commit rolls back every inserted row',async()=>{const f=await v3Fixture(414);await rejects(()=>persist(f,f.gate(),{beforeCommit:()=>f.edit('permissions',p=>p[3].status='REVOKED')}),/EVIDENCE_REVOKED_OR_UNAVAILABLE/);});
it('decision superseded during transaction rolls back every inserted row',async()=>{const f=await v3Fixture(415);await rejects(()=>persist(f,f.gate(),{beforeCommit:()=>f.edit('decision',d=>d.notes+=' New decision before commit.')}),/DECISION_SUPERSEDED_OR_STALE/);});
it('database error after lineage insertion rolls back actual SQL writes',async()=>{const f=await v3Fixture(416);await rejects(()=>persist(f,f.gate(),{txQuery:(tx,sql,v)=>sql.includes('INSERT INTO evidence_snapshots')?tx.query('SELECT 1/0'):tx.query(sql,v)}),{code:'22012'});});
it('stale cached Property ID cannot bypass current relationship validation',async()=>{const f=await v3Fixture(417),gate=f.gate(),saved=await persist(f,gate);await rejects(()=>persist(f,gate,{beforePersistence:tx=>tx.query("UPDATE idempotency_keys SET response_payload=jsonb_set(response_payload,'{propertyId}',to_jsonb($1::text)) WHERE operation='SYNTHETIC_DURABLE_IDENTITY_V1' AND response_payload->>'propertyId'=$2",[randomUUID(),saved.propertyId])}),/RETRIEVAL_PROPERTY_CONFLICT/);});
it('read-only independent SQL validates no orphan duplicate partial or non-synthetic records',async()=>{
  await adapter.read(async c=>{
    assert.equal((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'on');
    const r=(await c.query("SELECT count(*)::int AS links,count(DISTINCT l.candidate_id)::int AS candidates,count(DISTINCT l.property_id)::int AS properties,count(*) FILTER (WHERE c.id IS NULL OR p.id IS NULL OR a.id IS NULL OR e.id IS NULL OR a.candidate_id<>c.id OR e.candidate_id<>c.id OR a.county_enrichment_id<>e.id OR c.atn<>p.atn OR c.apn<>p.apn OR p.atn<>e.pts_atn_normalized OR p.apn<>e.apn9)::int AS broken FROM opportunity_property_links l LEFT JOIN opportunity_candidates c ON c.id=l.candidate_id LEFT JOIN properties p ON p.id=l.property_id LEFT JOIN candidate_address_resolutions a ON a.id=l.address_resolution_id LEFT JOIN opportunity_assessor_enrichments e ON e.id=l.assessor_enrichment_id WHERE l.link_status='ACTIVE'")).rows[0];assert.deepEqual(r,{links:5,candidates:5,properties:5,broken:0});
    const s=await fingerprint(c,schema);for(const t of ['properties','opportunity_candidates','candidate_address_resolutions','opportunity_property_links','evidence_snapshots','opportunity_assessor_enrichments','discovery_sources','discovery_records','opportunity_assessor_import_batches'])assert.equal(s[t].count,5);assert.equal(s.deals.count,0);
    assert.equal((await c.query("SELECT count(*)::int AS n FROM properties WHERE county<>'SYNTHETIC_COUNTY_CA' OR atn !~ '^900[0-9]{8}$' OR apn !~ '^900[0-9]{6}$' OR provider_property_id IS NOT NULL OR latitude IS NOT NULL OR longitude IS NOT NULL")).rows[0].n,0);
    assert.equal((await c.query("SELECT count(*)::int AS n FROM opportunity_candidates WHERE candidate_status<>'NEEDS_ADDRESS' OR priority_band<>'INSUFFICIENT_DATA' OR screening_score IS NOT NULL OR score_version<>'kern-screen-v1'")).rows[0].n,0);
    assert.equal((await c.query("SELECT count(*)::int AS n FROM evidence_snapshots WHERE provenance_payload->'trustedAuthorization' IS NULL OR provenance_payload->'trustedAuthorization'->>'synthetic'<>'true'")).rows[0].n,0);
    report.independentSql={...r,canonical:5,evidence:5,deals:0,readOnly:true,separateConnection:true,syntheticOnly:true,screeningUnchanged:true};report.finalSnapshot=s;
  });
});
after(async()=>{
  try{await adapter?.close();const p=await preflight(config);try{await p.client.query('BEGIN READ ONLY');const final=await inventory(p.client);assert.deepEqual({...final,schemas:final.schemas.filter(s=>s.name!==schema),objects:final.objects.filter(s=>s.schema!==schema),routines:final.routines.filter(s=>s.schema!==schema)},initialInventory);assert.deepEqual(await protectedState(p.client),priorState);await p.client.query('ROLLBACK');report.retainedSchemasUnchanged='PASS';}finally{await p.client.end();}assert.equal(network.blockedAttempts,0);report.network={...network};report.status=report.tests.length===19&&report.tests.every(t=>t.result==='PASS')&&report.isolationGates===19?'V3 POSTGRESQL CERTIFIED':'MORE DEVELOPMENT REQUIRED';}
  finally{report.completedAt=new Date().toISOString();report.cleanup='TRANSACTION FAILURES ROLLED BACK; NEW TEST SCHEMA RETAINED; PRIOR SCHEMAS UNTOUCHED';await writeFile(`${dir}/certification.json`,JSON.stringify(report,null,2)+'\n');console.log(`LOCAL_CERTIFICATION_ARTIFACT=${dir}/certification.json`);}
});
