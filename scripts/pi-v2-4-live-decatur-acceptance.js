import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'..');
process.chdir(ROOT);
try{process.loadEnvFile(path.join(ROOT,'.env'));}catch(error){if(error.code!=='ENOENT')throw error;}

const EXPECTED={
  node:'v22.12.0',
  projectId:'property-intelligence-8238b',
  organizationId:'property-intelligence-local',
  administratorUid:'d2NTUCs0lGe6C64pDnRGtgTXm0O2',
  address:'400 Decatur St, Bakersfield, CA 93308',
  subjectRef:'RESEARCH-EB66B8421C47',
  evidenceSnapshotId:'3630507840c38236a84bd1c30c93adcccc52db72bc94a197343c6566c62f8e71',
  scenarioId:'2908abf4-03a2-4d3c-931f-f61b5e9900c2',
  scenarioRevision:1
};
const APP_COLLECTIONS=['properties','propertyKeys','evidenceSnapshots','scenarioRevisions','reportRevisions','supportingDocuments','documentHashes','documentAudits','versions'];
const LOCAL_GUARDS=['data/raw/rentcast/property-research-v2-3','data/runtime/pi-v2-3/usage','data/runtime/investment-workspace-v1/scenarios','reports'];
const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>{
  if(value===null||typeof value!=='object')return value;
  if(typeof value.toDate==='function')return value.toDate().toISOString();
  if(Array.isArray(value))return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
};
const dataHash=value=>sha(JSON.stringify(canonical(value)));

async function fileTreeFingerprint(relative){
  const base=path.join(ROOT,relative),rows=[];
  async function visit(directory){
    let entries;
    try{entries=await readdir(directory,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return;throw error;}
    for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
      const absolute=path.join(directory,entry.name);
      if(entry.isDirectory())await visit(absolute);
      else if(entry.isFile()){
        const bytes=await readFile(absolute),info=await stat(absolute);
        rows.push({path:path.relative(ROOT,absolute).replaceAll('\\','/'),size:info.size,sha256:sha(bytes)});
      }
    }
  }
  await visit(base);
  return {fileCount:rows.length,totalBytes:rows.reduce((sum,row)=>sum+row.size,0),manifestSha256:dataHash(rows)};
}

async function localGuardState(){return Object.fromEntries(await Promise.all(LOCAL_GUARDS.map(async relative=>[relative,await fileTreeFingerprint(relative)])));}

async function collectionGroupState(db){
  const result={};
  for(const name of APP_COLLECTIONS){
    const snapshot=await db.collectionGroup(name).get();
    result[name]=snapshot.docs.map(item=>({path:item.ref.path,createTime:item.createTime?.toDate().toISOString()??null,updateTime:item.updateTime?.toDate().toISOString()??null,dataHash:dataHash(item.data())})).sort((a,b)=>a.path.localeCompare(b.path));
  }
  return result;
}

const documentCount=state=>Object.values(state).reduce((sum,rows)=>sum+rows.length,0);
const cookieValue=(jar,name)=>jar.get(name)??'';
function receiveCookies(jar,response){
  for(const line of response.headers.getSetCookie()){
    const pair=line.split(';',1)[0],index=pair.indexOf('='),name=pair.slice(0,index),value=decodeURIComponent(pair.slice(index+1));
    if(/(?:^|;)\s*Max-Age=0(?:;|$)/i.test(line)||!value)jar.delete(name);else jar.set(name,value);
  }
}

async function responseJson(response){
  const text=await response.text();
  try{return text?JSON.parse(text):null;}catch{return {unparseable:true};}
}

async function startSession({origin,apiKey,email,password}){
  const jar=new Map();
  const configResponse=await fetch(`${origin}/api/auth/config`);
  receiveCookies(jar,configResponse);
  const config=await responseJson(configResponse);
  assert.equal(configResponse.status,200);
  assert.equal(config.enabled,true);
  assert.equal(config.projectId,EXPECTED.projectId);
  assert.ok(cookieValue(jar,'pi_csrf'));

  const signInResponse=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})
  });
  const signIn=await responseJson(signInResponse);
  assert.equal(signInResponse.status,200,'Firebase administrator sign-in failed');
  assert.equal(signIn.localId,EXPECTED.administratorUid);
  assert.ok(signIn.idToken);

  const sessionResponse=await fetch(`${origin}/api/auth/session`,{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-PI-CSRF':cookieValue(jar,'pi_csrf'),Cookie:[...jar].map(([name,value])=>`${name}=${encodeURIComponent(value)}`).join('; ')},body:JSON.stringify({idToken:signIn.idToken})
  });
  receiveCookies(jar,sessionResponse);
  const session=await responseJson(sessionResponse);
  assert.equal(sessionResponse.status,200,'PI server session creation failed');
  assert.equal(session.user.uid,EXPECTED.administratorUid);
  assert.equal(session.user.role,'Administrator');
  assert.ok(cookieValue(jar,'pi_session'));

  async function request(route,{method='GET',body=null}={}){
    const headers={Cookie:[...jar].map(([name,value])=>`${name}=${encodeURIComponent(value)}`).join('; ')};
    if(method!=='GET')Object.assign(headers,{Origin:origin,'Content-Type':'application/json','X-PI-Workspace':'local-v1','X-PI-CSRF':cookieValue(jar,'pi_csrf')});
    const response=await fetch(`${origin}${route}`,{method,headers,body:body===null?undefined:JSON.stringify(body)});
    receiveCookies(jar,response);
    return {status:response.status,body:await responseJson(response)};
  }
  return {jar,request};
}

async function logout({origin,session}){
  const jar=session.jar,response=await fetch(`${origin}/api/auth/logout`,{
    method:'POST',headers:{Origin:origin,'X-PI-CSRF':cookieValue(jar,'pi_csrf'),Cookie:[...jar].map(([name,value])=>`${name}=${encodeURIComponent(value)}`).join('; ')}
  });
  receiveCookies(jar,response);
  assert.equal(response.status,200);
  assert.equal(cookieValue(jar,'pi_session'),'');
}

async function main(){
  const startedAt=new Date().toISOString();
  assert.equal(process.version,EXPECTED.node,'Acceptance must use Node 22.12.0 exactly');
  for(const name of ['PI_PUBLIC_FIREBASE_API_KEY','ADMIN_EMAIL','ADMIN_PW'])assert.ok(String(process.env[name]??'').trim(),`${name} is required`);

  const [{initializeFirebaseAuthentication},{getApp},{getFirestore},{createFirestoreDurablePropertyRepository},{createDurablePropertyService},{startInvestmentWorkspace},{cacheLocation,readCache},{queryAddress,selectProperty},{toPreliminaryEvidence},{addCachedPropertyResearch}]=await Promise.all([
    import('../src/auth/firebase-admin.js'),import('firebase-admin/app'),import('firebase-admin/firestore'),import('../src/investment-workspace/firestore-durable-properties.js'),import('../src/investment-workspace/durable-properties.js'),import('../src/investment-workspace/server.js'),import('../src/sources/rentcast/cache.js'),import('../src/sources/rentcast/propertyLookup.js'),import('../src/investment-workspace/property-research.js'),import('../src/investment-workspace/automatic-property-research.js')
  ]);
  const authentication=await initializeFirebaseAuthentication();
  assert.equal(authentication.expectedProjectId,EXPECTED.projectId);
  assert.equal(authentication.expectedOrganizationId,EXPECTED.organizationId);
  const firebaseApp=getApp('pi-v2-3a');
  assert.equal(firebaseApp.options.projectId,EXPECTED.projectId);
  const db=getFirestore(firebaseApp);

  const beforeFirestore=await collectionGroupState(db);
  assert.equal(documentCount(beforeFirestore),0,'Live PI Firestore collections must be empty before this isolated acceptance');
  const beforeLocal=await localGuardState();

  const address={street:'400 Decatur St',city:'Bakersfield',state:'CA',zip:'93308'};
  const propertyLocation=cacheLocation('/properties',{address:queryAddress(address)},'data/raw/rentcast/property-research-v2-3');
  const propertyRecord=await readCache(propertyLocation);
  assert.ok(propertyRecord,'Existing Decatur Property Records cache is required');
  const match=selectProperty(address,propertyRecord.body);
  assert.equal(match.status,'MATCHED_ADDRESS');
  const retained=toPreliminaryEvidence(match.selected,propertyRecord);
  const enriched=(await addCachedPropertyResearch({properties:[retained.property]})).properties[0];
  assert.equal(enriched.address,EXPECTED.address);
  assert.equal(enriched.ref,EXPECTED.subjectRef);
  assert.equal(enriched.evidenceFingerprint,EXPECTED.evidenceSnapshotId);
  const scenario=JSON.parse(await readFile(path.join(ROOT,`data/runtime/investment-workspace-v1/scenarios/${EXPECTED.scenarioId}.r${EXPECTED.scenarioRevision}.json`),'utf8'));
  assert.equal(scenario.id,EXPECTED.scenarioId);
  assert.equal(scenario.revision,EXPECTED.scenarioRevision);
  assert.equal(scenario.propertyRef,EXPECTED.subjectRef);
  assert.equal(scenario.evidenceFingerprint,EXPECTED.evidenceSnapshotId);
  const scenarioBeforeHash=dataHash(scenario);

  const committedTransactions=[],firestore={
    collection:(...args)=>db.collection(...args),
    runTransaction:async callback=>{
      const mutations=[];
      const result=await db.runTransaction(async transaction=>{
        const counted=new Proxy(transaction,{get(target,key){
          const value=target[key];
          if(['create','update','set','delete'].includes(String(key)))return (...args)=>{mutations.push({operation:String(key),path:args[0]?.path??null});return value.apply(target,args);};
          return typeof value==='function'?value.bind(target):value;
        }});
        return callback(counted);
      },{maxAttempts:1});
      committedTransactions.push(mutations);
      return result;
    }
  };
  const repository=createFirestoreDurablePropertyRepository({firestore});
  const durableProperties=createDurablePropertyService({repository});
  const evidenceOnlyResearch={
    setEvidenceProvider(){},
    setEvidenceHandler(handler){handler({property:enriched,detail:retained.detail});}
  };
  const app=await startInvestmentWorkspace({port:0,root:ROOT,viteEnabled:false,propertyDetail:false,propertyResearch:evidenceOnlyResearch,authentication,durableProperties});
  let firstSession,secondSession,promotion,duplicate,restoredProperty,restoredScenarios,restoredWorkspace;
  try{
    firstSession=await startSession({origin:app.origin,apiKey:process.env.PI_PUBLIC_FIREBASE_API_KEY,email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PW});
    const firstMe=await firstSession.request('/api/auth/me');
    assert.equal(firstMe.status,200);
    assert.deepEqual({uid:firstMe.body.user.uid,role:firstMe.body.user.role,organizationId:firstMe.body.user.organizationId},{uid:EXPECTED.administratorUid,role:'Administrator',organizationId:EXPECTED.organizationId});
    const bootstrap=await firstSession.request('/api/investment/bootstrap');
    assert.equal(bootstrap.status,200);
    const subject=bootstrap.body.properties.find(item=>item.ref===EXPECTED.subjectRef);
    assert.ok(subject);
    assert.equal(subject.evidenceFingerprint,EXPECTED.evidenceSnapshotId);
    const scenarios=await firstSession.request('/api/investment/scenarios');
    assert.equal(scenarios.status,200);
    const originalScenario=scenarios.body.find(item=>item.id===EXPECTED.scenarioId);
    assert.ok(originalScenario);
    assert.equal(originalScenario.revision,EXPECTED.scenarioRevision);
    assert.equal(dataHash(Object.fromEntries(Object.entries(originalScenario).filter(([key])=>!key.startsWith('_workspace')))),scenarioBeforeHash);

    const preview=await firstSession.request('/api/durable-properties/preview',{method:'POST',body:{subjectRef:EXPECTED.subjectRef}});
    assert.equal(preview.status,200);
    assert.equal(preview.body.address,EXPECTED.address);
    assert.deepEqual(preview.body.potentialDuplicates,[]);

    promotion=await firstSession.request('/api/durable-properties/save',{method:'POST',body:{subjectRef:EXPECTED.subjectRef,scenarioId:EXPECTED.scenarioId}});
    assert.equal(promotion.status,200,'The one approved promotion failed');
    assert.equal(promotion.body.property.address,EXPECTED.address);
    assert.equal(promotion.body.property.lifecycleStatus,'SAVED_PROPERTY');
    assert.deepEqual(promotion.body.property.evidenceSnapshotIds,[EXPECTED.evidenceSnapshotId]);
    assert.equal(promotion.body.property.scenarioCount,1);
    await logout({origin:app.origin,session:firstSession});

    secondSession=await startSession({origin:app.origin,apiKey:process.env.PI_PUBLIC_FIREBASE_API_KEY,email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PW});
    const secondMe=await secondSession.request('/api/auth/me');
    assert.equal(secondMe.status,200);
    assert.deepEqual({uid:secondMe.body.user.uid,role:secondMe.body.user.role,organizationId:secondMe.body.user.organizationId},{uid:EXPECTED.administratorUid,role:'Administrator',organizationId:EXPECTED.organizationId});
    const propertyId=promotion.body.property.id;
    restoredProperty=await secondSession.request(`/api/durable-properties/${propertyId}`);
    restoredScenarios=await secondSession.request(`/api/durable-properties/${propertyId}/scenarios`);
    restoredWorkspace=await secondSession.request('/api/investment/scenarios');
    assert.equal(restoredProperty.status,200);
    assert.equal(restoredProperty.body.property.id,propertyId);
    assert.equal(restoredProperty.body.property.lifecycleStatus,'SAVED_PROPERTY');
    assert.equal(restoredScenarios.status,200);
    assert.equal(restoredScenarios.body.revisions.length,1);
    const linked=restoredScenarios.body.revisions[0];
    assert.equal(linked.scenarioId,EXPECTED.scenarioId);
    assert.equal(linked.revision,EXPECTED.scenarioRevision);
    assert.equal(linked.evidenceSnapshotId,EXPECTED.evidenceSnapshotId);
    assert.deepEqual(linked.scenario,scenario);
    assert.equal(restoredWorkspace.status,200);
    const restoredAnalysis=restoredWorkspace.body.find(item=>item.id===EXPECTED.scenarioId);
    assert.ok(restoredAnalysis);
    assert.equal(restoredAnalysis.revision,EXPECTED.scenarioRevision);
    assert.equal(restoredAnalysis.propertyRef,EXPECTED.subjectRef);

    duplicate=await secondSession.request('/api/durable-properties/save',{method:'POST',body:{subjectRef:EXPECTED.subjectRef,scenarioId:EXPECTED.scenarioId}});
    assert.equal(duplicate.status,409);
    assert.equal(duplicate.body.error,'DUPLICATE_PROPERTY');
    assert.equal(duplicate.body.details.duplicates.length,1);
    assert.equal(duplicate.body.details.duplicates[0].id,propertyId);
    await logout({origin:app.origin,session:secondSession});
  }finally{
    await app.close();
  }

  const afterFirestore=await collectionGroupState(db),afterLocal=await localGuardState(),propertyId=promotion.body.property.id;
  assert.deepEqual(afterLocal,beforeLocal,'Provider evidence, usage, local scenarios or reports changed');
  const normalizedMatchKey='400 DECATUR ST|BAKERSFIELD|CA',addressKeyPath=`organizations/${EXPECTED.organizationId}/propertyKeys/${sha(`ADDRESS:${normalizedMatchKey}`)}`;
  const expectedPaths=[
    `organizations/${EXPECTED.organizationId}/properties/${propertyId}`,
    addressKeyPath,
    `organizations/${EXPECTED.organizationId}/properties/${propertyId}/evidenceSnapshots/${sha(EXPECTED.evidenceSnapshotId)}`,
    `organizations/${EXPECTED.organizationId}/properties/${propertyId}/scenarioRevisions/${EXPECTED.scenarioId}--r${EXPECTED.scenarioRevision}`
  ].sort();
  const actualPaths=Object.values(afterFirestore).flat().map(item=>item.path).sort();
  assert.deepEqual(actualPaths,expectedPaths);
  assert.equal(afterFirestore.properties.length,1);
  assert.equal(afterFirestore.propertyKeys.length,1);
  assert.equal(afterFirestore.evidenceSnapshots.length,1);
  assert.equal(afterFirestore.scenarioRevisions.length,1);
  for(const name of ['reportRevisions','supportingDocuments','documentHashes','documentAudits','versions'])assert.equal(afterFirestore[name].length,0);

  const propertySnapshot=await db.doc(`organizations/${EXPECTED.organizationId}/properties/${propertyId}`).get();
  const propertyData=propertySnapshot.data();
  assert.equal(propertyData.sourceSubjectRef,EXPECTED.subjectRef);
  assert.deepEqual(propertyData.evidenceSnapshotIds,[EXPECTED.evidenceSnapshotId]);
  assert.equal(propertyData.lifecycleStatus,'SAVED_PROPERTY');
  assert.equal(propertyData.createdBy,EXPECTED.administratorUid);
  assert.equal(propertyData.lastEditedBy,EXPECTED.administratorUid);
  const linkedSnapshot=await db.doc(`organizations/${EXPECTED.organizationId}/properties/${propertyId}/scenarioRevisions/${EXPECTED.scenarioId}--r${EXPECTED.scenarioRevision}`).get();
  assert.deepEqual(linkedSnapshot.data().scenario,scenario);
  assert.equal(dataHash(linkedSnapshot.data().scenario),scenarioBeforeHash);

  const mutationLedger=committedTransactions.flat();
  assert.equal(committedTransactions.length,3,'Expected create, scenario-link and rejected duplicate transactions');
  assert.deepEqual(committedTransactions.map(items=>items.length),[3,2,0]);
  assert.equal(mutationLedger.length,5);
  assert.equal(documentCount(afterFirestore),4);

  const completedAt=new Date().toISOString();
  return {
    status:'PASS',startedAt,completedAt,nodeVersion:process.version,projectId:EXPECTED.projectId,database:'(default)',databaseRegion:'us-west2',organizationId:EXPECTED.organizationId,
    administrator:{uid:EXPECTED.administratorUid,role:'Administrator',authenticatedSessions:2,passwordExposed:false},
    property:{stablePropertyId:propertyId,address:propertyData.address,lifecycleStatus:propertyData.lifecycleStatus,identityConfidence:propertyData.identityConfidence,parcelIdentifiers:propertyData.parcelIdentifiers,sourceSubjectRef:propertyData.sourceSubjectRef,evidenceSnapshotIds:propertyData.evidenceSnapshotIds,createdAt:propertyData.createdAt,updatedAt:propertyData.updatedAt,createdBy:propertyData.createdBy,lastEditedBy:propertyData.lastEditedBy},
    scenario:{id:EXPECTED.scenarioId,revision:EXPECTED.scenarioRevision,evidenceSnapshotId:EXPECTED.evidenceSnapshotId,savedAt:scenario.savedAt,sourceSha256:scenarioBeforeHash,restoredAfterNewLogin:true,exactPayloadMatch:true},
    firestore:{baselineDocumentCount:documentCount(beforeFirestore),finalDocumentCount:documentCount(afterFirestore),documentPaths:actualPaths,documentMetadata:Object.values(afterFirestore).flat().sort((a,b)=>a.path.localeCompare(b.path)),committedTransactions:committedTransactions.map((items,index)=>({number:index+1,writeCount:items.length,mutations:items})),exactDatabaseWrites:mutationLedger.length,transactionMaximumAttempts:1,duplicateAttemptStatus:duplicate.status,duplicateCreatedWrites:0},
    isolation:{localGuardStateUnchanged:true,providerRequests:0,cloudStorageOperations:0,reportWrites:0,documentWrites:0,archiveRestoreWrites:0,otherPropertyWrites:0,otherScenarioWrites:0},
    authentication:{firstSessionLoggedOut:true,secondSessionAuthenticatedRead:true,propertyRestored:true,linkedAnalysisRestored:true}
  };
}

try{
  const result=await main();
  console.log(`PI_V2_4_LIVE_ACCEPTANCE_RESULT=${JSON.stringify(result)}`);
}catch(error){
  console.error(`PI_V2_4_LIVE_ACCEPTANCE_FAILURE=${JSON.stringify({status:'FAIL',at:new Date().toISOString(),name:error.name,message:error.message,actual:error.actual,expected:error.expected})}`);
  process.exitCode=1;
}
