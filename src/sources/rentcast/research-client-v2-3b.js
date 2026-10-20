import {cacheLocation,readCache,saveCache} from './cache.js';
import {ProviderStop,redact,retryDelay} from './client.js';

const transient=new Set([429,500,502,503,504]);
const endpointContracts={
  '/avm/value':new Set(['address','lookupSubjectAttributes','compCount','maxRadius','daysOld']),
  '/properties':new Set(['address','radius','saleDateRange','propertyType','limit','offset','includeTotalCount'])
};

export function validateResearchRequestV2_3B(endpoint,params){
  const allowed=endpointContracts[endpoint];
  if(!allowed||typeof params?.address!=='string'||!params.address.trim()||Object.keys(params).some(key=>!allowed.has(key)))return false;
  if(endpoint==='/avm/value')return params.lookupSubjectAttributes===undefined||params.lookupSubjectAttributes===true;
  if(Object.keys(params).length===1)return true;
  return typeof params.radius==='number'&&params.radius>0&&params.radius<=3
    &&Number.isSafeInteger(params.saleDateRange)&&params.saleDateRange>=1&&params.saleDateRange<=365
    &&params.propertyType==='Single Family'&&params.limit===50&&params.offset===0
    &&(params.includeTotalCount===undefined||params.includeTotalCount===true);
}

// Versioned transport for the V2.3B research shapes. The original provider client
// remains byte-for-byte protected for historical evidence and earlier workflows.
export function createResearchClientV2_3B(config,{fetchImpl=fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),cachePrefix='data/raw/rentcast/property-research-v2-3',clock=()=>new Date().toISOString(),store={get:readCache,put:saveCache}}={}){
  const metrics={apiCalls:0,cacheHits:0,retries:0,rateLimits:0,events:[]};let exhaustedQuota=false;
  async function get(endpoint,params,{refresh=false}={}){
    if(config.baseUrl!=='https://api.rentcast.io/v1'||!validateResearchRequestV2_3B(endpoint,params))throw new ProviderStop('REQUEST_CONTRACT_STOP');
    const location=cacheLocation(endpoint,params,cachePrefix),cached=refresh?null:await store.get(location);
    if(cached){metrics.cacheHits++;return cached;}
    const url=new URL(`${config.baseUrl}${endpoint}`);for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));
    for(let attempt=0;attempt<=config.maxRetries;attempt++){
      if(exhaustedQuota||metrics.apiCalls>=config.maxCalls)throw new ProviderStop('QUOTA_BUDGET_STOP');
      if(metrics.apiCalls>0)await sleep(config.delayMs);
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),config.timeoutMs);let response,body,malformed=false;
      metrics.apiCalls++;
      try{
        response=await fetchImpl(url,{method:'GET',redirect:'error',signal:controller.signal,headers:{Accept:'application/json','X-Api-Key':config.apiKey}});
        const responseText=await response.text();try{body=JSON.parse(responseText);}catch{body={parseError:'Non-JSON response omitted'};malformed=true;}
      }catch(error){
        const code=controller.signal.aborted||error?.name==='AbortError'?'TIMEOUT_STOP':'NETWORK_STOP';
        metrics.events.push({endpoint,status:code,attempt});
        if(attempt===config.maxRetries)throw new ProviderStop(code);
        metrics.retries++;await sleep(500*2**attempt+Math.floor(Math.random()*100));continue;
      }finally{clearTimeout(timeout);}
      const entry=await store.put(location,{retrievedAt:clock(),httpStatus:response.status,body:redact(body,[config.apiKey])});
      metrics.events.push({endpoint,httpStatus:response.status,rawResponseRef:entry.rawResponseRef});
      const remaining=response.headers.get('x-ratelimit-remaining');if(remaining!==null&&Number(remaining)<=0)exhaustedQuota=true;
      if([401,403].includes(response.status))throw new ProviderStop('AUTHENTICATION_STOP',entry.rawResponseRef);
      if(response.status===402)throw new ProviderStop('QUOTA_STOP',entry.rawResponseRef);
      if(response.status===429)metrics.rateLimits++;
      if(transient.has(response.status)){
        const wait=retryDelay(response.headers.get('retry-after'))??500*2**attempt+Math.floor(Math.random()*100);
        if(exhaustedQuota||attempt===config.maxRetries||wait>30000)throw new ProviderStop(response.status===429?'RATE_LIMIT_STOP':'PROVIDER_UNAVAILABLE_STOP',entry.rawResponseRef);
        metrics.retries++;await sleep(wait);continue;
      }
      if(!response.ok)throw new ProviderStop(`HTTP_${response.status}_STOP`,entry.rawResponseRef);
      if(malformed||body===null||typeof body!=='object'||body.error)throw new ProviderStop('API_CONTRACT_STOP',entry.rawResponseRef);
      return entry;
    }
  }
  return {get,metrics};
}
