import {randomUUID} from 'node:crypto';
import {assessorOptions,listAssessorCandidates,readAssessor,safeAssessor,safeOpportunity,safeOpportunityDetail,safeOpportunityList,safeReviewResult} from '../../persistence/assessorOpportunityRepository.js';
import {investmentReportModel,recordInvestmentReport} from '../../services/investmentReportService.js';
import {finalize,manualDeal} from '../model.js';
import {safeDatabaseError} from '../../persistence/db.js';
import {saveProperty,savedProperties,openProperty,propertyEvidenceHistory,setPropertyArchive} from '../../services/propertyPersistenceService.js';
import {refreshEvidence} from '../../services/refreshEvidenceService.js';
import {saveDeal,savedDeals,openDeal,setDealArchive,duplicateDeal,reanalyzeDeal} from '../../services/dealPersistenceService.js';
import {calculateLinkedDecision} from '../../services/acquisitionDecisionService.js';
import {readAnalysisHistory} from '../../services/analysisSnapshotService.js';
import {calculateDecision,saveAcquisitionDecision,openAcquisitionDecision,listDecisionHistory,saveEncumbranceHistory,saveConditionHistory,listEncumbranceHistory,listConditionHistory} from '../../services/acquisitionDecisionService.js';
import {opportunities,opportunity,opportunityStatus,safeOpportunityMetrics,reviewOpportunity,resolveOpportunity,candidateCsv} from '../../services/opportunityService.js';
import {readAddressResolution,saveAddressResolution,providerReadyAddress} from '../../persistence/addressResolutionRepository.js';
import {parseAddress} from './live.js';

export const PDF_LOCAL_ONLY='PDF generation is currently available in the local analyst runtime.';
export const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
export const MAX_BODY=16000;
const actions=new Set(['/api/fixture','/api/resolve','/api/confirm','/api/properties/analyze','/api/deal/start','/api/deal','/api/report']);
const idSegment='[^/]+';
const isPropertyRecord=path=>new RegExp(`^/api/properties/${idSegment}$`).test(path);
const isPropertyEvidence=path=>new RegExp(`^/api/properties/${idSegment}/evidence$`).test(path);
const isPropertyRefresh=path=>new RegExp(`^/api/properties/${idSegment}/refresh$`).test(path);
const isPropertyArchive=path=>new RegExp(`^/api/properties/${idSegment}/archive$`).test(path);
const isDealRecord=path=>new RegExp(`^/api/deals/${idSegment}$`).test(path);
const isDealAnalyses=path=>new RegExp(`^/api/deals/${idSegment}/analyses$`).test(path);
const isDealAnalyze=path=>new RegExp(`^/api/deals/${idSegment}/analyze$`).test(path);
const isDealDuplicate=path=>new RegExp(`^/api/deals/${idSegment}/duplicate$`).test(path);
const isDealArchive=path=>new RegExp(`^/api/deals/${idSegment}/archive$`).test(path);
const isPropertyEncumbrances=path=>new RegExp(`^/api/properties/${idSegment}/encumbrances$`).test(path);
const isPropertyConditions=path=>new RegExp(`^/api/properties/${idSegment}/condition-assessments$`).test(path);
const isPropertyDecisions=path=>new RegExp(`^/api/properties/${idSegment}/acquisition-decisions$`).test(path);
const isDecisionRecord=path=>new RegExp(`^/api/acquisition-decisions/${idSegment}$`).test(path);
const isOpportunityRecord=path=>new RegExp(`^/api/opportunities/${idSegment}$`).test(path);
const isOpportunityReview=path=>new RegExp(`^/api/opportunities/${idSegment}/review$`).test(path);
const isOpportunityResolve=path=>new RegExp(`^/api/opportunities/${idSegment}/resolve$`).test(path);
const isOpportunityEnrich=path=>new RegExp(`^/api/opportunities/${idSegment}/enrich$`).test(path);
const isOpportunityAnalyze=path=>new RegExp(`^/api/opportunities/${idSegment}/analyze$`).test(path);
const isOpportunityAddressResolution=path=>new RegExp(`^/api/opportunities/${idSegment}/address-resolution$`).test(path);
function remember(map,key,value){while(map.size>=100)map.delete(map.keys().next().value);map.set(key,{value,expires:Date.now()+30*60*1000});}
function recall(map,key){const item=map.get(key);if(!item||item.expires<Date.now()){map.delete(key);return null;}return item.value;}
export function createApi({runtime='local',loadFixture,resolveCached,live,mapConfig=()=>({configured:false}),reportService,persistence=null}={}){
  const assessorRead=work=>{if(!persistence)throw new Error('DATABASE_NOT_CONFIGURED');return persistence.transaction(work);};
  const sessions=new Map(),confirmations=new Map(),reports=new Map();let busyReport=false;
  const fixtureId=model=>['fantasia','bass','joyce'].includes(model.id)?`fixture:${model.id}:${model.mode}`:null;
  const save=(model,portableId=null)=>{const sessionId=portableId??randomUUID();remember(sessions,sessionId,model);return {sessionId,model};};
  function found(result,mode){
    if(result.model)return save(result.model,fixtureId(result.model));
    if(result.candidates?.length){
      const portable=result.candidates.length===1&&['fantasia','bass','joyce'].includes(result.candidates[0].id)&&['property','deal'].includes(mode);
      const confirmationId=portable?`fixture-confirm:${result.candidates[0].id}:${mode}`:randomUUID();
      remember(confirmations,confirmationId,{result,mode});return {...result,confirm:undefined,confirmationId};
    }
    return result;
  }
  return async function handle(request){
    const url=new URL(request.url),path=url.pathname.replace(/^\/\.netlify\/functions\/api(?=\/|$)/,'/api');
    const origin=request.headers.get('origin');
    if(origin&&origin!==url.origin)return json(403,{error:'SAME_ORIGIN_REQUIRED'});
    try{
      if(request.method==='GET'){
        if(path==='/api/health'){
          let persistenceAvailable=Boolean(persistence),databaseError=null;
          if(persistence)try{await persistence.query('SELECT 1');}catch(error){persistenceAvailable=false;databaseError=safeDatabaseError(error);}
          return json(200,{ok:true,runtime,rentcastConfigured:Boolean(live?.configured),databaseConfigured:Boolean(persistence),databaseProvider:persistence?'postgresql':null,persistenceAvailable,...(databaseError?{databaseError}:{}),pdfAvailable:Boolean(reportService),durableLiveCache:runtime==='local',durableSessions:Boolean(persistence)});
        }
        if(path==='/api/reports/investment/capability')return json(200,{available:Boolean(reportService?.investment),modelAvailable:Boolean(persistence),message:reportService?.investment?'Full Investment Analysis PDF available.':PDF_LOCAL_ONLY});
        if(/^\/api\/acquisition-decisions\/[^/]+\/investment-report$/.test(path))return json(200,{report:await investmentReportModel({db:persistence,decisionId:path.split('/')[3]})});
        if(path==='/api/maps/config')return json(200,await mapConfig());
        if(path==='/api/reports/capability')return json(200,{available:Boolean(reportService),message:reportService?'Local analyst PDF available.':PDF_LOCAL_ONLY});
        if(path==='/api/fixtures')return json(200,{fixtures:[{id:'fantasia',name:'Florida Portfolio / Fantasia'},{id:'bass',name:'Bass — source STOP'},{id:'joyce',name:'Joyce — address ambiguity'}]});
        if(path==='/api/properties')return json(200,{properties:await savedProperties({db:persistence,search:url.searchParams.get('search') ?? '',includeArchived:url.searchParams.get('includeArchived')==='true'})});
        if(path==='/api/deals')return json(200,{deals:await savedDeals({db:persistence,search:url.searchParams.get('search') ?? '',includeArchived:url.searchParams.get('includeArchived')==='true'})});
        if(path==='/api/opportunities'){
          const page=Math.max(Math.trunc(Number(url.searchParams.get('page')))||1,1),pageSize=Math.min(Math.max(Math.trunc(Number(url.searchParams.get('pageSize')))||25,1),100);const result=await assessorRead(tx=>listAssessorCandidates(tx,{...assessorOptions(url),limit:pageSize,offset:(page-1)*pageSize}));return json(200,{opportunities:result.rows.map(safeOpportunityList),page,pageSize,total:result.total,metrics:safeOpportunityMetrics(await opportunityStatus({db:persistence}))});
        }
        if(path==='/api/opportunities/metrics')return json(200,{metrics:safeOpportunityMetrics(await opportunityStatus({db:persistence}))});
        if(path==='/api/opportunities/export'){const result=await assessorRead(tx=>listAssessorCandidates(tx,{...assessorOptions(url),limit:100,offset:0}));return new Response(candidateCsv(result.rows),{headers:{'Content-Type':'text/csv','Content-Disposition':'attachment; filename="property-intelligence-opportunities.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
        if(isOpportunityAddressResolution(path)){const id=path.split('/')[3];return json(200,{addressResolution:await assessorRead(tx=>readAddressResolution(tx,id)),history:await assessorRead(tx=>readAddressResolution(tx,id,{history:true}))});}
        if(isOpportunityRecord(path)){const id=path.split('/')[3],raw=await opportunity({db:persistence,id}),assessor=raw?await assessorRead(tx=>readAssessor(tx,id)):null;return json(200,{opportunity:safeOpportunityDetail(raw,assessor)});}
        if(isPropertyEvidence(path))return json(200,{evidence:await propertyEvidenceHistory({db:persistence,id:path.split('/')[3]})});
        if(isPropertyEncumbrances(path))return json(200,{encumbrances:await listEncumbranceHistory({db:persistence,propertyId:path.split('/')[3]})});
        if(isPropertyConditions(path))return json(200,{assessments:await listConditionHistory({db:persistence,propertyId:path.split('/')[3]})});
        if(isPropertyDecisions(path))return json(200,{decisions:await listDecisionHistory({db:persistence,propertyId:path.split('/')[3]})});
        if(isDecisionRecord(path))return json(200,{decision:await openAcquisitionDecision({db:persistence,id:path.split('/')[3]})});
        if(isPropertyRecord(path)&&!actions.has(path)){const property=await openProperty({db:persistence,id:path.split('/')[3]});return json(200,{property,sessionId:property?.model?save(property.model,`saved-property:${property.id}:property`).sessionId:null});}
        if(isDealAnalyses(path))return json(200,{analyses:await readAnalysisHistory({db:persistence,dealId:path.split('/')[3]})});
        if(isDealRecord(path)){const deal=await openDeal({db:persistence,id:path.split('/')[3]});return json(200,{deal,sessionId:deal?.model?save(deal.model,`saved-deal:${deal.id}:deal`).sessionId:null});}
        if(/^\/api\/reports\/[\w-]+$/.test(path)){
          const report=recall(reports,path.split('/').pop());
          if(!report||!reportService)return json(404,{error:'NOT_FOUND'});
          return new Response(await reportService.read(report),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="independent-deal-review.pdf"','Cache-Control':'no-store'}});
        }
        return json(actions.has(path)?405:404,{error:actions.has(path)?'METHOD_NOT_ALLOWED':'NOT_FOUND'});
      }
      const persistentAction = path==='/api/properties' || path==='/api/deals' || path==='/api/acquisition-decisions/calculate' || isPropertyRefresh(path) || isPropertyArchive(path) || isPropertyEncumbrances(path) || isPropertyConditions(path) || isPropertyDecisions(path) || isDecisionRecord(path) || isDealAnalyze(path) || isDealDuplicate(path) || isDealArchive(path) || isOpportunityReview(path) || isOpportunityResolve(path) || isOpportunityAddressResolution(path) || isOpportunityEnrich(path) || isOpportunityAnalyze(path);
      if(!actions.has(path)&&!persistentAction&&path!=='/api/reports/investment')return json(404,{error:'NOT_FOUND'});
      if(request.method!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
      if(origin!==url.origin)return json(403,{error:'SAME_ORIGIN_REQUIRED'});
      if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')??''))return json(415,{error:'JSON_REQUIRED'});
      if(Number(request.headers.get('content-length'))>MAX_BODY)return json(413,{error:'REQUEST_TOO_LARGE'});
      const reader=request.body?.getReader();let size=0;const chunks=[];
      if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();return json(413,{error:'REQUEST_TOO_LARGE'});}chunks.push(value);}
      let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json(400,{error:'INVALID_JSON'});}
      if(!data||typeof data!=='object'||Array.isArray(data))return json(400,{error:'INVALID_JSON'});
      if(path==='/api/reports/investment'){
        if(Object.keys(data).some(key=>!['decisionId','persistMetadata'].includes(key)))return json(400,{error:'REPORT_IDS_ONLY'});
        const model=await investmentReportModel({db:persistence,decisionId:data.decisionId});
        if(!reportService?.investment)return json(503,{error:'PDF_LOCAL_ONLY',message:PDF_LOCAL_ONLY,reportModelFingerprint:model.reportMeta.reportModelFingerprint});
        if(busyReport)return json(409,{error:'REPORT_IN_PROGRESS'});
        busyReport=true;
        try{const result=await reportService.investment(model);if(data.persistMetadata===true)await recordInvestmentReport({db:persistence,model});return new Response(result.bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="investment-analysis.pdf"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Report-Fingerprint':model.reportMeta.reportModelFingerprint}});}finally{busyReport=false;}
      }
      if(path==='/api/properties'){
        const token=data.sessionId?.match?.(/^fixture:(fantasia|bass|joyce):(property|deal)$/);
        const session=recall(sessions,data.sessionId) ?? (token ? await loadFixture(token[1],token[2]) : null);
        if(!session)return json(410,{error:'SESSION_EXPIRED',message:'This analysis session is no longer available. Analyze the address again before saving the property.'});
        return json(200,await saveProperty({db:persistence,model:session,requestKey:data.requestKey ?? request.headers.get('Idempotency-Key')}));
      }
      if(path==='/api/acquisition-decisions/calculate')return json(200,{decision:data.analysisSnapshotId||data.dealId||data.propertyId
        ?await calculateLinkedDecision({db:persistence,input:data.input,propertyId:data.propertyId,dealId:data.dealId,evidenceSnapshotId:data.evidenceSnapshotId,analysisSnapshotId:data.analysisSnapshotId})
        :await calculateDecision(data.input??data)});
      if(isPropertyEncumbrances(path))return json(200,await saveEncumbranceHistory({db:persistence,propertyId:path.split('/')[3],evidenceSnapshotId:data.evidenceSnapshotId,items:data.encumbrances??data.items??[],requestKey:data.requestKey ?? request.headers.get('Idempotency-Key')}));
      if(isPropertyConditions(path))return json(200,await saveConditionHistory({db:persistence,propertyId:path.split('/')[3],dealId:data.dealId,assessmentDate:data.assessmentDate??new Date().toISOString().slice(0,10),source:data.source,items:data.items??[],requestKey:data.requestKey ?? request.headers.get('Idempotency-Key')}));
      if(isPropertyDecisions(path)){
        const input=data.input??data,decision=data.decision;
        return json(200,await saveAcquisitionDecision({db:persistence,propertyId:path.split('/')[3],evidenceSnapshotId:data.evidenceSnapshotId??input.evidenceSnapshotId,dealId:data.dealId,analysisSnapshotId:data.analysisSnapshotId,decision,input,requestKey:data.requestKey ?? request.headers.get('Idempotency-Key'),conditionAssessment:data.conditionAssessment}));
      }
      if(isOpportunityReview(path))return json(200,safeReviewResult(await reviewOpportunity({db:persistence,id:path.split('/')[3],action:data.action,reasonCode:data.reasonCode,notes:data.notes,status:data.status,requestKey:data.requestKey ?? request.headers.get('Idempotency-Key')})));
      if(isOpportunityAddressResolution(path)){
        const id=path.split('/')[3],saved=await saveAddressResolution({db:persistence,candidateId:id,input:data,requestKey:data.requestKey ?? request.headers.get('Idempotency-Key'),context:data.context??'ANALYST_UI',supersedeId:data.supersedeId??null});
        if(data.action==='SAVE_AND_ANALYZE'){
          if(data.confirmProviderCall!==true||data.acknowledgeQuota!==true)return json(409,{error:'ANALYSIS_CONFIRMATION_REQUIRED',addressResolution:saved.addressResolution,providerCalls:0});
          if(!live)return json(503,{error:'LIVE_NOT_CONFIGURED',addressResolution:saved.addressResolution});
          const result=await live.analyze({address:saved.addressResolution.formatted_address,refresh:false,acknowledgeQuota:true});
          return json(200,{...found(result,'property'),addressResolution:saved.addressResolution,providerCallExplicit:true});
        }
        return json(200,saved);
      }
      if(isOpportunityResolve(path))return json(200,safeReviewResult(await resolveOpportunity({db:persistence,id:path.split('/')[3],address:data.address,source:data.source,propertyId:data.propertyId??null,requestKey:data.requestKey ?? request.headers.get('Idempotency-Key')})));
      if(isOpportunityEnrich(path)){
        if(data.confirmProviderCall!==true)return json(409,{error:'ENRICHMENT_CONFIRMATION_REQUIRED'});
        if(!live)return json(503,{error:'LIVE_NOT_CONFIGURED'});
        const candidate=await opportunity({db:persistence,id:path.split('/')[3]});if(!candidate||candidate.identity_status!=='RESOLVED'||!data.address)return json(409,{error:'ENRICHMENT_IDENTITY_REQUIRED'});
        const result=await live.analyze({address:data.address,refresh:true,acknowledgeQuota:Boolean(data.acknowledgeQuota)});return json(200,{candidateId:path.split('/')[3],status:'ENRICHMENT_RESULT',model:result.model??result,providerCallExplicit:true});
      }
      if(isOpportunityAnalyze(path)){
        if(data.confirmProviderCall!==true||data.acknowledgeQuota!==true)return json(409,{error:'ENRICHMENT_CONFIRMATION_REQUIRED'});
        const id=path.split('/')[3],candidate=await opportunity({db:persistence,id});
        const evidence=await assessorRead(tx=>readAssessor(tx,id));
        if(evidence?.crosswalk_status!=='MATCHED_EXACT')return json(409,{error:'ENRICHMENT_IDENTITY_REQUIRED'});
        const canonical=await assessorRead(tx=>readAddressResolution(tx,id));
        let address=canonical?.formatted_address??null,addressSource=canonical?'CANONICAL_ADDRESS_RESOLUTION':null;
        if(!address&&candidate?.address_line1&&candidate?.city&&candidate?.state&&candidate?.postal_code){address=providerReadyAddress({street:candidate.address_line1,city:candidate.city,state:candidate.state,postalCode:candidate.postal_code})?.formattedAddress??null;if(address)addressSource='LINKED_PROPERTY';}
        if(!address&&evidence?.situs_raw){try{address=parseAddress(evidence.situs_raw)?evidence.situs_raw:null;if(address)addressSource='COUNTY_SITUS';}catch{address=null;}}
        if(!address)return json(409,{error:'ADDRESS_INCOMPLETE',candidateId:id,countySitus:evidence.situs_raw??null,addressResolution:canonical});
        if(!live)return json(503,{error:'LIVE_NOT_CONFIGURED'});
        return json(200,{...found(await live.analyze({address,refresh:false,acknowledgeQuota:true}),'property'),submittedAddressSource:addressSource});
      }
      if(isPropertyRefresh(path)){
        const id=path.split('/')[3],token=data.sessionId?.match?.(/^fixture:(fantasia|bass|joyce):(property|deal)$/);
        const model=recall(sessions,data.sessionId) ?? (token ? await loadFixture(token[1],token[2]) : null);
        if(!model)return json(410,{error:'SESSION_EXPIRED',message:'This analysis session is no longer available. Analyze the address again before refreshing evidence.'});
        const providerRefresh=data.providerRefresh===true;
        if(providerRefresh&&!live)throw new Error('LIVE_NOT_CONFIGURED');
        return json(200,await refreshEvidence({db:persistence,propertyId:id,model,
          retrieve:providerRefresh ? async()=>{const result=await live.analyze({address:model?.address,refresh:true,acknowledgeQuota:Boolean(data.acknowledgeQuota)});return result.model ?? result;} : undefined,
          requestKey:data.requestKey ?? request.headers.get('Idempotency-Key')}));
      }
      if(isPropertyArchive(path))return json(200,{property:await setPropertyArchive({db:persistence,id:path.split('/')[3],archived:data.archived!==false})});
      if(path==='/api/deals'){
        const token=data.sessionId?.match?.(/^fixture:(fantasia|bass|joyce):deal$/);
        const model=recall(sessions,data.sessionId) ?? (token ? await loadFixture(token[1],'deal') : null);
        if(!model)return json(410,{error:'SESSION_EXPIRED',message:'This deal session is no longer available. Reopen the saved property and start the deal again.'});
        return json(200,await saveDeal({db:persistence,model,propertyId:data.propertyId,evidenceSnapshotId:data.evidenceSnapshotId,name:data.name,requestKey:data.requestKey ?? request.headers.get('Idempotency-Key')}));
      }
      if(isDealAnalyze(path)){
        const id=path.split('/')[3],durable=recall(sessions,data.sessionId) ? null : await openDeal({db:persistence,id});
        const model=recall(sessions,data.sessionId) ?? durable?.model;
        if(data.evidenceSnapshotId&&durable?.evidence&&!durable.evidence.some(row=>row.id===data.evidenceSnapshotId))throw new Error('EVIDENCE_NOT_LINKED');
        const evidenceSnapshotId=data.evidenceSnapshotId ?? durable?.evidence?.[0]?.id ?? null;
        return json(200,await reanalyzeDeal({db:persistence,id,model,evidenceSnapshotId,requestKey:data.requestKey ?? request.headers.get('Idempotency-Key')}));
      }
      if(isDealDuplicate(path))return json(200,await duplicateDeal({db:persistence,id:path.split('/')[3],name:data.name,requestKey:data.requestKey ?? request.headers.get('Idempotency-Key')}));
      if(isDealArchive(path))return json(200,{deal:await setDealArchive({db:persistence,id:path.split('/')[3],archived:data.archived!==false})});
      if(path==='/api/fixture'){const model=await loadFixture(data.id,data.mode);return json(200,save(model,fixtureId(model)));}
      if(path==='/api/resolve')return json(200,found(await resolveCached(data.address,data.mode),data.mode));
      if(path==='/api/properties/analyze'){
        if(!live)return json(503,{error:'LIVE_NOT_CONFIGURED'});
        return json(200,found(await live.analyze(data),'property'));
      }
      if(path==='/api/confirm'){
        const cachedConfirmation=typeof data.confirmationId==='string'&&data.confirmationId.match(/^fixture-confirm:(fantasia|bass|joyce):(property|deal)$/);
        const pending=recall(confirmations,data.confirmationId)??(cachedConfirmation?{result:{candidates:[{id:cachedConfirmation[1]}]},mode:cachedConfirmation[2]}:null);
        if(!pending?.result.candidates.some(c=>c.id===data.id))return json(400,{error:'CONFIRMATION_INVALID'});
        // Live confirmation is serialized by the live service; do not permit token replay.
        confirmations.delete(data.confirmationId);
        const result=pending.result.confirm?await pending.result.confirm(data.id):{model:await loadFixture(data.id,pending.mode)};
        return json(200,found(result,pending.mode));
      }
      if(path==='/api/report'&&!reportService)return json(503,{error:'PDF_LOCAL_ONLY',message:PDF_LOCAL_ONLY});
      let model=recall(sessions,data.sessionId);
      // Public, allowlisted fixture references are safe to reconstruct after a cold start.
      // Never reconstruct provider evidence from client-supplied models or trigger retrieval here.
      const portable=typeof data.sessionId==='string'&&data.sessionId.match(/^fixture:(fantasia|bass|joyce):(property|deal)$/);
      if(!model&&portable)model=await loadFixture(portable[1],portable[2]);
      if(!model)return json(410,{error:'SESSION_EXPIRED',message:'This nonpersistent session expired. Reload the fixture or analyze the address again.'});
      if(path==='/api/deal/start'){
        if(model.state!=='READY_PROPERTY')return json(409,{error:'IDENTITY_STOP'});
        const draft=finalize({...structuredClone(model),mode:'deal',state:'READY_DEAL',claims:[],claimOrigin:'ANALYST_ENTERED',analysis:null,notes:[...model.notes,'Nonpersistent manual deal session. Enter explicit claims; missing costs are unknown.']});
        // Cloud fixture deal submissions always reconstruct the original evidence basis;
        // the complete explicit claim payload is recalculated, never treated as evidence.
        return json(200,runtime==='netlify'&&portable?{sessionId:data.sessionId,model:draft}:save(draft));
      }
      if(path==='/api/deal'){const deal=manualDeal(model,data.claims??{});return json(200,runtime==='netlify'&&portable?{sessionId:data.sessionId,model:deal}:save(deal));}
      if(model.mode!=='deal')return json(400,{error:'DEAL_MODE_REQUIRED'});
      if(busyReport)return json(409,{error:'REPORT_IN_PROGRESS'});
      busyReport=true;try{const report=await reportService.generate(model);const id=randomUUID();remember(reports,id,report);return json(200,{pages:report.pages,digest:report.digest,sha256:report.sha256,download:`/api/reports/${id}`});}finally{busyReport=false;}
    }catch(error){
      if(/^DECISION_(?:ANALYSIS_(?:LINK_REQUIRED|PROPERTY_MISMATCH|DEAL_MISMATCH|EVIDENCE_MISMATCH)|CALCULATION_MISMATCH)$/.test(error.message))return json(409,{error:error.message});
      if(['REPORT_HISTORICAL_LINK_REQUIRED','REPORT_LINKAGE_STOP','REPORT_RECONCILIATION_STOP','REPORT_SECURITY_STOP','REPORT_SIZE_LIMIT'].includes(error.message))return json(409,{error:error.message});
      const known=new Set(['INVALID_FIXTURE','ADDRESS_INVALID','ADDRESS_REQUIRED','ADDRESS_INCOMPLETE','ADDRESS_ACTIVE_EXISTS','ADDRESS_ANALYST_CONFIRMATION_REQUIRED','ADDRESS_COUNTY_LINK_MISMATCH','ADDRESS_COUNTY_SITUS_MISMATCH','ADDRESS_CONFLICT','ADDRESS_SAVE_FAILED','ADDRESS_RESOLUTION_HISTORY_IMMUTABLE','ADDRESS_RESOLUTION_ACTIVE_REQUIRED','ADDRESS_VERSION_INVALID','ANALYSIS_CONFIRMATION_REQUIRED','EXPLICIT_COSTS_REQUIRED','HOLD_DAYS_REQUIRED','OTHER_COST_TIMING_REQUIRED','CLAIM_ORIGIN_REQUIRED','IDENTITY_STOP','LIVE_NOT_CONFIGURED','REFRESH_CONFIRMATION_REQUIRED','CONFIRMATION_INVALID','RATE_LIMIT_STOP','AUTHENTICATION_STOP','QUOTA_STOP','QUOTA_BUDGET_STOP','NETWORK_STOP','PROVIDER_UNAVAILABLE_STOP','API_CONTRACT_STOP','PROTECTED_INPUT_STOP','DATABASE_NOT_CONFIGURED','DATABASE_UNAVAILABLE','PROPERTY_NOT_SAVED','NOT_FOUND','ANALYSIS_REQUIRED','EVIDENCE_NOT_LINKED','INVALID_UUID','INVALID_HURDLE_TYPE','INVALID_HURDLE_RATE','INVALID_COST_BASIS','INVALID_COST_AMOUNT','INVALID_REHAB_COST','INVALID_REHAB_CONTINGENCY','INVALID_ENCUMBRANCE_AMOUNT','INVALID_TARGET','INVALID_TARGET_DISCOUNT','INVALID_TARGET_POLICY','INVALID_HOLD_DAYS','INVALID_EXIT_VALUE','INVALID_EVALUATION_PRICE','INVALID_SELLER_CONSTRAINT','STRATEGY_NOT_SUPPORTED','ACQUISITION_COST_TREATMENT_REQUIRED','DISPOSITION_COST_TREATMENT_REQUIRED','DECISION_UNAVAILABLE','INVALID_PROPERTY_ID','INVALID_EVIDENCE_SNAPSHOT_ID','INVALID_DEAL_ID','INVALID_ANALYSIS_SNAPSHOT_ID','INVALID_DECISION_ID','DEAL_NOT_LINKED','SOURCE_IMPORT_INVALID','SOURCE_RECONCILIATION_REQUIRED','SOURCE_REJECTED_ROWS','INVALID_CANDIDATE_ID','CANDIDATE_NOT_FOUND','REVIEW_ACTION_REQUIRED','INVALID_REVIEW_REASON','INVALID_CANDIDATE_STATUS','ENRICHMENT_CONFIRMATION_REQUIRED','ENRICHMENT_IDENTITY_REQUIRED']);
      const databaseFailure=/^[0-9A-Z]{5}$/.test(error?.code??'') || ['ECONNREFUSED','ENETUNREACH','ETIMEDOUT','ECONNRESET','ENOTFOUND','SELF_SIGNED_CERT_IN_CHAIN','ERR_TLS_CERT_ALTNAME_INVALID','UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(error?.code) || /ECONN|timeout|connection|certificate|TLS/i.test(error?.message??'');
      const code=known.has(error.message)?error.message:databaseFailure?safeDatabaseError(error).error:'ACTION_FAILED';
      return json(code==='RATE_LIMIT_STOP'?429:['LIVE_NOT_CONFIGURED','DATABASE_NOT_CONFIGURED','DATABASE_UNAVAILABLE'].includes(code)?503:code==='NOT_FOUND'?404:400,{error:code});
    }
  };
}
