import path from 'node:path';
import {existsSync} from 'node:fs';
import {initializeFirebaseAuthentication,initializeFirebaseDurableProperties} from '../src/auth/firebase-admin.js';
import {createFirestoreRetainedEvidenceRepository} from '../src/investment-workspace/firestore-retained-evidence.js';
import {buildLocalRetainedEvidenceRecords} from '../src/investment-workspace/retained-evidence-import.js';

const apply=process.argv.includes('--apply'),root=process.cwd(),envFile=path.join(root,'.env');
if(existsSync(envFile))process.loadEnvFile(envFile);
const authentication=await initializeFirebaseAuthentication({env:process.env}),organizationId=authentication.expectedOrganizationId,user={uid:'d2NTUCs0lGe6C64pDnRGtgTXm0O2',organizationId,role:'Administrator'},durableService=await initializeFirebaseDurableProperties({authentication}),durableRecords=await durableService.list({user,includeArchived:true});
const {getApp}=await import('firebase-admin/app'),{getFirestore}=await import('firebase-admin/firestore'),repository=createFirestoreRetainedEvidenceRepository({firestore:getFirestore(getApp('pi-v2-3a'))}),{records}=await buildLocalRetainedEvidenceRecords({root,organizationId,durableRecords,importedBy:user.uid}),existing=await repository.list(organizationId),existingById=new Map(existing.map(record=>[record.id,record])),plan=[];
for(const record of records){const prior=existingById.get(record.id);if(prior&&prior.payloadHash!==record.payloadHash)throw new Error(`IMMUTABLE_RETAINED_EVIDENCE_CONFLICT:${record.subjectRef}`);plan.push({id:record.id,path:`organizations/${organizationId}/retainedEvidenceSnapshots/${record.id}`,subjectRef:record.subjectRef,address:record.payload.property.address,evidenceFingerprint:record.evidenceFingerprint,payloadHash:record.payloadHash,payloadBytes:record.payloadBytes,sales:record.payload.property.sales?.length??0,listings:record.payload.property.listings?.length??0,classification:record.classification,operation:prior?'UNCHANGED':'CREATE'});}
const unexpected=existing.filter(record=>!records.some(candidate=>candidate.id===record.id)).map(record=>record.subjectRef);
let writes=0;
if(apply)for(const item of plan.filter(item=>item.operation==='CREATE')){const record=records.find(candidate=>candidate.id===item.id),result=await repository.createImmutable(record);if(result.created)writes++;}
console.log(JSON.stringify({mode:apply?'APPLY':'PREFLIGHT',projectId:authentication.expectedProjectId,database:'(default)',organizationId,providerRequests:0,plannedCreates:plan.filter(item=>item.operation==='CREATE').length,writes,unchanged:plan.filter(item=>item.operation==='UNCHANGED').length,unexpectedExistingSubjects:unexpected,records:plan},null,2));
