export function detailRoute(ref,snapshot){return '#property-detail?'+new URLSearchParams({subject:ref,snapshot}).toString();}
export function identifyRoute(ref,snapshot,scenario){const params=new URLSearchParams({subject:ref,snapshot});if(scenario)params.set('scenario',scenario);return '#analyze-property?'+params.toString();}
export function investmentRoute(ref,snapshot,scenario,tab,mode){const params=new URLSearchParams({subject:ref,snapshot});if(scenario)params.set('scenario',scenario);if(tab)params.set('tab',tab);if(mode)params.set('mode',mode);return '#investment?'+params.toString();}
export function routeContext(hash){const params=new URLSearchParams(hash.split('?')[1]||'');return {subject:params.get('subject'),snapshot:params.get('snapshot'),scenario:params.get('scenario'),tab:params.get('tab'),mode:params.get('mode')};}
export function requestedSubject(hash,properties,fingerprint){
 const context=routeContext(hash),ref=context.subject;if(!ref)return null;
 const p=properties.find(x=>x.ref===ref);
 if(!p||context.snapshot!==(p.evidenceFingerprint??fingerprint))throw new Error('Subject or evidence snapshot does not match this local workspace. No scenario was opened.');
 return p;
}
export function requestedScenario(hash,propertyRef,scenarios=[],evidenceFingerprint=null){
 const id=routeContext(hash).scenario;if(!id)return null;
 const scenario=scenarios.find(x=>x.id===id);
 if(!scenario||scenario.propertyRef!==propertyRef)throw new Error('Scenario does not belong to this Property and evidence context. Nothing was opened.');
 if(evidenceFingerprint&&scenario.evidenceFingerprint!==evidenceFingerprint)throw new Error('Scenario does not match the requested evidence snapshot. Nothing was opened.');
 return scenario;
}
