import http from 'node:http';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {loadEvidence} from './evidence.js';
import {createStore,validateDraft} from './store.js';
import {analyze} from './analysis.js';
import {workspaceReportHtml,renderWorkspacePdf} from './reports.js';
import {addPropertyDetails} from './property-detail.js';
import {addDiscoveryEvidence,loadDiscovery} from '../discovery/model.js';
import {createDiscoveryStore} from '../discovery/store.js';
import {createAddressResolutionService} from '../discovery/address-resolution.js';
import {classifyScenarioRecord} from '../discovery/scenario-classification.js';
import {planBatchEnrichment} from '../discovery/enrichment.js';
import {batchSummaryHtml,discoveryBriefHtml} from '../discovery/reports.js';
import {MAP_CSP} from '../workbench/mapConfig.js';
import {validateLeadEnvelope} from '../leads/contract.js';
import {createLeadRateLimiter,verifyLeadRequest} from '../leads/authentication.js';
import {createLeadStore} from '../leads/store.js';
import {addressParts,searchRetainedAddress} from '../../apps/web/src/features/property-search/address-identity.js';
import {addRetainedPropertyResearch} from './retained-property-research.js';
import {reportFilename} from '../../apps/web/src/features/investment-workspace/report-filename.js';
import {addCachedPropertyResearch,restoreDurablePropertyEvidence} from './automatic-property-research.js';
import {confirmationStreet,createWorkspaceRemovalRegistry,workspaceAddressKey} from './property-removal.js';
import {addQaAcceptanceLabel,addSupportingEvidenceToHtml} from './document-appendices.js';
import {reportModel} from './report-model.js';

const LOCAL_MAP_CSP=MAP_CSP.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'").replace("frame-src https://*.google.com", "frame-src 'self' blob: https://*.google.com");

function localAddressReview(input){
  if(input?.candidateId!=='LOCAL-ADDRESS-REVIEW')return null;
  const street=String(input?.addressInput?.street??'').trim().replace(/\s+/g,' '),city=String(input?.addressInput?.city??'').trim().replace(/\s+/g,' '),state=String(input?.addressInput?.state??'').trim().toUpperCase();
  if(!street||street.length>160||!city||city.length>100||state!=='CA')throw new Error('Local address review requires street, city and CA.');
  return {id:'LOCAL-ADDRESS-REVIEW',address:{street,city,state:'CA',postalCode:null,rawCountySitus:`${street}, ${city}`,confidence:'LOCAL_ANALYST_INPUT'},sourceIdentity:{}};
}

export function requireInvestmentBootstrap(ready){
  if(ready===true)return;
  throw Object.assign(new Error('INVESTMENT_BOOTSTRAP_REQUIRED'),{status:409,code:'INVESTMENT_BOOTSTRAP_REQUIRED'});
}

// Intentionally does not import the production runtime, environment loader,
// repositories, acquisition clients, database drivers or provider credentials.
export async function startInvestmentWorkspace({port=4175,root=process.cwd(),storeDirectory=path.join(root,'data/runtime/investment-workspace-v1/scenarios'),discoveryStoreDirectory=path.join(root,'data/runtime/discovery-v1-5/local-state'),leadStoreDirectory=path.join(root,'data/runtime/pi-v2-milestone2/incoming-leads'),leadIntakeSecret=null,viteEnabled=true,propertyDetail=false,addressTransport=null,propertyResearch=null,authentication=null,durableProperties=null,supportingDocuments=null,mapConfig={provider:'google',configured:false,reason:'Google Maps browser key is not configured.'}}={}){
  let evidence=await loadEvidence(root),discovery=null,discoveryStore=null;if(propertyDetail){evidence=await addPropertyDetails(evidence,root);discovery=await loadDiscovery(root);evidence=addDiscoveryEvidence(evidence,discovery);discoveryStore=createDiscoveryStore(discoveryStoreDirectory,discovery);}
  evidence=await addRetainedPropertyResearch(evidence,root);
  evidence=await addCachedPropertyResearch(evidence);
  const removalRegistry=await createWorkspaceRemovalRegistry({file:path.join(root,'data/runtime/pi-v2-3/workspace-removals.json')});
  evidence=removalRegistry.filterEvidence(evidence);
  const retainedSourceRefs=new Set(evidence.properties.map(property=>property.ref));
  propertyResearch?.setEvidenceProvider?.(()=>evidence);
  propertyResearch?.setEvidenceHandler?.(({property,detail})=>{if(removalRegistry.isRemoved(property))return;const properties=evidence.properties.some(item=>item.ref===property.ref)?evidence.properties.map(item=>item.ref===property.ref?property:item):[...evidence.properties,property],details=evidence.propertyDetails??[],propertyDetails=detail?(details.some(item=>item.subjectRef===property.ref)?details.map(item=>item.subjectRef===property.ref?detail:item):[...details,detail]):details;evidence={...evidence,properties,propertyDetails};});
  const store=createStore(storeDirectory,()=>evidence),removalTokens=new Map();
  const leadStore=createLeadStore(leadStoreDirectory),leadRateLimit=createLeadRateLimiter();
  const addressResolution=createAddressResolutionService({transport:addressTransport,maximumProviderCalls:50});
  const webRoot=path.resolve(root,'apps/web');
  const inside=(base,target)=>{const relative=path.relative(base,target);return relative!==''&&!relative.startsWith(`..${path.sep}`)&&relative!=='..'&&!path.isAbsolute(relative);};
  const allowedViteFile=urlPath=>{
    if(!urlPath.startsWith('/@fs/'))return true;
    const requested=path.resolve(urlPath.slice('/@fs/'.length));
    return inside(webRoot,requested)||/node_modules[\\/](vite[\\/]dist[\\/]client[\\/]env\.mjs|leaflet[\\/]dist[\\/])/.test(requested);
  };
  const vite=viteEnabled?await (await import('vite')).createServer({configFile:path.join(root,'apps/web/vite.config.js'),define:{__PI_LOCAL_INVESTMENT__:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'spa'}):null;
  let origin='',pdfBusy=false,investmentBootstrapReady=false;const researchApprovals=new Map();
  async function localResearchInput(req,input){
    if(input?.retainedSubjectRef){const retained=evidence.properties.find(item=>item.ref===input.retainedSubjectRef);if(!retained)throw Object.assign(new Error('RETAINED_SUBJECT_NOT_FOUND'),{status:404});return {address:addressParts(retained),retainedSubjectRef:retained.ref,addressValidation:{classification:'RETAINED_EVIDENCE',confirmationMethod:'RETAINED_SUBJECT',originalAddress:addressParts(retained),confirmedAddress:addressParts(retained),legalIdentityVerified:false}};}
    if(input?.localEvidenceKey){const catalog=await propertyResearch.localEvidence(req),cached=catalog.entries.find(item=>item.key===input.localEvidenceKey);if(!cached)throw Object.assign(new Error('LOCAL_EVIDENCE_NOT_FOUND'),{status:404});return {address:cached.addressComponents,addressValidation:{classification:'LOCAL_PROVIDER_CACHE',confirmationMethod:'LOCAL_EVIDENCE_SELECTION',originalAddress:cached.addressComponents,confirmedAddress:cached.addressComponents,legalIdentityVerified:false}};}
    const validated=addressResolution.consumeResearchToken(input?.addressValidationToken,{userId:req.authUser?.uid});return {address:validated.confirmedAddress,addressValidation:{classification:validated.classification,confirmationMethod:validated.confirmationMethod,originalAddress:validated.originalAddress,confirmedAddress:validated.confirmedAddress,googleEvidence:validated.googleEvidence,legalIdentityVerified:false}};
  }
  async function removalTarget(req,input){
    const property=input?.propertyRef?evidence.properties.find(item=>item.ref===input.propertyRef):null,catalog=propertyResearch?.localEvidence?await propertyResearch.localEvidence(req):{entries:[]},cached=input?.localEvidenceKey?catalog.entries.find(item=>item.key===input.localEvidenceKey):null;
    if(!property&&!cached)throw Object.assign(new Error('WORKSPACE_PROPERTY_NOT_FOUND'),{status:404});
    const addressComponents=property?addressParts(property):cached.addressComponents,address=property?.address??cached.address,propertyRef=property?.ref??null,scenarios=propertyRef?await store.dependencies(propertyRef):{scenarios:0,revisions:0},cache=propertyResearch?.localEvidenceDependencies?await propertyResearch.localEvidenceDependencies(req,addressComponents):{records:0,directories:0};
    return {propertyRef,localEvidenceKey:cached?.key??null,address,addressComponents,requiredStreet:addressComponents.street,sourceEvidencePreserved:Boolean(property&&retainedSourceRefs.has(property.ref)),dependencies:{...scenarios,cacheRecords:cache.records,cacheDirectories:cache.directories,browserDrafts:'cleared on this device',reportReferences:'cleared on this device'}};
  }
  async function durableEvidence(user){
    if(!durableProperties||!user){const {fingerprint,...safe}=evidence;return {...safe,evidenceFingerprint:fingerprint};}
    const durable=await durableProperties.list({user,includeArchived:true});
    evidence=await restoreDurablePropertyEvidence(evidence,durable);
    const {fingerprint,...safe}=evidence,bySubject=new Map(durable.map(item=>[item.sourceSubjectRef,item]));
    const properties=safe.properties.map(item=>{const saved=bySubject.get(item.ref);if(!saved)return item;return {...item,durablePropertyId:saved.id,lifecycleStatus:saved.lifecycleStatus,subjectKind:saved.lifecycleStatus==='ARCHIVED_PROPERTY'?'PRELIMINARY_RESEARCH':'DURABLE_SAVED',verificationStatus:saved.verificationStatus};});
    const propertyDetails=(safe.propertyDetails??[]).map(item=>{const saved=bySubject.get(item.subjectRef);if(!saved)return item;return {...item,durablePropertyId:saved.id,lifecycleStatus:saved.lifecycleStatus,subjectKind:saved.lifecycleStatus==='ARCHIVED_PROPERTY'?'PRELIMINARY':'DURABLE_SAVED'};});
    return {...safe,properties,propertyDetails,evidenceFingerprint:fingerprint};
  }
  async function durableScenarioLinks(user){if(!durableProperties||!user)return [];const properties=await durableProperties.list({user,includeArchived:true});return (await Promise.all(properties.map(property=>durableProperties.scenarioRevisions({user,id:property.id})))).flat();}
  async function allScenarioRevisions(user){const local=await store.all(),remote=(await durableScenarioLinks(user)).map(link=>link.scenario).filter(Boolean),byRevision=new Map([...remote,...local].map(item=>[`${item.id}:r${item.revision}`,item]));return [...byRevision.values()].sort((a,b)=>String(a.savedAt).localeCompare(String(b.savedAt))||a.revision-b.revision);}
  async function latestScenarios(user){const latest=new Map();for(const scenario of await allScenarioRevisions(user))if(!latest.has(scenario.id)||latest.get(scenario.id).revision<scenario.revision)latest.set(scenario.id,scenario);return [...latest.values()].sort((a,b)=>String(a.savedAt).localeCompare(String(b.savedAt)));}
  const durableIdRoute=pathname=>pathname.match(/^\/api\/durable-properties\/([a-f0-9-]{36})(?:\/(archive|restore|scenarios|reports))?$/i);
  const documentRoute=pathname=>pathname.match(/^\/api\/durable-properties\/([a-f0-9-]{36})\/documents(?:\/([A-Za-z0-9._-]{1,128}))?(?:\/versions\/(\d+)\/download|\/(update))?$/);
  const server=http.createServer(async(req,res)=>{
    const json=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
    try{
      if(req.headers.host!==new URL(origin).host){json(403,{error:'Only this local workspace host is allowed.'});return;}
      const url=new URL(req.url,origin);
      if(url.pathname==='/api/auth/config'&&req.method==='GET'){
        if(!authentication){json(200,{enabled:false});return;}
        const csrfToken=authentication.issueCsrf(res);json(200,{enabled:true,firebaseConfig:authentication.clientConfig,projectId:authentication.expectedProjectId,csrfToken});return;
      }
      if(url.pathname==='/api/auth/session'&&req.method==='POST'){
        if(!authentication){json(404,{error:'Authentication is not configured.'});return;}
        if(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json')){json(403,{error:'Local authentication origin is required.'});return;}
        authentication.requireCsrf(req);let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16000){json(413,{error:'Authentication request is too large.'});return;}}
        const user=await authentication.createSession(JSON.parse(body).idToken,res);json(200,{user:{uid:user.uid,role:user.role,emailVerified:user.emailVerified}});return;
      }
      if(url.pathname==='/api/auth/logout'&&req.method==='POST'){
        if(!authentication){json(204,{});return;}if(req.headers.origin!==origin){json(403,{error:'Local authentication origin is required.'});return;}authentication.requireCsrf(req);authentication.clearSession(res);json(200,{ok:true});return;
      }
      if(url.pathname==='/api/auth/me'&&req.method==='GET'){
        if(!authentication){json(200,{enabled:false,user:null});return;}let user;try{user=await authentication.authenticate(req);}catch(error){if(error?.code==='SESSION_COOKIE_MISSING'){json(200,{enabled:true,user:null});return;}throw error;}json(200,{enabled:true,user:{uid:user.uid,role:user.role,emailVerified:user.emailVerified,providerResearchAllowed:user.providerResearchAllowed,organizationId:user.organizationId,authenticatedAt:user.authenticatedAt,sessionExpiresAt:user.sessionExpiresAt}});return;
      }
      if(url.pathname==='/api/lead-intake/v1'){
        if(req.method!=='POST'||!req.headers['content-type']?.startsWith('application/json')){json(415,{error:'JSON POST required.'});return;}
        let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>32*1024){json(413,{error:'Lead request is too large.'});return;}}
        const source=String(req.headers['x-pi-lead-source']??'').toLowerCase(),rate=leadRateLimit(source||'unknown');if(!rate.allowed){res.setHeader('Retry-After',String(rate.retryAfterSeconds));json(429,{error:'Lead intake rate limit exceeded.'});return;}
        const verified=verifyLeadRequest({secret:leadIntakeSecret,timestamp:req.headers['x-pi-timestamp'],signature:req.headers['x-pi-signature'],body});if(!verified.ok){json(403,{error:'Lead intake authentication failed.',code:verified.reason});return;}
        const validation=validateLeadEnvelope(JSON.parse(body));if(!validation.valid){json(422,{error:'Lead request failed validation.',errors:validation.errors});return;}
        if(source!==validation.lead.source){json(422,{error:'Lead source header does not match the signed payload.'});return;}
        const result=await leadStore.intake(validation.lead);json(result.duplicate?200:201,{ok:true,id:result.lead.id,state:result.lead.state,duplicate:result.duplicate,duplicateReviewRequired:result.duplicateReviewRequired});return;
      }
      if(req.headers.origin&&req.headers.origin!==origin){json(403,{error:'Only this local workspace origin is allowed.'});return;}
      if(url.pathname.startsWith('/api/')){
        if(authentication)req.authUser=await authentication.authenticate(req);
        const route=url.pathname;
        if(req.method==='GET'&&route==='/api/maps/config'){json(200,mapConfig);return;}
        if(req.method==='GET'&&route==='/api/investment/bootstrap'){const bootstrap=await durableEvidence(req.authUser);investmentBootstrapReady=true;json(200,bootstrap);return;}
        if(req.method==='GET'&&route==='/api/investment/scenarios'){json(200,(await latestScenarios(req.authUser)).map(item=>({...item,_workspaceClassification:classifyScenarioRecord(item).classification,_workspaceClassificationReasons:classifyScenarioRecord(item).reasons})));return;}
        if(req.method==='GET'&&route==='/api/investment/scenario-revisions'){json(200,await allScenarioRevisions(req.authUser));return;}
        if(req.method==='GET'&&route==='/api/incoming-leads'){json(200,{intakeEnabled:Boolean(leadIntakeSecret),records:await leadStore.list()});return;}
        if(req.method==='GET'&&route==='/api/discovery/bootstrap'&&discovery){json(200,discovery);return;}
        if(req.method==='GET'&&route==='/api/discovery/state'&&discoveryStore){json(200,await discoveryStore.read());return;}
        if(req.method==='GET'&&route==='/api/discovery/address-resolution/usage'){json(200,addressResolution.usage());return;}
        if(req.method==='GET'&&route==='/api/property-research/capability'){json(200,propertyResearch?await propertyResearch.capability(req):{enabled:false,provider:'RentCast',remainingRequestBudget:null,blockers:['PROVIDER_ACCESS_NOT_CONFIGURED']});return;}
        if(req.method==='GET'&&route==='/api/property-research/local-evidence'){const catalog=propertyResearch?.localEvidence?await propertyResearch.localEvidence(req):{entries:[]},removed=new Set(removalRegistry.entries().map(entry=>entry.addressKey));json(200,{entries:catalog.entries.filter(entry=>!removed.has(workspaceAddressKey(entry.addressComponents)))});return;}
        if(req.method==='GET'&&route==='/api/durable-properties'){if(!durableProperties){json(200,{enabled:false,properties:[],reports:[]});return;}const properties=await durableProperties.list({user:req.authUser,includeArchived:url.searchParams.get('includeArchived')==='true'}),reports=(await Promise.all(properties.map(property=>durableProperties.reports({user:req.authUser,id:property.id})))).flat();json(200,{enabled:true,properties,reports});return;}
        const supportingMatch=documentRoute(route);
        if(req.method==='GET'&&supportingMatch&&supportingDocuments){const [,propertyId,documentId,version]=supportingMatch;if(documentId&&version){const result=await supportingDocuments.download({user:req.authUser,propertyId,documentId,version});res.writeHead(200,{'Content-Type':result.version.mimeType,'Content-Length':result.bytes.length,'Content-Disposition':`attachment; filename="${result.version.filename.replace(/["\\\r\n]/g,'_')}"`,'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'});res.end(result.bytes);return;}if(documentId){json(404,{error:'DOCUMENT_ROUTE_NOT_FOUND'});return;}json(200,{enabled:true,documents:await supportingDocuments.list({user:req.authUser,propertyId}),completeness:await supportingDocuments.completeness({user:req.authUser,propertyId})});return;}
        if(req.method==='GET'&&supportingMatch&&!supportingDocuments){json(503,{error:'SUPPORTING_DOCUMENT_STORAGE_NOT_CONFIGURED'});return;}
        const durableMatch=durableIdRoute(route);
        if(req.method==='GET'&&durableMatch&&durableProperties){const [,id,action]=durableMatch;if(action==='scenarios'){json(200,{revisions:await durableProperties.scenarioRevisions({user:req.authUser,id})});return;}if(action==='reports'){json(200,{reports:await durableProperties.reports({user:req.authUser,id})});return;}if(!action){json(200,{property:await durableProperties.get({user:req.authUser,id})});return;}}
        const researchRoutes=propertyResearch?.research?['/api/property-research/quote','/api/property-research/research']:propertyResearch?.plan?['/api/property-research/plan','/api/property-research/authorize','/api/property-research/run']:['/api/property-research/preview','/api/property-research/execute'];
        const postRoutes=['/api/investment/save','/api/investment/analyze','/api/investment/report','/api/workspace/property-removal/preview','/api/workspace/property-removal/execute','/api/incoming-leads/action','/api/durable-properties/preview','/api/durable-properties/save',...(discoveryStore?['/api/discovery/state','/api/discovery/address-resolution/suggest','/api/discovery/address-resolution/decision','/api/discovery/address-validation/start','/api/discovery/address-validation/confirm','/api/discovery/enrichment/preview','/api/discovery/report',...researchRoutes]:[])];
        if(req.method!=='POST'||(!postRoutes.includes(route)&&!(durableMatch&&['archive','restore'].includes(durableMatch[2]))&&!supportingMatch)){json(404,{error:'No provider, database or production API exists in this local workspace.'});return;}
        if(req.headers.origin!==origin||req.headers['x-pi-workspace']!=='local-v1'||!req.headers['content-type']?.startsWith('application/json')){json(403,{error:'Local workspace request headers are required.'});return;}
        const maximumBody=supportingMatch?15*1024*1024:64000;let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>maximumBody){json(413,{error:supportingMatch?'Document upload request is too large.':'Scenario request is too large.'});return;}}
        const input=JSON.parse(body);
        if(supportingMatch){
          if(!supportingDocuments)throw Object.assign(new Error('SUPPORTING_DOCUMENT_STORAGE_NOT_CONFIGURED'),{status:503});authentication?.requireCsrf(req);const [,propertyId,documentId,,action]=supportingMatch;
          if(action==='update'){json(200,{document:await supportingDocuments.update({user:req.authUser,propertyId,documentId,patch:input})});return;}
          if(documentId)throw Object.assign(new Error('DOCUMENT_ROUTE_NOT_FOUND'),{status:404});
          const encoded=String(input?.file?.base64??'');if(!encoded||encoded.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw Object.assign(new Error('DOCUMENT_BASE64_INVALID'),{status:422});const bytes=Buffer.from(encoded,'base64');if(bytes.toString('base64')!==encoded)throw Object.assign(new Error('DOCUMENT_BASE64_INVALID'),{status:422});
          json(201,{document:await supportingDocuments.upload({user:req.authUser,propertyId,metadata:input.metadata,file:{filename:input.file.filename,mimeType:input.file.mimeType,bytes},documentId:input.documentId??null})});return;
        }
        if(route==='/api/durable-properties/preview'||route==='/api/durable-properties/save'){
          if(!durableProperties)throw Object.assign(new Error('DURABLE_PROPERTY_STORAGE_NOT_CONFIGURED'),{status:503});
          const property=evidence.properties.find(item=>item.ref===String(input?.subjectRef??''));if(!property)throw Object.assign(new Error('PROPERTY_SUBJECT_NOT_FOUND'),{status:404});
          const scenario=input?.scenarioId?(await latestScenarios(req.authUser)).find(item=>item.id===input.scenarioId&&item.propertyRef===property.ref):null;
          if(input?.scenarioId&&!scenario)throw Object.assign(new Error('SAVED_SCENARIO_NOT_FOUND'),{status:409});
          if(route.endsWith('/preview')){json(200,await durableProperties.preview({user:req.authUser,subject:property}));return;}
          authentication?.requireCsrf(req);json(200,{property:await durableProperties.promote({user:req.authUser,subject:property,scenario})});return;
        }
        if(durableMatch&&['archive','restore'].includes(durableMatch[2])){
          if(!durableProperties)throw Object.assign(new Error('DURABLE_PROPERTY_STORAGE_NOT_CONFIGURED'),{status:503});authentication?.requireCsrf(req);
          json(200,{property:await durableProperties.setArchived({user:req.authUser,id:durableMatch[1],archived:durableMatch[2]==='archive'})});return;
        }
        if(route==='/api/workspace/property-removal/preview'){
          if(req.authUser?.role!=='Administrator')throw Object.assign(new Error('ROLE_NOT_AUTHORIZED'),{status:403});const target=await removalTarget(req,input),token=randomUUID(),expiresAt=new Date(Date.now()+5*60*1000).toISOString();removalTokens.set(token,{token,userId:req.authUser.uid,target,expiresAt,used:false});json(200,{removalToken:token,expiresAt,target});return;
        }
        if(route==='/api/workspace/property-removal/execute'){
          authentication?.requireCsrf(req);if(req.authUser?.role!=='Administrator')throw Object.assign(new Error('ROLE_NOT_AUTHORIZED'),{status:403});const authorization=removalTokens.get(String(input?.removalToken??''));if(!authorization||authorization.used||authorization.userId!==req.authUser.uid||Date.parse(authorization.expiresAt)<=Date.now())throw Object.assign(new Error('PROPERTY_REMOVAL_CONFIRMATION_EXPIRED'),{status:403});const expected=confirmationStreet(authorization.target.requiredStreet),entered=confirmationStreet(String(input?.confirmationStreet??''));if(!entered||entered!==expected)throw Object.assign(new Error('PROPERTY_REMOVAL_ADDRESS_MISMATCH'),{status:409});authorization.used=true;removalTokens.delete(authorization.token);const scenarioRemoval=authorization.target.propertyRef?await store.removeProperty(authorization.target.propertyRef):{scenarios:0,revisions:0},cacheRemoval=propertyResearch?.removeLocalEvidence?await propertyResearch.removeLocalEvidence(req,authorization.target.addressComponents):{records:0,directories:0},entry=await removalRegistry.add({propertyRef:authorization.target.propertyRef,address:authorization.target.address,addressComponents:authorization.target.addressComponents,userId:req.authUser.uid,sourceEvidencePreserved:authorization.target.sourceEvidencePreserved});evidence=removalRegistry.filterEvidence(evidence);json(200,{removed:true,address:authorization.target.address,addressComponents:authorization.target.addressComponents,propertyRef:authorization.target.propertyRef,scenarioRemoval,cacheRemoval,sourceEvidencePreserved:entry.sourceEvidencePreserved});return;
        }
        if(route==='/api/property-research/quote'){
          if(!propertyResearch?.research)throw Object.assign(new Error('AUTHENTICATED_RESEARCH_NOT_CONFIGURED'),{status:503});const researchInput=await localResearchInput(req,input),retained=input?.retainedSubjectRef?evidence.properties.find(item=>item.ref===input.retainedSubjectRef):null,operations=Array.isArray(input.operations)?input.operations:retained?['valuation','comparableSales']:['propertyRecords','valuation'];
          if(propertyResearch.quote){json(200,await propertyResearch.quote({user:req.authUser,address:researchInput.address,addressValidation:researchInput.addressValidation,currentProperty:retained,currentDetail:evidence.propertyDetails?.find(item=>item.subjectRef===retained?.ref)??null,operations,refresh:input.refresh===true,subjectRef:retained?.ref??null}));return;}
          const capability=await propertyResearch.capability(req),approvalId=randomUUID(),expiresAt=new Date(Date.now()+10*60_000).toISOString(),available=retained?operations.filter(operation=>operation==='propertyRecords'?Boolean(retained.propertyRef):operation==='valuation'?Number.isFinite(retained.avm?.price):Boolean(retained.sales?.length)):[];researchApprovals.set(approvalId,{userId:req.authUser?.uid,researchInput,expiresAt,used:false});json(200,{approvalId,expiresAt,provider:'RentCast',researchType:operations.map(value=>value.replace(/([a-z])([A-Z])/g,'$1 $2')).join(' + '),address:researchInput.address,operations:operations.map(key=>({key,label:key.replace(/([a-z])([A-Z])/g,'$1 $2'),requestRequired:!available.includes(key),estimatedMaximumChargeCents:available.includes(key)?0:capability.maximumEstimatedCostCents??20,source:available.includes(key)?'Retained evidence':'New RentCast request'})),estimatedMaximumChargeCents:operations.filter(key=>!available.includes(key)).length*(capability.maximumEstimatedCostCents??20),cachedResultsAvailable:available.length>0,refresh:input.refresh===true,warnings:[],previousFailure:null,automaticRetries:0});return;
        }
        if(route==='/api/property-research/research'){
          if(!propertyResearch?.research)throw Object.assign(new Error('AUTHENTICATED_RESEARCH_NOT_CONFIGURED'),{status:503});
          if(input?.approvalId&&propertyResearch.quote){json(200,await propertyResearch.research({user:req.authUser,approvalId:input.approvalId,idempotencyKey:input.idempotencyKey}));return;}
          if(input?.approvalId){const approval=researchApprovals.get(input.approvalId);if(!approval||approval.used||approval.userId!==req.authUser?.uid||Date.parse(approval.expiresAt)<=Date.now())throw Object.assign(new Error('RESEARCH_APPROVAL_INVALID'),{status:403});approval.used=true;json(200,await propertyResearch.research(req,approval.researchInput));return;}
          json(200,await propertyResearch.research(req,await localResearchInput(req,input)));return;
        }
        if(route==='/api/property-research/plan'){if(!propertyResearch?.plan)throw Object.assign(new Error('ONE_TIME_RESEARCH_NOT_CONFIGURED'),{status:503});json(200,await propertyResearch.plan(req,input));return;}
        if(route==='/api/property-research/authorize'){if(!propertyResearch?.authorize)throw Object.assign(new Error('ONE_TIME_RESEARCH_NOT_CONFIGURED'),{status:503});authentication?.requireCsrf(req);json(200,await propertyResearch.authorize(req,input));return;}
        if(route==='/api/property-research/run'){if(!propertyResearch?.run)throw Object.assign(new Error('ONE_TIME_RESEARCH_NOT_CONFIGURED'),{status:503});json(200,await propertyResearch.run(req,input));return;}
        if(route==='/api/property-research/preview'){if(!propertyResearch)throw Object.assign(new Error('LOCAL_LIVE_MODE_DISABLED'),{status:503});json(200,await propertyResearch.preview(req,input));return;}
        if(route==='/api/property-research/execute'){if(!propertyResearch)throw Object.assign(new Error('LOCAL_LIVE_MODE_DISABLED'),{status:503});json(200,await propertyResearch.execute(req,input));return;}
        if(route==='/api/incoming-leads/action'){
          const record=await leadStore.read(String(input.id??''));
          if(input.action==='REVIEW'){json(200,await leadStore.update(record.id,{state:'NEEDS_REVIEW'}));return;}
          if(input.action==='ARCHIVE'){json(200,await leadStore.update(record.id,{state:'ARCHIVED'}));return;}
          if(input.action==='RESEARCH_ADDRESS'){
            const result=searchRetainedAddress({street:record.lead.address.line1,city:record.lead.address.city,state:record.lead.address.state,zip:record.lead.address.postalCode},evidence.properties),matches=result.matches.map(item=>({ref:item.ref,address:item.address,evidenceFingerprint:item.evidenceFingerprint??evidence.fingerprint,subjectKind:item.subjectKind}));
            json(200,await leadStore.update(record.id,{state:'IN_RESEARCH',research:{status:result.status,matches,reviewedAt:new Date().toISOString(),providerCalls:0}}));return;
          }
          throw new Error('Unknown incoming-lead action.');
        }
        if(route==='/api/discovery/state'){json(200,await discoveryStore.save(input));return;}
        if(route==='/api/discovery/enrichment/preview'){
          const state=await discoveryStore.read(),batch=state.batches.find(item=>item.id===input.batchId);if(!batch)throw new Error('Choose a saved research batch before previewing enrichment.');
          const records=batch.candidateIds.map(id=>discovery.records.find(record=>record.id===id)).map(record=>record&&({...record,researchStatus:state.candidateStatus[record.id]??record.researchStatus}));if(records.some(record=>!record))throw new Error('Research batch contains an unavailable candidate.');
          const cachedAddressIds=records.filter(record=>addressResolution.isCached(record)).map(record=>record.id);json(200,planBatchEnrichment(records,{cachedAddressIds}));return;
        }
        if(route==='/api/discovery/report'){
          const state=await discoveryStore.read();let html,filename;
          if(input.kind==='batch'){
            const batch=state.batches.find(item=>item.id===input.batchId);if(!batch)throw new Error('Choose a saved research batch before exporting.');const records=batch.candidateIds.map(id=>discovery.records.find(record=>record.id===id)).map(record=>record&&({...record,researchStatus:state.candidateStatus[record.id]??record.researchStatus}));if(records.some(record=>!record))throw new Error('Research batch contains an unavailable candidate.');html=batchSummaryHtml(batch,records,evidence.disclaimer);filename=`${batch.id}-research-summary.pdf`;
          }else if(input.kind==='brief'){
            const source=discovery.records.find(item=>item.id===input.candidateId);if(!source)throw new Error('Unknown discovery candidate.');const record={...source,researchStatus:state.candidateStatus[source.id]??source.researchStatus};html=discoveryBriefHtml(record,evidence.disclaimer);filename=`${record.id}-research-brief.pdf`;
          }else throw new Error('Choose batch or brief report output.');
          if(pdfBusy){json(409,{error:'A local PDF is rendering. Wait for it to finish.'});return;}pdfBusy=true;try{const {bytes}=await renderWorkspacePdf(html);res.writeHead(200,{'Content-Type':'application/pdf','Cache-Control':'no-store','Content-Disposition':`attachment; filename="${filename}"`});res.end(bytes);}finally{pdfBusy=false;}return;
        }
        if(route==='/api/discovery/address-resolution/suggest'){
          const candidate=[...(discovery.records??discovery.candidates),...(discovery.counterexamples??[])].find(item=>item.id===input.candidateId||item.reference===input.candidateId)??localAddressReview(input);if(!candidate)throw new Error('Unknown discovery candidate.');
          json(200,await addressResolution.suggest(candidate));return;
        }
        if(route==='/api/discovery/address-resolution/decision'){
          const candidate=[...(discovery.records??discovery.candidates),...(discovery.counterexamples??[])].find(item=>item.id===input.candidateId||item.reference===input.candidateId)??localAddressReview(input);if(!candidate)throw new Error('Unknown discovery candidate.');
          const suggestion=await addressResolution.suggest(candidate);json(200,addressResolution.decide(input.candidateId,input,suggestion));return;
        }
        if(route==='/api/discovery/address-validation/start'){
          const retained=searchRetainedAddress(input,evidence.properties);
          if(retained.status==='MATCH'){const property=retained.matches[0];json(200,{kind:'RETAINED_MATCH',propertyRef:property.ref,evidenceFingerprint:property.evidenceFingerprint??evidence.fingerprint,message:'Retained evidence became available before provider research. No Google or RentCast request was made.'});return;}
          if(retained.status==='AMBIGUOUS'){json(200,{kind:'RETAINED_AMBIGUOUS',matches:retained.matches.map(item=>({ref:item.ref,address:item.address,evidenceFingerprint:item.evidenceFingerprint??evidence.fingerprint})),message:'Multiple retained subjects match this normalized address. Select the intended subject; no provider request was made.'});return;}
          json(200,{kind:'GOOGLE_VALIDATION',...(await addressResolution.validateForResearch(input,{userId:req.authUser?.uid}))});return;
        }
        if(route==='/api/discovery/address-validation/confirm'){json(200,addressResolution.confirmForResearch(input,{userId:req.authUser?.uid}));return;}
        if(route.endsWith('/save')){const baseline=(await latestScenarios(req.authUser)).find(item=>item.id===input.id)??null,saved=await store.save(input,{baseline});if(durableProperties&&req.authUser)await durableProperties.linkScenarioRevision({user:req.authUser,subjectRef:saved.propertyRef,scenario:saved});json(200,saved);return;}
        if(route.endsWith('/analyze')){validateDraft(input.scenario,evidence);json(200,analyze(input.scenario,{risk:input.risk===true}));return;}
        requireInvestmentBootstrap(investmentBootstrapReady);
        const s=(await allScenarioRevisions(req.authUser)).find(x=>x.id===input.id&&x.revision===input.revision);
        if(!s||!s.analysis)throw new Error('Save this scenario with complete valid assumptions before generating a report.');
        validateDraft(s,evidence);const p=evidence.properties.find(x=>x.ref===s.propertyRef),generatedAt=new Date().toISOString(),durableProperty=durableProperties&&req.authUser?await durableProperties.findBySubject({user:req.authUser,subjectRef:s.propertyRef}):null,appendices=supportingDocuments&&durableProperty?await supportingDocuments.reportDocuments({user:req.authUser,propertyId:durableProperty.id,references:s.evidenceAttachments??[]}):[],qaAcceptance=input.qaAcceptance===true,baseHtml=addSupportingEvidenceToHtml(workspaceReportHtml(p,s,evidence,input.kind,{generatedAt,supportingDocuments:appendices,qaNotForDistribution:qaAcceptance}),appendices,{kind:input.kind}),html=qaAcceptance?addQaAcceptanceLabel(baseHtml):baseHtml,baseFilename=reportFilename({property:p,scenario:s,kind:input.kind,generatedAt}),filename=qaAcceptance?`QA_NOT_FOR_DISTRIBUTION_${baseFilename}`:baseFilename,documentReferences=appendices.map(item=>({documentId:item.document.id,version:item.version.version,sha256:item.version.sha256,appendix:item.index,claims:item.claims??[]})),checklist=reportModel(p,s,{generatedAt,supportingDocuments:appendices}).model.dueDiligenceChecklist;
        if(durableProperties&&req.authUser)await durableProperties.linkReport({user:req.authUser,subjectRef:s.propertyRef,scenario:s,kind:input.kind,filename,status:qaAcceptance?'QA_NOT_FOR_DISTRIBUTION':input.pdf?'DOWNLOADED':'PREVIEWED',supportingDocuments:input.kind==='full'?documentReferences:[]});
        if(!input.pdf){json(200,{html,filename,generatedAt,checklist});return;}
        if(pdfBusy){json(409,{error:'A local PDF is rendering. Wait for it to finish.'});return;}
        pdfBusy=true;try{const {bytes}=await renderWorkspacePdf(html,{appendices:input.kind==='full'?appendices:[],qaNotForDistribution:qaAcceptance});res.writeHead(200,{'Content-Type':'application/pdf','Cache-Control':'no-store','Content-Disposition':`attachment; filename="${filename}"`});res.end(bytes);}finally{pdfBusy=false;}
        return;
      }
      // Retained evidence and local state are never served as static files.
      const raw=req.url??'';
      if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
      if(req.method!=='GET'||/%|\\|\.env|source_docs|data\/|__open-in-editor/i.test(raw)||!allowedViteFile(url.pathname)){json(404,{error:'Not available.'});return;}
      res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
      res.setHeader('Content-Security-Policy',LOCAL_MAP_CSP);
      if(vite)vite.middlewares(req,res,()=>json(404,{error:'Not found.'}));else json(404,{error:'UI disabled for API tests.'});
    }catch(e){json(Number.isInteger(e.status)?e.status:400,{error:/ENOENT|EACCES|JSON/.test(e.message)?'Local evidence or request could not be read. Check the saved scenario and workspace setup.':e.message,code:e.code??null,errors:e.errors??{},details:e.details??null});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});origin=`http://127.0.0.1:${server.address().port}`;
  return {url:`${origin}/${propertyDetail?'#property-detail':'#investment'}`,origin,close:async()=>{await vite?.close();await new Promise(resolve=>server.close(resolve));}};
}
