import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommercialService} from '../src/commercial/commercial-service.js';
import {createMemoryCommercialRepository} from '../src/commercial/memory-commercial-repository.js';
import {ROLES} from '../src/auth/access-control.js';
import {createNetlifyAuthenticatedApi} from '../src/auth/netlify-auth.js';

const clock=()=>new Date('2026-10-21T18:00:00.000Z');
const platform={uid:'platform',role:ROLES.PLATFORM_ADMINISTRATOR,organizationId:'workside',organizationName:'Workside Software, LLC'};
const orgAdmin={uid:'gnz-admin',role:ROLES.ORGANIZATION_ADMINISTRATOR,organizationId:'gnz',organizationName:'GNZ Marketing LLC'};

async function setup(){const repository=createMemoryCommercialRepository(),service=createCommercialService({repository,clock,flags:{ownerOrganizationId:'workside',externalBetaEnabled:true,stripeCheckoutEnabled:true,stripeLiveModeEnabled:true}});await service.createOrganization({user:platform,id:'gnz',name:'GNZ Marketing LLC'});return {repository,service};}

test('V3.1 overview is selected-organization scoped and protects cross-tenant access',async()=>{
  const {repository,service}=await setup();await service.grantCredits({user:platform,organizationId:'gnz',amount:3,reason:'Initial beta allowance',sourceId:'gnz-three'});await repository.putMember('gnz',{uid:'gnz-admin',email:'admin@example.test',role:ROLES.ORGANIZATION_ADMINISTRATOR,status:'ACTIVE'});await repository.audit('gnz',{kind:'USER_INVITED',actorUid:'platform',at:clock().toISOString()});
  const overview=await service.organizationOverview({user:platform,organizationId:'gnz'});assert.equal(overview.organization.name,'GNZ Marketing LLC');assert.equal(overview.balance.available,3);assert.equal(overview.creditTotals.complimentary,3);assert.equal(overview.members.length,1);assert.equal(overview.metrics.activeUsers,1);assert.equal(overview.audit[0].kind,'USER_INVITED');
  await assert.rejects(()=>service.organizationOverview({user:orgAdmin,organizationId:'workside'}),/ORGANIZATION_NOT_AUTHORIZED/);assert.equal((await service.organizationOverview({user:orgAdmin,organizationId:'gnz'})).organization.id,'gnz');
});

test('V3.1 preserves owner compatibility record and prevents its suspension',async()=>{
  const {service}=await setup(),organizations=await service.listOrganizations({user:platform}),owner=organizations.find(row=>row.id==='workside');assert.equal(owner.name,'Workside Software, LLC');assert.equal(owner.compatibilityRecord,true);await assert.rejects(()=>service.setOrganizationStatus({user:platform,organizationId:'workside',status:'SUSPENDED'}),/OWNER_ORGANIZATION_CANNOT_BE_SUSPENDED/);
});

test('V3.1 prevents duplicate active invitations but permits reissue after revocation',async()=>{
  const {service}=await setup(),sendInvitation=async()=>({uid:'invitee'});const first=await service.invite({user:platform,organizationId:'gnz',email:'Gabe@example.test',role:ROLES.ANALYST,sendInvitation});await assert.rejects(()=>service.invite({user:platform,organizationId:'gnz',email:'gabe@example.test',role:ROLES.ANALYST,sendInvitation}),/ACTIVE_INVITATION_ALREADY_EXISTS/);await service.revokeInvitation({user:platform,organizationId:'gnz',id:first.id});const second=await service.invite({user:platform,organizationId:'gnz',email:'gabe@example.test',role:ROLES.ANALYST,sendInvitation});assert.notEqual(second.id,first.id);
});

test('V3.1 protects the last active Organization Administrator',async()=>{
  const {repository,service}=await setup();await repository.putMember('gnz',{uid:'gnz-admin',email:'admin@example.test',role:ROLES.ORGANIZATION_ADMINISTRATOR,status:'ACTIVE'});await assert.rejects(()=>service.changeMemberRole({user:orgAdmin,uid:'gnz-admin',role:ROLES.ANALYST,applyIdentityRole:async()=>{}}),/LAST_ORGANIZATION_ADMINISTRATOR_PROTECTED/);await assert.rejects(()=>service.setMemberSuspended({user:platform,organizationId:'gnz',uid:'gnz-admin',suspended:true,applyIdentitySuspension:async()=>{}}),/LAST_ORGANIZATION_ADMINISTRATOR_PROTECTED/);await repository.putMember('gnz',{uid:'second-admin',email:'second@example.test',role:ROLES.ORGANIZATION_ADMINISTRATOR,status:'ACTIVE'});await service.changeMemberRole({user:platform,organizationId:'gnz',uid:'gnz-admin',role:ROLES.ANALYST,applyIdentityRole:async()=>{}});assert.equal((await repository.getMember('gnz','gnz-admin')).role,ROLES.ANALYST);
});

test('V3.1 report grants can be revoked without broadening Report Viewer permissions',async()=>{
  const {repository,service}=await setup(),analyst={uid:'analyst',role:ROLES.ANALYST,organizationId:'gnz'},viewer={uid:'viewer',role:ROLES.REPORT_VIEWER,organizationId:'gnz'};await repository.putMember('gnz',{uid:'viewer',email:'viewer@example.test',role:ROLES.REPORT_VIEWER,status:'ACTIVE'});await service.registerReport({user:analyst,report:{id:'report-one',propertyId:'property-one',filename:'report.pdf',generatedAt:clock().toISOString()},storage:{sha256:'abc',sizeBytes:100}});const grant=await service.grantReportAccess({user:orgAdmin,reportId:'report-one',viewerUid:'viewer',propertyId:'property-one'});assert.equal((await service.authorizedReports({user:viewer})).length,1);await service.revokeReportAccess({user:orgAdmin,id:grant.id});assert.equal((await service.authorizedReports({user:viewer})).length,0);
});

test('V3.1 organization administrators cannot grant platform roles',async()=>{
  const {repository,service}=await setup();await repository.putMember('gnz',{uid:'member',email:'member@example.test',role:ROLES.ANALYST,status:'ACTIVE'});await assert.rejects(()=>service.changeMemberRole({user:orgAdmin,uid:'member',role:ROLES.PLATFORM_ADMINISTRATOR,applyIdentityRole:async()=>{}}),/MEMBER_ROLE_INVALID|ROLE_NOT_AUTHORIZED/);
});

test('V3.1 overview endpoint reauthorizes organization context and returns safe identity metadata',async()=>{
  const {repository,service}=await setup();await repository.putMember('gnz',{uid:'gnz-admin',email:'admin@example.test',role:ROLES.ORGANIZATION_ADMINISTRATOR,status:'ACTIVE'});const fallback=async()=>new Response('{}',{status:404}),identity=Object.assign(async()=>null,{describeUsers:async()=>[{uid:'gnz-admin',email:'admin@example.test',displayName:'GNZ Admin',emailVerified:false,disabled:false,lastSignInAt:null}]}),platformApi=createNetlifyAuthenticatedApi({api:fallback,authentication:{enabled:true,authenticate:async()=>platform},commercial:async()=>service,inviteUser:identity}),response=await platformApi(new Request('https://pi.example/api/admin/organizations/gnz/overview')),body=await response.json();assert.equal(response.status,200);assert.equal(body.organization.id,'gnz');assert.equal(body.members[0].displayName,'GNZ Admin');assert.equal(body.members[0].emailVerified,false);assert.equal(JSON.stringify(body).includes('tokenHash'),false);
  const organizationApi=createNetlifyAuthenticatedApi({api:fallback,authentication:{enabled:true,authenticate:async()=>orgAdmin},commercial:async()=>service,inviteUser:identity}),denied=await organizationApi(new Request('https://pi.example/api/admin/organizations/workside/overview'));assert.equal(denied.status,403);assert.equal((await denied.json()).error,'ORGANIZATION_NOT_AUTHORIZED');
});
