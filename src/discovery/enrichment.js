import {DISCOVERY_LIMITS} from './config.js';

const RENTCAST_OVERAGE_RATE=0.20;

export function planBatchEnrichment(records,{cachedAddressIds=[],cachedRentCastIds=[],googleDailyQuota=25,googlePerMinuteQuota=10}={}){
  if(!Array.isArray(records)||records.length<1||records.length>DISCOVERY_LIMITS.batchSize)throw new Error(`Enrichment preview requires 1 to ${DISCOVERY_LIMITS.batchSize} distinct candidates.`);
  if(new Set(records.map(record=>record.id)).size!==records.length)throw new Error('Enrichment preview contains duplicate candidates.');
  const addressCache=new Set(cachedAddressIds),rentCastCache=new Set(cachedRentCastIds);
  const items=records.map(record=>{
    const hasSitus=!!record.address?.street&&!!record.address?.city,addressCached=addressCache.has(record.id),rentCastCached=rentCastCache.has(record.id);
    const googleRequests=hasSitus&&!addressCached?1:0,rentCastRequests=rentCastCached?0:3;
    const blockers=[];
    if(!hasSitus)blockers.push('No county street/city: parcel identifier/location research required; no Google address request proposed.');
    if(record.assessor?.matchStatus!=='MATCHED_EXACT')blockers.push('Assessor identity is not an exact match.');
    blockers.push('No batch-specific live authorization is attached.');
    return {candidateId:record.id,addressState:record.address?.evidenceState,identityState:record.assessor?.matchStatus,
      cached:{googleAddress:addressCached,rentCastEvidence:rentCastCached},
      proposed:[
        {provider:'Google Geocoding',purpose:hasSitus?'Standardized address and ZIP suggestion':'Not eligible without street/city',requests:googleRequests,estimatedIncrementalCharge:null,rateStatus:'CURRENT PRICE NOT ESTABLISHED IN V1.6'},
        {provider:'RentCast',purpose:'Property record, as-is valuation, and sold-property research kept as distinct evidence',requests:rentCastRequests,estimatedIncrementalCharge:rentCastRequests*RENTCAST_OVERAGE_RATE,rateStatus:'CONSERVATIVE OVERAGE EXPOSURE; INCLUDED ALLOWANCE NOT ASSUMED'}
      ],blockers,status:record.researchStatus??'NOT_RESEARCHED'};
  });
  const googleRequests=items.reduce((sum,item)=>sum+item.proposed[0].requests,0),rentCastRequests=items.reduce((sum,item)=>sum+item.proposed[1].requests,0);
  const blockers=['Live execution is disabled for this assignment.','Current provider entitlement, billing-period usage, quotas and batch-specific budget authorization must be verified immediately before execution.'];
  if(googleRequests>googleDailyQuota)blockers.push(`Google proposal exceeds the reported ${googleDailyQuota}/day quota and must be split across days.`);
  return {version:'PI_ENRICHMENT_PLAN_V1',candidateCount:records.length,items,totals:{cacheHits:items.filter(item=>item.cached.googleAddress||item.cached.rentCastEvidence).length,googleRequests,rentCastRequests,totalProviderRequests:googleRequests+rentCastRequests,rentCastMaximumOverageExposure:Number((rentCastRequests*RENTCAST_OVERAGE_RATE).toFixed(2)),googleIncrementalCharge:'UNKNOWN'},quotas:{googlePerMinute:googlePerMinuteQuota,googleDaily:googleDailyQuota},blockers,liveExecutionEnabled:false,providerCallsMade:0};
}

