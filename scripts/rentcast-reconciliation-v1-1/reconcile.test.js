import '../../src/analysis/offline.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcile,RULE_C,comparisonOnly} from './reconcile.js';
import {SOURCES} from './source.js';
import {seal,sha} from '../rentcast-controlled-pilot/core.js';
import {offlineStatus} from '../../src/analysis/offline.js';

// Synthetic only. Source references mimic verified reader output; no real record
// is changed. Real replay separately re-reads and verifies original DBF files.
function row(kind,values,ordinal=1){const ref=SOURCES[kind];return {values,reference:{path:ref.path,sha256:ref.sha256,ordinal,byteOffset:100+(ordinal-1)*100,projectionSha256:sha(JSON.stringify(values))}};}
function table(kind,rows){return {...SOURCES[kind],scannedRows:SOURCES[kind].rows,deletedRows:0,headerBytes:100,recordBytes:100,rows};}
function bind(x){
  x.evidence.countyIdentityFingerprint=sha(JSON.stringify(x.evidence.county));x.evidence.sourceFingerprint=sha(JSON.stringify(x.evidence.providerRecord));
  const {packetSha256,...payload}=x.evidence;x.evidence=seal(payload);x.evidenceText=JSON.stringify(x.evidence);
  const mapping=seal({candidates:[x.candidate]});x.mappingText=JSON.stringify(mapping);
  x.binding={evidencePath:'synthetic/private-evidence.json',mappingPath:'synthetic/private-mapping.json',evidenceFileSha256:sha(x.evidenceText),candidateSha256:sha(JSON.stringify(x.candidate)),mappingFileSha256:sha(x.mappingText),mappingPacketSha256:mapping.packetSha256,providerIdOccurrences:1};return x;
}
function fixture(){
  const county={jurisdiction:'KERN_CA',atn:'00100203004',apn9:'001002037'};
  const candidate={pilotCode:'SYN-P2',county,candidateId:'synthetic-candidate',sourceRecordReference:{source:'synthetic-source-1',row:1},requestAddress:{street:'1 Synthetic Street',city:'Test City',state:'CA'},assessor:{sourceRow:1,useCode:'0101',researchCategory:'RESIDENTIAL_SINGLE_FAMILY'},countyAddressReview:{rawCountySitus:'1 Synthetic Street, Test City'},existingIdentity:{conflicts:[],activeLinks:[],durablePropertyId:null,resolved_property_id:null,archived:false,qa_marker:false,source_relationship_verified:true}};
  const record={id:'synthetic-provider-id',assessorID:'00100203',addressLine1:'1 Synthetic St',city:'Test City',state:'CA',zipCode:'90001',county:'Kern',countyFips:'029',stateFips:'06',propertyType:'Single Family'};
  return bind({candidate,evidence:{pilotCode:candidate.pilotCode,county:{...county},sourceRecordReference:candidate.sourceRecordReference,httpStatus:200,providerRecord:record,reconciliation:{matchClassification:'APN_CONFLICT'}},
    source:{edition:'2026_FINAL',jurisdiction:'KERN_CA',fingerprints:Object.fromEntries(Object.entries(SOURCES).map(([k,r])=>[k,r.sha256])),metadataReference:{...SOURCES.metadata},tables:{
      parcel:table('parcel',[row('parcel',{APN:'00100203',APN9:county.apn9,APN_LABEL:'001-002-03'})]),
      land:table('land',[row('land',{ATN:county.atn,APN9:county.apn9,ADDR_SITUS:candidate.countyAddressReview.rawCountySitus,USE_CODE:'0101',ROLL:'1'})]),
      history:table('history',[row('history',{APN9:county.apn9,EVT_TYP_CR:'CV',DT_CREATE:'19940901',EVT_NUM_CR:'0.00000',EVT_TYP_IN:'',DT_INACT:'',EVT_NUM_IN:'0.00000'})]),
    }}});
}
const changeRow=(x,kind,changes)=>{x.source.tables[kind].rows[0]=row(kind,{...x.source.tables[kind].rows[0].values,...changes});};
function rejected(x){const r=reconcile(x);assert.notEqual(r.historicalSourceCrosswalk.status,'PASS');assert.equal(r.persistenceAuthorization,false);assert.equal(r.analystReview.routineEligible,false);return r;}
test('Rule C retrieves actual stored APN9 and retains source references',()=>{const x=fixture(),before=JSON.stringify(x),r=reconcile(x);assert.equal(r.ruleCEvaluation,'PASS');assert.equal(r.historicalSourceCrosswalk.classification,'DOCUMENTED_HISTORICAL_APN_CROSSWALK');assert.equal(r.identifiers.matchedSourceApn.raw,'00100203');assert.equal(r.identifiers.countyApn9.raw,'001002037');assert.equal(r.sourceRowReferences.length,3);assert.deepEqual(r.evaluationOrder,['SOURCE_AND_JURISDICTION','EXISTING_EXACT_APN9',RULE_C]);assert.equal(JSON.stringify(x),before);});
test('existing exact APN9 comparison wins before Rule C',()=>{const x=fixture();x.evidence.providerRecord.assessorID=x.candidate.county.apn9;bind(x);const r=reconcile(x);assert.equal(r.legacyComparison,'EXACT_APN_MATCH');assert.equal(r.historicalSourceCrosswalk.status,'PASS');assert.equal(r.ruleCEvaluation,'NOT_NEEDED');assert.equal(r.historicalSourceCrosswalk.strategy,'EXISTING_EXACT_APN9');});
test('existing normalized APN9 comparison preserved',()=>{const x=fixture();x.evidence.providerRecord.assessorID='001-002-037';bind(x);assert.equal(reconcile(x).legacyComparison,'NORMALIZED_APN_MATCH');assert.equal(reconcile(x).ruleCEvaluation,'NOT_NEEDED');});
test('only ordinary spaces and hyphens removed, leading zeros retained',()=>{const x=fixture();x.evidence.providerRecord.assessorID='001-002-03';bind(x);assert.equal(reconcile(x).ruleCEvaluation,'PASS');assert.equal(reconcile(x).identifiers.rentcastAssessorId.raw,'001-002-03');assert.equal(comparisonOnly('001 002-03'),'00100203');for(const value of ['001.002.03','001\t00203','001\u00a000203',100203])assert.equal(comparisonOnly(value),null);});
test('1 missing source APN rejects',()=>{const x=fixture();x.source.tables.parcel.rows=[];assert.ok(rejected(x).reasons.includes('SOURCE_APN_NOT_FOUND'));});
test('2 duplicate matching source APN rejects',()=>{const x=fixture();x.source.tables.parcel.rows.push(row('parcel',{...x.source.tables.parcel.rows[0].values},2));rejected(x);});
test('3 APN mapping to conflicting APN9s rejects',()=>{const x=fixture();x.source.tables.parcel.rows.push(row('parcel',{APN:'00100203',APN9:'009999999'},2));rejected(x);});
test('4 APN9 mapping to multiple ATNs rejects',()=>{const x=fixture();x.source.tables.land.rows.push(row('land',{...x.source.tables.land.rows[0].values,ATN:'00100203005'},2));rejected(x);});
test('5 wrong candidate APN9 rejects',()=>{const x=fixture();x.candidate.county.apn9='001002038';x.evidence.county={...x.candidate.county};bind(x);rejected(x);});
test('6 wrong candidate ATN rejects',()=>{const x=fixture();x.candidate.county.atn='00100203005';x.evidence.county={...x.candidate.county};bind(x);rejected(x);});
test('7 wrong provider/county jurisdiction rejects',()=>{for(const fn of [x=>x.evidence.providerRecord.county='Other',x=>x.source.jurisdiction='OTHER_CA',x=>x.candidate.county.jurisdiction='OTHER_CA']){const x=fixture();fn(x);x.evidence.county={...x.candidate.county};bind(x);rejected(x);}});
test('8 wrong state rejects',()=>{const x=fixture();x.evidence.providerRecord.state='NV';bind(x);rejected(x);});
test('9 changed or missing source fingerprint rejects',()=>{for(const name of Object.keys(SOURCES)){const x=fixture();x.source.fingerprints[name]='changed';rejected(x);}});
test('10 missing source-row reference rejects',()=>{for(const kind of ['parcel','land','history']){const x=fixture();delete x.source.tables[kind].rows[0].reference;rejected(x);}});
test('11 leading-zero mismatch rejects',()=>{const x=fixture();x.evidence.providerRecord.assessorID='100203';bind(x);rejected(x);});
test('12 numeric identifier coercion rejected',()=>{const x=fixture();x.evidence.providerRecord.assessorID=100203;bind(x);rejected(x);});
test('13 no padding short provider identifiers',()=>{const x=fixture();x.evidence.providerRecord.assessorID='0100203';bind(x);rejected(x);});
test('14 calculated check-digit substitute cannot replace source APN9',()=>{const x=fixture();changeRow(x,'parcel',{APN9:'001002039'});rejected(x);});
test('15 ATN is diagnostic only, never accepted as APN',()=>{const x=fixture();x.evidence.providerRecord.assessorID=x.candidate.county.atn;bind(x);const r=rejected(x);assert.equal(r.observedAtnRelationship.matchesAfterFormattingOnly,true);assert.equal(r.observedAtnRelationship.acceptedAsEquivalence,false);});
test('16 address-only match cannot substitute for parcel evidence',()=>{const x=fixture();x.evidence.providerRecord.assessorID=null;bind(x);rejected(x);});
test('17 property-type conflict quarantines',()=>{const x=fixture();x.evidence.providerRecord.propertyType='Land';bind(x);assert.ok(rejected(x).contradictions.includes('PROPERTY_TYPE_CONFLICT'));});
test('18 known inactivation quarantines',()=>{const x=fixture();changeRow(x,'history',{DT_INACT:'20250101',EVT_TYP_IN:'DL'});assert.ok(rejected(x).reasons.includes('KNOWN_HISTORICAL_INACTIVATION'));});
test('19 unresolved split/merge/transfer quarantines',()=>{for(const code of ['CT','CB','DT']){const x=fixture();changeRow(x,'history',{EVT_TYP_CR:code});rejected(x);}});
test('20 unknown current freshness blocks routine eligibility, not historical observation',()=>{const r=reconcile(fixture());assert.equal(r.historicalSourceCrosswalk.status,'PASS');assert.equal(r.currentIdentityFreshness,'CURRENT_IDENTITY_FRESHNESS_UNVERIFIED');assert.equal(r.currentIdentityVerified,false);assert.equal(r.analystReview.routineEligible,false);assert.equal(r.analystReview.tier,'EXCEPTION_REVIEW_REQUIRED');assert.equal(r.persistenceAuthorization,false);assert.equal(r.analystReview.approval,null);});
test('21 changed original RentCast content cannot be replayed under old fingerprint',()=>{const x=fixture();x.evidence.providerRecord.assessorID='00999999';rejected(x);});
test('22 changed candidate mapping cannot be replayed under old fingerprint',()=>{const x=fixture();x.candidate.county.apn9='009999999';rejected(x);});
test('23 another candidate evidence cannot be substituted',()=>{const x=fixture();x.evidence.pilotCode='SYN-OTHER';bind(x);rejected(x);});
test('24 attempted automatic approval throws',()=>assert.throws(()=>reconcile(fixture(),{analystApproval:'APPROVED'}),/NO_APPROVAL_OR_PERSISTENCE/));
test('25 attempted persistence throws',()=>assert.throws(()=>reconcile(fixture(),{persist:true}),/NO_APPROVAL_OR_PERSISTENCE/));
test('missing or ambiguous history blocks historical certification',()=>{for(const count of [0,2]){const x=fixture();x.source.tables.history.rows=Array.from({length:count},(_,i)=>row('history',x.source.tables.history.rows[0].values,i+1));rejected(x);}});
test('unknown history meaning or missing activity fields stays quarantined',()=>{for(const change of [{EVT_TYP_CR:'PC'},{DT_INACT:undefined},{EVT_TYP_IN:undefined},{EVT_NUM_IN:undefined}]){const x=fixture();changeRow(x,'history',change);rejected(x);}});
test('existing suffix/unit/ZIP/city/street checks not relaxed',()=>{for(const change of [{addressLine1:'1 Synthetic AV'},{addressLine2:'Unit 2'},{zipCode:null},{city:'Other City'},{addressLine1:'9 Synthetic St'}]){const x=fixture();Object.assign(x.evidence.providerRecord,change);bind(x);rejected(x);}});
test('wrong edition and incomplete table coverage reject',()=>{const x=fixture();x.source.edition='2027';rejected(x);const y=fixture();y.source.tables.land.scannedRows=1;rejected(y);});
test('source row projection change without reference digest fails',()=>{const x=fixture();x.source.tables.parcel.rows[0].values.APN9='009999999';rejected(x);});
test('same input replay deterministic and no automatic state advancement',()=>{const x=fixture(),a=reconcile(x),b=reconcile(x);assert.deepEqual(a,b);const {reconciliationFingerprint,...payload}=a;assert.equal(reconciliationFingerprint,sha(JSON.stringify(payload)));assert.equal(a.round1Selected,false);});
test('external RentCast ID remains separate from all county identifiers',()=>{const r=reconcile(fixture());assert.equal(r.identifiers.rentcastId.role,'EXTERNAL_PROVIDER_ID_ONLY');assert.equal(r.identifiers.rentcastId.raw,'synthetic-provider-id');assert.notEqual(r.identifiers.rentcastId.raw,r.identifiers.countyAtn.raw);});
test('duplicate RentCast identity is rejected',()=>{const x=fixture();x.binding.providerIdOccurrences=2;rejected(x);});
test('structured county provenance survives independent JSON decoding',()=>{const x=JSON.parse(JSON.stringify(fixture()));assert.equal(reconcile(x).ruleCEvaluation,'PASS');});
test('unknown archive/link/source relationship flags fail closed',()=>{for(const key of ['archived','qa_marker','source_relationship_verified','durablePropertyId','resolved_property_id']){const x=fixture();delete x.candidate.existingIdentity[key];bind(x);rejected(x);}});
test('network disabled throughout focused certification',()=>assert.equal(offlineStatus().networkAttempts,0));
