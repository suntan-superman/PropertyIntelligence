export const UNAVAILABLE='Property Intelligence API is unavailable. The web interface loaded, but the analysis service could not be reached.';
const messages={SESSION_EXPIRED:'This nonpersistent session expired. Reload the fixture or analyze the address again.',
  ADDRESS_INVALID:'Enter a complete address: street, city, two-letter state ZIP. Do not supply a URL.',
  ADDRESS_INCOMPLETE:'County situs is incomplete. Enter and confirm the complete property address.',
  ADDRESS_CONFLICT:'The proposed address conflicts with the linked Property identity. No change was saved.',
  ADDRESS_ACTIVE_EXISTS:'A confirmed address already exists. Edit it explicitly to create a superseding version.',
  ADDRESS_ANALYST_CONFIRMATION_REQUIRED:'Analyst confirmation is required before saving an address.',
  ANALYSIS_CONFIRMATION_REQUIRED:'Address saved. Confirm the provider analysis action to continue.',
  LIVE_NOT_CONFIGURED:'Live analysis is not configured. Saved fixtures remain available.',
  RATE_LIMIT_STOP:'Provider rate limit reached. No automatic retry; wait before another explicit request.',
  AUTHENTICATION_STOP:'Provider authentication failed. Check server configuration.',
  QUOTA_STOP:'Provider quota is exhausted.',QUOTA_BUDGET_STOP:'Provider call budget reached.',
  REFRESH_CONFIRMATION_REQUIRED:'Confirm that refreshing may consume provider quota.',
  PDF_LOCAL_ONLY:'PDF generation is currently available in the local analyst runtime.',
  EXPLICIT_COSTS_REQUIRED:'Enter each required known cost explicitly. Unknown is not zero.',
  HOLD_DAYS_REQUIRED:'Enter a positive holding duration.',OTHER_COST_TIMING_REQUIRED:'Specify the additional cost and its cash timing.',
  CONFIRMATION_INVALID:'Confirmation expired or was already used. Analyze the address again.',
  IDENTITY_STOP:'Identity / representation must be resolved before creating a deal.'};
export async function request(path,options={}){
  let res;try{res=await fetch(`/api/${path}`,options);}catch{throw new Error(UNAVAILABLE);}
  const type=(res.headers.get('content-type')??'').split(';')[0].trim().toLowerCase();
  const safeType=['application/json','text/html','text/plain'].includes(type)?type:'another content type';
  if(type!=='application/json')throw new Error(`${UNAVAILABLE} HTTP ${res.status} — expected JSON, received ${safeType}.`);
  let result;try{const body=await res.text();if(!body.trim())throw new Error();result=JSON.parse(body);}catch{throw new Error(`${UNAVAILABLE} HTTP ${res.status} — invalid or empty JSON response.`);}
  if(!result||typeof result!=='object'||Array.isArray(result))throw new Error(UNAVAILABLE);
  if(!res.ok){const error=new Error(messages[result.error]??`Analysis action could not be completed (HTTP ${res.status}). No result was accepted.`);error.code=result.error;error.details=result;throw error;}
  return result;
}
export const action=(path,data)=>request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
