export const ROLES=Object.freeze({
  PLATFORM_ADMINISTRATOR:'Platform Administrator',
  ORGANIZATION_ADMINISTRATOR:'Organization Administrator',
  ANALYST:'Analyst',
  REPORT_VIEWER:'Report Viewer',
  SUSPENDED:'Suspended',
  // Kept as source-compatible aliases while existing Firebase claims are migrated.
  ADMINISTRATOR:'Platform Administrator',
  VIEWER:'Report Viewer'
});

const ROLE_ALIASES=Object.freeze({Administrator:ROLES.PLATFORM_ADMINISTRATOR,Viewer:ROLES.REPORT_VIEWER});
export const normalizeRole=value=>ROLE_ALIASES[value]??(Object.values(ROLES).includes(value)?value:null);
export const roleCapabilities=role=>{
  const normalized=normalizeRole(role),platform=normalized===ROLES.PLATFORM_ADMINISTRATOR,organizationAdmin=normalized===ROLES.ORGANIZATION_ADMINISTRATOR,analyst=normalized===ROLES.ANALYST,viewer=normalized===ROLES.REPORT_VIEWER;
  return Object.freeze({
    platformAdmin:platform,
    manageOrganization:platform||organizationAdmin,
    manageBilling:platform||organizationAdmin,
    research:platform||organizationAdmin||analyst,
    editAnalysis:platform||organizationAdmin||analyst,
    editChecklist:platform||organizationAdmin||analyst,
    finalizeReports:platform||organizationAdmin||analyst,
    viewAuthorizedReports:platform||organizationAdmin||analyst||viewer,
    uploadDocuments:platform||organizationAdmin||analyst,
    applicationAccess:normalized!==ROLES.SUSPENDED&&Boolean(normalized)
  });
};

export class AccessDenied extends Error{
  constructor(code,status=403){super(code);this.code=code;this.status=status;}
}

const cleanUser=value=>{
  if(!value||typeof value.uid!=='string'||!value.uid.trim())throw new AccessDenied('AUTHENTICATION_REQUIRED',401);
  const role=normalizeRole(value.role);
  if(!role)throw new AccessDenied('ROLE_NOT_AUTHORIZED');
  if(role===ROLES.SUSPENDED)throw new AccessDenied('ACCOUNT_SUSPENDED');
  return Object.freeze({uid:value.uid.trim(),role,emailVerified:value.emailVerified===true,sessionExpiresAt:value.sessionExpiresAt??null,
    providerResearchAllowed:roleCapabilities(role).research&&value.providerResearchAllowed===true,
    organizationId:typeof value.organizationId==='string'&&value.organizationId.trim()?value.organizationId.trim():null,
    authenticatedAt:typeof value.authenticatedAt==='string'&&Number.isFinite(Date.parse(value.authenticatedAt))?value.authenticatedAt:null,
    displayName:typeof value.displayName==='string'?value.displayName.trim().slice(0,120):'',
    organizationName:typeof value.organizationName==='string'?value.organizationName.trim().slice(0,160):''});
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
