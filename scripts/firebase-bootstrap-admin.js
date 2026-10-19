import path from 'node:path';
import {getApps,initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {INITIAL_ADMINISTRATOR_UID,verifyFirebaseCredentialBinding} from '../src/auth/firebase-admin.js';

process.loadEnvFile(path.resolve('.env'));
const requested=process.argv[2];
if(requested!==INITIAL_ADMINISTRATOR_UID)throw new Error('Pass the exact reviewed initial administrator UID. Self-selected or alternate UIDs are rejected.');
const binding=await verifyFirebaseCredentialBinding(process.env),existing=getApps().find(app=>app.name==='pi-admin-bootstrap'),app=existing??initializeApp({credential:applicationDefault(),projectId:binding.expectedProjectId},'pi-admin-bootstrap'),auth=getAuth(app),user=await auth.getUser(requested),prior=user.customClaims??{},organizationId=String(process.env.PI_FIREBASE_ORGANIZATION_ID??'').trim();
if(!organizationId)throw new Error('PI_FIREBASE_ORGANIZATION_ID_REQUIRED');
await auth.setCustomUserClaims(requested,{...prior,role:'Administrator',piProviderResearch:true,piOrganizationId:organizationId});
await auth.revokeRefreshTokens(requested);
console.log(JSON.stringify({status:'ADMINISTRATOR_BOOTSTRAPPED',uid:requested,projectId:binding.expectedProjectId,claims:{role:'Administrator',piProviderResearch:true,piOrganizationId:organizationId},tokensRevoked:true},null,2));
