import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import {ROLES} from '../auth/access-control.js';

export const PHOTO_CATEGORIES=Object.freeze(['EXTERIOR','INTERIOR','KITCHEN','BATHROOM','ROOF','FOUNDATION','LANDSCAPING','REPAIRS_DAMAGE','OTHER']);
export const PHOTO_MIME_TYPES=Object.freeze(['image/jpeg','image/png','image/webp']);
export const PHOTO_LIMITS=Object.freeze({maximumBytes:10*1024*1024,maximumPhotos:30,maximumReportPhotos:12,maximumPixels:100_000_000,derivativeWidth:1600,derivativeHeight:1200});
const writableRoles=new Set(['Administrator',ROLES.PLATFORM_ADMINISTRATOR,ROLES.ORGANIZATION_ADMINISTRATOR,ROLES.ANALYST]);
const clean=(value,maximum=500)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,maximum);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const clone=value=>value==null?value:structuredClone(value);
const safeId=(value,label)=>{const text=clean(value,128);if(!/^[A-Za-z0-9._-]{1,128}$/.test(text))throw new PropertyPhotoError(`${label}_INVALID`);return text;};
const isoDate=value=>{const text=clean(value,10);if(text&&!/^\d{4}-\d{2}-\d{2}$/.test(text))throw new PropertyPhotoError('PHOTO_CAPTURE_DATE_INVALID');return text||null;};
const captureDateSource=(value,date)=>{
  if(!date)return 'UNKNOWN';
  return value==='FILE_METADATA'?'FILE_METADATA':'ANALYST_SUPPLIED';
};

export class PropertyPhotoError extends Error{
  constructor(code,status=400,details={}){super(code);this.code=code;this.status=status;this.details=details;}
}

function actor(user,{write=false}={}){
  if(!user?.uid||!user?.organizationId)throw new PropertyPhotoError('AUTHENTICATION_REQUIRED',401);
  if(write&&!writableRoles.has(user.role))throw new PropertyPhotoError('ROLE_NOT_AUTHORIZED',403);
  return {uid:safeId(user.uid,'USER_ID'),organizationId:safeId(user.organizationId,'ORGANIZATION_ID')};
}
function filename(value){const name=clean(value,180);if(!name||name!==path.basename(name)||/[\\/\0]/.test(name))throw new PropertyPhotoError('PHOTO_FILENAME_INVALID');return name;}
function photoMetadata(input={}){
  const category=PHOTO_CATEGORIES.includes(input.category)?input.category:'OTHER';
  const captureDate=isoDate(input.captureDate);
  return {caption:clean(input.caption,180),category,sourceDescription:clean(input.sourceDescription,240),captureDate,captureDateSource:captureDateSource(input.captureDateSource,captureDate),conditionClaim:clean(input.conditionClaim,120)||null};
}
function contentSignature(bytes,mimeType){
  if(mimeType==='image/jpeg')return bytes.length>3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  if(mimeType==='image/png')return bytes.length>8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  return bytes.length>12&&bytes.subarray(0,4).toString('ascii')==='RIFF'&&bytes.subarray(8,12).toString('ascii')==='WEBP';
}
export async function inspectPropertyPhoto({bytes,mimeType,filename:originalFilename,limits=PHOTO_LIMITS}={}){
  const content=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes??[]),name=filename(originalFilename),mime=clean(mimeType,100).toLowerCase();
  if(!PHOTO_MIME_TYPES.includes(mime))throw new PropertyPhotoError('PHOTO_MIME_TYPE_NOT_ALLOWED',415);
  if(!content.length)throw new PropertyPhotoError('PHOTO_EMPTY');
  if(content.length>limits.maximumBytes)throw new PropertyPhotoError('PHOTO_TOO_LARGE',413,{maximumBytes:limits.maximumBytes});
  const allowed={'image/jpeg':['.jpg','.jpeg'],'image/png':['.png'],'image/webp':['.webp']}[mime];if(!allowed.includes(path.extname(name).toLowerCase()))throw new PropertyPhotoError('PHOTO_EXTENSION_MISMATCH',415);
  if(!contentSignature(content,mime))throw new PropertyPhotoError('PHOTO_CONTENT_MISMATCH',415);
  let metadata;try{metadata=await sharp(content,{failOn:'error',limitInputPixels:limits.maximumPixels,unlimited:false}).metadata();}catch{throw new PropertyPhotoError('PHOTO_DECODE_FAILED',422);}
  const expected={'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'}[mime];
  if(metadata.format!==expected||!metadata.width||!metadata.height||metadata.pages&&metadata.pages>1)throw new PropertyPhotoError('PHOTO_DECODE_FAILED',422);
  const derivative=await sharp(content,{failOn:'error',limitInputPixels:limits.maximumPixels,unlimited:false}).rotate().resize({width:limits.derivativeWidth,height:limits.derivativeHeight,fit:'inside',withoutEnlargement:true}).jpeg({quality:86,mozjpeg:true}).toBuffer();
  const derivativeMetadata=await sharp(derivative).metadata();
  return {bytes:content,filename:name,mimeType:mime,sizeBytes:content.length,sha256:digest(content),width:metadata.width,height:metadata.height,derivative,derivativeMimeType:'image/jpeg',derivativeSizeBytes:derivative.length,derivativeSha256:digest(derivative),derivativeWidth:derivativeMetadata.width,derivativeHeight:derivativeMetadata.height};
}

function validateScan(scan,photo){
  if(scan?.available===false)throw new PropertyPhotoError('PHOTO_MALWARE_SCANNER_UNAVAILABLE',503);
  if(scan?.clean!==true||String(scan?.result??'').toUpperCase()!=='CLEAN')throw new PropertyPhotoError('PHOTO_MALWARE_DETECTED',422);
  if(scan.sha256&&scan.sha256!==photo.sha256)throw new PropertyPhotoError('PHOTO_SCANNER_HASH_MISMATCH',502);
  const scannedAt=Date.parse(scan.scannedAt),signatureUpdatedAt=Date.parse(scan.signatureUpdatedAt),age=scannedAt-signatureUpdatedAt;
  if(!clean(scan.engine,120)||!clean(scan.engineVersion,120)||!clean(scan.signatureVersion,120)||!Number.isFinite(scannedAt)||!Number.isFinite(signatureUpdatedAt)||age<0||age>24*60*60*1000)throw new PropertyPhotoError('PHOTO_MALWARE_SIGNATURE_STALE',503);
  return {scanStatus:'CLEAN',scanEngine:clean(scan.engine,120),scanEngineVersion:clean(scan.engineVersion,120),scanSignatureVersion:clean(scan.signatureVersion,120),scanSignatureUpdatedAt:new Date(signatureUpdatedAt).toISOString(),scannedAt:new Date(scannedAt).toISOString()};
}

export function photoSelectionFingerprint(references=[]){
  const normalized=(Array.isArray(references)?references:[]).map(item=>({photoId:String(item.photoId??''),version:Number(item.version)})).filter(item=>item.photoId&&Number.isInteger(item.version)).sort((a,b)=>a.photoId.localeCompare(b.photoId)||a.version-b.version);
  return digest(Buffer.from(JSON.stringify(normalized)));
}
export function publicPropertyPhoto(record){
  const version=(record.versions??[]).find(item=>item.version===record.currentVersion)??record.versions?.at(-1);
  return {id:record.id,propertyId:record.propertyId,caption:record.caption,category:record.category,sourceDescription:record.sourceDescription,captureDate:record.captureDate,captureDateSource:captureDateSource(record.captureDateSource,record.captureDate),conditionClaim:record.conditionClaim,displayOrder:record.displayOrder,isCover:Boolean(record.isCover),deletedAt:record.deletedAt??null,uploadedAt:record.uploadedAt,uploadedBy:record.uploadedBy,currentVersion:record.currentVersion,currentVersionMetadata:version?{version:version.version,filename:version.filename,mimeType:version.mimeType,sizeBytes:version.sizeBytes,width:version.width,height:version.height,sha256:version.sha256,scanStatus:version.scanStatus,uploadedAt:version.uploadedAt}:null};
}

export function createPropertyPhotoService({repository,storage,malwareScanner,durableProperties,clock=()=>new Date(),idFactory=randomUUID,limits=PHOTO_LIMITS}={}){
  if(!repository||!storage||!malwareScanner||!durableProperties)throw new Error('PROPERTY_PHOTO_DEPENDENCIES_REQUIRED');
  const timestamp=()=>clock().toISOString(),propertyAccess=(user,propertyId)=>durableProperties.get({user,id:safeId(propertyId,'PROPERTY_ID')});
  const audit=(entry)=>repository.appendAudit({...entry,at:timestamp()});
  const extensionFor=mimeType=>mimeType==='image/png'?'png':mimeType==='image/webp'?'webp':'jpg';
  const validateIntent=file=>{const name=filename(file?.filename),mime=clean(file?.mimeType,100).toLowerCase(),size=Number(file?.sizeBytes);if(!PHOTO_MIME_TYPES.includes(mime))throw new PropertyPhotoError('PHOTO_MIME_TYPE_NOT_ALLOWED',415);if(!Number.isInteger(size)||size<1)throw new PropertyPhotoError('PHOTO_SIZE_INVALID');if(size>limits.maximumBytes)throw new PropertyPhotoError('PHOTO_TOO_LARGE',413,{maximumBytes:limits.maximumBytes});const allowed={'image/jpeg':['.jpg','.jpeg'],'image/png':['.png'],'image/webp':['.webp']}[mime];if(!allowed.includes(path.extname(name).toLowerCase()))throw new PropertyPhotoError('PHOTO_EXTENSION_MISMATCH',415);return {filename:name,mimeType:mime,sizeBytes:size};};
  const uploadKey=(organizationId,propertyId,photoId,mimeType)=>`organizations/${organizationId}/properties/${propertyId}/photos/${photoId}/versions/v000001/original-upload.${extensionFor(mimeType)}`;
  async function availableSlot(who,propertyId){const current=await repository.list(who.organizationId,propertyId);if(current.filter(item=>!item.deletedAt).length>=limits.maximumPhotos)throw new PropertyPhotoError('PHOTO_GALLERY_LIMIT',409,{maximumPhotos:limits.maximumPhotos});return current;}
  async function persist({who,propertyId,metadata,inspected,scan,id,originalStorageKey,originalStored=false,current=null}){
    const records=current??await availableSlot(who,propertyId),duplicate=records.find(item=>(item.versions??[]).some(version=>version.sha256===inspected.sha256)&&!item.deletedAt);if(duplicate)throw new PropertyPhotoError('DUPLICATE_PHOTO_CONTENT',409,{photo:publicPropertyPhoto(duplicate)});
    const version=1,uploadedAt=timestamp(),base=`organizations/${who.organizationId}/properties/${propertyId}/photos/${id}/versions/v000001`,derivativeStorageKey=`${base}/report-${inspected.derivativeSha256}.jpg`;
    if(!originalStored)await storage.put(originalStorageKey,inspected.bytes,{contentType:inspected.mimeType,sha256:inspected.sha256});
    else await storage.secure?.(originalStorageKey,{contentType:inspected.mimeType,sha256:inspected.sha256});
    await storage.put(derivativeStorageKey,inspected.derivative,{contentType:inspected.derivativeMimeType,sha256:inspected.derivativeSha256});
    const versionRecord={version,filename:inspected.filename,mimeType:inspected.mimeType,sizeBytes:inspected.sizeBytes,width:inspected.width,height:inspected.height,sha256:inspected.sha256,storageKey:originalStorageKey,derivativeMimeType:inspected.derivativeMimeType,derivativeSizeBytes:inspected.derivativeSizeBytes,derivativeWidth:inspected.derivativeWidth,derivativeHeight:inspected.derivativeHeight,derivativeSha256:inspected.derivativeSha256,derivativeStorageKey,metadataStripped:true,...scan,uploadedAt,uploadedBy:who.uid,immutable:true};
    const record={id,organizationId:who.organizationId,propertyId,...photoMetadata(metadata),displayOrder:records.filter(item=>!item.deletedAt).length,isCover:records.every(item=>item.deletedAt),deletedAt:null,uploadedAt,uploadedBy:who.uid,updatedAt:uploadedAt,updatedBy:who.uid,currentVersion:version,versions:[versionRecord]};
    await repository.create(record,versionRecord);
    await audit({organizationId:who.organizationId,propertyId,photoId:id,version,userId:who.uid,action:'PROPERTY_PHOTO_UPLOADED',sha256:inspected.sha256});return publicPropertyPhoto(record);
  }
  async function list({user,propertyId,includeRemoved=false}){const who=actor(user);await propertyAccess(user,propertyId);const records=await repository.list(who.organizationId,propertyId);return records.filter(item=>includeRemoved||!item.deletedAt).map(publicPropertyPhoto).sort((a,b)=>a.displayOrder-b.displayOrder||a.uploadedAt.localeCompare(b.uploadedAt));}
  async function upload({user,propertyId,metadata,file}){
    const who=actor(user,{write:true});await propertyAccess(user,propertyId);const current=await availableSlot(who,propertyId),inspected=await inspectPropertyPhoto({...file,limits}),scan=validateScan(await malwareScanner.scan(inspected.bytes,{filename:inspected.filename,mimeType:inspected.mimeType,sha256:inspected.sha256}),inspected),id=idFactory(),base=`organizations/${who.organizationId}/properties/${propertyId}/photos/${id}/versions/v000001`,originalStorageKey=`${base}/original-${inspected.sha256}.${extensionFor(inspected.mimeType)}`;
    return persist({who,propertyId,metadata,inspected,scan,id,originalStorageKey,current});
  }
  async function initiateUpload({user,propertyId,file}){const who=actor(user,{write:true});await propertyAccess(user,propertyId);await availableSlot(who,propertyId);const intent=validateIntent(file);if(typeof storage.createUploadUrl!=='function')return {directUpload:false};const photoId=idFactory(),storageKey=uploadKey(who.organizationId,propertyId,photoId,intent.mimeType),expiresAt=new Date(clock().getTime()+10*60*1000).toISOString(),signed=await storage.createUploadUrl(storageKey,{contentType:intent.mimeType,expiresAt});return {directUpload:true,photoId,uploadUrl:signed.url,method:signed.method??'PUT',headers:signed.headers??{'Content-Type':intent.mimeType},expiresAt};}
  async function completeUpload({user,propertyId,photoId,metadata,file}){const who=actor(user,{write:true});await propertyAccess(user,propertyId);const intent=validateIntent(file),id=safeId(photoId,'PHOTO_ID'),originalStorageKey=uploadKey(who.organizationId,propertyId,id,intent.mimeType);if(typeof storage.stat!=='function')throw new PropertyPhotoError('PHOTO_DIRECT_UPLOAD_NOT_SUPPORTED',409);const object=await storage.stat(originalStorageKey);if(object.contentType!==intent.mimeType||object.sizeBytes!==intent.sizeBytes||object.sizeBytes>limits.maximumBytes)throw new PropertyPhotoError('PHOTO_DIRECT_UPLOAD_MISMATCH',422);const bytes=await storage.get(originalStorageKey),inspected=await inspectPropertyPhoto({bytes,mimeType:intent.mimeType,filename:intent.filename,limits}),scan=validateScan(await malwareScanner.scan(inspected.bytes,{filename:inspected.filename,mimeType:inspected.mimeType,sha256:inspected.sha256}),inspected),current=await availableSlot(who,propertyId);return persist({who,propertyId,metadata,inspected,scan,id,originalStorageKey,originalStored:true,current});}
  async function update({user,propertyId,photoId,patch}){
    const who=actor(user,{write:true});await propertyAccess(user,propertyId);const prior=await repository.get(who.organizationId,propertyId,safeId(photoId,'PHOTO_ID'));if(!prior)throw new PropertyPhotoError('PHOTO_NOT_FOUND',404);const now=timestamp(),next={...prior,...photoMetadata({...prior,...patch}),updatedAt:now,updatedBy:who.uid};
    if(patch.removed===true)Object.assign(next,{deletedAt:now,isCover:false});
    if(patch.removed===false)next.deletedAt=null;
    if(patch.isCover===true&&!next.deletedAt){await repository.setCover(who.organizationId,propertyId,photoId,now,who.uid);next.isCover=true;}else{await repository.update(who.organizationId,propertyId,photoId,next);if(patch.removed===true&&prior.isCover){const replacement=(await repository.list(who.organizationId,propertyId)).filter(item=>!item.deletedAt&&item.id!==photoId).sort((a,b)=>a.displayOrder-b.displayOrder)[0];if(replacement)await repository.setCover(who.organizationId,propertyId,replacement.id,now,who.uid);}}
    await audit({organizationId:who.organizationId,propertyId,photoId,version:prior.currentVersion,userId:who.uid,action:patch.removed===true?'PROPERTY_PHOTO_REMOVED':'PROPERTY_PHOTO_METADATA_UPDATED'});return publicPropertyPhoto(await repository.get(who.organizationId,propertyId,photoId));
  }
  async function reorder({user,propertyId,photoIds}){const who=actor(user,{write:true});await propertyAccess(user,propertyId);const active=(await repository.list(who.organizationId,propertyId)).filter(item=>!item.deletedAt),ids=(Array.isArray(photoIds)?photoIds:[]).map(id=>safeId(id,'PHOTO_ID'));if(ids.length!==active.length||new Set(ids).size!==ids.length||active.some(item=>!ids.includes(item.id)))throw new PropertyPhotoError('PHOTO_ORDER_INVALID');await repository.reorder(who.organizationId,propertyId,ids,timestamp(),who.uid);await audit({organizationId:who.organizationId,propertyId,userId:who.uid,action:'PROPERTY_PHOTOS_REORDERED'});return list({user,propertyId});}
  async function bytesFor({user,propertyId,photoId,version=null}){const who=actor(user);await propertyAccess(user,propertyId);const record=await repository.get(who.organizationId,propertyId,safeId(photoId,'PHOTO_ID'));if(!record)throw new PropertyPhotoError('PHOTO_NOT_FOUND',404);const selected=(record.versions??[]).find(item=>item.version===Number(version??record.currentVersion));if(!selected||selected.scanStatus!=='CLEAN')throw new PropertyPhotoError('PHOTO_NOT_AVAILABLE',423);const bytes=await storage.get(selected.derivativeStorageKey);if(digest(bytes)!==selected.derivativeSha256)throw new PropertyPhotoError('PHOTO_INTEGRITY_FAILURE',409);return {record,version:selected,bytes};}
  async function reportPhotos({user,propertyId,scenario,auditInclusion=false}){
    const references=Array.isArray(scenario?.photoSelections)?scenario.photoSelections:[],ack=scenario?.photoRightsAcknowledgment;if(!references.length)return [];
    if(references.length>limits.maximumReportPhotos)throw new PropertyPhotoError('PHOTO_REPORT_LIMIT',409,{maximumReportPhotos:limits.maximumReportPhotos});
    const identities=references.map(reference=>`${safeId(reference.photoId,'PHOTO_ID')}:${Number(reference.version)}`);if(identities.some((identity,index)=>!Number.isInteger(Number(references[index].version))||Number(references[index].version)<1)||new Set(identities).size!==identities.length)throw new PropertyPhotoError('PHOTO_REPORT_SELECTION_INVALID',409);
    const expected=photoSelectionFingerprint(references),ackRevision=Number(ack?.revision),scenarioRevision=Number(scenario.revision);if(!ack||ack.confirmed!==true||!clean(ack.userId,128)||!clean(ack.confirmedAt,40)||Number.isNaN(Date.parse(ack.confirmedAt))||ack.organizationId!==user.organizationId||ack.scenarioId!==scenario.id||!Number.isInteger(ackRevision)||ackRevision<1||ackRevision>scenarioRevision||ack.selectionFingerprint!==expected)throw new PropertyPhotoError('PHOTO_REDISTRIBUTION_ACKNOWLEDGMENT_REQUIRED',409);
    const results=[];for(const reference of references){const {record,version,bytes}=await bytesFor({user,propertyId,photoId:reference.photoId,version:reference.version});results.push({photo:{...publicPropertyPhoto(record),caption:clean(reference.caption??record.caption,180),category:PHOTO_CATEGORIES.includes(reference.category)?reference.category:record.category,sourceDescription:clean(reference.sourceDescription??record.sourceDescription,240),isCover:reference.isCover===true},version,bytes,dataUrl:`data:${version.derivativeMimeType};base64,${bytes.toString('base64')}`});}
    if(auditInclusion)await audit({organizationId:user.organizationId,propertyId,userId:user.uid,action:'PROPERTY_PHOTOS_INCLUDED_IN_REPORT',scenarioId:scenario.id,revision:scenario.revision,photoVersions:results.map(item=>`${item.photo.id}:v${item.version.version}`)});return results;
  }
  return {list,upload,initiateUpload,completeUpload,update,reorder,preview:bytesFor,reportPhotos};
}
