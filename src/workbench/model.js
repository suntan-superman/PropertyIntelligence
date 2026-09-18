import {readFile} from 'node:fs/promises';
import {readJson,resolve,hash} from '../io/files.js';
import {context} from '../analysis/context.js';
import {costModel} from '../underwriting/costModel.js';
import {evaluate} from '../underwriting/metrics.js';
import {breakEven} from '../analysis/breakEven.js';
import {sensitivity} from '../analysis/sensitivity.js';
import {scenarioCatalog} from '../analysis/scenarioCatalog.js';

export const WARNING='Excludes material unknown costs. This is not a fully burdened profit estimate.';
export const DEFAULT_SCENARIOS=['SPONSOR_CASE','SALE_MINUS_10','SALE_MINUS_20','INDEPENDENT_AVM_HIGH','INDEPENDENT_AVM_POINT'];
export async function preservation() {
  const manifest=await readJson('data/validation/sprint3-protected-inputs.json');
  for(const item of manifest.files)if(hash(await readFile(resolve(item.file)))!==item.sha256)throw new Error('PROTECTED_INPUT_STOP');
  return {status:'PASS',files:manifest.files.length};
}
export async function inputs() {
  await preservation();
  const [portfolio,verification]=await Promise.all(['data/deals/florida-portfolio.json','data/normalized/florida-verification.json'].map(readJson));
  return {portfolio,verification};
}
export const money=v=>v==null?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
export const percent=v=>v==null?'Unknown':`${(v*100).toFixed(1)}%`;
export const hasLocation=c=>Number.isFinite(c?.latitude)&&Number.isFinite(c?.longitude)&&Math.abs(c.latitude)<=90&&Math.abs(c.longitude)<=180;
export function compView(c,index) {
  return {...c,number:index+1,id:`comp-${index+1}`,mappable:hasLocation(c),
    locationStatus:hasLocation(c)?'Provider coordinates':'Map location unavailable',
    badge:c.status==='Active'?'Listing':c.status==='Inactive'?'Inactive':'Status unclear',
    tenure:'Land tenure unknown',priceLabel:'Provider-listed price',priceText:money(c.price),
    yearBuilt:c.providerAttributes?.yearBuilt??c.yearBuilt??null,lotSize:c.providerAttributes?.lotSize??null,
    unit:c.providerAttributes?.addressLine2??null,sourceStatus:'RentCast / INDEPENDENT_ONLY'};
}
function questionGroup(q) {
  if(/identity|address/i.test(q.id))return 'Unresolved identity';
  if(/resale|comp/i.test(q.id))return 'Valuation';
  if(/repair|condition/i.test(q.id))return 'Repairs';
  if(/timeline|schedule/i.test(q.id))return 'Schedule';
  if(/title|legal|closing|restrictions/i.test(q.id))return 'Legal/title';
  if(/tenure|park/i.test(q.id))return 'Tenure/property';
  return 'Holding costs';
}
export function finalize(model) {
  const p=model.property, a=model.analysis, v=p?.valuation;
  model.comps=(p?.comps??[]).map(compView);
  model.metrics=[['Independent AVM',v?.price,'INDEPENDENT_ONLY','RentCast'],['AVM low',v?.low,'INDEPENDENT_ONLY','RentCast'],['AVM high',v?.high,'INDEPENDENT_ONLY','RentCast']];
  const claimLabel=model.claimOrigin==='ANALYST_ENTERED'?'Entered':'Sponsor';
  if(model.mode==='deal')model.metrics.unshift([`${claimLabel} Purchase`,a?.base?.includedCosts.acquisition??model.claims.find(c=>c.field==='acquisitionCost')?.value,model.claimOrigin,'Sponsor / manual claims'],[`${claimLabel} Resale`,a?.base?.grossSale??model.claims.find(c=>c.field==='projectedListPrice')?.value,model.claimOrigin,'Sponsor / manual claims']);
  if(a)model.metrics.push(['Modeled Break-Even',a.breakEven.salePrice,'DERIVED','Property Intelligence calculation']);
  model.metrics=model.metrics.map(([label,value,status,source])=>({label,value:value??null,display:money(value),status:value==null?'MISSING':status,source,
    references:source==='RentCast'?model.provenance.filter(p=>p.source==='RentCast'&&p.field==='valuation'):source==='Property Intelligence calculation'?model.provenance:model.claims}));
  model.valuationStatus=a&&Number.isFinite(v?.low)&&Number.isFinite(v?.high)&&(a.base.grossSale>v.high||a.base.grossSale<v.low)?'CONFLICTING':v?'INDEPENDENT_ONLY':'UNAVAILABLE';
  model.divergence=a&&v?{vsPoint:a.base.grossSale-v.price,vsHigh:v.high==null?null:a.base.grossSale-v.high}:null;
  model.scale=[['AVM low',v?.low],['Independent AVM',v?.price],['Modeled break-even',a?.breakEven.salePrice],['AVM high',v?.high],[`${claimLabel} resale`,a?.base.grossSale]].filter(([,n])=>Number.isFinite(n));
  const max=Math.max(1,...model.scale.map(([,n])=>n));
  model.scale=model.scale.map(([label,value])=>({label,value,display:money(value),position:100*value/max}));
  model.warning=WARNING;
  model.limitations=['Independent estimates are evidence, not verified resale proceeds.','Manufactured-home land tenure, park restrictions and comp tenure/comparability remain unresolved.','Unknown costs remain excluded, not zero. No probability assigned.'];
  model.questions=model.questions.map(q=>({...q,group:questionGroup(q)}));
  model.digest=hash(JSON.stringify({...model,digest:undefined}));
  return model;
}
export async function fixture(id,mode='deal') {
  if(!['fantasia','bass','joyce'].includes(id)||!['property','deal'].includes(mode))throw new Error('INVALID_FIXTURE');
  const input=await inputs(),ctx=context(input,id);
  const [evidence,questions]=await Promise.all(['data/analysis/evidence/florida-evidence-completeness.json','data/analysis/evidence/sponsor-information-request.json'].map(readJson));
  let analysis=null;
  if(id==='fantasia'&&mode==='deal') {
    const [scenarios,be]=await Promise.all(['data/analysis/scenarios/fantasia-scenarios.json','data/analysis/break-even/fantasia-break-even.json'].map(readJson));
    analysis={base:scenarios.scenarios.find(s=>s.id==='SPONSOR_CASE').outputs,costModel:scenarios.costModel,
      scenarios:scenarios.scenarios,breakEven:be,sensitivity:sensitivity(input),defaultScenarios:DEFAULT_SCENARIOS};
  }
  const result=ctx.result;
  return finalize({schemaVersion:1,id,mode,address:result.property?.address??Object.values(result.verificationAddress??ctx.seed.sponsorAddress).filter(Boolean).join(', '),
    state:result.status==='ADDRESS_AMBIGUOUS'?'AMBIGUOUS':result.status.includes('STOP')?'SOURCE_STOP':mode==='deal'?'READY_DEAL':'READY_PROPERTY',
    resolutionStatus:result.status,property:result.property,analysis,claims:mode==='deal'?ctx.deal.claims:[],claimOrigin:'SPONSOR_SUPPLIED',
    candidates:result.candidates.map((c,index)=>({index,address:c.formattedAddress??c.addressLine1??'Unspecified candidate'})),
    evidence:evidence.properties.find(p=>p.propertyId===id).fields.filter(f=>mode==='deal'||['identity','property','valuation','comparability','tenure'].includes(f.category)),
    questions:questions.requests.filter(q=>q.propertyId===id),provenance:ctx.provenance,
    cache:{status:'EXISTING_CACHED_EVIDENCE',retrievedAt:[...new Set(result.evidence.map(e=>e.retrievedAt).filter(Boolean))],newProviderCalls:0},
    notes:result.anomalies,originalClaimsPreserved:true});
}
export function manualDeal(original,payload) {
  if(!['READY_PROPERTY','READY_DEAL'].includes(original.state))throw new Error('IDENTITY_STOP');
  if(!['ANALYST_ENTERED','SPONSOR_SUPPLIED'].includes(payload.origin))throw new Error('CLAIM_ORIGIN_REQUIRED');
  const mapping={acquisitionCost:'acquisition',estimatedRepairs:'repairs',projectedListPrice:'sale',spaceRentThreeMonths:'rent',salesCommission:'commission',escrowClosingCosts:'escrow'};
  const values={};
  for(const [field,key] of Object.entries(mapping)){
    const value=payload[key];
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e10)throw new Error('EXPLICIT_COSTS_REQUIRED');
    values[field]=value;
  }
  if(!Number.isFinite(payload.holdDays)||payload.holdDays<=0||payload.holdDays>3650)throw new Error('HOLD_DAYS_REQUIRED');
  const model=structuredClone(original),at=new Date().toISOString();
  model.mode='deal';model.state='READY_DEAL';model.claimOrigin=payload.origin;
  model.claims=Object.entries(values).map(([field,value])=>({field:field==='spaceRentThreeMonths'?'spaceRentForHoldingPeriod':field,value,status:payload.origin,suppliedAt:at,sourceDocument:'Local analyst entry; not independently verified'}));
  model.claims.push({field:'holdDays',value:payload.holdDays,status:payload.origin,suppliedAt:at});
  model.provenance=[...original.provenance.filter(p=>p.source==='RentCast'),{source:payload.origin,reference:'Local analyst entry',retrievedAt:at}];
  const costs=costModel(values,{provenance:model.provenance,sponsorTimelineDays:payload.holdDays});
  costs.baseRentCoverageDays=payload.holdDays;costs.monthlySpaceRent=payload.rent/(payload.holdDays/30);
  costs.derivation={status:'DERIVED_FROM_EXPLICIT_AGGREGATE',aggregate:payload.rent,days:payload.holdDays,monthlySpaceRent:costs.monthlySpaceRent,daysPerModelMonth:30};
  costs.warnings=[WARNING,'Manual rent is an explicit aggregate for the entered hold duration. Holding scenarios vary rent only.'];
  costs.costs.forEach(c=>{if(c.status==='KNOWN_SUPPLIED')c.source=payload.origin;if(c.field==='spaceRent')c.claimField='spaceRentForHoldingPeriod';});
  if(payload.otherKnownCost!==null&&payload.otherKnownCost!==undefined) {
    if(!Number.isFinite(payload.otherKnownCost)||payload.otherKnownCost<0||payload.otherKnownCost>1e10||!['UPFRONT','DISPOSITION'].includes(payload.otherCashTiming))throw new Error('OTHER_COST_TIMING_REQUIRED');
    costs.costs.push({field:'additionalExplicitCosts',value:payload.otherKnownCost,status:'KNOWN_SUPPLIED',source:payload.origin,cashTiming:payload.otherCashTiming,notes:['Additional explicitly supplied cost; unresolved cost categories remain unknown.']});
    model.claims.push({field:'additionalExplicitCosts',value:payload.otherKnownCost,cashTiming:payload.otherCashTiming,status:payload.origin,suppliedAt:at});
  }
  const base=evaluate(costs),input={portfolio:{deals:[{id:model.id,claims:model.claims}],properties:[{id:model.id}]},verification:{properties:[{propertyId:model.id,property:model.property,evidence:[]}]}};
  const scenarios=scenarioCatalog(costs,model.property?.valuation).map(s=>{
    const outputs=Object.values(s.overrides).some(v=>v===null)?{status:'UNAVAILABLE'}:evaluate(costs,s.overrides);
    outputs.changeVsSponsorDollars=outputs.modeledProfit==null?null:outputs.modeledProfit-base.modeledProfit;
    return {...s,label:s.label.replaceAll('Sponsor','Entered').replaceAll('sponsor','entered'),outputs,provenance:model.provenance};
  });
  model.analysis={base,costModel:costs,scenarios,breakEven:breakEven(input,{id:model.id,model:costs}),sensitivity:sensitivity(input,{id:model.id,model:costs}),defaultScenarios:DEFAULT_SCENARIOS};
  model.analysis.sensitivity.ranking.basis=model.analysis.sensitivity.ranking.basis.replace('sponsor arithmetic','entered base-case arithmetic');
  model.analysis.sensitivity.ranking.notes=['Deterministic perturbations; no probability assigned.',`Holding baseline is the explicitly entered ${payload.holdDays}-day rent coverage.`];
  // Original evidence remains historical; it must not masquerade as confirmation of edited claims.
  model.evidence=model.evidence.map(f=>({...f,notes:[...(f.notes??[]),'Original fixture evidence assessment; does not validate manual deal inputs.']}));
  model.notes=[...model.notes,'Manual scenario is separate from the saved sponsor deal. Original artifacts unchanged.'];
  return finalize(model);
}
