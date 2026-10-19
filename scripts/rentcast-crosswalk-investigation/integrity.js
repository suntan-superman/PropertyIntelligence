import '../../src/analysis/offline.js';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileHash,ZIP,ZIP_HASH,zipEntries,zipMember} from '../sprint6_2/io.js';
import {ROOT,check,sha,saveNew} from '../rentcast-controlled-pilot/core.js';
import {readJson,verifyProtection} from '../rentcast-controlled-pilot/local.js';
import {offlineStatus} from '../../src/analysis/offline.js';

export const CACHE='data/runtime/sprint6_2-kern-assessor';
export const PACKAGE=`${CACHE}/package/KernCountyAssessor_GisParcels_2026final`;
export const OUT=`${ROOT}/private-crosswalk-integrity.json`;
export async function verifyHistoricalEvidence(){
  const before=await readJson(`${ROOT}/protected-before.json`),mapping=await readJson(`${ROOT}/candidate-mapping.json`),cert=await readJson(`${ROOT}/post-acquisition-certification.json`),audit=await readJson('data/validation/sprint6_2-kern-assessor-source-audit.json');
  await verifyProtection(before);
  const originalHashes={...before};
  for(const [p,h] of Object.entries(cert.artifactHashes)){check(await fileHash(p)===h,`RENTCAST_INTEGRITY_STOP:${p}`);originalHashes[p]=h;}
  const seal=p=>{const {packetSha256,...rest}=p;check(sha(JSON.stringify(rest))===packetSha256,'PACKET_SEAL_STOP');};
  seal(mapping);check((await readJson(`${ROOT}/execution-lock.json`)).mappingSha256===mapping.packetSha256,'CANDIDATE_MAPPING_CHANGED');
  for(const c of mapping.candidates){seal(await readJson(`${ROOT}/evidence/${c.pilotCode}.json`));seal(await readJson(`${ROOT}/review-packets/${c.pilotCode}-review.json`));}
  const ledger=await readJson(`${ROOT}/request-ledger.json`);check(JSON.stringify(ledger)===JSON.stringify(cert.requestAccounting),'ORIGINAL_LEDGER_CHANGED');
  for(const [k,p] of Object.entries(mapping.sourcePaths)){check(await fileHash(p)===mapping.inputHashes[k],`SOURCE_INTEGRITY_STOP:${p}`);originalHashes[p]=mapping.inputHashes[k];}
  check(await fileHash(ZIP)===ZIP_HASH,'ORIGINAL_ARCHIVE_INTEGRITY_STOP');originalHashes[ZIP]=ZIP_HASH;
  for(const f of audit.sourceFiles){check(await fileHash(f.path)===f.sha256,`COUNTY_SOURCE_INTEGRITY_STOP:${f.path}`);originalHashes[f.path]=f.sha256;}
  for(const item of audit.inventory.filter(x=>x.sha256)){const p=`${CACHE}/package/${item.name}`;check(await fileHash(p)===item.sha256,`NESTED_ARCHIVE_INTEGRITY_STOP:${p}`);originalHashes[p]=item.sha256;}
  const textSources=[{zip:ZIP,member:'KernCountyAssessor_GisParcels_2026final/_readme.txt',path:`PACKAGE/_readme.txt`.replace('PACKAGE',PACKAGE)},
    {zip:`${PACKAGE}/Shapefile_Parcels_Land_2026final.zip`,member:'parcels_land_2026final_shp.xml',path:`${CACHE}/extracted/Shapefile_Parcels_Land_2026final/parcels_land_2026final_shp.xml`},
    {zip:`${PACKAGE}/KIPS_Situs_2026-06-26.zip`,member:'sits_schema.txt',path:`${CACHE}/extracted/KIPS_Situs_2026-06-26/sits_schema.txt`}];
  for(const s of textSources){const entries=await zipEntries(s.zip),matches=entries.filter(e=>e.name===s.member||e.name.endsWith('/'+s.member));check(matches.length===1,`SOURCE_MEMBER_MISSING:${s.path}`);const bytes=await zipMember(s.zip,matches[0]);check(bytes.equals(await readFile(s.path)),`SOURCE_MEMBER_CHANGED:${s.path}`);originalHashes[s.path]=sha(bytes);}
  async function snapshot(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())await snapshot(p);else if(e.isFile())originalHashes[p]=await fileHash(p);}}
  await snapshot(ROOT);
  await snapshot('docs');
  await snapshot('scripts/rentcast-controlled-pilot');
  await snapshot('scripts/sprint6_2');
  const sourceHashes=Object.fromEntries(Object.entries(originalHashes).filter(([p])=>p===ZIP||p.startsWith(CACHE)||p===mapping.sourcePaths.pts));
  check(offlineStatus().networkAttempts===0,'NETWORK_ATTEMPT_STOP');
  return {version:1,checkedAt:new Date().toISOString(),countySourceIntegrity:'PASS',rentcastEvidenceIntegrity:'PASS',candidateMappingUnchanged:true,originalLedgerUnchanged:true,originalHashes,sourceHashes,metadataVerifiedAgainstOriginalArchives:textSources.map(s=>s.path),providerCalls:0,databaseConnections:0,databaseWrites:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/rentcast-crosswalk-investigation/integrity.js')){
  try{execFileSync('git',['check-ignore','--quiet',OUT],{stdio:'pipe'});const result=await verifyHistoricalEvidence();await saveNew(OUT,result);console.log(JSON.stringify({...result,originalHashes:undefined,sourceHashes:undefined,protectedPaths:Object.keys(result.originalHashes).length}));}
  catch(e){console.error(String(e.message));process.exitCode=1;}
}
