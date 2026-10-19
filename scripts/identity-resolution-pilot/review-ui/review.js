/* Private local UI: no analytics, remote resources, browser storage or provider calls. */
const $=id=>document.getElementById(id);
const fields=[['street','Street address'],['city','City'],['state','State'],['postalCode','ZIP-5']];
let token='',current=null,reviewer='',dirty=false,pending=null;
let suggestion=null,suggestionRef=null,suggestionDeadline=0,suggestionTimer=null;
let reviewMode='DETAILED';
const unavailableMessage='Previous address suggestion unavailable. New verification requires separate authorization.';
const labels={APPROVED:'Approved',NEEDS_MORE_EVIDENCE:'Needs more evidence',REJECTED:'Rejected'};
function element(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function facts(id,rows){const node=$(id);node.replaceChildren();for(const [k,v]of rows){node.append(element('dt',k),element('dd',v??'Not established'));}}
function assessment(a,{initial=false}={}){
  const tier=a?.tier??'INSUFFICIENT_EVIDENCE';if(current)current.reviewAssessment=a;
  $('review-tier').textContent={ROUTINE_REVIEW:'Routine address review',EXCEPTION_REVIEW:'Exception review',INSUFFICIENT_EVIDENCE:'Insufficient evidence'}[tier];
  $('review-assessment').className=`tier-card ${tier==='EXCEPTION_REVIEW'?'exception':tier==='INSUFFICIENT_EVIDENCE'?'insufficient':''}`;
  $('tier-address').textContent=suggestion?.formattedAddress??'No permitted complete address proposal';$('tier-attribution').hidden=!suggestion;
  $('tier-identity').textContent=`County identity: ${a?.countyExact?'unique / exact at source snapshot':'not established for routine review'}. Assessor relationship: ${a?.assessorExact?'exact at source snapshot':'requires review'}.`;
  $('tier-reasons').replaceChildren();
  for(const c of a?.checks??[]){if(!c.pass)$('tier-reasons').append(element('li',`${c.code.replaceAll('_',' ')} — ${c.detail}`));}
  if(tier==='ROUTINE_REVIEW')$('tier-reasons').append(element('li','Street/city agree; state agrees with jurisdiction; ZIP available as a temporary proposal; one rooftop result. No outstanding source-quality flag.'));
  $('tier-action').textContent=a?.requiredAction??unavailableMessage;
  $('assembled-reference-list').replaceChildren();
  for(const [field,label]of fields){const refs=a?.componentReferences?.[field]??[];const section=element('section');section.append(element('strong',label));for(const ref of refs)section.append(element('p',`${ref.source}: ${ref.citation}`));if(!refs.length)section.append(element('p','No available source reference assembled.'));$('assembled-reference-list').append(section);}
  if(initial){reviewMode=tier==='ROUTINE_REVIEW'?'ROUTINE':'DETAILED';$('supporting-review').open=tier!=='ROUTINE_REVIEW';$('detailed-review').open=tier!=='ROUTINE_REVIEW';$('routine-evidence-ack').checked=false;$('routine-notes').value='';}
  if(tier!=='ROUTINE_REVIEW'){reviewMode='DETAILED';$('routine-evidence-ack').checked=false;$('detailed-review').open=true;}
  $('routine-controls').hidden=reviewMode!=='ROUTINE';
  $('decision').querySelector('option[value="APPROVED"]').textContent=reviewMode==='ROUTINE'?'Confirm address evidence':'Approved';
}
function audit(value){
  $('decision-audit').hidden=!value?.historicalDecisionExists;$('audit-entries').replaceChildren();
  const state=v=>v===true?'yes':v===false?'no':'not independently revalidated';
  $('audit-state').textContent=value?`Historical decision exists: ${value.historicalDecisionExists?'yes':'no'}. Supporting evidence available: ${state(value.supportingEvidenceAvailable)}. Reuse permitted: ${state(value.supportingEvidenceReusePermitted)}. Effectiveness: ${value.operationalEffectiveness}. No canonical identity created.`:'';
  for(const e of value?.entries??[])$('audit-entries').append(element('li',`${e.decision} · ${e.reviewedBy??'Reviewer not recorded'} · ${e.reviewedAt??'Timestamp not recorded'} · ${e.sourceDependency}`));
}
async function request(path,body){
  const started=performance.now();
  const result=await fetch(path,{method:body?'POST':'GET',cache:'no-store',credentials:'omit',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const json=await result.json();if(!result.ok)throw Object.assign(new Error(json.error),{errors:json.errors??[json.error]});
  const evidence=json.googleSuggestion??(typeof json.available==='boolean'?json:null);if(evidence?.available)evidence.validForMs=Math.max(0,evidence.validForMs-(performance.now()-started));return json;
}
function clearSuggestion(clearDraft=false){
  clearTimeout(suggestionTimer);suggestion=null;suggestionDeadline=0;
  $('suggestion-content').hidden=true;$('suggestion-unavailable').hidden=false;$('suggestion-unavailable').textContent=unavailableMessage;
  for(const id of ['suggestion-address','suggestion-facts','suggestion-limitations','suggestion-difference-list'])$(id).replaceChildren();
  $('suggestion-differences').hidden=true;$('suggestion-suffix').hidden=true;
  if(clearDraft&&suggestionRef&&current){
    $('decision-form').reset();for(const [f]of fields){$(`component-${f}`).value=current.packet.addressReview.components[f]??'';$(`evidence-${f}`).value='';$(`verification-${f}`).value='UNVERIFIED';}
    $('reviewer').value=reviewer;dirty=true;messages([unavailableMessage,'Suggestion-derived draft cleared. No decision was saved.']);
    $('save-confirmation').textContent='';$('saved-status').textContent='STALE · REVIEW AGAIN';$('stale-warning').hidden=false;$('stale-warning').textContent='Suggestion evidence is unavailable. Its draft or prior decision cannot carry forward; review requires permitted evidence.';
    const nav=$('pilot-nav').querySelector('button[aria-current="true"] span');if(nav)nav.textContent='Evidence unavailable · Review again';
    current.decision={};current.googleSuggestion={available:false};
  }
  if(clearDraft)suggestionRef=null;
  if(clearDraft&&current){assessment(null);if(current.decisionAudit?.entries?.at(-1)?.sourceDependency==='TEMPORARY_GOOGLE_DEPENDENT'){current.decisionAudit={...current.decisionAudit,supportingEvidenceAvailable:false,supportingEvidenceReusePermitted:false,operationalEffectiveness:'SUSPENDED'};audit(current.decisionAudit);}}
}
function showSuggestion(s){
  clearSuggestion(false);
  if(!s?.available||s.reference?.packetSha256!==current?.packet.packetSha256||s.reference?.pilotCode!==current?.packet.pilotCode||s.validForMs<=0){clearSuggestion(true);return;}
  suggestion=s;const duration=Math.min(s.validForMs,Date.parse(s.expiresAt)-Date.now());
  if(duration<=0){clearSuggestion(true);return;}
  suggestionDeadline=performance.now()+duration;suggestionTimer=setTimeout(()=>clearSuggestion(true),Math.min(duration,2147483647));
  $('suggestion-content').hidden=false;$('suggestion-unavailable').hidden=true;$('suggestion-address').textContent=s.formattedAddress;
  facts('suggestion-facts',[['County situs',current.packet.addressReview.rawCountySitus],['Street',`${s.streetNumber} ${s.route}`],['City',s.components.city],['State / ZIP',`${s.components.state} / ${s.components.postalCode}`],['Precision',s.precision],['Classification',s.classification],['Partial-match field',s.partialMatchFieldPresent?String(s.partialMatch):'Not returned'],['Retrieved',s.retrievedAt],['Review deadline',s.expiresAt]]);
  $('suggestion-limitations').textContent=`${s.source}. ${s.limitations}`;
  $('suggestion-suffix').hidden=!s.suffixReview;
  for(const row of s.differences){const item=element('div',undefined,`difference-row${row.differs?' difference-changed':''}`);item.append(element('strong',fields.find(([f])=>f===row.field)?.[1]??row.field),element('span',`County: ${row.county??'Missing in source'}`),element('span',`Google: ${row.proposed}`));$('suggestion-difference-list').append(item);}
  if(s.suffixReview)$('suggestion-differences').hidden=false;
  if(s.reviewAssessment)assessment(s.reviewAssessment);
}
async function refreshSuggestion(){
  if(!current||!token)return false;const code=current.packet.pilotCode,packetHash=current.packet.packetSha256;
  try{const s=await request(`/api/pilots/${code}/suggestion`);if(!current||current.packet.pilotCode!==code||current.packet.packetSha256!==packetHash)return false;
    if(!s.available||s.reference?.packetSha256!==packetHash||(suggestionRef&&JSON.stringify(s.reference)!==JSON.stringify(suggestionRef))){clearSuggestion(true);return false;}
    showSuggestion(s);return !!suggestion;
  }catch{clearSuggestion(true);return false;}
}
function differences(){if(!suggestion||performance.now()>=suggestionDeadline){clearSuggestion(true);return;}$('suggestion-differences').hidden=false;$('suggestion-differences').focus();}
function messages(errors,success=false){const box=$('validation-results');box.className=success?'success':'validation';box.replaceChildren(element('strong',success?'Validation complete':'Review needed'));if(errors.length){const list=element('ul');for(const msg of errors)list.append(element('li',msg));box.append(list);}}
function formData(){if(reviewMode==='ROUTINE')return {pilotCode:current.packet.pilotCode,packetSha256:current.packet.packetSha256,decisionRevision:current.decisionRevision,decision:$('decision').value,reviewedBy:$('reviewer').value,reviewerAcknowledged:$('reviewer-ack').checked,notes:$('routine-notes').value,reviewMode:'ROUTINE',routineEvidenceReviewed:$('routine-evidence-ack').checked,suggestionEvidenceRef:suggestion?.reference};
  return {pilotCode:current.packet.pilotCode,packetSha256:current.packet.packetSha256,decisionRevision:current.decisionRevision,decision:$('decision').value,reviewedBy:$('reviewer').value,reviewerAcknowledged:$('reviewer-ack').checked,
  confirmedAddress:Object.fromEntries(fields.map(([f])=>[f,$(`component-${f}`).value])),componentEvidenceReferences:Object.fromEntries(fields.map(([f])=>[f,$(`evidence-${f}`).value])),componentVerification:Object.fromEntries(fields.map(([f])=>[f,$(`verification-${f}`).value])),
  notes:$('review-notes').value,supportingEvidenceReferences:$('supporting-evidence').value,contradictionStatus:$('contradiction-status').value,addressChangeNotes:$('address-change-notes').value,acreageAcknowledged:$('acreage-ack').checked,acreageNotes:$('acreage-notes').value,...(suggestionRef?{suggestionEvidenceRef:suggestionRef}:{})};}
function render(data){
  current=data;dirty=false;$('review-content').hidden=false;$('page-message').textContent='';$('validation-results').replaceChildren();$('validation-results').className='';$('save-confirmation').textContent='';$('save-confirmation').className='';
  const p=data.packet,d=data.decision,stale=d.stale;
  $('synthetic-banner').hidden=!p.synthetic;
  $('packet-title').textContent=`${p.pilotCode} · Source packet`;
  facts('identity-facts',[['County ATN',p.county.atn],['County APN9',p.county.apn9]]);$('raw-situs').textContent=p.addressReview.rawCountySitus;
  facts('classification-facts',[['Official use',`${p.assessor.useCode} · ${p.assessor.officialDescription}`],['Research class',p.assessor.researchCategory],['County flags',p.assessor.countyReviewFlags.join(', ')||'None recorded']]);
  $('missing-components').textContent=p.canonicalValidation.missingComponents.length?`Missing from source: ${p.canonicalValidation.missingComponents.map(k=>fields.find(([f])=>f===k)?.[1]??k).join(' and ')}. Evidence required; no values inferred.`:'All components have text, but human evidence verification is still required.';
  facts('source-dates',[['Assessor as-of',p.sourceDates.assessorAsOf],['Power-to-Sell',p.sourceDates.powerToSellAsOf],['Acquisition',p.sourceDates.acquiredAt],['DB snapshot',p.sourceDates.databaseSnapshotAt],['Local verified',p.sourceDates.localVerificationAt]]);
  facts('integrity-facts',[['Packet SHA-256',p.packetSha256],['Canonical status',p.canonicalStatus],['Format check',p.canonicalValidation.formatValid?'Complete format only':'Incomplete'],['Postal validation','Not performed'],['Identity conflicts',p.identityConflicts.join(', ')||'None in source snapshot']]);
  const flagged=p.assessor.countyReviewFlags.includes('ACREAGE_DELTA_GT_0_01');$('acreage-card').hidden=!flagged;$('acreage-review').hidden=!flagged;$('stale-warning').hidden=!stale;
  $('stale-warning').textContent=d.suggestionUnavailable?'Suggestion evidence is unavailable. Its prior decision cannot carry forward; review requires permitted evidence.':'The packet has changed since the saved decision. Its prior decision is invalid for this packet. Review the evidence again; no approval carries forward.';
  $('saved-status').textContent=stale?'STALE · REVIEW AGAIN':(labels[d.effectiveDecision]??'NOT REVIEWED');
  const container=$('component-fields');container.replaceChildren();
  for(const [key,label]of fields){
    const missing=p.addressReview.missingComponents.includes(key),section=element('section',undefined,`component${missing?' missing':''}`),heading=element('h3',label);
    if(missing)heading.append(element('span','MISSING IN SOURCE','missing-tag'));section.append(heading);
    const inputLabel=element('label',`Confirmed ${label.toLowerCase()}`);inputLabel.htmlFor=`component-${key}`;const input=element('input');input.id=inputLabel.htmlFor;input.autocomplete='off';input.maxLength=key==='state'?2:key==='postalCode'?5:180;input.value=(d.confirmedAddress?.[key]??p.addressReview.components[key]??'');input.placeholder=missing?'Enter only when supported by evidence':'Verify against your source';section.append(inputLabel,input);
    const row=element('div',undefined,'evidence-row'),evidence=element('div'),check=element('div');const l=element('label','Supporting source / reference');l.htmlFor=`evidence-${key}`;const ref=element('input');ref.id=l.htmlFor;ref.maxLength=1200;ref.placeholder='Document, date, page / record';ref.value=d.componentEvidenceReferences?.[key]??'';evidence.append(l,ref);
    const vl=element('label','Verification');vl.htmlFor=`verification-${key}`;const select=element('select');select.id=vl.htmlFor;for(const [v,t]of [['UNVERIFIED','Not verified'],['VERIFIED','I verified this'],['CONTRADICTORY','Contradictory']]){const opt=element('option',t);opt.value=v;select.append(opt);}select.value=stale?'UNVERIFIED':d.componentVerification?.[key]??'UNVERIFIED';check.append(vl,select);row.append(evidence,check);section.append(row);container.append(section);
  }
  $('reviewer').value=reviewer;$('decision').value=stale?'':d.decision??'';$('reviewer-ack').checked=false;
  $('contradiction-status').value=stale?'NOT_REVIEWED':d.contradictionStatus??'NOT_REVIEWED';$('supporting-evidence').value=d.supportingEvidenceReferences??'';$('review-notes').value=d.notes??'';$('address-change-notes').value=d.addressChangeNotes??'';
  $('acreage-ack').checked=!stale&&d.acreageAcknowledged===true;$('acreage-notes').value=d.acreageNotes??'';
  if(d.reviewedAt){$('save-confirmation').textContent=`Last local decision: ${labels[d.decision]??d.decision} · ${d.reviewedBy} · ${d.reviewedAt}${stale?' (stale; not effective)':''}`;}
  for(const b of $('pilot-nav').querySelectorAll('button'))b.setAttribute('aria-current',String(b.dataset.code===p.pilotCode));
  const initialAssessment=data.reviewAssessment;suggestionRef=d.suggestionEvidenceRef??null;showSuggestion(data.googleSuggestion);delete current.googleSuggestion;assessment(initialAssessment,{initial:true});$('routine-notes').value=d.notes??'';audit(data.decisionAudit);$('decision-form').hidden=false;
  if(d.suggestionUnavailable)messages([unavailableMessage,'Saved suggestion-derived content is hidden; its prior decision is not effective.']);
}
async function navigation(){const result=await request('/api/pilots');reviewer=result.reviewer;const nav=$('pilot-nav');nav.replaceChildren();for(const row of result.pilots){const b=element('button',row.pilotCode);b.type='button';b.dataset.code=row.pilotCode;b.setAttribute('aria-current',String(row.pilotCode===current?.packet.pilotCode));b.append(element('span',`${row.stale?'Stale decision':labels[row.decision]??'Not reviewed'}${row.flagged?' · Acreage flag':''}`));b.onclick=()=>navigate(row.pilotCode);nav.append(b);}}
async function navigate(code){if(dirty){pending=code;$('navigation-warning').hidden=false;return;}try{render(await request(`/api/pilots/${code}`));}catch(e){$('page-message').className='notice danger';$('page-message').textContent=e.message;$('review-content').hidden=true;}}
$('login-form').onsubmit=async event=>{event.preventDefault();token=$('access-code').value.trim();try{await navigation();$('access-code').value='';$('login-error').textContent='';$('login').hidden=true;$('workspace').hidden=false;await navigate('IP-P1');}catch{token='';$('login-error').textContent='Access denied. Check the terminal access code, session expiry or local server.';}};
$('decision-form').oninput=()=>{if(reviewMode==='ROUTINE'&&suggestion)suggestionRef=suggestion.reference;dirty=true;$('save-confirmation').textContent='Unsaved changes';$('save-confirmation').className='muted';};
$('discard').onclick=()=>{dirty=false;$('navigation-warning').hidden=true;const target=pending;pending=null;if(target==='LOCK')lock();else navigate(target);};
function lock(){clearSuggestion(false);suggestionRef=null;token='';current=null;dirty=false;$('workspace').hidden=true;$('login').hidden=false;$('decision-form').reset();$('component-fields').replaceChildren();$('pilot-nav').replaceChildren();for(const id of ['identity-facts','classification-facts','source-dates','integrity-facts','raw-situs','save-confirmation','validation-results','tier-address','tier-identity','tier-reasons','tier-action','assembled-reference-list','audit-state','audit-entries'])$(id).replaceChildren();$('access-code').focus();}
$('lock').onclick=()=>{if(dirty){pending='LOCK';$('navigation-warning').hidden=false;}else lock();};
async function run(save){if(reviewMode==='ROUTINE'&&$('decision').value==='APPROVED'&&!$('routine-evidence-ack').checked){messages(['EXPLICIT_EVIDENCE_REVIEW_REQUIRED: personally review the component evidence before confirmation.']);return;}$('save').disabled=true;$('validate').disabled=true;try{const result=await request(`/api/pilots/${current.packet.pilotCode}/${save?'decision':'validate'}`,formData());if(save){render(result);await navigation();$('save-confirmation').className='success';$('save-confirmation').textContent=`Saved locally: ${labels[result.decision.decision]} · ${result.decision.reviewedAt}. No Property or database record created.`;}else messages(result.valid?['Review requirements satisfied for the chosen decision. Nothing was saved.',`Address format: ${result.canonicalValidation.formatValid?'complete':'incomplete'}; postal validation was not performed.`]:result.errors,result.valid);}catch(e){messages(e.errors??[e.message]);}finally{$('save').disabled=false;$('validate').disabled=false;}}
$('validate').onclick=()=>run(false);$('decision-form').onsubmit=e=>{e.preventDefault();run(true);};
$('use-suggestion').onclick=async()=>{
  $('use-suggestion').disabled=true;
  try{if(!await refreshSuggestion())return;
    reviewMode='DETAILED';$('routine-controls').hidden=true;$('detailed-review').open=true;
    suggestionRef=suggestion.reference;
    for(const [f]of fields){if(suggestion.components[f])$(`component-${f}`).value=suggestion.components[f];$(`verification-${f}`).value='UNVERIFIED';$(`evidence-${f}`).value=(current.reviewAssessment?.componentReferences?.[f]??[]).map(r=>r.citation).join('\n');}
    $('supporting-evidence').value=fields.map(([f])=>`${f}: ${$(`evidence-${f}`).value}`).join('\n');
    $('decision').value='';$('reviewer-ack').checked=false;$('contradiction-status').value='NOT_REVIEWED';dirty=true;
    $('save-confirmation').textContent='Suggestion copied to draft only. Verify each component and choose your own decision.';differences();
  }finally{$('use-suggestion').disabled=false;}
};
$('review-differences').onclick=async()=>{if(await refreshSuggestion())differences();};
$('suggestion-needs-evidence').onclick=async()=>{if(!await refreshSuggestion())return;suggestionRef=suggestion.reference;$('decision').value='NEEDS_MORE_EVIDENCE';$('reviewer-ack').checked=false;$('contradiction-status').value='UNRESOLVED';dirty=true;differences();(reviewMode==='ROUTINE'?$('routine-notes'):$('review-notes')).focus();};
$('use-detailed-review').onclick=()=>{reviewMode='DETAILED';$('routine-controls').hidden=true;$('detailed-review').open=true;$('decision').value='';$('reviewer-ack').checked=false;dirty=true;};
$('detailed-review').ontoggle=()=>{if($('detailed-review').open&&reviewMode==='ROUTINE'){reviewMode='DETAILED';$('routine-controls').hidden=true;$('decision').value='';$('reviewer-ack').checked=false;dirty=true;}};
$('routine-evidence-ack').onchange=()=>{if(suggestion)suggestionRef=suggestion.reference;dirty=true;};
// Only local evidence rechecks. No provider or replacement lookup exists.
setInterval(()=>{if(current&&token&&!document.hidden)refreshSuggestion();},30000);
document.addEventListener('visibilitychange',async()=>{
  if(document.hidden){$('suggestion-content').hidden=true;$('review-assessment').hidden=true;$('supporting-review').hidden=true;if(suggestionRef)$('decision-form').hidden=true;}
  else if(current){try{await refreshSuggestion();}finally{$('review-assessment').hidden=false;$('supporting-review').hidden=false;$('decision-form').hidden=false;}}
});
