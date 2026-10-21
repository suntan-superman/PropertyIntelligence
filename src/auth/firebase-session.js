import {randomBytes,timingSafeEqual} from 'node:crypto';
import {AccessDenied,ROLES,normalizeRole,roleCapabilities} from './access-control.js';

export const SESSION_COOKIE='pi_session',CSRF_COOKIE='pi_csrf',SESSION_MAX_AGE_MS=8*60*60*1000;
export const DEFAULT_RESEARCH_REAUTH_MAX_AGE_MS=5*60*1000;
const safeEqual=(left,right)=>{const a=Buffer.from(String(left??'')),b=Buffer.from(String(right??''));return a.length===b.length&&timingSafeEqual(a,b);};
const cookieMap=request=>Object.fromEntries(String(request.headers.cookie??'').split(';').map(value=>value.trim()).filter(Boolean).map(value=>{const index=value.indexOf('=');return index<0?[value,'']:[value.slice(0,index),decodeURIComponent(value.slice(index+1))];}));
const cookie=(name,value,{httpOnly=false,maxAge=null,secure=false}={})=>`${name}=${encodeURIComponent(value)}; Path=/; SameSite=Strict${httpOnly?'; HttpOnly':''}${secure?'; Secure':''}${maxAge==null?'':`; Max-Age=${Math.max(0,Math.floor(maxAge/1000))}`}`;

function verifiedUser(decoded,expectedProjectId,initialAdministratorUid,issuer,expectedOrganizationId){
  if(!decoded||decoded.aud!==expectedProjectId||decoded.iss!==`${issuer}/${expectedProjectId}`||typeof decoded.uid!=='string'||!decoded.uid)throw new AccessDenied('AUTHENTICATION_PROJECT_MISMATCH',401);
  const role=normalizeRole(decoded.role);
  if(!role)throw new AccessDenied(decoded.uid===initialAdministratorUid?'ADMINISTRATOR_BOOTSTRAP_REQUIRED':'ROLE_NOT_AUTHORIZED',403);
  if(role===ROLES.SUSPENDED)throw new AccessDenied('ACCOUNT_SUSPENDED',403);
  if(decoded.uid===initialAdministratorUid&&role!==ROLES.PLATFORM_ADMINISTRATOR)throw new AccessDenied('ADMINISTRATOR_BOOTSTRAP_REQUIRED',403);
  const organizationId=typeof decoded.piOrganizationId==='string'&&decoded.piOrganizationId.trim()?decoded.piOrganizationId.trim():null;
  if(!organizationId)throw new AccessDenied('ORGANIZATION_MEMBERSHIP_REQUIRED',403);
  if(decoded.uid===initialAdministratorUid&&organizationId!==expectedOrganizationId)throw new AccessDenied('ORGANIZATION_NOT_AUTHORIZED',403);
  return {uid:decoded.uid,role,emailVerified:decoded.email_verified===true,sessionExpiresAt:decoded.exp?new Date(decoded.exp*1000).toISOString():null,providerResearchAllowed:roleCapabilities(role).research&&(decoded.piProviderResearch===true||role===ROLES.PLATFORM_ADMINISTRATOR),organizationId,authenticatedAt:Number.isFinite(decoded.auth_time)?new Date(decoded.auth_time*1000).toISOString():null,displayName:String(decoded.name??'').trim(),organizationName:String(decoded.piOrganizationName??'').trim()};
}

export function createFirebaseSessionService({adminAuth,expectedProjectId,initialAdministratorUid,expectedOrganizationId='property-intelligence-local',publicConfig,clock=()=>new Date(),secureCookies=false,csrfBytes=()=>randomBytes(24)}={}){
  if(!adminAuth||typeof adminAuth.verifyIdToken!=='function'||typeof adminAuth.verifySessionCookie!=='function'||typeof adminAuth.createSessionCookie!=='function')throw new Error('FIREBASE_ADMIN_AUTH_REQUIRED');
  if(!expectedProjectId||publicConfig?.projectId!==expectedProjectId)throw new Error('FIREBASE_PROJECT_CONFIGURATION_MISMATCH');
  if(!initialAdministratorUid)throw new Error('INITIAL_ADMINISTRATOR_UID_REQUIRED');
  const issueCsrf=res=>{const token=csrfBytes().toString('base64url');res.setHeader('Set-Cookie',cookie(CSRF_COOKIE,token,{secure:secureCookies,maxAge:SESSION_MAX_AGE_MS}));return token;};
  const requireCsrf=request=>{const supplied=request.headers['x-pi-csrf'],stored=cookieMap(request)[CSRF_COOKIE];if(!supplied||!stored||!safeEqual(supplied,stored))throw new AccessDenied('CSRF_VALIDATION_FAILED',403);};
  const authenticate=async request=>{
    const token=cookieMap(request)[SESSION_COOKIE];
    if(!token)throw new AccessDenied('SESSION_COOKIE_MISSING',401);
    try{return verifiedUser(await adminAuth.verifySessionCookie(token,true),expectedProjectId,initialAdministratorUid,'https://session.firebase.google.com',expectedOrganizationId);}
    catch(error){if(error instanceof AccessDenied)throw error;const reason=String(error?.code??'').replace(/^auth\//,'').replace(/[^a-z0-9-]/gi,'_').toUpperCase()||'INVALID';throw new AccessDenied(`FIREBASE_SESSION_${reason}`,401);}
  };
  const createSession=async(idToken,res)=>{const decoded=await adminAuth.verifyIdToken(idToken,true),user=verifiedUser(decoded,expectedProjectId,initialAdministratorUid,'https://securetoken.google.com',expectedOrganizationId),expiresIn=SESSION_MAX_AGE_MS,session=await adminAuth.createSessionCookie(idToken,{expiresIn});res.setHeader('Set-Cookie',cookie(SESSION_COOKIE,session,{httpOnly:true,secure:secureCookies,maxAge:expiresIn}));return user;};
  const verifyRecentIdToken=async(idToken,sessionUser,{maxAgeMs=DEFAULT_RESEARCH_REAUTH_MAX_AGE_MS}={})=>{
    let recent;
    try{recent=verifiedUser(await adminAuth.verifyIdToken(idToken,true),expectedProjectId,initialAdministratorUid,'https://securetoken.google.com',expectedOrganizationId);}catch(error){if(error instanceof AccessDenied)throw error;throw new AccessDenied('FIREBASE_REAUTHENTICATION_FAILED',401);}
    if(recent.uid!==sessionUser?.uid||recent.role!==sessionUser?.role||recent.organizationId!==sessionUser?.organizationId)throw new AccessDenied('REAUTHENTICATION_IDENTITY_MISMATCH',403);
    if(!recent.providerResearchAllowed||!recent.emailVerified)throw new AccessDenied('PROVIDER_RESEARCH_NOT_AUTHORIZED',403);
    const authenticatedAt=Date.parse(recent.authenticatedAt),now=clock().getTime();
    if(!Number.isFinite(authenticatedAt)||authenticatedAt>now+30_000||now-authenticatedAt>maxAgeMs)throw new AccessDenied('RECENT_FIREBASE_LOGIN_REQUIRED',401);
    return recent;
  };
  const clearSession=res=>res.setHeader('Set-Cookie',cookie(SESSION_COOKIE,'',{httpOnly:true,secure:secureCookies,maxAge:0}));
  return {enabled:true,publicConfig:{...publicConfig,apiKey:undefined},clientConfig:publicConfig,expectedProjectId,expectedOrganizationId,initialAdministratorUid,issueCsrf,requireCsrf,authenticate,createSession,verifyRecentIdToken,clearSession,clock};
}
