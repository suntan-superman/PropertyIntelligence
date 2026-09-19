import {hash} from '../io/files.js';
import {acquisitionDecisionQuestions} from '../analysis/diligenceQuestions.js';

export const MAO_MODEL_VERSION='sprint5-mao-v1';
export const STRATEGY='FIX_AND_FLIP';
export const HURDLE_TYPES=Object.freeze(['CASH_ON_CASH','RETURN_ON_TOTAL_PROJECT_COST','PROFIT_MARGIN_ON_SALE']);
export const COST_BASES=Object.freeze(['FIXED','PERCENT_OF_PURCHASE','PERCENT_OF_EXIT','PER_DAY','PER_MONTH']);
export const REHAB_MULTIPLIERS=Object.freeze([1,1.2,1.5]);
export const UNKNOWN_MAO_WARNING='Result excludes material unknown costs and is not a fully burdened profit estimate.';

const finiteNonNegative=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const roundCents=value=>Math.round((value+Number.EPSILON)*100)/100;
const cents=value=>Math.round(value*100);
const asArray=value=>Array.isArray(value)?value:value==null?[]:Object.entries(value).map(([name,item])=>({name,...(typeof item==='object'?item:{value:item})}));
const clone=value=>structuredClone(value);

function rate(value,name) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error(`INVALID_${name.toUpperCase()}`);
  return value>1?value/100:value;
}

function normalizeLine(line, fallbackName='cost') {
  if(line==null)return null;
  const source=typeof line==='number'?{amount:line}:line;
  const status=source.status??(source.amount===null||source.value===null?'UNKNOWN':'KNOWN_SUPPLIED');
  const applicable=source.applicable===false||status==='NOT_APPLICABLE';
  if(applicable)return {...source,name:source.name??source.field??fallbackName,status:'NOT_APPLICABLE',amount:null};
  let amount=source.amount??source.value??source.cost??(source.percentage??source.rate??null);
  const basis=String(source.basis??source.costBasis??'FIXED').toUpperCase();
  if(!COST_BASES.includes(basis))throw new Error('INVALID_COST_BASIS');
  if(amount!==null&&amount!==undefined&&!finiteNonNegative(amount))throw new Error('INVALID_COST_AMOUNT');
  if(amount!==null&&amount!==undefined)amount=roundCents(amount);
  return {...source,name:source.name??source.field??fallbackName,basis,amount,status,
    percentage:source.percentage??source.rate??(basis.startsWith('PERCENT_')?amount:null),
    source:source.source??null,notes:source.notes??null};
}

function normalizeLines(input,names) {
  if(Array.isArray(input))return input.map((line,index)=>normalizeLine(line,`${names}_${index+1}`)).filter(Boolean);
  if(input&&typeof input==='object')return Object.entries(input).map(([name,line])=>normalizeLine(typeof line==='object'?{name,...line}:{name,amount:line},name)).filter(Boolean);
  return [];
}

function lineAmount(line,{purchasePrice,exitValue,days,months}) {
  if(line.status==='UNKNOWN')return null;
  if(line.status==='NOT_APPLICABLE')return 0;
  const amount=line.amount;
  if(amount===null||amount===undefined)return null;
  switch(line.basis){
    case 'FIXED':return amount;
    case 'PERCENT_OF_PURCHASE':return purchasePrice*rate(amount,'cost_percentage');
    case 'PERCENT_OF_EXIT':return exitValue*rate(amount,'cost_percentage');
    case 'PER_DAY':return amount*(line.days??days??0);
    case 'PER_MONTH':return amount*(line.months??months??((days??0)/30));
    default:throw new Error('INVALID_COST_BASIS');
  }
}

function normalizeHurdle(input) {
  const source=input?.hurdle??input??{};
  const type=source.type??source.hurdleType;
  if(!HURDLE_TYPES.includes(type))throw new Error('INVALID_HURDLE_TYPE');
  const raw=source.rate??source.hurdleRate??source.percentage;
  const value=rate(raw,'hurdle_rate');
  if(value<=0||value>=1)throw new Error('INVALID_HURDLE_RATE');
  return {type,rate:value,ratePercent:value*100,formula:type==='CASH_ON_CASH'?'modeledProfit / cashInvested':type==='RETURN_ON_TOTAL_PROJECT_COST'?'modeledProfit / totalProjectCost':'modeledProfit / modeledSaleProceeds'};
}

function normalizeExitBases(input) {
  const property=input?.property??{};
  const valuation=input?.valuation??property.valuation??{};
  const existing=asArray(input?.exitBases??input?.exits);
  const byBasis=new Map(existing.map(item=>[item.basis??item.exitBasis,item]));
  const add=(basis,value,extra={})=>{if(value!==null&&value!==undefined&&!byBasis.has(basis))byBasis.set(basis,{basis,value,...extra});};
  add('INDEPENDENT_LOW',valuation.low,{evidenceSnapshotId:input?.evidenceSnapshotId,evidenceStatus:'INDEPENDENT_ONLY',provenance:input?.provenance});
  add('INDEPENDENT_POINT',valuation.price,{evidenceSnapshotId:input?.evidenceSnapshotId,evidenceStatus:'INDEPENDENT_ONLY',provenance:input?.provenance});
  add('INDEPENDENT_HIGH',valuation.high,{evidenceSnapshotId:input?.evidenceSnapshotId,evidenceStatus:'INDEPENDENT_ONLY',provenance:input?.provenance});
  if(input?.analystExit!==undefined)add('ANALYST_EXIT',input.analystExit,{evidenceStatus:'ANALYST_ENTERED',provenance:[{source:'ANALYST_ENTERED',reference:'Analyst exit assumption'}]});
  if(input?.sponsorExit!==undefined)add('SPONSOR_EXIT',input.sponsorExit,{evidenceStatus:'SPONSOR_SUPPLIED',provenance:[{source:'SPONSOR_SUPPLIED',reference:'Sponsor exit assumption'}]});
  return [...byBasis.values()].map(item=>{if(!finiteNonNegative(item.value))throw new Error('INVALID_EXIT_VALUE');return {...item,value:roundCents(item.value),exitBasis:item.basis,evidenceStatus:item.evidenceStatus??'UNKNOWN',provenance:item.provenance??[]};}).filter(item=>item.value!==null&&item.value!==undefined);
}

function normalizeRehab(input) {
  const rehab=input?.rehab??{};
  const items=asArray(rehab.items??rehab.assessments).map((item,index)=>({...item,category:item.category??item.name??`OTHER_${index+1}`,conditionStatus:item.conditionStatus??item.status??'UNKNOWN',estimatedCost:item.estimatedCost??item.amount??null,source:item.source??null}));
  for(const item of items)if(item.estimatedCost!==null&&item.estimatedCost!==undefined&&!finiteNonNegative(item.estimatedCost))throw new Error('INVALID_REHAB_COST');
  const noRehab=rehab.noRehabAssumption===true||rehab.explicitNoRehab===true;
  if(!noRehab&&!items.length&&(rehab.additionalUnallocated===undefined||rehab.additionalUnallocated===null))return {status:'MISSING',items,base:0,warnings:['Rehab amount or an explicit no-rehab assumption is required.']};
  const explicit=items.reduce((sum,item)=>sum+(item.estimatedCost??0),0)+(rehab.additionalUnallocated??0);
  if(!finiteNonNegative(explicit))throw new Error('INVALID_REHAB_COST');
  const contingency=rehab.contingency??{};
  const contingencyBasis=String(contingency.basis??rehab.contingencyBasis??'FIXED').toUpperCase();
  const contingencyValue=contingency.value??rehab.contingency??0;
  if(!finiteNonNegative(contingencyValue)||!['FIXED','PERCENT_OF_REHAB'].includes(contingencyBasis))throw new Error('INVALID_REHAB_CONTINGENCY');
  const contingencyAmount=contingencyBasis==='PERCENT_OF_REHAB'?explicit*rate(contingencyValue,'contingency'):contingencyValue;
  const warnings=[];
  if(items.some(item=>!['GOOD','NOT_ASSESSED'].includes(item.conditionStatus)&&item.estimatedCost===null))warnings.push('Condition issue identified without cost estimate.');
  return {status:'KNOWN',items,base:roundCents(explicit),contingencyBasis,contingencyValue,contingencyAmount:roundCents(contingencyAmount),total:roundCents(explicit+contingencyAmount),noRehabAssumption:noRehab,warnings};
}

function normalizeEncumbrances(items=[]) {
  const rows=asArray(items).map((item,index)=>({...item,id:item.id??item.observationId??`encumbrance-${index+1}`,type:item.type??'OTHER',amount:item.amount??null,amountStatus:item.amountStatus??(item.amount==null?'UNKNOWN':'REPORTED'),source:item.source??null,asOfDate:item.asOfDate??null,payoffVerified:item.payoffVerified===true,priorityKnown:item.priorityKnown===true,notes:item.notes??null}));
  for(const item of rows)if(item.amount!==null&&!finiteNonNegative(item.amount))throw new Error('INVALID_ENCUMBRANCE_AMOUNT');
  const known=rows.filter(item=>typeof item.amount==='number').reduce((sum,item)=>sum+item.amount,0);
  return {items:rows,knownTotal:roundCents(known),unknownCount:rows.filter(item=>item.amount===null).length};
}

function normalizeTarget(input,mao) {
  const policy=input?.targetPolicy??input?.target??null;
  if(!policy)return {policy:null,target:null};
  const type=policy.type??'MANUAL';
  let target=null;
  if(type==='MANUAL'){if(policy.value!==null&&policy.value!==undefined&&!finiteNonNegative(policy.value))throw new Error('INVALID_TARGET');target=policy.value??null;}
  else if(type==='FIXED_DISCOUNT_FROM_MAO'){if(!finiteNonNegative(policy.discount))throw new Error('INVALID_TARGET_DISCOUNT');target=Math.max(0,mao-policy.discount);}
  else if(type==='PERCENT_DISCOUNT_FROM_MAO'){const discount=rate(policy.discount??policy.percentage,'target_discount');target=roundCents(mao*(1-discount));}
  else throw new Error('INVALID_TARGET_POLICY');
  return {policy:{...policy,type},target:target===null?null:roundCents(target)};
}

function normalizeCosts(input,rehab) {
  const acquisition=normalizeLines(input?.acquisitionCosts??input?.acquisitionCostItems??input?.acquisitionCostsTreatment,'acquisition_cost');
  const disposition=normalizeLines(input?.dispositionCosts??input?.dispositionCostItems??input?.dispositionCostsTreatment,'disposition_cost');
  const holding=normalizeLines(input?.holdingCosts?.items??input?.holdingCosts,'holding_cost');
  const financing=normalizeLines(input?.financing?.items??input?.financingCosts,'financing_cost');
  const holdingInfo=input?.holdingCosts&&typeof input.holdingCosts==='object'&&!Array.isArray(input.holdingCosts)?input.holdingCosts:{};
  const financingInfo=input?.financing&&typeof input.financing==='object'?input.financing:{};
  const days=input?.holdDays??holdingInfo.days??holdingInfo.durationDays??null;
  const months=input?.holdMonths??holdingInfo.months??(days==null?null:days/30);
  if(days!==null&&(!finiteNonNegative(days)||days===0))throw new Error('INVALID_HOLD_DAYS');
  return {acquisition,disposition,holding,financing,days,months,financingInfo,holdingInfo,rehab};
}

function compile(input,exitValue,rehabMultiplier) {
  const rehab=normalizeRehab(input), costs=normalizeCosts(input,rehab);
  const lines=[...costs.acquisition.map(line=>({...line,group:'acquisition'})),...costs.disposition.map(line=>({...line,group:'disposition'})),...costs.holding.map(line=>({...line,group:'holding'})),...costs.financing.map(line=>({...line,group:'financing'}))];
  const durationUnknown=costs.holding.some(line=>(line.basis==='PER_DAY'||line.basis==='PER_MONTH')&&costs.days===null&&!line.days&&!line.months);
  const fixed={project:rehab.total*rehabMultiplier,cash:rehab.total*rehabMultiplier};let purchaseCoeff=0,cashPurchaseCoeff=0,unknown=[];
  for(const line of lines){
    if(line.status==='UNKNOWN'||(line.basis==='PER_DAY'||line.basis==='PER_MONTH')&&line.amount!=null&&durationUnknown){unknown.push(line.name);continue;}
    if(line.status==='NOT_APPLICABLE')continue;
    const value=lineAmount(line,{purchasePrice:1,exitValue,days:costs.days,months:costs.months});
    if(value===null){unknown.push(line.name);continue;}
    const purchaseRate=line.basis==='PERCENT_OF_PURCHASE'?rate(line.amount,'cost_percentage'):0;
    if(purchaseRate){purchaseCoeff+=purchaseRate;if(line.group!=='disposition')cashPurchaseCoeff+=purchaseRate;continue;}
    const actual=line.basis==='PERCENT_OF_EXIT'?value:value;
    fixed.project+=actual;
    if(line.group!=='disposition')fixed.cash+=actual;
  }
  const financingMode=String(costs.financingInfo.mode??input?.financingMode??'CASH').toUpperCase();
  if(financingMode!=='CASH'){
    const loanAmount=costs.financingInfo.loanAmount??null,ltv=costs.financingInfo.ltv??costs.financingInfo.loanToValue??null;
    const interestRate=costs.financingInfo.interestRate??null,duration=costs.financingInfo.expectedDurationDays??costs.days;
    if(loanAmount===null&&ltv===null)unknown.push('loan amount or LTV');
    else {
      const loanFixed=loanAmount??0,loanCoeff=ltv===null?0:rate(ltv,'ltv');
      if(loanAmount!==null)fixed.project+=loanFixed;
      else {purchaseCoeff+=loanCoeff;cashPurchaseCoeff+=loanCoeff;}
      if(interestRate===null||duration===null)unknown.push('financing interest');
      else {const annual=rate(interestRate,'interest_rate'),interestFixed=loanFixed*annual*duration/365,interestCoeff=loanCoeff*annual*duration/365;fixed.project+=interestFixed;fixed.cash+=interestFixed;purchaseCoeff+=interestCoeff;cashPurchaseCoeff+=interestCoeff;}
    }
    const points=costs.financingInfo.points??costs.financingInfo.originationRate??null;
    if(points!==null){const p=rate(points,'points');if(loanAmount!==null){fixed.project+=loanAmount*p;fixed.cash+=loanAmount*p;}else{purchaseCoeff+=p*rate(ltv,'ltv');cashPurchaseCoeff+=p*rate(ltv,'ltv');}}
    const financingFees=costs.financingInfo.financingFees??null;if(financingFees===null)unknown.push('financing fees');else {fixed.project+=financingFees;fixed.cash+=financingFees;}
  }
  const k=1+purchaseCoeff,cashK=1+cashPurchaseCoeff;
  return {fixedProject:roundCents(fixed.project),fixedCash:roundCents(fixed.cash),purchaseCoefficient:k,cashCoefficient:cashK,unknown:[...new Set(unknown)],costs,rehab,financingMode};
}

function evaluateCompiled(compiled,exitValue,purchasePrice,hurdle) {
  const projectCost=compiled.fixedProject+compiled.purchaseCoefficient*purchasePrice;
  const cashInvested=compiled.fixedCash+compiled.cashCoefficient*purchasePrice;
  const modeledProfit=exitValue-projectCost;
  const modeledSaleProceeds=exitValue-(projectCost-purchasePrice);
  let metric=null;
  if(hurdle.type==='CASH_ON_CASH')metric=cashInvested===0?null:modeledProfit/cashInvested;
  if(hurdle.type==='RETURN_ON_TOTAL_PROJECT_COST')metric=projectCost===0?null:modeledProfit/projectCost;
  if(hurdle.type==='PROFIT_MARGIN_ON_SALE')metric=exitValue===0?null:modeledProfit/exitValue;
  return {purchasePrice:roundCents(purchasePrice),modeledProfit:roundCents(modeledProfit),totalProjectCost:roundCents(projectCost),cashInvested:roundCents(cashInvested),modeledSaleProceeds:roundCents(modeledSaleProceeds),selectedReturnMetric:metric===null?null:Number(metric.toFixed(10)),hurdleRate:hurdle.rate,meetsHurdle:metric!==null&&metric+1e-10>=hurdle.rate};
}

export function evaluateMao(input,{exitValue,purchasePrice,rehabMultiplier=1}={}) {
  if(!finiteNonNegative(exitValue)||!finiteNonNegative(purchasePrice))throw new Error('INVALID_EVALUATION_PRICE');
  const hurdle=normalizeHurdle(input);const compiled=compile(input,exitValue,rehabMultiplier);return {...evaluateCompiled(compiled,exitValue,purchasePrice,hurdle),costCompleteness:compiled.unknown.length?'INCOMPLETE':'COMPLETE',unknownCosts:compiled.unknown,warnings:[...compiled.rehab.warnings,...(compiled.unknown.length?[UNKNOWN_MAO_WARNING]:[])]};
}

export function solveMao(input,{exitValue,rehabMultiplier=1}={}) {
  if(!finiteNonNegative(exitValue))throw new Error('INVALID_EXIT_VALUE');
  const hurdle=normalizeHurdle(input),compiled=compile(input,exitValue,rehabMultiplier);
  if(compiled.rehab.status==='MISSING')return {status:'UNAVAILABLE',exitValue:roundCents(exitValue),reason:'REHAB_REQUIRED',costCompleteness:'UNAVAILABLE',warnings:compiled.rehab.warnings};
  const unknown=compiled.unknown, r=hurdle.rate, k=compiled.purchaseCoefficient, cashK=compiled.cashCoefficient, fixed=compiled.fixedProject, cashFixed=compiled.fixedCash;
  let raw;
  if(hurdle.type==='CASH_ON_CASH')raw=(exitValue-fixed-r*cashFixed)/(k+r*cashK);
  else if(hurdle.type==='RETURN_ON_TOTAL_PROJECT_COST')raw=(exitValue-fixed*(1+r))/(k*(1+r));
  else raw=((1-r)*exitValue-fixed)/k;
  if(!Number.isFinite(raw))return {status:'UNAVAILABLE',exitValue:roundCents(exitValue),reason:'SOLVER_UNAVAILABLE',costCompleteness:unknown.length?'INCOMPLETE':'COMPLETE',unknownCosts:unknown,warnings:[...compiled.rehab.warnings]};
  let price=Math.max(0,Math.floor(raw*100+1e-8)/100);
  let evaluation=evaluateCompiled(compiled,exitValue,price,hurdle);
  for(let i=0;i<3&&evaluateCompiled(compiled,exitValue,price+0.01,hurdle).meetsHurdle;i++)price=roundCents(price+0.01);
  for(let i=0;i<3&&!evaluation.meetsHurdle&&price>=0;i++){price=roundCents(Math.max(0,price-0.01));evaluation=evaluateCompiled(compiled,exitValue,price,hurdle);}
  return {status:'AVAILABLE',costCompleteness:unknown.length?'INCOMPLETE':'COMPLETE',unknownCosts:unknown,warnings:[...compiled.rehab.warnings,...(unknown.length?[UNKNOWN_MAO_WARNING]:[])],hurdle,solver:{method:'EXACT_LINEAR',bounds:{minimum:0,maximum:Math.max(0,raw)},toleranceCents:1,iterationCap:6,rawSolution:raw},...evaluation,exitValue:roundCents(exitValue),rehabMultiplier};
}

function conflict(exitBases,independent) {
  const low=independent.find(item=>item.basis==='INDEPENDENT_LOW')?.value,high=independent.find(item=>item.basis==='INDEPENDENT_HIGH')?.value;
  return exitBases.map(item=>({...item,conflict:(item.basis==='ANALYST_EXIT'||item.basis==='SPONSOR_EXIT')&&low!=null&&high!=null&&(item.value<low||item.value>high),evidenceStatus:item.evidenceStatus??'UNKNOWN'}));
}

export function calculateAcquisitionDecision(input={}) {
  if((input.strategy??STRATEGY)!==STRATEGY)throw new Error('STRATEGY_NOT_SUPPORTED');
  const hasAcquisitionTreatment=Object.prototype.hasOwnProperty.call(input,'acquisitionCosts')||Object.prototype.hasOwnProperty.call(input,'acquisitionCostItems')||Object.prototype.hasOwnProperty.call(input,'acquisitionCostsTreatment');
  const hasDispositionTreatment=Object.prototype.hasOwnProperty.call(input,'dispositionCosts')||Object.prototype.hasOwnProperty.call(input,'dispositionCostItems')||Object.prototype.hasOwnProperty.call(input,'dispositionCostsTreatment');
  if(!hasAcquisitionTreatment)return {status:'UNAVAILABLE',strategy:STRATEGY,reason:'ACQUISITION_COST_TREATMENT_REQUIRED'};
  if(!hasDispositionTreatment)return {status:'UNAVAILABLE',strategy:STRATEGY,reason:'DISPOSITION_COST_TREATMENT_REQUIRED'};
  const hurdle=normalizeHurdle(input),exitBases=normalizeExitBases(input);if(!exitBases.length)return {status:'UNAVAILABLE',strategy:STRATEGY,reason:'EXIT_VALUE_REQUIRED',hurdle};
  const independent=exitBases.filter(item=>item.basis.startsWith('INDEPENDENT_'));const exits=conflict(exitBases,independent);
  const results=exits.map(exit=>({...solveMao(input,{exitValue:exit.value}),exitBasis:exit.basis,exitEvidenceSnapshotId:exit.evidenceSnapshotId??input.evidenceSnapshotId??null,exitEvidenceStatus:exit.evidenceStatus,exitProvenance:exit.provenance,exitConflict:exit.conflict}));
  const selectedBasis=input.selectedExitBasis??'INDEPENDENT_POINT';const selected=results.find(item=>item.exitBasis===selectedBasis)||results[0];
  if(!selected)return {status:'UNAVAILABLE',strategy:STRATEGY,reason:'EXIT_VALUE_REQUIRED',hurdle};
  const mao=selected.calculatedMao??selected.purchasePrice; // normalized below
  for(const result of results)result.calculatedMao=result.status==='AVAILABLE'?result.purchasePrice:null;
  const chosen=results.find(item=>item.exitBasis===selected.exitBasis)??selected, selectedMao=chosen.calculatedMao;
  const walkCap=input.manualWalkAwayCap??null;if(walkCap!==null&&!finiteNonNegative(walkCap))throw new Error('INVALID_WALKAWAY_CAP');
  const effectiveWalkaway=selectedMao===null?null:walkCap===null?selectedMao:Math.min(selectedMao,walkCap);
  const target=normalizeTarget(input,selectedMao??0);
  const enc=normalizeEncumbrances(input.encumbrances??input.propertyEncumbrances??[]);
  const ask=input.sellerAskingPrice??input.sellerAsk??null;const auction=input.auctionMinimum??null;
  for(const value of [ask,auction])if(value!==null&&!finiteNonNegative(value))throw new Error('INVALID_SELLER_CONSTRAINT');
  const evaluatePoint=value=>value===null?null:evaluateMao(input,{exitValue:chosen.exitValue,purchasePrice:value});
  const sellerAskEconomics=evaluatePoint(ask),targetEconomics=evaluatePoint(target.target),proposedEconomics=evaluatePoint(input.proposedOffer??null);
  const knownGap=selectedMao===null?null:roundCents(selectedMao-enc.knownTotal);
  const sensitivity=[];for(const result of results){for(const multiplier of REHAB_MULTIPLIERS){const solved=solveMao(input,{exitValue:result.exitValue,rehabMultiplier:multiplier});sensitivity.push({exitBasis:result.exitBasis,exitValue:result.exitValue,rehabMultiplier:multiplier,rehabCase:multiplier===1?'BASE':`PLUS_${Math.round((multiplier-1)*100)}_PERCENT`,calculatedMao:solved.status==='AVAILABLE'?solved.purchasePrice:null,status:solved.status,costCompleteness:solved.costCompleteness,exitEvidenceSnapshotId:result.exitEvidenceSnapshotId});}}
  const warnings=[...new Set(results.flatMap(item=>item.warnings??[]))];if(enc.unknownCount)warnings.push(`${enc.unknownCount} encumbrance amount(s) are unknown; unknown is not zero.`);if(knownGap!==null&&knownGap<0)warnings.push(`Known encumbrances exceed the selected MAO by $${Math.abs(knownGap).toFixed(2)}. Meeting the selected return hurdle would require resolution, reduction, assumption, payoff restructuring, or other treatment of at least $${Math.abs(knownGap).toFixed(2)} of known obligations, subject to title/legal verification.`);
  const condition=normalizeRehab(input);const completeness=chosen.costCompleteness==='UNAVAILABLE'?'UNAVAILABLE':chosen.costCompleteness==='INCOMPLETE'||condition.warnings.length?'INCOMPLETE':'COMPLETE';
  const unknownCosts=[...new Set(results.flatMap(item=>item.unknownCosts??[]))];
  const outputs={status:chosen.status==='UNAVAILABLE'?'UNAVAILABLE':'AVAILABLE',strategy:STRATEGY,hurdle,exitResults:results,selectedExitBasis:chosen.exitBasis,selectedExitValue:chosen.exitValue,calculatedMao:selectedMao,manualWalkawayCap:walkCap,effectiveWalkawayPrice:effectiveWalkaway,targetOffer:target.target,targetPolicy:target.policy,sellerAskingPrice:ask,auctionMinimum:auction,apparentSellerEquityAtAsk:ask===null?null:roundCents(ask-enc.knownTotal),sellerAskEconomics,targetEconomics,proposedEconomics,knownEncumbranceTotal:enc.knownTotal,unknownEncumbranceCount:enc.unknownCount,encumbranceGap:knownGap,encumbrances:enc.items,rehab:condition,sensitivity,warnings,costCompleteness:completeness,unknownCosts,financingMode:String(input.financing?.mode??input.financingMode??'CASH').toUpperCase(),titleVerified:input.titleVerified===true};
  outputs.diligenceQuestions=acquisitionDecisionQuestions(outputs);
  const inputsPayload=clone({strategy:STRATEGY,...input,normalizedExitBases:exitBases,normalizedEncumbrances:enc.items,normalizedRehab:condition});
  outputs.modelFingerprint=hash(JSON.stringify({modelVersion:MAO_MODEL_VERSION,inputs:inputsPayload,outputs:{...outputs,modelFingerprint:undefined}}));
  outputs.decisionVersion=MAO_MODEL_VERSION;outputs.inputsPayload=inputsPayload;outputs.hurdleDefinition=hurdle.formula;
  return outputs;
}

export const calculateMAO=calculateAcquisitionDecision;
export const solveMAO=solveMao;
