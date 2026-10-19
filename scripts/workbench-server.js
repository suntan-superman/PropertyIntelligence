import path from 'node:path';
try{process.loadEnvFile(path.resolve('.env'));}catch(error){if(error.code!=='ENOENT')throw error;}
const portIndex=process.argv.indexOf('--port'),port=portIndex>=0?Number(process.argv[portIndex+1]):4173;
const investment=process.argv.includes('--investment');
if(investment&&process.argv.includes('--built'))throw new Error('Investment workspace is local-development only. Omit --built.');
const start=investment?(await import('../src/investment-workspace/server.js')).startInvestmentWorkspace:(await import('../src/workbench/server.js')).startWorkbench;
// Guided Analysis, Discovery, My Workspace and Property Detail share one
// retained evidence graph. Investment mode must load it even when an older
// launch command omits the formerly optional --property-detail switch.
const propertyDetail=investment||process.argv.includes('--property-detail');
const googleGeocoding=investment&&process.argv.includes('--google-geocoding');
const addressTransport=googleGeocoding?(await import('../src/discovery/address-resolution.js')).createGoogleGeocodingTransport({apiKey:process.env.GOOGLE_GEOCODING_API_KEY}):null;
const operationalPersistence=investment&&process.argv.includes('--operational-persistence');
const firebaseAuthentication=investment&&(operationalPersistence||process.argv.includes('--firebase-auth'))?await (await import('../src/auth/firebase-admin.js')).initializeFirebaseAuthentication():null;
const firestoreProperties=investment&&(operationalPersistence||process.argv.includes('--firestore-properties'));
if(firestoreProperties&&!firebaseAuthentication)throw new Error('Firestore durable properties require --firebase-auth.');
const durableProperties=firestoreProperties?await (await import('../src/auth/firebase-admin.js')).initializeFirebaseDurableProperties({authentication:firebaseAuthentication}):null;
const supportingDocumentStorage=investment&&process.argv.includes('--supporting-documents');
if(supportingDocumentStorage&&!durableProperties)throw new Error('Supporting documents require operational Firestore property persistence.');
const supportingDocuments=supportingDocumentStorage?await (await import('../src/auth/firebase-admin.js')).initializeFirebaseSupportingDocuments({authentication:firebaseAuthentication,durableProperties,malwareScanner:await (await import('../src/investment-workspace/cloud-run-malware-scanner.js')).loadCloudRunMalwareScanner()}):null;
const livePropertyResearch=investment&&(Boolean(firebaseAuthentication)||process.argv.includes('--live-property-research'));
let propertyResearch=null;
if(livePropertyResearch){
  if(firebaseAuthentication){
    const module=await import('../src/investment-workspace/authenticated-research-config.js');
    try{propertyResearch=await module.loadAuthenticatedResearchConfiguration({authentication:firebaseAuthentication});}
    catch(error){const recognized=/^[A-Z0-9_]+$/.test(String(error?.message??''))?error.message:'PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED';propertyResearch=module.unavailableAuthenticatedResearch(recognized);console.warn(`Authenticated provider research is disabled: ${recognized}. Update the private account-level provider controls and restart PI.`);}
  }else propertyResearch=await (await import('../src/investment-workspace/live-research-config.js')).loadLocalResearchConfiguration();
}
const mapConfig=investment?await (await import('../src/workbench/mapConfig.js')).readMapConfig():undefined;
const app=await start({dev:!process.argv.includes('--built'),port:Number.isFinite(port)?port:4173,propertyDetail,addressTransport,propertyResearch,authentication:firebaseAuthentication,durableProperties,supportingDocuments,mapConfig});
console.log(`Internal Property Intelligence Workbench: ${app.url}`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();process.exit(0);});
