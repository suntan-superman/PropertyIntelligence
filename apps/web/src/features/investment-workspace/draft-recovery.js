export const WORKSPACE_DRAFT_KEY='pi-investment-workspace-v1-drafts';
export const SESSION_RECOVERY_KEY='pi-investment-workspace-session-recovery-v1';
export const SAVE_REMINDER_INTERVAL_MS=10*60*1000;

export function workspaceSnapshot({drafts,selected,activeId,subject,mode,guidedProgress}){
  return {drafts,selected,activeId,subject,mode,guidedProgress};
}

export function writeWorkspaceDraft(value,storage=localStorage){
  storage.setItem(WORKSPACE_DRAFT_KEY,JSON.stringify(value));
}

export function readWorkspaceDraft(storage=localStorage){
  try{
    const value=JSON.parse(storage.getItem(WORKSPACE_DRAFT_KEY));
    if(!value||typeof value!=='object'||Array.isArray(value))return {};
    const object=input=>input&&typeof input==='object'&&!Array.isArray(input)?input:{};
    const drafts=Array.isArray(value.drafts)?value.drafts.filter(item=>item&&typeof item==='object'&&typeof item.id==='string'&&typeof item.propertyRef==='string').map(item=>({...item,inputs:object(item.inputs),risk:{...object(item.risk),variables:object(item.risk?.variables)},compReviews:object(item.compReviews),analystEvidence:Array.isArray(item.analystEvidence)?item.analystEvidence:[],evidenceAttachments:Array.isArray(item.evidenceAttachments)?item.evidenceAttachments:[]})):[];
    return {drafts,selected:Array.isArray(value.selected)?value.selected.filter(item=>typeof item==='string'):[],activeId:typeof value.activeId==='string'?value.activeId:'',subject:typeof value.subject==='string'?value.subject:'',mode:value.mode==='advanced'?'advanced':'guided',guidedProgress:object(value.guidedProgress)};
  }catch{return {};}
}

export function writeSessionRecovery(value,{reason='SESSION_EXPIRED',storage=localStorage,now=()=>new Date()}={}){
  const dirtyDrafts=(value.drafts??[]).filter(item=>item?.dirty);
  if(!dirtyDrafts.length)return null;
  const recovery={schemaVersion:1,reason,savedAt:now().toISOString(),workspace:workspaceSnapshot(value),dirtyScenarioIds:dirtyDrafts.map(item=>item.id)};
  storage.setItem(SESSION_RECOVERY_KEY,JSON.stringify(recovery));
  writeWorkspaceDraft(recovery.workspace,storage);
  return recovery;
}

export function readSessionRecovery(storage=localStorage){
  try{const value=JSON.parse(storage.getItem(SESSION_RECOVERY_KEY));return value?.schemaVersion===1&&value.workspace?value:null;}catch{return null;}
}

export function clearSessionRecovery(storage=localStorage){storage.removeItem(SESSION_RECOVERY_KEY);}

export function removePropertyDrafts(propertyRef,storage=localStorage){
  const clean=workspace=>{const removedIds=new Set((workspace?.drafts??[]).filter(item=>item?.propertyRef===propertyRef).map(item=>item.id)),drafts=(workspace?.drafts??[]).filter(item=>item?.propertyRef!==propertyRef),guidedProgress=Object.fromEntries(Object.entries(workspace?.guidedProgress??{}).filter(([id])=>!removedIds.has(id)));return {...(workspace??{}),drafts,selected:(workspace?.selected??[]).filter(ref=>ref!==propertyRef),activeId:removedIds.has(workspace?.activeId)?'':workspace?.activeId??'',subject:workspace?.subject===propertyRef?'':workspace?.subject??'',guidedProgress};};
  const workspace=clean(readWorkspaceDraft(storage));writeWorkspaceDraft(workspace,storage);
  const recovery=readSessionRecovery(storage);if(recovery){const next={...recovery,workspace:clean(recovery.workspace),dirtyScenarioIds:(recovery.dirtyScenarioIds??[]).filter(id=>workspace.drafts.some(item=>item.id===id))};if(next.workspace.drafts.length)storage.setItem(SESSION_RECOVERY_KEY,JSON.stringify(next));else clearSessionRecovery(storage);}
  return workspace;
}

export function saveReminderDue({dirty,dirtySince,lastPromptAt,now=Date.now(),intervalMs=SAVE_REMINDER_INTERVAL_MS}){
  if(!dirty||!Number.isFinite(dirtySince))return false;
  return now-Math.max(dirtySince,Number.isFinite(lastPromptAt)?lastPromptAt:0)>=intervalMs;
}
