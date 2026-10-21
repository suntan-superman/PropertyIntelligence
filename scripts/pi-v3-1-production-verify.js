import assert from 'node:assert/strict';
import {getApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {INITIAL_ADMINISTRATOR_UID,initializeFirebaseAuthentication,initializeFirebaseCommercial} from '../src/auth/firebase-admin.js';
import {normalizeRole} from '../src/auth/access-control.js';

const GNZ='org-7f98dd73-6cc4-4d9a-bca9-3f6dd7dd5b00',GABE_INVITATION='b9e004cc-a91f-434e-ac96-9000c06d12b3';
const authentication=await initializeFirebaseAuthentication({env:process.env,secureCookies:true}),account=await getAuth(getApp('pi-v2-3a')).getUser(INITIAL_ADMINISTRATOR_UID),claims=account.customClaims??{},user={uid:account.uid,email:account.email??'',displayName:account.displayName??'',role:normalizeRole(claims.role),organizationId:claims.piOrganizationId,organizationName:claims.piOrganizationName,emailVerified:account.emailVerified};
assert.equal(user.role,'Platform Administrator','PLATFORM_ADMINISTRATOR_REQUIRED');
const service=await initializeFirebaseCommercial({authentication,env:process.env}),[gnz,workside]=await Promise.all([service.organizationOverview({user,organizationId:GNZ}),service.organizationOverview({user,organizationId:user.organizationId})]);
const invitation=gnz.invitations.find(row=>row.id===GABE_INVITATION);
assert.equal(gnz.organization.name,'GNZ Marketing LLC');assert.equal(gnz.organization.status,'ACTIVE');assert.equal(gnz.balance.available,3);assert.equal(gnz.balance.reserved,0);assert.equal(gnz.creditTotals.complimentary,3);assert.equal(gnz.properties.length,0);assert.ok(invitation,'GNZ_INVITATION_MISSING');assert.equal(invitation.status,'PENDING');assert.equal(invitation.role,'Organization Administrator');assert.equal(invitation.tokenHash,undefined);assert.equal(workside.balance.available,1);assert.equal(workside.properties.length,2);
console.log(JSON.stringify({verifiedAt:new Date().toISOString(),project:authentication.expectedProjectId,gnz:{status:gnz.organization.status,availableCredits:gnz.balance.available,reservedCredits:gnz.balance.reserved,complimentaryCredits:gnz.creditTotals.complimentary,propertyCount:gnz.properties.length,memberCount:gnz.members.length,pendingInvitationPreserved:true},workside:{availableCredits:workside.balance.available,propertyCount:workside.properties.length,reportCount:workside.metrics.reportsGenerated},mutations:0,providerRequests:0,stripeOperations:0},null,2));
