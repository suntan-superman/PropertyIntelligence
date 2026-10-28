import React,{useState} from 'react';
import {useAuthentication} from '../auth/AuthenticationGate.jsx';
import {useNotificationDialog} from './NotificationDialog.jsx';
import {detailRoute,investmentRoute} from '../features/property-detail/navigation.js';

export const DURABLE_PROPERTY_SAVED_EVENT='pi-durable-property-saved';

async function request(path,body,csrfToken){
  const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-PI-Workspace':'local-v1',...(csrfToken?{'X-PI-CSRF':csrfToken}:{})},body:JSON.stringify(body)}),result=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(result.error||'The property could not be saved.');error.code=result.code??result.error;error.details=result.details;throw error;}return result;
}

const confidenceLabel=value=>({EXISTING_DURABLE_RECORD:'Existing durable record',REVIEWED_ADDRESS_WITH_UNVERIFIED_PARCEL:'Reviewed address; parcel not legally verified',PROVIDER_REPORTED_ADDRESS_MATCH:'Provider-reported address match',REVIEWED_ADDRESS_ONLY:'Reviewed address only'}[value]??value??'Unknown');
const unavailable=value=>value==='DURABLE_PROPERTY_STORAGE_NOT_CONFIGURED'||value===14||/firestore|unavailable|deadline exceeded/i.test(String(value??''));

async function duplicateNotice(dialog,property,duplicate){const choice=await dialog.choose({title:'Property already saved',message:'PI found an existing organization property with the same normalized address or parcel identifier. No duplicate was created and no records were merged.',details:[['Existing property',duplicate?.address??property.address],['Lifecycle',duplicate?.lifecycleStatus??'SAVED_PROPERTY'],['Identity confidence',confidenceLabel(duplicate?.identityConfidence)]],tone:'info',actions:[{label:'Cancel',value:'cancel'},{label:'Open Existing Property',value:'open',primary:true}]});if(choice==='open'){if(duplicate?.sourceSubjectRef&&duplicate.evidenceSnapshotIds?.[0])location.hash=investmentRoute(duplicate.sourceSubjectRef,duplicate.evidenceSnapshotIds[0],null,'Overview','guided');else location.hash='#saved-properties';}}

export async function promotePreliminaryProperty({property,scenario=null,prepareScenario=false,authentication,dialog,onSaved=null}){
  const body={subjectRef:property.ref,...(!prepareScenario&&scenario?.id&&scenario.revision>0?{scenarioId:scenario.id}:{})},preview=await request('/api/durable-properties/preview',body);
  if(preview.potentialDuplicates.length){await duplicateNotice(dialog,property,preview.potentialDuplicates[0]);return null;}
  const confirmed=await dialog.confirm({title:'Save as Property?',message:`This creates an organization property record${prepareScenario?' and then saves the current scenario revision':''}. It does not verify ownership, title, parcel identity or legal status, and it does not rewrite the retained evidence snapshot.`,details:[['Address',preview.address],['Parcel identifier',preview.parcelIdentifiers.map(item=>`${item.type} ${item.value}`).join(', ')||'Unknown'],['Identity confidence',confidenceLabel(preview.identityConfidence)],['Evidence snapshot',preview.evidenceSnapshotId],['Potential duplicates','None found in this organization']],confirmLabel:prepareScenario?'Save Property & Scenario':'Save as Property',cancelLabel:'Cancel',tone:'info'});
  if(!confirmed)return null;
  const result=await request('/api/durable-properties/save',body,authentication.csrfToken);
  onSaved?.(result.property);window.dispatchEvent(new CustomEvent(DURABLE_PROPERTY_SAVED_EVENT,{detail:{property:result.property}}));return result.property;
}

export default function SaveAsPropertyButton({property,scenario=null,prepareScenario=null,onSaved=null,savedProperty=null,savedAction='status',className='secondary',label='Save as Property'}){
  const authentication=useAuthentication(),dialog=useNotificationDialog(),[busy,setBusy]=useState(false),[savedRecord,setSavedRecord]=useState(null);
  if(!property)return null;
  const durable=savedRecord??savedProperty,isSaved=Boolean(durable)||property.subjectKind==='DURABLE_SAVED'&&property.lifecycleStatus!=='ARCHIVED_PROPERTY';
  if(isSaved&&savedAction==='open')return <a className={className} href={detailRoute(property.ref,property.evidenceFingerprint??durable?.evidenceSnapshotIds?.[0])}>Open Property</a>;
  if(isSaved)return <span className="pi-property-saved-status">Saved Property</span>;
  async function run(){
    setBusy(true);
    let promotedProperty=null;
    try{
      promotedProperty=await promotePreliminaryProperty({property,scenario,prepareScenario:Boolean(prepareScenario),authentication,dialog,onSaved});
      if(!promotedProperty)return;setSavedRecord(promotedProperty);
      const savedScenario=prepareScenario?await prepareScenario():scenario,scenarioSaved=!prepareScenario||savedScenario?.revision>0;
      await dialog.notify({title:scenarioSaved&&prepareScenario?'Property and scenario saved':'Property saved',message:scenarioSaved?prepareScenario?`${promotedProperty.address} is now a Saved Property and the analysis was saved as scenario revision ${savedScenario.revision}. Identity and verification labels remain unchanged.`:`${promotedProperty.address} is now a Saved Property. Its identity and verification labels remain unchanged.`:`${promotedProperty.address} is now a Saved Property. The analysis remains in this browser because its scenario revision was not saved; correct the highlighted fields and select Save again.`,confirmLabel:'Continue',tone:scenarioSaved?'info':'warning'});
    }catch(error){
      if(error.code==='DUPLICATE_PROPERTY'){await duplicateNotice(dialog,property,error.details?.duplicates?.[0]);return;}
      const storageUnavailable=unavailable(error.code)||unavailable(error.message),propertyWasSaved=Boolean(promotedProperty);
      await dialog.notify({title:propertyWasSaved?'Property saved; scenario not saved':'Property was not saved',message:propertyWasSaved?`${promotedProperty.address} is now a Saved Property, but the analysis remains in this browser because the scenario revision could not be saved. ${error.message}`:storageUnavailable?'Durable property storage is unavailable. No Saved Property was created and PI did not fall back to browser-local storage. Ask an administrator to verify the Firestore server configuration.':error.message,confirmLabel:'Close',tone:'warning'});
    }finally{setBusy(false);}
  }
  const disabled=busy||!authentication.user;
  return <button type="button" className={className} disabled={disabled} onClick={run} data-tooltip="Create an organization Saved Property while preserving this preliminary subject, evidence snapshot and saved scenario revision.">{busy?'Saving…':authentication.user?label:'Sign in to save property'}</button>;
}
