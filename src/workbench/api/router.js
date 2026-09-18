import {randomUUID} from 'node:crypto';
import {finalize,manualDeal} from '../model.js';

export const PDF_LOCAL_ONLY='PDF generation is currently available in the local analyst runtime.';
export const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
export const MAX_BODY=16000;
const actions=new Set(['/api/fixture','/api/resolve','/api/confirm','/api/properties/analyze','/api/deal/start','/api/deal','/api/report']);
function remember(map,key,value){while(map.size>=100)map.delete(map.keys().next().value);map.set(key,{value,expires:Date.now()+30*60*1000});}
function recall(map,key){const item=map.get(key);if(!item||item.expires<Date.now()){map.delete(key);return null;}return item.value;}
export function createApi({runtime='local',loadFixture,resolveCached,live,mapConfig=()=>({configured:false}),reportService}={}){
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
        if(path==='/api/health')return json(200,{ok:true,runtime,rentcastConfigured:Boolean(live?.configured),pdfAvailable:Boolean(reportService),durableLiveCache:runtime==='local',durableSessions:false});
        if(path==='/api/maps/config')return json(200,await mapConfig());
        if(path==='/api/reports/capability')return json(200,{available:Boolean(reportService),message:reportService?'Local analyst PDF available.':PDF_LOCAL_ONLY});
        if(path==='/api/fixtures')return json(200,{fixtures:[{id:'fantasia',name:'Florida Portfolio / Fantasia'},{id:'bass',name:'Bass — source STOP'},{id:'joyce',name:'Joyce — address ambiguity'}]});
        if(/^\/api\/reports\/[\w-]+$/.test(path)){
          const report=recall(reports,path.split('/').pop());
          if(!report||!reportService)return json(404,{error:'NOT_FOUND'});
          return new Response(await reportService.read(report),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="independent-deal-review.pdf"','Cache-Control':'no-store'}});
        }
        return json(actions.has(path)?405:404,{error:actions.has(path)?'METHOD_NOT_ALLOWED':'NOT_FOUND'});
      }
      if(!actions.has(path))return json(404,{error:'NOT_FOUND'});
      if(request.method!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
      if(origin!==url.origin)return json(403,{error:'SAME_ORIGIN_REQUIRED'});
      if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')??''))return json(415,{error:'JSON_REQUIRED'});
      if(Number(request.headers.get('content-length'))>MAX_BODY)return json(413,{error:'REQUEST_TOO_LARGE'});
      const reader=request.body?.getReader();let size=0;const chunks=[];
      if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();return json(413,{error:'REQUEST_TOO_LARGE'});}chunks.push(value);}
      let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json(400,{error:'INVALID_JSON'});}
      if(!data||typeof data!=='object'||Array.isArray(data))return json(400,{error:'INVALID_JSON'});
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
      const known=new Set(['INVALID_FIXTURE','ADDRESS_INVALID','ADDRESS_REQUIRED','EXPLICIT_COSTS_REQUIRED','HOLD_DAYS_REQUIRED','OTHER_COST_TIMING_REQUIRED','CLAIM_ORIGIN_REQUIRED','IDENTITY_STOP','LIVE_NOT_CONFIGURED','REFRESH_CONFIRMATION_REQUIRED','CONFIRMATION_INVALID','RATE_LIMIT_STOP','AUTHENTICATION_STOP','QUOTA_STOP','QUOTA_BUDGET_STOP','NETWORK_STOP','PROVIDER_UNAVAILABLE_STOP','API_CONTRACT_STOP','PROTECTED_INPUT_STOP']);
      const code=known.has(error.message)?error.message:'ACTION_FAILED';
      return json(code==='RATE_LIMIT_STOP'?429:code==='LIVE_NOT_CONFIGURED'?503:400,{error:code});
    }
  };
}
