import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

export const EVIDENCE_ROOT='data/runtime/gabe-demo-v2-1-2026-10-13';
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const pick=(o,keys)=>Object.fromEntries(keys.map(k=>[k,o?.[k]??null]));
export async function loadEvidence(root=process.cwd()){
  const read=n=>readFile(path.join(root,EVIDENCE_ROOT,n));
  const bytes=await read('report-model-v2-1.json'),fingerprint=sha(bytes),model=JSON.parse(bytes),receipt=JSON.parse(await read('final-receipt-v2-1.json'));
  const ledger=JSON.parse(await read('ENRICHMENT_LEDGER_V2_1.json'));
  // Verify the retained handoff's exact file bindings, not a new certification framework.
  for(const name of ['report-model-v2-1.json','REVIEW_DECISIONS.json','ENRICHMENT_LEDGER_V2_1.json','SOLD_CALLS.jsonl']){
    if(sha(await read(name))!==receipt.artifacts?.[name]?.sha256)throw new Error('Retained evidence changed; review the original handoff before loading.');
  }
  for(const [relative,expected] of Object.entries(model.sourceBindings??{})){
    if(relative.includes('..')||path.isAbsolute(relative)||/(?:^|[\\/])\.env(?:\.|$)|\.(?:pem|key)$/i.test(relative))throw new Error('Unexpected source binding.');
    if(sha(await readFile(path.join(root,relative)))!==expected)throw new Error('Original demo source evidence changed. Review it before continuing.');
  }
  const decisions=await read('REVIEW_DECISIONS.json');
  if(sha(decisions)!=='48e6821613570a055ed7f53f0f488d025bbd705f3f81cdb3cde07d0364643cf1')throw new Error('The reviewed demo decisions have changed. Revalidate the evidence before loading.');
  if(model.cards?.length!==6||new Set(model.cards.map(x=>x.ref)).size!==6||model.cards.some((c,i)=>c.ref!==`GABE-0${i+1}`||c.review?.action!=='ACCEPT_PRELIMINARY'))throw new Error('Six reviewed demo subjects are required.');
  const properties=model.cards.map(c=>({ref:c.ref,address:c.address,city:c.city,subjectKind:'PRELIMINARY_RESEARCH',addressComponents:c.addressComponents,evidenceFingerprint:fingerprint,
    attributes:pick(c.attributes,['propertyType','bedrooms','bathrooms','squareFootage','lotSize','yearBuilt','lastSaleDate','lastSalePrice']),
    avm:pick(c.avm,['price','low','high']),propertyRef:c.propertyRef,valuationRef:c.valuationRef,
    propertyRetrievedAt:c.propertyRetrievedAt,valuationRetrievedAt:c.valuationRetrievedAt,providerAsOf:c.providerAsOf,valuationAsOf:c.valuationAsOf,
    reviewDate:c.review.reviewedAt,identityStatus:'Reviewed preliminary address; legal parcel identity not verified',
    historicalTrigger:pick(c.historicalTrigger,['kind','amount','sourceDate','sourceRef','meaning']),
    countyUse:pick(c.countyUse,['code','sourceRef']),
    sales:(c.sales??[]).map(s=>pick(s,['evidenceRef','address','propertyType','bedrooms','bathrooms','squareFootage','distance','ageDays','saleDate','salePrice','pricePerSf','reason','armsLength','condition','transactionType'])),
    saleSearch:pick(c.saleSearch,['retrievedAt','returned','eligible','radius','partial']),findings:c.findings??[],
    listings:(c.marketListings??[]).map(s=>pick(s,['ref','address','status','price','lastSeenDate','distance','daysOld','bedrooms','bathrooms','squareFootage','priceMeaning','note']))}));
  return {fingerprint,properties,budget:{priorRequests:ledger.totalDemoRequests,exposureCents:ledger.combinedMaximumExposureCents,
    ceilingCents:ledger.authorizedCeilingCents,remainingCents:ledger.unusedConservativeCeilingCents,actualInvoiceVerified:ledger.actualInvoiceVerified,newRequests:0},
    refresh:{enabled:false,estimatedRequests:2,estimatedExposureCents:40,reason:'No general workspace refresh executor is activated. The retained demo used its one-shot reservations. No live guard is bypassed; this workspace has no credential loader or provider transport.'},
    disclaimer:(await readFile(path.join(root,'docs/SPRINT6_2_SOURCE_DISCLAIMER.md'),'utf8')).replaceAll('\r\n','\n').split('SUMMARY:\n\n')[1].trim()};
}
