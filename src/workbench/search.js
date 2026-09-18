import {fixture,inputs} from './model.js';
import {addressKey} from '../sources/rentcast/propertyLookup.js';

export function normalizeAddress(text) {
  if(typeof text!=='string'||text.length>300)throw new Error('ADDRESS_INVALID');
  return text.trim().replace(/\s+/g,' ');
}
// Sprint 3 is cache-first and deliberately makes no new provider calls. A new,
// uncached identity requires a future explicit retrieval workflow, not geocoding guesses.
export async function resolveCached(text,mode='property') {
  const address=normalizeAddress(text),input=await inputs(),key=addressKey(address);
  if(!key)throw new Error('ADDRESS_REQUIRED');
  const candidates=[];
  for(const seed of input.portfolio.properties) {
    const result=input.verification.properties.find(p=>p.propertyId===seed.id);
    const addressObj=result.verificationAddress??seed.sponsorAddress;
    const full=result.property?.address??Object.values(addressObj).filter(Boolean).join(', ');
    const exact=addressKey(full)===key;
    if(exact&&result.status==='INDEPENDENT_EVIDENCE_AVAILABLE')return {model:await fixture(seed.id,mode)};
    const aliases=[addressObj.street,seed.sponsorAddress.street,[addressObj.street,addressObj.city,addressObj.state].filter(Boolean).join(', '),Object.values(seed.sponsorAddress).filter(Boolean).join(', ')];
    if(exact||aliases.some(alias=>addressKey(alias)===key))candidates.push({id:seed.id,address:full});
  }
  if(candidates.length)return {state:'AMBIGUOUS',candidates,message:'Confirm the intended cached property. Confirmation does not clear a source STOP or supply missing identity evidence.'};
  return {state:'ERROR',candidates:[],message:'No matching cached evidence. Live provider retrieval is not enabled in this internal release; no request was sent. Supply independently resolved evidence before analysis.'};
}
