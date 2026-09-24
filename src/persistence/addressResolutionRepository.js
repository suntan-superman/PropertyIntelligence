import {idempotent,audit,rowJson} from './db.js';

const CONTROL=/[\u0000-\u001f\u007f]/;
const ZIP=/^\d{5}$/;
const EXT=/^\d{4}$/;
const STATES=/^[A-Z]{2}$/;
const SOURCES=new Set(['ANALYST','ADDRESS_PROVIDER','EXISTING_PROPERTY_RECORD','OTHER_VERIFIED_SOURCE']);
const METHODS=new Set(['MANUAL_EXTERNAL_LOOKUP','MANUAL_DOCUMENT_REVIEW','PROVIDER_SUGGESTION_CONFIRMED','EXISTING_CANONICAL_MATCH']);
const clean=(value,field,max=180)=>{
  if(typeof value!=='string')throw new Error('ADDRESS_INVALID');
  const v=value.trim().replace(/\s+/g,' ');
  if(!v||v.length>max||CONTROL.test(v)||/^https?:\/\//i.test(v))throw new Error('ADDRESS_INVALID');
  return v;
};
export function validateCanonicalAddress(input={}){
  let postal=String(input.postalCode??input.postal_code??'').trim();
  let extension=String(input.postalCodeExtension??input.postal_code_extension??'').trim();
  if(postal.includes('-')&&extension===''){const parts=postal.split('-');postal=parts[0];extension=parts[1]??'';}
  const street=clean(input.street,'street'),city=clean(input.city,'city'),state=clean(input.state,'state',2).toUpperCase();
  if(!STATES.test(state)||!ZIP.test(postal)|| (extension && !EXT.test(extension)))throw new Error('ADDRESS_INVALID');
  const formatted=`${street}, ${city}, ${state} ${postal}${extension?`-${extension}`:''}`;
  return {street,city,state,postalCode:postal,postalCodeExtension:extension||null,formattedAddress:formatted};
}
export const providerReadyAddress=value=>{try{return validateCanonicalAddress(value);}catch{return null;}};
export const normalizeAddressForCompare=value=>{const a=validateCanonicalAddress(value);return [a.street,a.city,a.state,a.postalCode,a.postalCodeExtension??''].join('|').toUpperCase();};

const PUBLIC=['id','candidate_id','county_enrichment_id','county_situs_raw','street','city','state','postal_code','postal_code_extension','formatted_address','resolution_source','resolution_method','verification_status','provider_name','provider_place_id','analyst_confirmed','confirmed_at','created_at','superseded_at','created_by_context','notes','version'];
const safe=row=>row?Object.fromEntries(PUBLIC.filter(k=>row[k]!==undefined).map(k=>[k,row[k]])):null;
export function safeAddressResolution(row){return safe(row);}

export async function readAddressResolution(tx,candidateId,{history=false}={}){
  const sql=history
    ? 'SELECT * FROM candidate_address_resolutions WHERE candidate_id=$1 ORDER BY version DESC'
    : "SELECT * FROM candidate_address_resolutions WHERE candidate_id=$1 AND superseded_at IS NULL AND verification_status <> 'SUPERSEDED' ORDER BY version DESC LIMIT 1";
  const rows=(await tx.query(sql,[candidateId])).rows.map(rowJson);
  return history?rows.map(safe):(safe(rows[0]??null));
}

async function candidateContext(tx,candidateId,countyEnrichmentId){
  const candidate=(await tx.query('SELECT c.id,c.resolved_property_id,p.address_line1,p.city,p.state,p.postal_code FROM opportunity_candidates c LEFT JOIN properties p ON p.id=c.resolved_property_id WHERE c.id=$1',[candidateId])).rows[0];
  if(!candidate)throw new Error('CANDIDATE_NOT_FOUND');
  let county=null;
  if(countyEnrichmentId){county=(await tx.query('SELECT id,candidate_id,situs_raw FROM opportunity_assessor_enrichments WHERE id=$1 AND superseded_at IS NULL',[countyEnrichmentId])).rows[0];if(!county||county.candidate_id!==candidateId)throw new Error('ADDRESS_COUNTY_LINK_MISMATCH');}
  return {candidate,county};
}

export async function saveAddressResolution({db,candidateId,input={},requestKey=null,context='ANALYST_UI',supersedeId=null}){
  const address=validateCanonicalAddress(input);
  if(input.analystConfirmed!==true)throw new Error('ADDRESS_ANALYST_CONFIRMATION_REQUIRED');
  if(!SOURCES.has(input.resolutionSource??'ANALYST')||!METHODS.has(input.resolutionMethod??'MANUAL_EXTERNAL_LOOKUP'))throw new Error('ADDRESS_INVALID');
  if(input.providerPayloadFingerprint!=null&&!/^[0-9a-f]{64}$/i.test(String(input.providerPayloadFingerprint)))throw new Error('ADDRESS_INVALID');
  return db.transaction(tx=>idempotent(tx,requestKey,'candidate-address-resolution',async()=>{
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`candidate-address-resolution:${candidateId}`]);
    const {candidate,county}=await candidateContext(tx,candidateId,input.countyEnrichmentId??input.county_enrichment_id??null);
    if(candidate.address_line1&&candidate.city&&candidate.state&&candidate.postal_code){
      let existing;try{existing=normalizeAddressForCompare({street:candidate.address_line1,city:candidate.city,state:candidate.state,postalCode:candidate.postal_code});}catch{existing=null;}
      if(existing&&existing!==normalizeAddressForCompare(address))throw new Error('ADDRESS_CONFLICT');
    }
    const active=(await tx.query("SELECT * FROM candidate_address_resolutions WHERE candidate_id=$1 AND superseded_at IS NULL AND verification_status <> 'SUPERSEDED' ORDER BY version DESC LIMIT 1 FOR UPDATE",[candidateId])).rows[0];
    if(active){
      const same=normalizeAddressForCompare(active)===normalizeAddressForCompare(address);
      if(!supersedeId&&!same)throw new Error('ADDRESS_ACTIVE_EXISTS');
      if(same&&!supersedeId)return {addressResolution:safe(rowJson(active)),idempotentReplay:true,providerCalls:0};
      if(supersedeId!==active.id)throw new Error('ADDRESS_CONFLICT');
      await tx.query('UPDATE candidate_address_resolutions SET superseded_at=now(),verification_status=\'SUPERSEDED\' WHERE id=$1',[active.id]);
    }
    const version=Number((await tx.query('SELECT COALESCE(max(version),0)+1 AS version FROM candidate_address_resolutions WHERE candidate_id=$1',[candidateId])).rows[0].version);
    const source=input.resolutionSource??'ANALYST';
    const status=source==='ADDRESS_PROVIDER'?'PROVIDER_CONFIRMED':source==='EXISTING_PROPERTY_RECORD'?'EXISTING_PROPERTY_CONFIRMED':'ANALYST_CONFIRMED';
    const values=[candidateId,county?.id??null,county?.situs_raw??null,address.street,address.city,address.state,address.postalCode,address.postalCodeExtension,address.formattedAddress,source,input.resolutionMethod??'MANUAL_EXTERNAL_LOOKUP',status,input.providerName??null,input.providerPlaceId??null,input.providerPayloadFingerprint??null,context,input.notes??null,version,requestKey??null];
    const row=(await tx.query(`INSERT INTO candidate_address_resolutions (candidate_id,county_enrichment_id,county_situs_raw,street,city,state,postal_code,postal_code_extension,formatted_address,resolution_source,resolution_method,verification_status,provider_name,provider_place_id,provider_payload_fingerprint,analyst_confirmed,confirmed_at,created_by_context,notes,version,idempotency_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,now(),$16,$17,$18,$19) RETURNING *`,values)).rows[0];
    await audit(tx,{aggregateType:'OPPORTUNITY_CANDIDATE',aggregateId:candidateId,eventType:'CANDIDATE_ADDRESS_RESOLVED',payload:{addressResolutionId:row.id,version:row.version,source:row.resolution_source},requestKey});
    return {addressResolution:safe(rowJson(row)),idempotentReplay:false,providerCalls:0};
  }));
}

export async function addressResolutionSnapshot(db,candidateId){return db.transaction(tx=>readAddressResolution(tx,candidateId,{history:true}));}
