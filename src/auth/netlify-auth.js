import {searchRetainedAddress} from '../../apps/web/src/features/property-search/address-identity.js';

const json=(status,body,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});

function routePath(request){
  const path=new URL(request.url).pathname;
  if(path.startsWith('/.netlify/functions/api/'))return `/api/${path.slice('/.netlify/functions/api/'.length)}`;
  return path;
}

function nodeRequest(request){
  const headers={};request.headers.forEach((value,key)=>{headers[key.toLowerCase()]=value;});
  return {headers,method:request.method,url:new URL(request.url).pathname};
}

function responseHeaders(){const values={};return {values,setHeader(name,value){values[name]=value;}};}
function sameOrigin(request){return request.headers.get('origin')===new URL(request.url).origin;}

async function requestBody(request,maximum=16_000){
  const text=await request.text();
  if(Buffer.byteLength(text)>maximum)throw Object.assign(new Error('AUTHENTICATION_REQUEST_TOO_LARGE'),{status:413});
  try{return JSON.parse(text);}catch{throw Object.assign(new Error('AUTHENTICATION_JSON_INVALID'),{status:400});}
}

function publicUser(user){return {uid:user.uid,role:user.role,emailVerified:user.emailVerified,providerResearchAllowed:user.providerResearchAllowed,organizationId:user.organizationId,authenticatedAt:user.authenticatedAt,sessionExpiresAt:user.sessionExpiresAt};}
const filename=value=>String(value??'').split(/[\\/]/).at(-1).slice(0,180);
const safeWorkspaceDocument=(document={})=>{const version=document.currentVersionMetadata;return {id:document.id,propertyId:document.propertyId,documentType:document.documentType,description:document.description,source:document.source,sourceDate:document.sourceDate,uploadedAt:document.uploadedAt,updatedAt:document.updatedAt,reviewStatus:document.reviewStatus,confidentiality:document.confidentiality,redistributionPermission:document.redistributionPermission,appendixSelected:document.appendixSelected,evidenceClaim:document.evidenceClaim,currentVersion:document.currentVersion,versionCount:document.versionCount,eligibilityConsistent:document.eligibilityConsistent,currentVersionMetadata:version?{version:version.version,filename:filename(version.filename),mimeType:version.mimeType,sizeBytes:version.sizeBytes,pageCount:version.pageCount,uploadedAt:version.uploadedAt,scanStatus:version.scanStatus}:null};};
export const durableWorkspaceReport=report=>({id:report.id,propertyAddress:report.propertyAddress,propertyRef:report.propertyRef,scenarioId:report.scenarioId,scenarioName:report.scenarioName,revision:report.revision,evidenceSnapshotId:report.evidenceSnapshotId,kind:report.kind,filename:filename(report.filename),status:report.status,generatedAt:report.generatedAt,supportingDocumentCount:Array.isArray(report.supportingDocuments)?report.supportingDocuments.length:0});
export const durableWorkspaceSubject=property=>{
  const evidenceFingerprint=property.evidenceSnapshotIds?.at(-1)??null,components=property.addressComponents??{};
  const durableSource='Organization-scoped durable Firestore property record · detailed source evidence not present';
  return {ref:property.sourceSubjectRef,address:property.address,addressComponents:components,street:components.street??'',city:components.city??'',state:components.state??'',zip:components.zip??'',subjectKind:property.lifecycleStatus==='ARCHIVED_PROPERTY'?'PRELIMINARY_RESEARCH':'DURABLE_SAVED',durablePropertyId:property.id,lifecycleStatus:property.lifecycleStatus,verificationStatus:property.verificationStatus,evidenceFingerprint,attributes:{propertyType:property.propertyType??'Unknown'},avm:{price:null,low:null,high:null},sales:[],saleSearch:{retrievedAt:null,returned:0,eligible:0,radius:null,partial:false},listings:[],findings:['The durable cloud record preserves this property and its saved scenarios. Detailed retained evidence remains unknown unless present in the immutable snapshot payload.'],historicalTrigger:{amount:null,sourceDate:null,sourceRef:durableSource,meaning:'Historical county evidence is not present in this cloud record.'},countyUse:{code:null,sourceRef:durableSource},identityStatus:property.identityConfidence??'Identity confidence unknown',reviewDate:property.updatedAt,propertyRef:durableSource,valuationRef:null,propertyRetrievedAt:null,valuationRetrievedAt:null,providerAsOf:null,valuationAsOf:null};
};
export const durableWorkspacePropertyDetail=subject=>({id:subject.durablePropertyId,subjectRef:subject.ref,subjectKind:subject.subjectKind,evidenceSnapshotId:subject.evidenceFingerprint,evidenceFingerprint:subject.evidenceFingerprint,digest:`${subject.evidenceFingerprint??'unknown'}:${subject.ref}`,mode:'property',state:'READY_PROPERTY',resolutionStatus:'DURABLE_SAVED',address:subject.address,property:{...subject.attributes,squareFeet:subject.attributes.squareFootage??null,coordinates:null,valuation:subject.avm},comps:[],metrics:[],provenance:[],cache:{retrievedAt:[],source:'Organization-scoped durable Firestore record; valuation evidence payload not present'},valuationReference:null,valuationAsOf:null,valuationStatus:'NOT_AVAILABLE',findings:subject.findings});
function retainedSubjectWithLifecycle(subject,durable){
  if(!durable)return structuredClone(subject);
  return {...structuredClone(subject),subjectKind:durable.lifecycleStatus==='ARCHIVED_PROPERTY'?'PRELIMINARY_RESEARCH':'DURABLE_SAVED',durablePropertyId:durable.id,lifecycleStatus:durable.lifecycleStatus,verificationStatus:durable.verificationStatus,identityStatus:durable.identityConfidence??subject.identityStatus};
}
function retainedDetailWithLifecycle(detail,subject){
  if(!detail)return durableWorkspacePropertyDetail(subject);
  return {...structuredClone(detail),id:subject.durablePropertyId??detail.id,subjectKind:subject.subjectKind,evidenceSnapshotId:subject.evidenceFingerprint,evidenceFingerprint:subject.evidenceFingerprint};
}
const addressParts=property=>property?.addressComponents??{street:property?.street??'',city:property?.city??'',state:property?.state??'',zip:property?.zip??''};
async function cloudEvidence({user,durableService,evidenceService,includeArchived=true}){
  const durable=await durableService.list({user,includeArchived}),retained=evidenceService?await evidenceService.bootstrap({user}):{properties:[],propertyDetails:[],records:[]},durableBySubject=new Map(durable.map(item=>[item.sourceSubjectRef,item]));
  const properties=retained.properties.map(subject=>retainedSubjectWithLifecycle(subject,durableBySubject.get(subject.ref))),retainedRefs=new Set(properties.map(item=>item.ref));
  for(const property of durable)if(!retainedRefs.has(property.sourceSubjectRef))properties.push(durableWorkspaceSubject(property));
  const detailsBySubject=new Map(retained.propertyDetails.map(detail=>[detail.subjectRef,detail])),propertyDetails=properties.map(subject=>retainedDetailWithLifecycle(detailsBySubject.get(subject.ref),subject));
  return {durable,properties,propertyDetails,records:retained.records??[]};
}
async function exactEvidenceSubject({user,evidenceService,property,scenario}){
  if(!evidenceService)throw Object.assign(new Error('RETAINED_EVIDENCE_STORAGE_NOT_CONFIGURED'),{status:503});
  const record=await evidenceService.find({user,subjectRef:property.sourceSubjectRef,evidenceFingerprint:scenario?.evidenceFingerprint??property.evidenceSnapshotIds?.at(-1)});
  if(!record)throw Object.assign(new Error('RETAINED_EVIDENCE_SNAPSHOT_NOT_FOUND'),{status:409});
  return retainedSubjectWithLifecycle(record.payload.property,property);
}
function localEvidenceEntry(record){
  const property=record.payload.property,times=[property.propertyRetrievedAt,property.valuationRetrievedAt,property.saleSearch?.retrievedAt].filter(Boolean).sort();
  return {key:record.id,propertyRef:property.ref,address:property.address,addressComponents:property.addressComponents,source:'Organization retained RentCast evidence',retrievedAt:times.at(-1)??record.importedAt,evidence:{propertyRecords:Boolean(property.propertyRef),valuation:Number.isFinite(property.avm?.price),comparableSales:Array.isArray(property.sales)&&property.sales.length>0},propertySummary:{propertyType:property.attributes?.propertyType??null,bedrooms:property.attributes?.bedrooms??null,bathrooms:property.attributes?.bathrooms??null,squareFootage:property.attributes?.squareFootage??null}};
}
const classifyScenario=scenario=>{const marked=scenario?.demonstration===true||/(^|\b)(QA|FIXTURE|SYNTHETIC)(\b|$)|ARTIFICIAL DEMONSTRATION/i.test(String(scenario?.name??''));return {...scenario,_workspaceClassification:marked?'CONFIRMED_QA':'USER_OR_UNCLASSIFIED',_workspaceClassificationReasons:marked?['QA/test marker']:[]};};
const durableRoute=path=>path.match(/^\/api\/durable-properties\/([A-Za-z0-9._-]{1,128})(?:\/(workspace|archive|restore))?$/);
const documentRoute=path=>path.match(/^\/api\/durable-properties\/([A-Za-z0-9._-]{1,128})\/documents(?:\/([A-Za-z0-9._-]{1,128}))?(?:\/versions\/(\d+)\/download|\/(update))?$/);

async function documentRegister(service,{user,propertyId}){
  const listed=await service.list({user,propertyId}),documents=Array.isArray(listed)?listed:listed.documents??[],completeness=Array.isArray(listed)?await service.completeness({user,propertyId}):listed.completeness??[];
  return {documents:documents.map(safeWorkspaceDocument),completeness};
}

function selectedReportDocuments(documents,references=[]){
  const links=new Map();
  for(const reference of Array.isArray(references)?references:[]){
    if(!reference?.documentId||!Number.isInteger(reference.version))continue;
    const key=`${reference.documentId}:${reference.version}`,prior=links.get(key)??{documentId:reference.documentId,version:reference.version,claims:[]};
    if(reference.fieldKey&&!prior.claims.some(claim=>claim.fieldKey===reference.fieldKey))prior.claims.push({fieldKey:reference.fieldKey,fieldLabel:reference.fieldLabel});
    links.set(key,prior);
  }
  return [...links.values()].map(reference=>{
    const document=documents.find(item=>item.id===reference.documentId&&item.currentVersion===reference.version);
    if(!document||document.eligibilityConsistent===false||document.currentVersionMetadata?.scanStatus!=='CLEAN'||!['REVIEWED','INDEPENDENTLY_VERIFIED'].includes(document.reviewStatus)||document.redistributionPermission!=='APPROVED'||document.confidentiality!=='STANDARD'||document.appendixSelected!==true)return null;
    return {document,version:document.currentVersionMetadata,claims:reference.claims};
  }).filter(Boolean).map((item,index)=>({...item,index:index+1}));
}

const qaScenario=scenario=>scenario?.demonstration===true||/(^|\b)(QA|FIXTURE|SYNTHETIC)(\b|$)|ARTIFICIAL DEMONSTRATION/i.test(String(scenario?.name??''));
const reportDownloadHeaders=(filenameValue,result)=>({'Content-Type':'application/pdf','Content-Length':String(result.bytes.length),'Content-Disposition':`attachment; filename="${filename(filenameValue).replaceAll('"','_')}"`,'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff','X-PI-Report-Pages':String(result.totalPages),'X-PI-Appendix-Pages':String(result.appendixPages)});

/** Protects the deployed workbench API with the same Firebase session boundary as PI local development. */
export function createNetlifyAuthenticatedApi({api,authentication,durableProperties=null,retainedEvidence=null,productionResearch=null,addressValidation=null,documentMetadata=null,pdfRenderer=null,pdfAvailable=typeof pdfRenderer==='function'}={}){
  if(typeof api!=='function'||!authentication?.enabled)throw new Error('NETLIFY_AUTHENTICATION_REQUIRED');
  let pdfBusy=false;
  const inFlightReportRequests=new Set();
  return async request=>{
    const path=routePath(request),adapted=nodeRequest(request);
    try{
      if(path==='/api/health')return api(request);
      if(path==='/api/auth/config'&&request.method==='GET'){
        const recorder=responseHeaders(),csrfToken=authentication.issueCsrf(recorder);
        return json(200,{enabled:true,firebaseConfig:authentication.clientConfig,csrfToken},recorder.values);
      }
      if(path==='/api/auth/session'&&request.method==='POST'){
        if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});
        authentication.requireCsrf(adapted);const body=await requestBody(request),recorder=responseHeaders(),user=await authentication.createSession(body.idToken,recorder);
        return json(200,{user:publicUser(user)},recorder.values);
      }
      if(path==='/api/auth/logout'&&request.method==='POST'){
        if(!sameOrigin(request))return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});
        authentication.requireCsrf(adapted);const recorder=responseHeaders();authentication.clearSession(recorder);return json(200,{ok:true},recorder.values);
      }
      if(path==='/api/auth/me'&&request.method==='GET'){
        try{return json(200,{enabled:true,user:publicUser(await authentication.authenticate(adapted))});}
        catch(error){if(error?.code==='SESSION_COOKIE_MISSING')return json(200,{enabled:true,user:null});throw error;}
      }
      const user=await authentication.authenticate(adapted);
      if(path==='/api/durable-properties'&&request.method==='GET'){
        if(typeof durableProperties!=='function')return json(503,{error:'DURABLE_PROPERTY_STORAGE_NOT_CONFIGURED'});
        const service=await durableProperties(),includeArchived=new URL(request.url).searchParams.get('includeArchived')==='true',properties=await service.list({user,includeArchived}),reports=(await Promise.all(properties.map(property=>service.reports({user,id:property.id})))).flat().map(durableWorkspaceReport);
        return json(200,{enabled:true,properties,reports});
      }
      if(request.method==='GET'&&['/api/investment/bootstrap','/api/investment/scenarios','/api/investment/scenario-revisions'].includes(path)){
        if(typeof durableProperties!=='function')return json(503,{error:'DURABLE_PROPERTY_STORAGE_NOT_CONFIGURED'});
        const service=await durableProperties(),evidenceService=typeof retainedEvidence==='function'?await retainedEvidence():null,workspace=await cloudEvidence({user,durableService:service,evidenceService,includeArchived:true}),properties=workspace.durable,links=(await Promise.all(properties.map(property=>service.scenarioRevisions({user,id:property.id})))).flat(),scenarios=links.map(link=>link.scenario).filter(Boolean).sort((a,b)=>String(a.savedAt).localeCompare(String(b.savedAt))||a.revision-b.revision);
        if(path==='/api/investment/bootstrap'){const fingerprints=[...new Set(workspace.properties.map(subject=>subject.evidenceFingerprint).filter(Boolean))];return json(200,{properties:workspace.properties,propertyDetails:workspace.propertyDetails,evidenceFingerprint:fingerprints.length===1?fingerprints[0]:null,disclaimer:'Organization-scoped retained evidence is restored from immutable normalized snapshots. Provider-reported facts remain unverified unless separately reviewed.'});}
        if(path==='/api/investment/scenario-revisions')return json(200,scenarios);
        const latest=new Map();for(const scenario of scenarios)if(!latest.has(scenario.id)||latest.get(scenario.id).revision<scenario.revision)latest.set(scenario.id,scenario);
        return json(200,[...latest.values()].map(classifyScenario));
      }
      if(path==='/api/discovery/bootstrap'&&request.method==='GET')return json(200,{sourceSnapshotDate:null,fingerprint:'PRIVATE_CLOUD_DISCOVERY_NOT_LOADED',records:[],counterexamples:[],limits:{batchSize:80,shortlistSize:6},viewCounts:{allCountyRecords:0,residential:0,needsResearch:0},universe:{total:0,countySitusPresent:0,countySitusMissing:0,countySitusMalformed:0,assessorUnmatched:0,geometryAvailable:0}});
      if(path==='/api/discovery/state'&&request.method==='GET')return json(200,{shortlist:[],batches:[],candidateStatus:{},activeBatchId:null,history:[]});
      if(path==='/api/incoming-leads'&&request.method==='GET')return json(200,{intakeEnabled:false,records:[]});
      if(path==='/api/property-research/capability'&&request.method==='GET'){
        if(typeof productionResearch==='function')return json(200,await (await productionResearch()).capability({user}));
        return json(200,{enabled:typeof retainedEvidence==='function',liveProviderEnabled:false,cacheRestoreEnabled:typeof retainedEvidence==='function',cacheRestoreOnly:true,workflow:'RETAINED_EVIDENCE_ONLY_V1',provider:'RentCast',remainingRequestBudget:{providerRequests:0},blockers:['LIVE_PROVIDER_RESEARCH_DISABLED']});
      }
      if(path==='/api/admin/provider-research-settings'){
        if(typeof productionResearch!=='function')return json(503,{error:'PRODUCTION_RESEARCH_NOT_CONFIGURED'});const service=await productionResearch();
        if(request.method==='GET')return json(200,{settings:await service.getSettings({user})});
        if(request.method==='POST'){if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});authentication.requireCsrf(adapted);const input=await requestBody(request);return json(200,{settings:await service.updateSettings({user,patch:input})});}
      }
      if(path==='/api/discovery/address-validation/start'&&request.method==='POST'){
        if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json')||request.headers.get('x-pi-workspace')!=='local-v1')return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});const input=await requestBody(request),evidenceService=typeof retainedEvidence==='function'?await retainedEvidence():null,retained=evidenceService?await evidenceService.bootstrap({user}):{properties:[]},match=searchRetainedAddress(input,retained.properties);
        if(match.status==='MATCH'){const property=match.matches[0];return json(200,{kind:'RETAINED_MATCH',propertyRef:property.ref,evidenceFingerprint:property.evidenceFingerprint,message:'Retained evidence became available before provider research. No Google or RentCast request was made.'});}
        if(match.status==='AMBIGUOUS')return json(200,{kind:'RETAINED_AMBIGUOUS',matches:match.matches.map(item=>({ref:item.ref,address:item.address,evidenceFingerprint:item.evidenceFingerprint})),message:'Multiple retained subjects match this normalized address. Select the intended subject; no provider request was made.'});
        if(typeof addressValidation!=='function')return json(503,{error:'ADDRESS_VALIDATION_NOT_CONFIGURED'});return json(200,{kind:'GOOGLE_VALIDATION',...await (await addressValidation()).validateForResearch(input,{userId:user.uid})});
      }
      if(path==='/api/discovery/address-validation/confirm'&&request.method==='POST'){
        if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json')||request.headers.get('x-pi-workspace')!=='local-v1')return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});if(typeof addressValidation!=='function')return json(503,{error:'ADDRESS_VALIDATION_NOT_CONFIGURED'});return json(200,await (await addressValidation()).confirmForResearch(await requestBody(request),{userId:user.uid}));
      }
      if(path==='/api/property-research/local-evidence'&&request.method==='GET'){
        if(typeof retainedEvidence!=='function')return json(200,{entries:[]});const service=await retainedEvidence(),records=await service.list({user});return json(200,{entries:records.map(localEvidenceEntry)});
      }
      if(path==='/api/property-research/quote'&&request.method==='POST'){
        if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json')||request.headers.get('x-pi-workspace')!=='local-v1')return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});
        if(typeof retainedEvidence!=='function')return json(503,{error:'RETAINED_EVIDENCE_STORAGE_NOT_CONFIGURED'});
        if(typeof productionResearch!=='function')return json(503,{error:'PRODUCTION_RESEARCH_NOT_CONFIGURED'});
        const input=await requestBody(request,16_000),evidenceService=await retainedEvidence(),record=input?.localEvidenceKey?await evidenceService.get({user,id:input.localEvidenceKey}):input?.retainedSubjectRef?await evidenceService.find({user,subjectRef:input.retainedSubjectRef}):null;
        if(!record&&input?.retainedSubjectRef)return json(404,{error:'LOCAL_EVIDENCE_NOT_FOUND'});
        let validated=null;if(!record){if(typeof addressValidation!=='function')return json(503,{error:'ADDRESS_VALIDATION_NOT_CONFIGURED'});validated=await (await addressValidation()).consumeResearchToken(input?.addressValidationToken,{userId:user.uid});}
        const property=record?.payload.property??null,detail=record?.payload.propertyDetail??null,address=property?addressParts(property):validated.confirmedAddress,addressContext=property?{classification:'RETAINED_EVIDENCE',confirmationMethod:'RETAINED_SUBJECT',originalAddress:address,confirmedAddress:address,legalIdentityVerified:false}:{classification:validated.classification,confirmationMethod:validated.confirmationMethod,originalAddress:validated.originalAddress,confirmedAddress:validated.confirmedAddress,googleEvidence:validated.googleEvidence,legalIdentityVerified:false};
        return json(200,await (await productionResearch()).quote({user,address,addressValidation:addressContext,currentProperty:property,currentDetail:detail,operations:Array.isArray(input.operations)?input.operations:property?['valuation','comparableSales']:['propertyRecords','valuation'],refresh:input.refresh===true,subjectRef:property?.ref??null}));
      }
      if(path==='/api/property-research/research'&&request.method==='POST'){
        if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json')||request.headers.get('x-pi-workspace')!=='local-v1')return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});
        if(typeof productionResearch==='function'){
          const input=await requestBody(request,4_000);
          return json(200,await (await productionResearch()).research({user,approvalId:input?.approvalId,idempotencyKey:input?.idempotencyKey}));
        }
        if(typeof retainedEvidence!=='function')return json(503,{error:'RETAINED_EVIDENCE_STORAGE_NOT_CONFIGURED'});
        const input=await requestBody(request,16_000),service=await retainedEvidence(),record=input?.localEvidenceKey?await service.get({user,id:input.localEvidenceKey}):input?.retainedSubjectRef?await service.find({user,subjectRef:input.retainedSubjectRef}):null;
        if(!record)return json(404,{error:'LOCAL_EVIDENCE_NOT_FOUND'});
        const property=record.payload.property,available={propertyRecords:Boolean(property.propertyRef),valuation:Number.isFinite(property.avm?.price),comparableSales:Array.isArray(property.sales)&&property.sales.length>0},labels={propertyRecords:'Property records',valuation:'Valuation',comparableSales:'Comparable sales'},operations=Object.entries(available).map(([key,value])=>({key,label:labels[key],status:value?'Available':'Unavailable',requestsUsed:0,estimatedCostCents:0,source:'Organization retained evidence',...(value?{}:{error:'NOT_PRESENT_IN_RETAINED_SNAPSHOT'})}));
        return json(200,{status:operations.every(item=>item.status==='Available')?'COMPLETE':'PARTIAL',property,operations,requestsUsed:0,estimatedSpendingCents:0,automaticRetries:0,durablePropertyCreated:false,identityBoundary:'Restored provider-reported evidence remains preliminary and is not legal parcel, title or ownership verification.'});
      }
      if(path==='/api/investment/analyze'&&request.method==='POST'){
        if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json')||request.headers.get('x-pi-workspace')!=='local-v1')return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});
        if(typeof durableProperties!=='function')return json(503,{error:'DURABLE_PROPERTY_STORAGE_NOT_CONFIGURED'});
        const input=await requestBody(request,64_000),raw=input?.scenario,service=await durableProperties(),evidenceService=typeof retainedEvidence==='function'?await retainedEvidence():null,properties=await service.list({user,includeArchived:false}),property=properties.find(item=>item.sourceSubjectRef===raw?.propertyRef);
        if(!property)return json(404,{error:'DURABLE_PROPERTY_NOT_FOUND'});
        const subject=await exactEvidenceSubject({user,evidenceService,property,scenario:raw});if(Object.keys(raw?.compReviews??{}).some(reference=>!subject.sales.some(sale=>sale.evidenceRef===reference)))return json(409,{error:'COMPARABLE_EVIDENCE_NOT_RESTORED'});const evidence={properties:[subject],fingerprint:subject.evidenceFingerprint};
        try{const [{validateDraft},{analyze}]=await Promise.all([import('../investment-workspace/store.js'),import('../investment-workspace/analysis.js')]),scenario=validateDraft(raw,evidence);return json(200,analyze(scenario,{risk:input.risk===true}));}
        catch(error){return json(422,{error:error.message,errors:error.errors??{}});}
      }
      if(path==='/api/investment/save'&&request.method==='POST'){
        if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json')||request.headers.get('x-pi-workspace')!=='local-v1')return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});
        authentication.requireCsrf(adapted);
        if(typeof durableProperties!=='function')return json(503,{error:'DURABLE_PROPERTY_STORAGE_NOT_CONFIGURED'});
        const raw=await requestBody(request,64_000),service=await durableProperties(),evidenceService=typeof retainedEvidence==='function'?await retainedEvidence():null,properties=await service.list({user,includeArchived:false}),property=properties.find(item=>item.sourceSubjectRef===raw?.propertyRef);
        if(!property)return json(404,{error:'DURABLE_PROPERTY_NOT_FOUND'});
        const links=await service.scenarioRevisions({user,id:property.id}),sameScenario=links.map(link=>link.scenario).filter(item=>item?.id===raw?.id).sort((a,b)=>b.revision-a.revision),baseline=sameScenario[0]??null;
        if((raw?.revision??0)!==(baseline?.revision??0))return json(409,{error:'SCENARIO_REVISION_CONFLICT'});
        const subject=await exactEvidenceSubject({user,evidenceService,property,scenario:raw});if(Object.keys(raw?.compReviews??{}).some(reference=>!subject.sales.some(sale=>sale.evidenceRef===reference)))return json(409,{error:'COMPARABLE_EVIDENCE_NOT_RESTORED'});const evidence={properties:[subject],fingerprint:subject.evidenceFingerprint};
        try{const [{validateDraft},{analyze}]=await Promise.all([import('../investment-workspace/store.js'),import('../investment-workspace/analysis.js')]),clean=validateDraft(raw,evidence),saved={...clean,revision:(baseline?.revision??0)+1,savedAt:new Date().toISOString()};try{saved.analysis=analyze(saved,{risk:saved.riskRequested});saved.validation=null;}catch(error){saved.analysis=null;saved.validation={message:error.message,errors:error.errors??{}};}await service.linkScenarioRevision({user,subjectRef:saved.propertyRef,scenario:saved});return json(200,saved);}
        catch(error){return json(422,{error:error.message,errors:error.errors??{}});}
      }
      if(path==='/api/investment/report'&&request.method==='POST'){
        if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json')||request.headers.get('x-pi-workspace')!=='local-v1')return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});
        const input=await requestBody(request,64_000),wantsPdf=input?.pdf===true;
        if(wantsPdf){authentication.requireCsrf(adapted);if(typeof pdfRenderer!=='function')return json(501,{error:'DEPLOYED_PDF_RENDERER_NOT_AVAILABLE'});if(pdfBusy)return json(409,{error:'PDF_RENDER_IN_PROGRESS'});}
        if(typeof durableProperties!=='function')return json(503,{error:'DURABLE_PROPERTY_STORAGE_NOT_CONFIGURED'});
        const service=await durableProperties(),evidenceService=typeof retainedEvidence==='function'?await retainedEvidence():null,properties=await service.list({user,includeArchived:false}),links=(await Promise.all(properties.map(property=>service.scenarioRevisions({user,id:property.id})))).flat(),scenario=links.map(link=>link.scenario).find(item=>item?.id===input?.id&&item.revision===input?.revision);
        if(!scenario?.analysis)return json(409,{error:'SAVED_COMPLETE_SCENARIO_REQUIRED'});
        const propertyRecord=properties.find(item=>item.sourceSubjectRef===scenario.propertyRef);if(!propertyRecord)return json(404,{error:'DURABLE_PROPERTY_NOT_FOUND'});
        const allowed=new Set(Object.keys(scenario.compReviews??{})),property=await exactEvidenceSubject({user,evidenceService,property:propertyRecord,scenario});if([...allowed].some(reference=>!property.sales.some(sale=>sale.evidenceRef===reference)))return json(409,{error:'COMPARABLE_EVIDENCE_NOT_RESTORED'});const evidence={properties:[property],fingerprint:property.evidenceFingerprint,disclaimer:'Organization-scoped retained evidence is restored from an immutable normalized snapshot. Provider-reported facts remain unverified unless separately reviewed.'};
        try{
          const [{validateDraft},{workspaceReportHtml},{addSupportingEvidenceToHtml,addQaAcceptanceLabel},{reportFilename},{reportModel}]=await Promise.all([import('../investment-workspace/store.js'),import('../investment-workspace/report-html.js'),import('../investment-workspace/document-appendices.js'),import('../../apps/web/src/features/investment-workspace/report-filename.js'),import('../investment-workspace/report-model.js')]);
          validateDraft(scenario,evidence);
          const kind=['brief','full','checklist'].includes(input.kind)?input.kind:'brief',qaNotForDistribution=qaScenario(scenario),requestId=String(input.requestId??'').trim();
          if(wantsPdf&&requestId&&!/^[A-Za-z0-9_-]{8,100}$/.test(requestId))return json(422,{error:'REPORT_REQUEST_ID_INVALID'});
          const dedupeKey=wantsPdf?`${user.uid}:${scenario.id}:${scenario.revision}:${kind}:${requestId||'single'}`:null;
          if(dedupeKey&&inFlightReportRequests.has(dedupeKey))return json(409,{error:'DUPLICATE_REPORT_REQUEST'});
          if(dedupeKey)inFlightReportRequests.add(dedupeKey);
          if(wantsPdf)pdfBusy=true;
          try{
            let appendices=[],documentService=null;
            if(typeof documentMetadata==='function'&&propertyRecord.id){
              documentService=await documentMetadata();
              if(wantsPdf&&kind==='full'&&typeof documentService.reportDocuments==='function')appendices=await documentService.reportDocuments({user,propertyId:propertyRecord.id,references:scenario.evidenceAttachments??[]});
              else{const register=await documentRegister(documentService,{user,propertyId:propertyRecord.id});appendices=selectedReportDocuments(register.documents,scenario.evidenceAttachments);}
            }
            const generatedAt=new Date().toISOString(),base=workspaceReportHtml(property,scenario,evidence,kind,{generatedAt,supportingDocuments:appendices,qaNotForDistribution}),withEvidence=addSupportingEvidenceToHtml(base,appendices,{kind}),html=qaNotForDistribution?addQaAcceptanceLabel(withEvidence):withEvidence,baseFilename=reportFilename({property,scenario,kind,generatedAt}),reportFilenameValue=qaNotForDistribution?`QA_NOT_FOR_DISTRIBUTION_${baseFilename}`:baseFilename,checklist=reportModel(property,scenario,{generatedAt,supportingDocuments:appendices}).model.dueDiligenceChecklist;
            if(!wantsPdf)return json(200,{html,filename:reportFilenameValue,generatedAt,checklist,pdfAvailable:Boolean(pdfAvailable),supportingDocumentCount:appendices.length,classification:qaNotForDistribution?'SYNTHETIC_QA':'PRELIMINARY'});
            const result=await pdfRenderer(html,{appendices:kind==='full'?appendices:[],qaNotForDistribution}),documentReferences=kind==='full'?appendices.map(item=>({documentId:item.document.id,version:item.version.version,sha256:item.version.sha256,appendix:item.index,claims:item.claims??[]})):[];
            await service.linkReport({user,subjectRef:scenario.propertyRef,scenario,kind,filename:reportFilenameValue,status:qaNotForDistribution?'QA_NOT_FOR_DISTRIBUTION':'DOWNLOADED',supportingDocuments:documentReferences});
            return new Response(result.bytes,{status:200,headers:reportDownloadHeaders(reportFilenameValue,result)});
          }finally{if(wantsPdf)pdfBusy=false;if(dedupeKey)inFlightReportRequests.delete(dedupeKey);}
        }catch(error){return json(Number.isInteger(error?.status)?error.status:422,{error:/^[A-Z0-9_-]+$/.test(String(error?.code??error?.message))?String(error.code??error.message):'PDF_RENDER_FAILED',errors:error.errors??{}});}
      }
      const supportingMatch=documentRoute(path);
      if(supportingMatch&&request.method==='GET'){
        if(typeof documentMetadata!=='function')return json(503,{error:'SUPPORTING_DOCUMENT_STORAGE_NOT_CONFIGURED'});
        const [,propertyId,documentId,version]=supportingMatch,service=await documentMetadata();
        if(documentId&&version){if(typeof service.download!=='function')return json(503,{error:'SUPPORTING_DOCUMENT_DOWNLOAD_NOT_CONFIGURED'});const result=await service.download({user,propertyId,documentId,version:Number(version)});return new Response(result.bytes,{status:200,headers:{'Content-Type':result.version.mimeType,'Content-Length':String(result.bytes.length),'Content-Disposition':`attachment; filename="${filename(result.version.filename).replaceAll('"','_')}"`,'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'}});}
        if(documentId)return json(404,{error:'DOCUMENT_ROUTE_NOT_FOUND'});
        const register=await documentRegister(service,{user,propertyId});return json(200,{enabled:true,...register});
      }
      if(supportingMatch&&request.method==='POST'){
        if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json')||request.headers.get('x-pi-workspace')!=='local-v1')return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});
        authentication.requireCsrf(adapted);if(typeof documentMetadata!=='function')return json(503,{error:'SUPPORTING_DOCUMENT_STORAGE_NOT_CONFIGURED'});
        const [,propertyId,documentId,,action]=supportingMatch,service=await documentMetadata();
        if(action==='update'){if(typeof service.update!=='function')return json(503,{error:'SUPPORTING_DOCUMENT_WRITES_NOT_CONFIGURED'});const input=await requestBody(request,64_000);return json(200,{document:safeWorkspaceDocument(await service.update({user,propertyId,documentId,patch:input}))});}
        if(documentId)return json(404,{error:'DOCUMENT_ROUTE_NOT_FOUND'});if(typeof service.upload!=='function')return json(503,{error:'SUPPORTING_DOCUMENT_WRITES_NOT_CONFIGURED'});
        const input=await requestBody(request,15*1024*1024),encoded=String(input?.file?.base64??'');if(!encoded||encoded.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))return json(422,{error:'DOCUMENT_BASE64_INVALID'});const bytes=Buffer.from(encoded,'base64');if(bytes.toString('base64')!==encoded)return json(422,{error:'DOCUMENT_BASE64_INVALID'});
        const document=await service.upload({user,propertyId,metadata:input.metadata,file:{filename:input.file?.filename,mimeType:input.file?.mimeType,bytes},documentId:input.documentId??null});return json(201,{document:safeWorkspaceDocument(document)});
      }
      if(['/api/durable-properties/preview','/api/durable-properties/save'].includes(path)&&request.method==='POST'){
        if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json')||request.headers.get('x-pi-workspace')!=='local-v1')return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});
        if(typeof durableProperties!=='function'||typeof retainedEvidence!=='function')return json(503,{error:'DURABLE_PROPERTY_STORAGE_NOT_CONFIGURED'});
        const input=await requestBody(request),evidenceService=await retainedEvidence(),record=await evidenceService.find({user,subjectRef:input?.subjectRef});if(!record)return json(404,{error:'RETAINED_SUBJECT_NOT_FOUND'});
        const service=await durableProperties(),subject=record.payload.property,scenario=input?.scenarioId?(await Promise.all((await service.list({user,includeArchived:true})).map(property=>service.scenarioRevisions({user,id:property.id})))).flat().map(link=>link.scenario).find(item=>item?.id===input.scenarioId)??null:null;
        if(path.endsWith('/preview'))return json(200,await service.preview({user,subject,scenario}));
        authentication.requireCsrf(adapted);return json(200,{property:await service.promote({user,subject,scenario})});
      }
      const durableMatch=durableRoute(path);
      if(durableMatch){
        if(typeof durableProperties!=='function')return json(503,{error:'DURABLE_PROPERTY_STORAGE_NOT_CONFIGURED'});
        const [,id,action]=durableMatch,service=await durableProperties();
        if(request.method==='GET'&&(!action||action==='workspace')){
          const property=await service.get({user,id});
          if(!action)return json(200,{property});
          const [revisions,reports,docsRegister]=await Promise.all([service.scenarioRevisions({user,id}),service.reports({user,id}),typeof documentMetadata==='function'?documentMetadata().then(metadata=>documentRegister(metadata,{user,propertyId:id})):Promise.resolve({documents:[],completeness:[]})]);
          return json(200,{property,revisions,reports:reports.map(durableWorkspaceReport),documents:docsRegister.documents,documentCompleteness:docsRegister.completeness});
        }
        if(request.method==='POST'&&['archive','restore'].includes(action)){
          if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json(403,{error:'AUTHENTICATION_ORIGIN_REQUIRED'});
          authentication.requireCsrf(adapted);
          return json(200,{property:await service.setArchived({user,id,archived:action==='archive'})});
        }
        return json(405,{error:'METHOD_NOT_ALLOWED'});
      }
      return api(request);
    }catch(error){
      if(process.env.PI_DEBUG_NETLIFY_API==='true')console.error(error);
      const unavailable=['4','8','14'].includes(String(error?.code))||/firestore.*(?:unavailable|deadline|credential)/i.test(String(error?.message??'')),status=unavailable?503:Number.isInteger(error?.status)?error.status:400,code=unavailable?'DURABLE_PROPERTY_STORAGE_UNAVAILABLE':/^[A-Z0-9_-]+$/.test(String(error?.code??error?.message))?String(error.code??error.message):'AUTHENTICATION_FAILED';
      return json(status,{error:code,code});
    }
  };
}
