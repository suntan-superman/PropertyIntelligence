// Strict SQL-routing test double, NOT PostgreSQL or a persistence certification.
// Whole transactions are serialized by this model; it cannot prove PG concurrency.
import '../../src/analysis/offline.js';
import {createDatabase} from '../../src/persistence/db.js';
import {seedRows,TEST_NOW} from './fixture.js';
const registered=new WeakSet();
export const isQueryDouble=db=>registered.has(db);
export function createQueryDouble(fixture){
  let state=seedRows(fixture),tail=Promise.resolve(),fault=null,active=0;
  const events=[];
  const execute=(s,sql,v=[],transaction=false)=>{
    const q=sql.replace(/\s+/g,' ').trim(),rows=value=>({rows:structuredClone(value),rowCount:value.length});
    if(/^SELECT pg_advisory_xact_lock/.test(q)){events.push({kind:'LOCK',identity:v[0]});return rows([]);}
    if(/^INSERT|^UPDATE|^DELETE/.test(q)){if(!transaction)throw new Error('MOCK_WRITE_OUTSIDE_TRANSACTION');if(fault&&q.includes(fault))throw new Error('SYNTHETIC_INJECTED_FAILURE');events.push({kind:'SQL_WRITE',table:q.match(/(?:INTO|UPDATE) (\w+)/)?.[1]});}
    const id=()=>`bbbbbbbb-2222-4222-8222-${String(s.nextId++).padStart(12,'0')}`;
    const now=()=>new Date(TEST_NOW).toISOString();
    if(q.includes('/* pilot:county-duplicates */'))return rows(s.candidates.filter(r=>r.jurisdiction===v[0]&&(r.atn===v[1]||r.apn===v[2])&&!r.archived_at));
    if(q.includes('/* pilot:county-properties */'))return rows(s.properties.filter(r=>r.normalized_address===v[0]||(r.state===v[1]&&r.county===v[2]&&(r.atn===v[3]||r.apn===v[4]))));
    if(q.includes('/* pilot:source-relationship */'))return rows(s.sourceRecords.filter(r=>r.candidate_id===v[0]&&r.id===v[1]));
    if(q.includes('FROM opportunity_assessor_import_batches'))return rows(s.batches.filter(r=>r.id===v[0]));
    if(q.startsWith('SELECT c.id,c.resolved_property_id')){
      const c=s.candidates.find(r=>r.id===v[0]);if(!c)return rows([]);const p=s.properties.find(r=>r.id===c.resolved_property_id);return rows([{...c,...(p?{address_line1:p.address_line1,city:p.city,state:p.state,postal_code:p.postal_code}:{})}]);
    }
    if(q.includes('FROM opportunity_candidates WHERE id=$1'))return rows(s.candidates.filter(r=>r.id===v[0]));
    if(q.includes('FROM opportunity_assessor_enrichments WHERE id=$1'))return rows(s.assessors.filter(r=>r.id===v[0]&&(!q.includes('superseded_at IS NULL')||!r.superseded_at)));
    if(q.includes('SELECT COALESCE(max(version),0)+1'))return rows([{version:1+Math.max(0,...s.resolutions.filter(r=>r.candidate_id===v[0]).map(r=>r.version))}]);
    if(q.includes('FROM candidate_address_resolutions WHERE candidate_id=$1'))return rows(s.resolutions.filter(r=>r.candidate_id===v[0]&&(!q.includes('superseded_at IS NULL')||(!r.superseded_at&&r.verification_status!=='SUPERSEDED'))).sort((a,b)=>b.version-a.version).slice(0,q.includes('LIMIT 1')?1:undefined));
    if(q.includes('FROM candidate_address_resolutions WHERE id=$1'))return rows(s.resolutions.filter(r=>r.id===v[0]));
    if(q.startsWith('INSERT INTO candidate_address_resolutions')){
      if(s.resolutions.some(r=>r.candidate_id===v[0]&&!r.superseded_at))throw new Error('MODEL_ACTIVE_RESOLUTION_CONFLICT');
      const fields=['candidate_id','county_enrichment_id','county_situs_raw','street','city','state','postal_code','postal_code_extension','formatted_address','resolution_source','resolution_method','verification_status','provider_name','provider_place_id','provider_payload_fingerprint','created_by_context','notes','version','idempotency_key'];
      const r={id:id(),...Object.fromEntries(fields.map((k,i)=>[k,v[i]])),analyst_confirmed:true,confirmed_at:now(),created_at:now(),superseded_at:null};s.resolutions.push(r);return rows([r]);
    }
    if(q.startsWith('INSERT INTO properties')){
      const existing=s.properties.find(r=>r.normalized_address===v[0]);if(existing)return rows([existing]);
      const fields=['normalized_address','address_line1','city','state','postal_code','county','latitude','longitude','property_type','apn','atn','provider_property_id','identity_status'];
      const r={id:id(),...Object.fromEntries(fields.map((k,i)=>[k,v[i]])),archived_at:null,created_at:now(),updated_at:now()};s.properties.push(r);return rows([r]);
    }
    if(/FROM properties WHERE id\s*=\s*\$1/.test(q))return rows(s.properties.filter(r=>r.id===v[0]));
    if(q.includes('FROM properties WHERE normalized_address = $1'))return rows(s.properties.filter(r=>r.normalized_address===v[0]).slice(0,1));
    if(q.includes('FROM opportunity_property_links l JOIN properties')){
      const l=s.links.find(r=>r.candidate_id===v[0]&&r.link_status==='ACTIVE'&&!r.superseded_at);const p=l&&s.properties.find(r=>r.id===l.property_id);return rows(l&&p?[{...l,address_line1:p.address_line1,city:p.city,state:p.state,postal_code:p.postal_code,linked_deal_count:0}]:[]);
    }
    if(q.includes('FROM opportunity_property_links WHERE candidate_id=$1'))return rows(s.links.filter(r=>r.candidate_id===v[0]&&r.link_status==='ACTIVE'&&!r.superseded_at));
    if(q.includes('FROM opportunity_property_links WHERE property_id=$1'))return rows(s.links.filter(r=>r.property_id===v[0]&&r.link_status==='ACTIVE'&&!r.superseded_at));
    if(q.startsWith('INSERT INTO opportunity_property_links')){
      if(s.links.some(r=>(r.candidate_id===v[0]||r.property_id===v[1])&&r.link_status==='ACTIVE'&&!r.superseded_at))throw new Error('MODEL_ACTIVE_LINEAGE_CONFLICT');
      const fields=['candidate_id','property_id','address_resolution_id','assessor_enrichment_id','origin','link_method','link_status','created_by_context','idempotency_key'];
      const r={id:id(),...Object.fromEntries(fields.map((k,i)=>[k,v[i]])),created_at:now(),superseded_at:null};s.links.push(r);return rows([r]);
    }
    if(q.startsWith('INSERT INTO evidence_snapshots')){
      const fields=['property_id','source','source_record_id','retrieved_at','snapshot_type','status','property_payload','valuation_payload','tax_payload','assessment_payload','sale_history_payload','features_payload','legal_payload','provenance_payload','raw_reference'];
      const r={id:id(),...Object.fromEntries(fields.map((k,i)=>[k,i>=6&&i<=13?JSON.parse(v[i]):v[i]])),created_at:now()};s.evidence.push(r);return rows([r]);
    }
    if(q.includes('FROM evidence_snapshots WHERE id = $1'))return rows(s.evidence.filter(r=>r.id===v[0]));
    if(q.startsWith('INSERT INTO audit_events')){const r={id:id(),aggregate_type:v[0],aggregate_id:v[1],event_type:v[2],event_payload:JSON.parse(v[3]),request_key:v[4],created_at:now()};s.audits.push(r);return rows([r]);}
    if(q.includes('FROM idempotency_keys WHERE request_key = $1'))return rows(s.idempotency.filter(r=>r.request_key===v[0]&&r.operation===v[1]));
    if(q.startsWith('INSERT INTO idempotency_keys')){if(s.idempotency.some(r=>r.request_key===v[0]))throw new Error('MODEL_REQUEST_KEY_CONFLICT');s.idempotency.push({request_key:v[0],operation:v[1],response_status:v[2],response_payload:JSON.parse(v[3])});return rows([]);}
    throw new Error('UNSUPPORTED_SQL_IN_QUERY_DOUBLE');
  };
  const pool={query:async(sql,v)=>execute(state,sql,v),connect:async()=>{
    let release;const ready=tail;tail=new Promise(r=>{release=r;});await ready;active++;let local=null;
    return {query:async(sql,v)=>{
      if(sql==='BEGIN'){local=structuredClone(state);events.push({kind:'BEGIN'});return {rows:[]};}
      if(sql==='COMMIT'){state=local;events.push({kind:'COMMIT'});return {rows:[]};}
      if(sql==='ROLLBACK'){local=null;events.push({kind:'ROLLBACK'});return {rows:[]};}
      if(!local)throw new Error('TRANSACTION_REQUIRED');return execute(local,sql,v,true);
    },release:()=>{active--;release();}};
  },end:async()=>{}};
  const db=createDatabase({pool});registered.add(db);
  return Object.assign(db,{inspect:()=>structuredClone(state),events:()=>structuredClone(events),setFault:needle=>{fault=needle;},mutateSeed:fn=>{if(active)throw new Error('ACTIVE_MODEL_TRANSACTION');fn(state);},certificationMode:'OFFLINE_QUERY_DOUBLE_ONLY'});
}
