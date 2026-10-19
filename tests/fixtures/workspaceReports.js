import {blankInputs} from '../../src/investment-workspace/analysis.js';

// Artificial scenario assumptions only. The six production-like evidence cards
// are loaded separately from the retained, private handoff; never copied here.
export function reportScenario(evidence, index=0){
  const p=evidence.properties[index];
  const [purchase,exit,rehab]=[[180000,300000,35000],[230000,380000,45000],[240000,390000,40000],[85000,175000,30000],[90000,170000,25000],[130000,240000,30000]][index];
  const compReviews={};
  if(index===0)compReviews[p.sales[0].evidenceRef]={include:true,notes:'Research only; condition and transfer terms require verification.'};
  if(index===3){compReviews[p.sales[0].evidenceRef]={include:false,notes:'Excluded from this demonstration scenario pending transfer and condition evidence.'};compReviews[p.sales[1].evidenceRef]={include:true,notes:'Research candidate only; size difference requires diligence.'};}
  return {id:`00000000-0000-4000-8000-00000000000${index+1}`,propertyRef:p.ref,name:`QA demonstration ${p.ref}`,revision:2,
    evidenceFingerprint:evidence.fingerprint,savedAt:'2026-10-13T23:00:00.000Z',
    inputs:{...blankInputs(),purchasePrice:String(purchase),exitValue:String(exit),rehabCost:String(rehab),contingency:'10',acquisitionFixed:'2500',sellingCommissionRate:'5',sellerClosingRate:'1',propertyTaxes:'8',insurance:'3',utilities:'5'},
    targetType:'PROFIT_MARGIN_ON_SALE',compReviews,notes:'QA demonstration only: retained real evidence with artificial analyst assumptions. Not observed financial results.',demonstration:true,riskRequested:true,
    risk:{seed:`workspace-qa-${p.ref}`,iterations:500,variables:{exitValue:{min:exit*.85,mode:exit,max:exit*1.1},rehabCost:{min:rehab*.9,mode:rehab,max:rehab*1.3},renovationDays:{min:75,mode:90,max:120},marketingDays:{min:25,mode:30,max:60}},rationale:'Artificial independent triangular assumptions for report QA; not calibrated to market or condition evidence.'}};
}

export function reportMatrix(evidence){
  const actual=evidence.properties.map((p,i)=>({name:p.ref,property:p,scenario:reportScenario(evidence,i),evidenceKind:'Retained real subject / artificial scenario'}));
  const variant=(name)=>({name,property:structuredClone(actual[0].property),scenario:structuredClone(actual[0].scenario),evidenceKind:'Synthetic edge case derived from retained subject; NOT additional vendor evidence'});
  const none=variant('QA-NO-COMPS');none.property.sales=[];none.property.findings=[];none.scenario.compReviews={};none.scenario.riskRequested=false;
  const one=variant('QA-ONE-COMP');one.property.sales=one.property.sales.slice(0,1);one.property.findings=[];
  const unknown=variant('QA-ZERO-UNKNOWN');unknown.property.sales=[];unknown.property.findings=[];unknown.property.attributes={};unknown.property.avm={price:null,low:null,high:null};unknown.property.historicalTrigger.amount=null;unknown.scenario.compReviews={};unknown.scenario.riskRequested=false;
  for(const k of ['rehabCost','contingency','acquisitionFixed','sellingCommissionRate','sellerClosingRate','propertyTaxes','insurance','utilities'])unknown.scenario.inputs[k]='0';
  return [...actual,none,one,unknown];
}
