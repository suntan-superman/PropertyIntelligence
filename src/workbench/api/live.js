import {randomUUID} from 'node:crypto';
import {hash} from '../../io/files.js';
import {createClient,ProviderStop} from '../../sources/rentcast/client.js';
import {configuration} from '../../sources/rentcast/config.js';
import {lookupProperty,queryAddress,addressKey} from '../../sources/rentcast/propertyLookup.js';
import {normalizeProperty} from '../../sources/rentcast/normalizer.js';
import {fetchValuation} from '../../sources/rentcast/valuation.js';
import {finalize} from '../model.js';
import {normalizeAddress} from '../search.js';

export function parseAddress(value){
  const text=normalizeAddress(value);
  if(/https?:|[<>\\/\x00-\x1f]/i.test(text))throw new Error('ADDRESS_INVALID');
  const match=text.match(/^(\d[^,]{1,180}),\s*([^,]{2,80}),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if(!match)throw new Error('ADDRESS_INVALID');
  return {street:match[1].trim(),city:match[2].trim(),state:match[3].toUpperCase(),zip:match[4]};
}
const supported=new Set(['Manufactured','Single Family','Condo','Townhouse','Multi-Family','Duplex','Apartment']);
export function createLiveService({env={},store,resolveCached,loadFixture,fetchImpl,clock}={}){
  let config=null;try{config=configuration(env);}catch{/* absent/invalid config disables only live retrieval */}
  const inFlight=new Map();let cooldownUntil=0;
  async function complete(client,address,selected,record,refresh,confirmation,expectedManufactured=false){
    const id=`live-${hash(queryAddress(address)).slice(0,16)}`;
    let normalized=normalizeProperty(id,selected,record),state='READY_PROPERTY',resolutionStatus='INDEPENDENT_EVIDENCE_AVAILABLE';
    const snapshots=[record];let stoppedRef=null;
    const notes=['Provider-reported evidence is INDEPENDENT_ONLY, not VERIFIED. Land tenure, title, condition and unknown costs remain unresolved.'];
    try{
      if(!supported.has(selected.propertyType)||expectedManufactured&&selected.propertyType!=='Manufactured'||selected.propertyType==='Manufactured'&&!(selected.squareFootage>0&&selected.bedrooms!=null&&selected.bathrooms!=null))throw new ProviderStop('MANUFACTURED_REPRESENTATION_STOP');
      if(selected.addressLine2)throw new ProviderStop('UNIT_IDENTITY_STOP');
      const avm=await fetchValuation(client,address,selected,{refresh,expectedPropertyType:selected.propertyType});
      snapshots.push(avm.record);
      normalized=normalizeProperty(id,selected,record,avm);
    }catch(error){
      if(['RATE_LIMIT_STOP','AUTHENTICATION_STOP','QUOTA_STOP','QUOTA_BUDGET_STOP','NETWORK_STOP','PROVIDER_UNAVAILABLE_STOP'].includes(error.code))throw error;
      state='SOURCE_STOP';stoppedRef=error.rawResponseRef;resolutionStatus=error instanceof ProviderStop?error.code:'NORMALIZATION_OR_CONTRACT_STOP';notes.push('Identity / representation or valuation contract STOP. No deal analysis permitted.');
    }
    const {property,evidence}=normalized;
    const provenance=evidence.map(e=>({source:e.source,sourceType:e.sourceType,field:e.field,reference:e.rawResponseRef,rawResponseRef:e.rawResponseRef,retrievedAt:e.retrievedAt,status:'INDEPENDENT_ONLY',evidenceId:e.id}));
    for(const snapshot of snapshots)provenance.push({source:'RentCast',field:'sourceSnapshot',reference:snapshot.rawResponseRef,rawResponseRef:snapshot.rawResponseRef,bodyHash:snapshot.bodyHash,retrievedAt:snapshot.retrievedAt,status:'INDEPENDENT_ONLY'});
    if(stoppedRef)provenance.push({source:'RentCast',field:'rejectedEvidence',reference:stoppedRef,rawResponseRef:stoppedRef,status:'SOURCE_STOP',notes:['Rejected provider evidence; not used as subject valuation.']});
    if(confirmation)provenance.push(confirmation);
    return {model:finalize({schemaVersion:1,id,mode:'property',address:property.address??queryAddress(address),state,resolutionStatus,property,analysis:null,claims:[],claimOrigin:'ANALYST_ENTERED',candidates:[],
      evidence:[...evidence.map(e=>({field:e.field,category:'property',sponsorValue:null,independentValue:e.value,status:'PARTIAL',supportLevel:'INDEPENDENT_ONLY',sources:[e],notes:e.notes,materiality:'Evidence only; not verified'})),
        ...['landTenure','title','repairCondition','insuranceCost','propertyTaxHoldingCost'].map(field=>({field,category:'unresolved',sponsorValue:null,independentValue:null,status:'MISSING',supportLevel:'UNKNOWN',sources:[],notes:['Not established by this retrieval. Missing costs are unknown, not zero.']}))],
      questions:[],provenance,cache:{status:client.metrics.apiCalls?'LIVE_PROVIDER_RETRIEVAL':'CACHED_EVIDENCE',source:client.metrics.apiCalls?'Live provider retrieval':'Cached evidence',retrievedAt:[...new Set(evidence.map(e=>e.retrievedAt))],newProviderCalls:client.metrics.apiCalls,durable:store.durable,limitation:store.durable?'Local runtime snapshots; original fixture evidence unchanged.':'Per-instance memory only. Evidence and sessions may be lost on cold start or eviction; not durable persistence.'},notes,originalClaimsPreserved:true})};
  }
  async function analyzeOnce(data){
    if(typeof data.address!=='string'||Object.keys(data).some(k=>!['address','refresh','acknowledgeQuota'].includes(k))||data.refresh!==undefined&&typeof data.refresh!=='boolean')throw new Error('ADDRESS_INVALID');
    if(data.refresh&&!data.acknowledgeQuota)throw new Error('REFRESH_CONFIRMATION_REQUIRED');
    const text=normalizeAddress(data.address),cached=await resolveCached(text,'property');
    if(cached.model&&!data.refresh)return cached;
    if(cached.candidates?.length)return {...cached,confirm:async id=>({model:await loadFixture(id,'property')})};
    const address=parseAddress(text);
    if(!config)throw new Error('LIVE_NOT_CONFIGURED');
    if(Date.now()<cooldownUntil)throw new Error('RATE_LIMIT_STOP');
    // Per explicit analysis budget; no retries in an interactive serverless invocation.
    const client=createClient({...config,maxCalls:2,maxRetries:0},{store,cachePrefix:'data/runtime/rentcast',fetchImpl,clock});
    const match=await lookupProperty(client,address,{refresh:Boolean(data.refresh)});
    if(!match.selected){
      const candidates=match.candidates.map(raw=>({id:randomUUID(),address:raw.formattedAddress??[raw.addressLine1,raw.addressLine2,raw.city,raw.state,raw.zipCode].filter(Boolean).join(', '),propertyType:raw.propertyType??null}));
      let confirmed=false;
      return {state:'AMBIGUOUS',candidates,message:candidates.length?'Confirm the intended provider candidate. Confirmation is an analyst identity choice, not verification.':'No matching provider identity. Supply a complete independently resolved address; no AVM requested.',
        confirm:async id=>{
          if(confirmed)throw new Error('CONFIRMATION_INVALID');confirmed=true;
          const index=candidates.findIndex(c=>c.id===id);if(index<0)throw new Error('CONFIRMATION_INVALID');
          const raw=match.candidates[index];
          const confirmedAddress={street:raw.addressLine1,city:raw.city,state:raw.state,zip:raw.zipCode};
          if(!confirmedAddress.street||!confirmedAddress.city||!confirmedAddress.state||!confirmedAddress.zip)throw new Error('ADDRESS_INVALID');
          return complete(client,confirmedAddress,raw,match.record,Boolean(data.refresh),{source:'ANALYST_ENTERED',status:'IDENTITY_CONFIRMED_NOT_VERIFIED',requestedAddress:queryAddress(address),confirmedAddress:queryAddress(confirmedAddress),retrievedAt:new Date().toISOString()},cached.model?.id==='fantasia');
        }};
    }
    return complete(client,address,match.selected,match.record,Boolean(data.refresh),null,cached.model?.id==='fantasia');
  }
  return {configured:Boolean(config),async analyze(data){
    // Only normalized identical requests share an operation; a refresh never joins a non-refresh.
    const key=hash(JSON.stringify([addressKey(data.address),data.refresh,data.acknowledgeQuota,Object.keys(data).sort()]));
    if(inFlight.has(key))return inFlight.get(key);
    if(inFlight.size>=8)throw new Error('RATE_LIMIT_STOP');
    const promise=analyzeOnce(data).catch(error=>{if(error.code==='RATE_LIMIT_STOP')cooldownUntil=Date.now()+60000;throw error;}).finally(()=>inFlight.delete(key));
    inFlight.set(key,promise);return promise;
  }};
}
