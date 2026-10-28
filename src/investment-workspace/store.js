import {mkdir,readFile,readdir,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {FIELDS, analyze} from './analysis.js';
import {validateAnalystEvidence} from './analyst-evidence.js';

const idPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const text=(v,max)=>typeof v==='string'&&v.length<=max;
function validateEvidenceAttachments(value=[]){
  if(!Array.isArray(value)||value.length>100)throw new Error('Evidence attachments exceed the scenario limit.');
  const seen=new Set();
  return value.map(item=>{
    if(!item||!idPattern.test(item.id)||!text(item.fieldKey,160)||!/^[A-Za-z0-9._:-]+$/.test(item.fieldKey)||!text(item.fieldLabel,160)||!item.fieldLabel.trim()||!text(item.documentId,128)||!/^[A-Za-z0-9._-]+$/.test(item.documentId)||!Number.isInteger(item.version)||item.version<1||item.version>10_000)throw new Error('Evidence attachment link is invalid.');
    for(const [key,maximum] of [['filename',180],['description',1000],['source',240],['sourceDate',10],['reviewStatus',64],['confidentiality',64],['redistributionPermission',64],['scanStatus',32],['linkedAt',40]])if(!text(item[key]??'',maximum))throw new Error('Evidence attachment metadata is invalid.');
    if(item.appendixSelected!==undefined&&typeof item.appendixSelected!=='boolean')throw new Error('Evidence attachment report selection is invalid.');
    const hasDocumentAmount=item.documentAmount!==undefined&&item.documentAmount!==null&&String(item.documentAmount).trim()!=='';
    if(item.documentAmountAnalystConfirmed!==undefined&&typeof item.documentAmountAnalystConfirmed!=='boolean')throw new Error('Document amount confirmation is invalid.');
    if(!text(item.documentAmountCurrency??'',3)||!text(item.documentAmountSemanticType??'',100)||!text(item.documentAmountSourceNote??'',300)||!text(item.documentAmountConfirmedAt??'',40))throw new Error('Document amount metadata is invalid.');
    if(item.documentAmountSourcePage!==undefined&&item.documentAmountSourcePage!==null&&item.documentAmountSourcePage!==''&&(!Number.isInteger(Number(item.documentAmountSourcePage))||Number(item.documentAmountSourcePage)<1||Number(item.documentAmountSourcePage)>10_000))throw new Error('Document amount source page is invalid.');
    if(hasDocumentAmount){
      const amount=Number(item.documentAmount);
      if(!Number.isFinite(amount)||Math.abs(amount)>1_000_000_000||Math.abs(Math.round(amount*100)-amount*100)>1e-7)throw new Error('Document amount is invalid.');
      if((item.documentAmountCurrency??'USD')!=='USD'||!item.documentAmountSemanticType?.trim())throw new Error('Document amount claim mapping is invalid.');
      if(item.documentAmountAnalystConfirmed===true&&!item.documentAmountSourcePage&&!item.documentAmountSourceNote?.trim())throw new Error('Confirmed document amounts require a source page or note.');
      if(item.documentAmountAnalystConfirmed===true&&(!item.documentAmountConfirmedAt||Number.isNaN(Date.parse(item.documentAmountConfirmedAt))))throw new Error('Confirmed document amounts require a confirmation timestamp.');
    }else if(item.documentAmountAnalystConfirmed===true)throw new Error('A document amount is required before analyst confirmation.');
    const key=`${item.fieldKey}:${item.documentId}:${item.version}`;if(seen.has(key))throw new Error('The same document version cannot be linked twice to one evidence field.');seen.add(key);
    return {...Object.fromEntries(['id','fieldKey','fieldLabel','documentId','version','filename','description','source','sourceDate','reviewStatus','confidentiality','redistributionPermission','scanStatus','linkedAt'].map(key=>[key,item[key]??''])),...(item.appendixSelected===undefined?{}:{appendixSelected:item.appendixSelected}),
      ...(hasDocumentAmount?{documentAmount:Number(item.documentAmount),documentAmountCurrency:item.documentAmountCurrency??'USD',documentAmountSemanticType:item.documentAmountSemanticType,documentAmountSourcePage:item.documentAmountSourcePage?Number(item.documentAmountSourcePage):null,documentAmountSourceNote:item.documentAmountSourceNote??'',documentAmountAnalystConfirmed:item.documentAmountAnalystConfirmed===true,documentAmountConfirmedAt:item.documentAmountAnalystConfirmed===true?item.documentAmountConfirmedAt??'':''}:{})};
  });
}
function validatePhotoSelections(value=[]){
  if(!Array.isArray(value)||value.length>12)throw new Error('No more than 12 property photos may be selected for a report.');
  const seen=new Set(),cover=[];
  const selections=value.map(item=>{
    if(!item||!text(item.photoId,128)||!/^[A-Za-z0-9._-]+$/.test(item.photoId)||!Number.isInteger(item.version)||item.version<1||item.version>10_000||!text(item.caption??'',180)||!text(item.category??'OTHER',40)||!text(item.sourceDescription??'',240)||typeof item.isCover!=='boolean')throw new Error('Property photo selection is invalid.');
    const key=`${item.photoId}:${item.version}`;if(seen.has(key))throw new Error('A property photo version can be selected only once.');seen.add(key);if(item.isCover)cover.push(key);
    return {photoId:item.photoId,version:item.version,caption:item.caption??'',category:item.category??'OTHER',sourceDescription:item.sourceDescription??'',isCover:item.isCover};
  });
  if(cover.length>1)throw new Error('Choose only one report cover photo.');
  return selections;
}
function validatePhotoAcknowledgment(value,selections){
  if(value==null)return null;
  if(!value||value.confirmed!==true||!text(value.userId,128)||!text(value.organizationId,128)||!text(value.scenarioId,128)||!Number.isInteger(value.revision)||value.revision<1||!text(value.confirmedAt,40)||Number.isNaN(Date.parse(value.confirmedAt))||!text(value.selectionFingerprint,64)||!/^[a-f0-9]{64}$/.test(value.selectionFingerprint)||!selections.length)throw new Error('Property photo redistribution acknowledgment is invalid.');
  return {confirmed:true,userId:value.userId,organizationId:value.organizationId,confirmedAt:value.confirmedAt,scenarioId:value.scenarioId,revision:value.revision,selectionFingerprint:value.selectionFingerprint};
}
export function validateDraft(s,evidence){
  const property=evidence.properties.find(p=>p.ref===s?.propertyRef);
  if(!property||!idPattern.test(s.id)||!text(s.name,80)||!s.name.trim())throw new Error('Choose a valid property and scenario name.');
  const fingerprint=property.evidenceFingerprint??evidence.fingerprint;
  if(s.evidenceFingerprint!==fingerprint)throw new Error('Evidence changed; reopen this scenario against the current retained evidence.');
  if(!s.inputs||Object.keys(s.inputs).sort().join()!==Object.keys(FIELDS).sort().join()||Object.values(s.inputs).some(v=>!['string','number'].includes(typeof v)||String(v).length>30))throw new Error('Scenario inputs do not match the workspace contract.');
  if(!text(s.notes??'',1500)||!text(s.risk?.seed??'',100)||!text(s.risk?.rationale??'',300)||JSON.stringify(s.risk??{}).length>3000)throw new Error('Keep notes and uncertainty settings within the documented limits.');
  for(const [ref,v] of Object.entries(s.compReviews??{}))if(!property.sales.some(c=>c.evidenceRef===ref)||typeof v.include!=='boolean'||!text(v.notes??'',500))throw new Error('Comparable reviews must belong to this property.');
  if(s.demonstration!==undefined&&typeof s.demonstration!=='boolean')throw new Error('Invalid demonstration marker.');
  const sellerValuationBasis=s.sellerValuationBasis??'PROVIDER_AVM';
  if(!['PROVIDER_AVM','PROPOSED_SALE_PRICE'].includes(sellerValuationBasis))throw new Error('Choose a supported seller equity valuation basis.');
  const analystEvidence=validateAnalystEvidence(s.analystEvidence??[]);
  const evidenceAttachments=validateEvidenceAttachments(s.evidenceAttachments??[]);
  const photoSelections=validatePhotoSelections(s.photoSelections??[]),photoRightsAcknowledgment=validatePhotoAcknowledgment(s.photoRightsAcknowledgment??null,photoSelections);
  if(photoRightsAcknowledgment&&photoRightsAcknowledgment.scenarioId!==s.id)throw new Error('Property photo redistribution acknowledgment belongs to another scenario.');
  return {id:s.id,propertyRef:s.propertyRef,name:s.name.trim(),evidenceFingerprint:fingerprint,inputs:{...s.inputs},targetType:s.targetType,
    notes:s.notes??'',risk:structuredClone(s.risk??{}),compReviews:structuredClone(s.compReviews??{}),analystEvidence,evidenceAttachments,photoSelections,photoRightsAcknowledgment,sellerValuationBasis,demonstration:s.demonstration===true,riskRequested:s.riskRequested===true};
}
export function createStore(directory,evidenceSource){
  const evidence=()=>typeof evidenceSource==='function'?evidenceSource():evidenceSource;
  async function all(){
    await mkdir(directory,{recursive:true});const revisions=[];
    for(const file of (await readdir(directory)).filter(f=>/^[a-f0-9-]{36}\.r\d+\.json$/.test(f)).sort())revisions.push(JSON.parse(await readFile(path.join(directory,file),'utf8')));
    return revisions.sort((a,b)=>a.savedAt.localeCompare(b.savedAt)||a.revision-b.revision);
  }
  async function list(){
    const latest=new Map();
    for(const s of await all()){
      if(!latest.has(s.id)||latest.get(s.id).revision<s.revision)latest.set(s.id,s);
    }
    return [...latest.values()].sort((a,b)=>a.savedAt.localeCompare(b.savedAt));
  }
  async function save(raw,{baseline=null}={}){
    const clean=validateDraft(raw,evidence()),local=(await list()).find(s=>s.id===clean.id),old=local??(baseline?.id===clean.id?baseline:null);
    if(old&&old.propertyRef!==clean.propertyRef)throw new Error('A scenario cannot move to another property. Duplicate it within its original property.');
    if((raw.revision??0)!==(old?.revision??0))throw new Error('This scenario changed in another tab. Reopen it before saving. Your local draft is retained.');
    const s={...clean,revision:(old?.revision??0)+1,savedAt:new Date().toISOString()};
    try{s.analysis=analyze(s,{risk:s.riskRequested});s.validation=null;}catch(e){s.analysis=null;s.validation={message:e.message,errors:e.errors??{}};}
    await writeFile(path.join(directory,`${s.id}.r${s.revision}.json`),JSON.stringify(s,null,2)+'\n',{flag:'wx',mode:0o600});
    return s;
  }
  async function dependencies(propertyRef){const revisions=(await all()).filter(item=>item.propertyRef===propertyRef);return {scenarios:new Set(revisions.map(item=>item.id)).size,revisions:revisions.length};}
  async function removeProperty(propertyRef){const revisions=(await all()).filter(item=>item.propertyRef===propertyRef);for(const revision of revisions)await unlink(path.join(directory,`${revision.id}.r${revision.revision}.json`));return {scenarios:new Set(revisions.map(item=>item.id)).size,revisions:revisions.length};}
  return {all,list,save,dependencies,removeProperty};
}
