export const ROLES=Object.freeze({ADMINISTRATOR:'Administrator',ANALYST:'Analyst',VIEWER:'Viewer'});

export class AccessDenied extends Error{
  constructor(code,status=403){super(code);this.code=code;this.status=status;}
}

const cleanUser=value=>{
  if(!value||typeof value.uid!=='string'||!value.uid.trim())throw new AccessDenied('AUTHENTICATION_REQUIRED',401);
  const role=Object.values(ROLES).includes(value.role)?value.role:null;
  if(!role)throw new AccessDenied('ROLE_NOT_AUTHORIZED');
  return Object.freeze({uid:value.uid.trim(),role,emailVerified:value.emailVerified===true,sessionExpiresAt:value.sessionExpiresAt??null,
    providerResearchAllowed:role===ROLES.ADMINISTRATOR||value.providerResearchAllowed===true,
    organizationId:typeof value.organizationId==='string'&&value.organizationId.trim()?value.organizationId.trim():null,
    authenticatedAt:typeof value.authenticatedAt==='string'&&Number.isFinite(Date.parse(value.authenticatedAt))?value.authenticatedAt:null});
};

// Production adapters must verify an identity-provider token server-side and
// return trusted claims. Browser-provided role or user-id headers are never used.
export function createAccessControl({verifySession}={}){
  return {
    async authenticate(request){
      if(typeof verifySession!=='function')throw new AccessDenied('AUTHENTICATION_NOT_CONFIGURED',503);
      return cleanUser(await verifySession(request));
    },
    require(user,roles){
      const trusted=cleanUser(user);
      if(!roles.includes(trusted.role))throw new AccessDenied('ROLE_NOT_AUTHORIZED');
      if(trusted.sessionExpiresAt&&Date.parse(trusted.sessionExpiresAt)<=Date.now())throw new AccessDenied('SESSION_EXPIRED',401);
      return trusted;
    }
  };
}

export function fixedLocalSession(user){
  const trusted=cleanUser(user);
  return async()=>trusted;
}
