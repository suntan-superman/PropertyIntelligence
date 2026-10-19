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

/** Protects the deployed workbench API with the same Firebase session boundary as PI local development. */
export function createNetlifyAuthenticatedApi({api,authentication}={}){
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
      await authentication.authenticate(adapted);
      return api(request);
    }catch(error){
      const status=Number.isInteger(error?.status)?error.status:400,code=/^[A-Z0-9_-]+$/.test(String(error?.code??error?.message))?String(error.code??error.message):'AUTHENTICATION_FAILED';
      return json(status,{error:code,code});
    }
  };
}
