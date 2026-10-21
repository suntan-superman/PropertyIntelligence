import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {PDFDocument} from 'pdf-lib';
import {ROLES} from '../auth/access-control.js';

export const DOCUMENT_TYPES=Object.freeze(['MORTGAGE_PAYOFF','LIEN_RELEASE','PROPERTY_TAX_FORECLOSURE','REHABILITATION_ESTIMATE','PROPERTY_CONDITION','COMPARABLE_VALUATION','CONTRACT_CLOSING_EXPENSE','OTHER']);
export const DOCUMENT_REVIEW=Object.freeze(['PENDING_REVIEW','REVIEWED','INDEPENDENTLY_VERIFIED','REJECTED','SUPERSEDED']);
export const DOCUMENT_CONFIDENTIALITY=Object.freeze(['STANDARD','CONFIDENTIAL','RESTRICTED_PROVIDER']);
export const REDISTRIBUTION=Object.freeze(['NOT_APPROVED','APPROVED']);
export const DOCUMENT_MIME_TYPES=Object.freeze(['application/pdf','image/jpeg','image/png']);
export const DEFAULT_DOCUMENT_SIZE_LIMIT=10*1024*1024;
export const DEFAULT_SIGNATURE_MAX_AGE_MS=24*60*60*1000;
export const DOCUMENT_ELIGIBILITY_FIELDS=Object.freeze(['reviewStatus','confidentiality','redistributionPermission','appendixSelected','reviewedAt','reviewedBy']);
const writableRoles=new Set(['Administrator',ROLES.PLATFORM_ADMINISTRATOR,ROLES.ORGANIZATION_ADMINISTRATOR,ROLES.ANALYST]);
const clean=(value,maximum=500)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,maximum);
const clone=value=>value==null?value:structuredClone(value);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const safeId=(value,label)=>{const text=clean(value,128);if(!/^[A-Za-z0-9._-]{1,128}$/.test(text))throw new SupportingDocumentError(`${label}_INVALID`);return text;};

export class SupportingDocumentError extends Error{
  constructor(code,status=400,details={}){super(code);this.code=code;this.status=status;this.details=details;}
}

export function documentEligibility(source={}){
  return {reviewStatus:source.reviewStatus??null,confidentiality:source.confidentiality??null,redistributionPermission:source.redistributionPermission??null,appendixSelected:Boolean(source.appendixSelected),reviewedAt:source.reviewedAt??null,reviewedBy:source.reviewedBy??null};
}

export function assertCurrentDocumentEligibility(record){
  const version=(record?.versions??[]).find(item=>item.version===record.currentVersion);
  if(!version)throw new SupportingDocumentError('DOCUMENT_VERSION_NOT_FOUND',404);
  const parent=documentEligibility(record),authoritative=documentEligibility(version),inconsistent=DOCUMENT_ELIGIBILITY_FIELDS.some(field=>parent[field]!==authoritative[field]);
  if(inconsistent)throw new SupportingDocumentError('DOCUMENT_ELIGIBILITY_INCONSISTENT',409,{documentId:record.id,currentVersion:record.currentVersion});
  return authoritative;
}

function actor(user,{write=false}={}){
  if(!user?.uid||!user?.organizationId)throw new SupportingDocumentError('AUTHENTICATION_REQUIRED',401);
  if(write&&!writableRoles.has(user.role))throw new SupportingDocumentError('ROLE_NOT_AUTHORIZED',403);
  return {uid:safeId(user.uid,'USER_ID'),organizationId:safeId(user.organizationId,'ORGANIZATION_ID'),role:user.role};
}

function safeFilename(value){
  const name=clean(value,180);
  if(!name||name!==path.basename(name)||/[\\/\0]/.test(name)||name==='.'||name==='..')throw new SupportingDocumentError('DOCUMENT_FILENAME_INVALID');
  return name;
}

function normalizedMetadata(input={}){
  const documentType=clean(input.documentType,64),reviewStatus=clean(input.reviewStatus||'PENDING_REVIEW',64),confidentiality=clean(input.confidentiality||'STANDARD',64),redistributionPermission=clean(input.redistributionPermission||'NOT_APPROVED',64);
  if(!DOCUMENT_TYPES.includes(documentType))throw new SupportingDocumentError('DOCUMENT_TYPE_INVALID');
  if(!DOCUMENT_REVIEW.includes(reviewStatus))throw new SupportingDocumentError('DOCUMENT_REVIEW_STATUS_INVALID');
  if(!DOCUMENT_CONFIDENTIALITY.includes(confidentiality))throw new SupportingDocumentError('DOCUMENT_CONFIDENTIALITY_INVALID');
  if(!REDISTRIBUTION.includes(redistributionPermission))throw new SupportingDocumentError('DOCUMENT_REDISTRIBUTION_INVALID');
  const sourceDate=clean(input.sourceDate,10);if(sourceDate&&!/^\d{4}-\d{2}-\d{2}$/.test(sourceDate))throw new SupportingDocumentError('DOCUMENT_SOURCE_DATE_INVALID');
  return {documentType,description:clean(input.description,1000),source:clean(input.source,240),sourceDate:sourceDate||null,reviewStatus,confidentiality,redistributionPermission,evidenceClaim:clean(input.evidenceClaim||documentType,80),appendixSelected:Boolean(input.appendixSelected)};
}

function pngDimensions(bytes){if(bytes.length<24)return null;return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};}
function jpegDimensions(bytes){
  let offset=2;
  while(offset+9<bytes.length){if(bytes[offset]!==0xff){offset++;continue;}const marker=bytes[offset+1],length=bytes.readUInt16BE(offset+2);if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {height:bytes.readUInt16BE(offset+5),width:bytes.readUInt16BE(offset+7)};if(length<2)break;offset+=2+length;}
  return null;
}

export async function inspectSupportingDocument({bytes,mimeType,filename,sizeLimit=DEFAULT_DOCUMENT_SIZE_LIMIT}){
  const content=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes??[]),name=safeFilename(filename),mime=clean(mimeType,100).toLowerCase();
  if(!DOCUMENT_MIME_TYPES.includes(mime))throw new SupportingDocumentError('DOCUMENT_MIME_TYPE_NOT_ALLOWED',415);
  if(!content.length)throw new SupportingDocumentError('DOCUMENT_EMPTY');
  if(content.length>sizeLimit)throw new SupportingDocumentError('DOCUMENT_TOO_LARGE',413,{maximumBytes:sizeLimit});
  const extension=path.extname(name).toLowerCase(),expected={'application/pdf':['.pdf'],'image/jpeg':['.jpg','.jpeg'],'image/png':['.png']}[mime];if(!expected.includes(extension))throw new SupportingDocumentError('DOCUMENT_EXTENSION_MISMATCH',415);
  let pageCount=1,dimensions=null;
  if(mime==='application/pdf'){
    if(content.subarray(0,5).toString('ascii')!=='%PDF-')throw new SupportingDocumentError('DOCUMENT_CONTENT_MISMATCH',415);
    const text=content.toString('latin1');if(/\/(?:JavaScript|JS|Launch|EmbeddedFile|OpenAction)\b/i.test(text))throw new SupportingDocumentError('DOCUMENT_ACTIVE_CONTENT_REJECTED',422);
    try{const pdf=await PDFDocument.load(content,{ignoreEncryption:false,updateMetadata:false});pageCount=pdf.getPageCount();}catch{throw new SupportingDocumentError('DOCUMENT_PDF_MALFORMED',422);}
    if(pageCount<1||pageCount>200)throw new SupportingDocumentError('DOCUMENT_PAGE_LIMIT',413,{maximumPages:200});
  }else if(mime==='image/png'){
    if(!content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new SupportingDocumentError('DOCUMENT_CONTENT_MISMATCH',415);dimensions=pngDimensions(content);
  }else{
    if(content[0]!==0xff||content[1]!==0xd8||content[2]!==0xff)throw new SupportingDocumentError('DOCUMENT_CONTENT_MISMATCH',415);dimensions=jpegDimensions(content);
  }
  if(mime.startsWith('image/')&&(!dimensions?.width||!dimensions?.height||dimensions.width>20000||dimensions.height>20000||dimensions.width*dimensions.height>100_000_000))throw new SupportingDocumentError('DOCUMENT_IMAGE_MALFORMED',422);
  return {bytes:content,filename:name,mimeType:mime,sizeBytes:content.length,sha256:digest(content),pageCount,dimensions};
}

export function publicSupportingDocument(record){
  if(!record)return null;
  const current=(record.versions??[]).find(version=>version.version===record.currentVersion)??record.versions?.at(-1)??null;
  const eligibilityConsistent=record.eligibilityConsistent!==false,eligibility=eligibilityConsistent?assertCurrentDocumentEligibility(record):{reviewStatus:'PENDING_REVIEW',confidentiality:record.confidentiality??'STANDARD',redistributionPermission:'NOT_APPROVED',appendixSelected:false,reviewedAt:null,reviewedBy:null};
  return {id:record.id,propertyId:record.propertyId,documentType:record.documentType,description:record.description,source:record.source,sourceDate:record.sourceDate,uploadedAt:record.uploadedAt,uploadedBy:record.uploadedBy,updatedAt:record.updatedAt,updatedBy:record.updatedBy,...eligibility,eligibilityConsistent,eligibilityError:eligibilityConsistent?null:(record.eligibilityError??'DOCUMENT_ELIGIBILITY_INCONSISTENT'),evidenceClaim:record.evidenceClaim,currentVersion:record.currentVersion,versionCount:(record.versions??[]).length,currentVersionMetadata:current?{version:current.version,filename:current.filename,mimeType:current.mimeType,sizeBytes:current.sizeBytes,sha256:current.sha256,pageCount:current.pageCount,uploadedAt:current.uploadedAt,uploadedBy:current.uploadedBy,scanStatus:current.scanStatus,scanEngine:current.scanEngine,scanEngineVersion:current.scanEngineVersion,scanSignatureVersion:current.scanSignatureVersion,scanSignatureUpdatedAt:current.scanSignatureUpdatedAt,scannedAt:current.scannedAt}:null};
}

function currentVersion(record,version=null){
  const selected=(record.versions??[]).find(item=>item.version===Number(version??record.currentVersion));
  if(!selected)throw new SupportingDocumentError('DOCUMENT_VERSION_NOT_FOUND',404);
  return selected;
}

function requireCleanVersion(record,version=null,{maximumSignatureAgeMs=DEFAULT_SIGNATURE_MAX_AGE_MS}={}){
  const selected=currentVersion(record,version),scannedAt=Date.parse(selected.scannedAt),signatureUpdatedAt=Date.parse(selected.scanSignatureUpdatedAt),signatureAge=scannedAt-signatureUpdatedAt;
  if(selected.scanStatus!=='CLEAN'||!clean(selected.scanEngine,120)||!clean(selected.scanEngineVersion,120)||!clean(selected.scanSignatureVersion,120)||!Number.isFinite(scannedAt)||!Number.isFinite(signatureUpdatedAt)||signatureAge<0||signatureAge>maximumSignatureAgeMs)throw new SupportingDocumentError('DOCUMENT_SCAN_NOT_CLEAN',423);
  return selected;
}

function validatedScan(scan,validated,maximumSignatureAgeMs){
  if(scan?.available===false)throw new SupportingDocumentError('DOCUMENT_MALWARE_SCANNER_UNAVAILABLE',503);
  const status=clean(scan?.result||(scan?.clean?'CLEAN':'INFECTED'),32).toUpperCase();
  if(status!=='CLEAN'||scan?.clean!==true)throw new SupportingDocumentError('DOCUMENT_MALWARE_DETECTED',422);
  if(scan.sha256&&scan.sha256!==validated.sha256)throw new SupportingDocumentError('DOCUMENT_SCANNER_HASH_MISMATCH',502);
  const engine=clean(scan.engine,120),engineVersion=clean(scan.engineVersion,120),signatureVersion=clean(scan.signatureVersion,120),signatureUpdatedAt=clean(scan.signatureUpdatedAt,40),scannedAt=clean(scan.scannedAt,40),signatureTime=Date.parse(signatureUpdatedAt),scanTime=Date.parse(scannedAt),age=scanTime-signatureTime;
  if(!engine||!engineVersion||!signatureVersion||!Number.isFinite(signatureTime)||!Number.isFinite(scanTime)||age<0||age>maximumSignatureAgeMs)throw new SupportingDocumentError('DOCUMENT_MALWARE_SIGNATURE_STALE',503);
  return {scanStatus:'CLEAN',scanEngine:engine,scanEngineVersion:engineVersion,scanSignatureVersion:signatureVersion,scanSignatureUpdatedAt:new Date(signatureTime).toISOString(),scanSignatureAgeHours:age/3600000,scannedAt:new Date(scanTime).toISOString()};
}

export function documentCompleteness(documents,{staleAfterDays=365,now=new Date()}={}){
  return DOCUMENT_TYPES.filter(type=>type!=='OTHER').map(type=>{
    const records=documents.filter(item=>item.documentType===type),latest=records.sort((a,b)=>String(b.sourceDate??b.uploadedAt).localeCompare(String(a.sourceDate??a.uploadedAt)))[0];
    if(!latest)return {documentType:type,status:'EVIDENCE_MISSING'};
    const version=(latest.versions??[]).find(item=>item.version===latest.currentVersion)??latest.currentVersionMetadata;if(version?.scanStatus!=='CLEAN')return {documentType:type,status:'DOCUMENT_SCAN_REQUIRED',documentId:latest.id};
    if(['REJECTED','SUPERSEDED'].includes(latest.reviewStatus))return {documentType:type,status:'EVIDENCE_STALE_OR_SUPERSEDED',documentId:latest.id};
    if(latest.sourceDate&&(now-Date.parse(`${latest.sourceDate}T00:00:00Z`))/86400000>staleAfterDays)return {documentType:type,status:'EVIDENCE_STALE_OR_SUPERSEDED',documentId:latest.id};
    if(latest.reviewStatus==='INDEPENDENTLY_VERIFIED')return {documentType:type,status:'EVIDENCE_INDEPENDENTLY_VERIFIED',documentId:latest.id};
    if(latest.reviewStatus==='REVIEWED')return {documentType:type,status:'EVIDENCE_REVIEWED',documentId:latest.id};
    return {documentType:type,status:'DOCUMENT_UPLOADED_NOT_REVIEWED',documentId:latest.id};
  });
}

export function createSupportingDocumentService({repository,storage,malwareScanner,durableProperties,clock=()=>new Date(),idFactory=randomUUID,sizeLimit=DEFAULT_DOCUMENT_SIZE_LIMIT,maximumSignatureAgeMs=DEFAULT_SIGNATURE_MAX_AGE_MS}={}){
  if(!repository||!storage||!malwareScanner||!durableProperties)throw new Error('SUPPORTING_DOCUMENT_DEPENDENCIES_REQUIRED');
  const timestamp=()=>clock().toISOString();
  const propertyAccess=async(user,propertyId)=>durableProperties.get({user,id:safeId(propertyId,'PROPERTY_ID')});
  async function audit(entry){await repository.appendAudit({...entry,at:timestamp()});}
  async function list({user,propertyId}){const who=actor(user);await propertyAccess(user,propertyId);return (await repository.list(who.organizationId,propertyId)).map(publicSupportingDocument);}
  async function verifiedBytes(record,version){const selected=requireCleanVersion(record,version,{maximumSignatureAgeMs}),bytes=await storage.get(selected.storageKey);if(digest(bytes)!==selected.sha256)throw new SupportingDocumentError('DOCUMENT_INTEGRITY_FAILURE',409);return {selected,bytes};}
  async function upload({user,propertyId,metadata,file,documentId=null}){
    const who=actor(user,{write:true});await propertyAccess(user,propertyId);const validated=await inspectSupportingDocument({...file,sizeLimit}),submitted=normalizedMetadata(metadata),meta={...submitted,reviewStatus:'PENDING_REVIEW',redistributionPermission:'NOT_APPROVED',appendixSelected:false};
    const scan=await malwareScanner.scan(validated.bytes,{filename:validated.filename,mimeType:validated.mimeType,sha256:validated.sha256}),uploadedAt=timestamp(),scanMetadata=validatedScan(scan,validated,maximumSignatureAgeMs);
    const duplicate=await repository.findByHash(who.organizationId,validated.sha256);if(duplicate)throw new SupportingDocumentError('DUPLICATE_DOCUMENT_CONTENT',409,{document:publicSupportingDocument(duplicate)});
    const id=documentId?safeId(documentId,'DOCUMENT_ID'):idFactory(),prior=documentId?await repository.get(who.organizationId,propertyId,id):null;if(documentId&&!prior)throw new SupportingDocumentError('DOCUMENT_NOT_FOUND',404);
    const version=(prior?.currentVersion??0)+1,extension=validated.mimeType==='application/pdf'?'pdf':validated.mimeType==='image/png'?'png':'jpg',storageKey=`organizations/${who.organizationId}/properties/${propertyId}/documents/${id}/versions/${version}/${validated.sha256}.${extension}`;
    await storage.put(storageKey,validated.bytes,{contentType:validated.mimeType,sha256:validated.sha256});
    const versionRecord={version,filename:validated.filename,mimeType:validated.mimeType,sizeBytes:validated.sizeBytes,sha256:validated.sha256,pageCount:validated.pageCount,dimensions:validated.dimensions,storageKey,...scanMetadata,reviewStatus:'PENDING_REVIEW',confidentiality:meta.confidentiality,redistributionPermission:'NOT_APPROVED',appendixSelected:false,reviewedAt:null,reviewedBy:null,uploadedAt,uploadedBy:who.uid,immutable:true};
    const record={...(prior??{}),id,propertyId,organizationId:who.organizationId,...meta,uploadedAt:prior?.uploadedAt??uploadedAt,uploadedBy:prior?.uploadedBy??who.uid,updatedAt:uploadedAt,updatedBy:who.uid,reviewedAt:null,reviewedBy:null,currentVersion:version,versions:[...(prior?.versions??[]),versionRecord]};
    try{const result=await repository.createVersion(record,versionRecord);if(!result.created)throw new SupportingDocumentError('DUPLICATE_DOCUMENT_CONTENT',409,{document:publicSupportingDocument(result.duplicate)});}catch(error){await storage.remove?.(storageKey).catch(()=>{});throw error;}
    await audit({organizationId:who.organizationId,propertyId,documentId:id,version,userId:who.uid,action:documentId?'DOCUMENT_VERSION_UPLOADED':'DOCUMENT_UPLOADED',sha256:validated.sha256});return publicSupportingDocument(await repository.get(who.organizationId,propertyId,id));
  }
  async function update({user,propertyId,documentId,patch}){
    const who=actor(user,{write:true});await propertyAccess(user,propertyId);const prior=await repository.get(who.organizationId,propertyId,documentId);if(!prior)throw new SupportingDocumentError('DOCUMENT_NOT_FOUND',404);
    requireCleanVersion(prior,null,{maximumSignatureAgeMs});
    const merged=normalizedMetadata({...prior,...patch}),now=timestamp(),appendixSelected=Boolean(patch.appendixSelected??prior.appendixSelected)&&['REVIEWED','INDEPENDENTLY_VERIFIED'].includes(merged.reviewStatus)&&merged.redistributionPermission==='APPROVED'&&merged.confidentiality==='STANDARD';
    if(patch.appendixSelected&&!appendixSelected)throw new SupportingDocumentError('DOCUMENT_NOT_ELIGIBLE_FOR_APPENDIX',409);
    const reviewedAt=['REVIEWED','INDEPENDENTLY_VERIFIED'].includes(merged.reviewStatus)?(prior.reviewedAt??now):null,reviewedBy=reviewedAt?who.uid:null,versions=(prior.versions??[]).map(version=>version.version===prior.currentVersion?{...version,reviewStatus:merged.reviewStatus,confidentiality:merged.confidentiality,redistributionPermission:merged.redistributionPermission,appendixSelected,reviewedAt,reviewedBy}:version);
    const next={...prior,...merged,appendixSelected,updatedAt:now,updatedBy:who.uid,reviewedAt,reviewedBy,versions};await repository.update(who.organizationId,propertyId,documentId,next);await audit({organizationId:who.organizationId,propertyId,documentId,version:prior.currentVersion,userId:who.uid,action:'DOCUMENT_METADATA_UPDATED'});return publicSupportingDocument(next);
  }
  async function download({user,propertyId,documentId,version=null}){
    const who=actor(user);await propertyAccess(user,propertyId);const record=await repository.get(who.organizationId,propertyId,documentId);if(!record)throw new SupportingDocumentError('DOCUMENT_NOT_FOUND',404);const {selected,bytes}=await verifiedBytes(record,version);await audit({organizationId:who.organizationId,propertyId,documentId,version:selected.version,userId:who.uid,action:'DOCUMENT_DOWNLOADED'});return {document:publicSupportingDocument(record),version:selected,bytes};
  }
  async function reportDocuments({user,propertyId,references=[]}){
    const who=actor(user);await propertyAccess(user,propertyId);const rights=(record,versionNumber)=>{assertCurrentDocumentEligibility(record);const version=(record.versions??[]).find(item=>item.version===versionNumber);if(!version)throw new SupportingDocumentError('DOCUMENT_VERSION_NOT_FOUND',404);return documentEligibility(version);},eligible=(record,versionNumber)=>{const access=rights(record,versionNumber);return access.appendixSelected&&['REVIEWED','INDEPENDENTLY_VERIFIED'].includes(access.reviewStatus)&&access.redistributionPermission==='APPROVED'&&access.confidentiality==='STANDARD'&&access.reviewStatus!=='SUPERSEDED';};
    const requested=new Map();
    for(const reference of Array.isArray(references)?references:[]){
      if(!reference?.documentId||!Number.isInteger(reference.version))continue;
      const key=`${reference.documentId}:${reference.version}`,prior=requested.get(key)??{documentId:reference.documentId,version:reference.version,claims:[]};
      if(reference.fieldKey&&!prior.claims.some(claim=>claim.fieldKey===reference.fieldKey))prior.claims.push({
        fieldKey:clean(reference.fieldKey,160),fieldLabel:clean(reference.fieldLabel,160),
        ...(reference.documentAmount!==undefined&&reference.documentAmount!==null&&String(reference.documentAmount).trim()!==''&&Number.isFinite(Number(reference.documentAmount))?{
          documentAmount:Number(reference.documentAmount),documentAmountCurrency:clean(reference.documentAmountCurrency||'USD',3),
          documentAmountSemanticType:clean(reference.documentAmountSemanticType,100),documentAmountSourcePage:reference.documentAmountSourcePage?Number(reference.documentAmountSourcePage):null,
          documentAmountSourceNote:clean(reference.documentAmountSourceNote,300),documentAmountAnalystConfirmed:reference.documentAmountAnalystConfirmed===true,
          documentAmountConfirmedAt:clean(reference.documentAmountConfirmedAt,40)
        }: {})
      });
      requested.set(key,prior);
    }
    let selected=[];
    if(requested.size){
      for(const request of requested.values()){const record=await repository.get(who.organizationId,propertyId,safeId(request.documentId,'DOCUMENT_ID'));if(record&&eligible(record,request.version))selected.push({record,version:request.version,claims:request.claims});}
    }else selected=(await repository.list(who.organizationId,propertyId)).filter(record=>eligible(record,record.currentVersion)).map(record=>({record,version:record.currentVersion,claims:[]}));
    selected.sort((a,b)=>String(a.record.uploadedAt).localeCompare(String(b.record.uploadedAt))||a.version-b.version);
    return Promise.all(selected.map(async(item,index)=>{const {selected:version,bytes}=await verifiedBytes(item.record,item.version),versionRights=rights(item.record,version.version);await audit({organizationId:who.organizationId,propertyId,documentId:item.record.id,version:version.version,userId:who.uid,action:'DOCUMENT_INCLUDED_IN_REPORT'});const document={...publicSupportingDocument(item.record),reviewStatus:versionRights.reviewStatus,confidentiality:versionRights.confidentiality,redistributionPermission:versionRights.redistributionPermission,appendixSelected:Boolean(versionRights.appendixSelected)};document.currentVersion=version.version;document.currentVersionMetadata={version:version.version,filename:version.filename,mimeType:version.mimeType,sizeBytes:version.sizeBytes,sha256:version.sha256,pageCount:version.pageCount,uploadedAt:version.uploadedAt,uploadedBy:version.uploadedBy,scanStatus:version.scanStatus};return {index:index+1,document,version,bytes,claims:item.claims};}));
  }
  async function completeness({user,propertyId}){return documentCompleteness(await list({user,propertyId}));}
  return {list,upload,update,download,reportDocuments,completeness};
}

export function createMockMalwareScanner({infectedHashes=[],clock=()=>new Date()}={}){const infected=new Set(infectedHashes);return {async scan(bytes,{sha256}){const infectedFile=infected.has(sha256)||bytes.includes(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')),now=clock();return {available:true,clean:!infectedFile,result:infectedFile?'INFECTED':'CLEAN',sha256,engine:'ClamAV mock',engineVersion:'1.4.3-test',signatureVersion:'test-signatures-1',signatureUpdatedAt:new Date(now.getTime()-60_000).toISOString(),scannedAt:now.toISOString()};}};}
export function createUnavailableMalwareScanner(){return {async scan(){return {available:false,clean:false,engine:null};}};}
