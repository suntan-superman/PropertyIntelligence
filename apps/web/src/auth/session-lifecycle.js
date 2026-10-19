export const SESSION_EXPIRED_EVENT='pi:session-expired';

const sessionCodes=new Set(['SESSION_COOKIE_MISSING','SESSION_EXPIRED','AUTHENTICATION_REQUIRED']);
let installed=false;

export function isSessionAuthenticationFailure(status,body){
  if(status!==401||!body||typeof body!=='object')return false;
  const code=String(body.code??body.error??'');
  return sessionCodes.has(code)||code.startsWith('FIREBASE_SESSION_');
}

export function announceSessionExpired(reason='SESSION_EXPIRED'){
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT,{detail:{reason,detectedAt:new Date().toISOString()}}));
}

export function installSessionExpiryMonitor(fetchImpl=window.fetch.bind(window)){
  if(installed)return;
  installed=true;
  window.fetch=async(...args)=>{
    const response=await fetchImpl(...args);
    const url=String(args[0]?.url??args[0]??'');
    if(response.status===401&&!url.includes('/api/auth/')){
      const body=await response.clone().json().catch(()=>null);
      if(isSessionAuthenticationFailure(response.status,body))announceSessionExpired(String(body.code??body.error));
    }
    return response;
  };
}
