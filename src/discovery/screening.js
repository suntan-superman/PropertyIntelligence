const RESIDENTIAL_CONFIDENCE=Object.freeze({
  RESIDENTIAL_SINGLE_FAMILY:{points:30,label:'High',reason:'Assessor category is residential single family.'},
  RESIDENTIAL_MULTI_FAMILY:{points:25,label:'High',reason:'Assessor category is residential multi-family.'},
  MANUFACTURED_MOBILE:{points:22,label:'Moderate',reason:'Assessor category is manufactured/mobile residential.'},
  VACANT_RESIDENTIAL:{points:12,label:'Limited',reason:'Assessor category is vacant residential; no dwelling is established.'}
});

const clamp=value=>Math.max(0,Math.min(100,value));
const daysBetween=(from,to)=>Math.max(0,Math.floor((Date.parse(to)-Date.parse(from))/86400000));

export function isResidentialCategory(category){return Object.hasOwn(RESIDENTIAL_CONFIDENCE,String(category??''));}

export function scoreResidentialScreening(record,{asOfDate='2026-10-14'}={}){
  const use=RESIDENTIAL_CONFIDENCE[record.propertyType?.category]??{points:0,label:'Not residential',reason:'Assessor category is not classified as residential.'};
  const sourceDays=record.source?.observedDate?daysBetween(record.source.observedDate,asOfDate):null;
  const sourceAge=sourceDays==null?0:sourceDays<=90?15:sourceDays<=180?11:sourceDays<=365?7:3;
  const hasSitus=!!record.address?.street&&!!record.address?.city;
  const addressReadiness=hasSitus?20:record.address?.evidenceState==='MALFORMED_COUNTY_SITUS'?5:0;
  const exact=record.assessor?.matchStatus==='MATCHED_EXACT';
  const completeness=(exact?4:0)+(record.sourceIdentity?.apn9?3:0)+(record.geometry?.status==='GEOMETRY_EXACT'?3:0);
  const researchability=(exact&&(hasSitus||record.geometry?.status==='GEOMETRY_EXACT'))?5:record.sourceIdentity?.atn?2:0;
  const distress=record.discoveryReason?.type==='HISTORICAL_POWER_TO_SELL'?20:0;
  const components={
    residentialUse:{points:use.points,max:30,reason:use.reason},
    historicalDistress:{points:distress,max:20,reason:distress?'Dated Power-to-Sell appearance is retained as a historical screening signal only.':'No retained historical distress signal.'},
    addressReadiness:{points:addressReadiness,max:20,reason:hasSitus?'County situs has street and city; it is not postal or legal identity verification.':'No usable county street/city is available.'},
    sourceAge:{points:sourceAge,max:15,reason:sourceDays==null?'Source age cannot be calculated.':`Source was ${sourceDays} days old at the fixed screening date.`},
    propertyDataCompleteness:{points:completeness,max:10,reason:'Exact assessor match, APN9 and parcel-geometry metadata are counted independently.'},
    researchability:{points:researchability,max:5,reason:researchability===5?'Identifiers plus situs or exact geometry support follow-up research.':'Additional identity/location work is required.'}
  };
  const score=clamp(Object.values(components).reduce((sum,item)=>sum+item.points,0));
  return {version:'PI_RESIDENTIAL_SCREEN_V1',score,band:score>=80?'READY_TO_RESEARCH':score>=55?'RESEARCHABLE':score>=30?'NEEDS_REVIEW':'LOW_RESIDENTIAL_CONFIDENCE',residentialConfidence:use.label,components,
    boundary:'Research priority only. Investment attractiveness and potential profitability are not scored; historical tax amount is not a score component.'};
}

