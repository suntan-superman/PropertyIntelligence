// Stored evidence only. No provider imports, credentials, refresh or live request path.
import {readFile,lstat,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {CODES,sha} from './review-model.js';

export const UNAVAILABLE='Previous address suggestion unavailable. New verification requires separate authorization.';
export const REVIEW_SCOPE='INITIATING_REVIEWER_LOCAL_POC_REVIEW_ONLY';
export const RETENTION_BASIS='GOOGLE_GEOCODING_6_3_CONDITIONAL_END_USER_REVIEW';
const unavailable=()=>({available:false,message:UNAVAILABLE,liveLookupEnabled:false});
const text=(value,max=300)=>typeof value==='string'&&value.length<=max&&!/[\x00-\x1f\x7f]/.test(value)?value:null;
const stamp=value=>typeof value==='string'?Date.parse(value):NaN;
async function privateText(root,file){
  const full=join(root,file);
  if((await lstat(full)).isSymbolicLink()||(await realpath(full)).toLowerCase()!==full.toLowerCase())throw new Error('PRIVATE_PATH');
  if((await lstat(full)).size>1024*1024)throw new Error('EVIDENCE_SIZE');
  execFileSync('git',['check-ignore','--quiet',full],{stdio:'pipe'});
  if(execFileSync('git',['ls-files','--',full],{encoding:'utf8'}).trim())throw new Error('TRACKED_EVIDENCE');
  return readFile(full,'utf8');
}
export async function readGoogleSuggestion({directory,packet,reviewer,clock=Date.now}){
  try{
    const root=resolve(directory),code=packet.pilotCode;
    if(!CODES.includes(code))return unavailable();
    const access=JSON.parse(await privateText(root,'google-review-access.json'));
    if(access.schemaVersion!==1||access.authorization!=='ASSISTED_ADDRESS_VERIFICATION_V1_LOCAL_REVIEW_ONLY')return unavailable();
    const grants=access.grants?.filter(g=>g.pilotCode===code&&g.reviewer===reviewer)??[];
    if(grants.length!==1)return unavailable();
    const grant=grants[0],now=clock();
    if(grant.scope!==REVIEW_SCOPE||grant.permittedBasis!==RETENTION_BASIS||grant.rawResponseStored!==false||
      grant.packetSha256!==packet.packetSha256||!/^[a-f0-9]{64}$/.test(grant.evidenceSha256)||
      !Number.isFinite(stamp(grant.expiresAt))||!Number.isFinite(stamp(grant.receivedAt))||
      stamp(grant.receivedAt)>now||stamp(grant.expiresAt)<=now)return unavailable();
    const raw=await privateText(root,`google-geocoding-${code.toLowerCase()}/diagnostic.json`);
    if(sha(raw)!==grant.evidenceSha256)return unavailable();
    const d=JSON.parse(raw),retention=d.retention;
    if(d.pilotCode!==code||d.packetSha256!==packet.packetSha256||d.receivedAt!==grant.receivedAt||
      retention?.deleteOrReviewBy!==grant.expiresAt||retention.rawResponseStored!==false||
      retention.noRedistributionOrSharedReuse!==true||
      retention.restrictedTo!=='Initiating authorized reviewer; not a shared cache, canonical database or public artifact'||
      !retention.terms?.startsWith('https://cloud.google.com/maps-platform/terms/maps-service-terms')||
      stamp(grant.expiresAt)-stamp(d.receivedAt)>86401000||
      d.request?.components!=='administrative_area:CA|country:US'||d.request.suppliedZip!==false||
      d.httpStatus!==200||d.googleStatus!=='OK'||d.candidateCount!==1||d.candidates?.length!==1||
      !['EXACT ADDRESS CANDIDATE','PARTIAL/AMBIGUOUS','PARTIAL / AMBIGUOUS'].includes(d.assessment?.classification))return unavailable();
    const c=d.candidates[0],v=k=>text(c.components?.[k]?.longName),short=k=>text(c.components?.[k]?.shortName);
    const number=v('street_number'),route=v('route'),city=v('locality'),state=short('administrative_area_level_1'),zip=v('postal_code');
    if(!number||!route||!city||!state||!zip||!text(c.formattedAddress)||!text(c.locationType))return unavailable();
    const address={street:`${number} ${route}`,city,state,postalCode:zip};
    const differences=['street','city','state','postalCode'].map(field=>({field,
      county:packet.addressReview.components[field]||null,proposed:address[field],
      differs:(packet.addressReview.components[field]||'').trim().toUpperCase()!==address[field].toUpperCase(),
      kind:packet.addressReview.components[field]?'COMPARE':'MISSING_IN_COUNTY'}));
    const suffixReview=/\bCI$/i.test(packet.addressReview.components.street)&&/\bCIRCLE$/i.test(route)&&/\bCIR$/i.test(short('route')||'');
    // Explicit DTO: no coordinates, place ID, raw payload, private paths or credentials.
    return {available:true,liveLookupEnabled:false,source:'Google Maps · Geocoding',
      reference:{pilotCode:code,packetSha256:packet.packetSha256,evidenceSha256:grant.evidenceSha256},
      formattedAddress:text(c.formattedAddress),streetNumber:number,route,routeShort:short('route'),candidateCount:d.candidateCount,components:address,
      precision:c.locationType,classification:d.assessment.classification,
      partialMatch:c.partialMatchFieldPresent===true&&typeof c.partialMatch==='boolean'?c.partialMatch:null,
      partialMatchFieldPresent:typeof c.partialMatchFieldPresent==='boolean'?c.partialMatchFieldPresent:null,differences,suffixReview,
      retrievedAt:d.receivedAt,expiresAt:grant.expiresAt,validForMs:Math.max(0,stamp(grant.expiresAt)-clock()),
      notice:'Google address matching does not verify county parcel identity.',
      limitations:'State/country were jurisdiction-supported request constraints. County ZIP is missing. No component is analyst-verified; postal deliverability and parcel identity are not established.'};
  }catch{return unavailable();}
}
