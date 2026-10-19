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
export const durableWorkspaceReport=report=>({id:report.id,scenarioId:report.scenarioId,scenarioName:report.scenarioName,revision:report.revision,kind:report.kind,status:report.status,generatedAt:report.generatedAt,supportingDocumentCount:Array.isArray(report.supportingDocuments)?report.supportingDocuments.length:0});
const durableRoute=path=>path.match(/^\/api\/durable-properties\/([A-Za-z0-9._-]{1,128})(?:\/(workspace|archive|restore))?$/);

/** Protects the deployed workbench API with the same Firebase session boundary as PI local development. */
export function createNetlifyAuthenticatedApi({api,authentication,durableProperties=null,documentMetadata=null}={}){
  if(typeof api!=='function'||!authentication?.enabled)throw new Error('NETLIFY_AUTHENTICATION_REQUIRED');
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
        const service=await durableProperties(),includeArchived=new URL(request.url).searchParams.get('includeArchived')==='true',properties=await service.list({user,includeArchived});
        return json(200,{enabled:true,properties});
      }
      const durableMatch=durableRoute(path);
      if(durableMatch){
        if(typeof durableProperties!=='function')return json(503,{error:'DURABLE_PROPERTY_STORAGE_NOT_CONFIGURED'});
        const [,id,action]=durableMatch,service=await durableProperties();
        if(request.method==='GET'&&(!action||action==='workspace')){
          const property=await service.get({user,id});
          if(!action)return json(200,{property});
          const [revisions,reports,documentRegister]=await Promise.all([service.scenarioRevisions({user,id}),service.reports({user,id}),typeof documentMetadata==='function'?documentMetadata().then(metadata=>metadata.list({user,propertyId:id})):Promise.resolve({documents:[],completeness:[]})]);
          return json(200,{property,revisions,reports:reports.map(durableWorkspaceReport),documents:documentRegister.documents,documentCompleteness:documentRegister.completeness});
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
      const unavailable=['4','8','14'].includes(String(error?.code))||/firestore.*(?:unavailable|deadline|credential)/i.test(String(error?.message??'')),status=unavailable?503:Number.isInteger(error?.status)?error.status:400,code=unavailable?'DURABLE_PROPERTY_STORAGE_UNAVAILABLE':/^[A-Z0-9_-]+$/.test(String(error?.code??error?.message))?String(error.code??error.message):'AUTHENTICATION_FAILED';
      return json(status,{error:code,code});
    }
  };
}
