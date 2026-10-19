import '../../src/analysis/offline.js';
import {readFile} from 'node:fs/promises';
import {schema,scanDbf} from '../sprint6_2/dbf.js';
import {fileHash,ZIP,ZIP_HASH} from '../sprint6_2/io.js';
import {ROOT as PILOT,check,sha} from '../rentcast-controlled-pilot/core.js';
import {readJson,verifyProtection} from '../rentcast-controlled-pilot/local.js';
export const ROOT='data/runtime/rentcast-reconciliation-v1-1';
const BASE='data/runtime/sprint6_2-kern-assessor/extracted';
export const SOURCES=Object.freeze({
  archive:{path:ZIP,sha256:ZIP_HASH},
  parcel:{path:`${BASE}/Shapefile_Parcels_Land_2026final/parcels_land_2026final.dbf`,sha256:'d27d17ea42946debd31b165893d042ea11fb39c608c81620724dc03f3527bd5e',rows:424125},
  land:{path:`${BASE}/TaxRoll_Land_2026final/TaxRoll_Land_2026final.dbf`,sha256:'3f96888125baad5525b1791d2e2ab56b5403b14d10f489378059341c0d17fbd5',rows:426054},
  history:{path:`${BASE}/TaxRoll_ParcelHistory_2026final/TaxRoll_ParcelHistory_2026final.dbf`,sha256:'ad866d3dc10122aecf8442da0210e0d25d1cf2287b786ca7fd9769f0c2fd7d11',rows:532878},
  metadata:{path:`${BASE}/Shapefile_Parcels_Land_2026final/parcels_land_2026final_shp.xml`,sha256:'1b74e844badc0bba857f86f5a1668df971eb8c8010aa0a889f234d839536955b'},
  eventTypes:{path:`${BASE}/TaxRoll_ParcelHistory_EventTypes_2026final/TaxRoll_ParcelHistory_EventTypes_2026final.dbf`,sha256:'de0a4de73c4d336b51b190165ec8f7592fb3228875b20578f25c76869c24dadf',rows:10},
});
export function sealedValid(value){if(!value||typeof value!=='object')return false;const {packetSha256,...body}=value;return packetSha256===sha(JSON.stringify(body));}
export async function loadSources(){
  const baseline=await readJson(`${ROOT}/preservation-before.json`);await verifyProtection(baseline.hashes);
  const fingerprints={};for(const [name,ref] of Object.entries(SOURCES)){const actual=await fileHash(ref.path);check(actual===ref.sha256,`SOURCE_FINGERPRINT_STOP:${ref.path}`);fingerprints[name]=actual;}
  const mappingPath=`${PILOT}/candidate-mapping.json`,mappingText=await readFile(mappingPath,'utf8'),mapping=JSON.parse(mappingText);
  check(sealedValid(mapping)&&mapping.candidates.length===3,'MAPPING_SEAL_STOP');
  const evidenceItems=[];for(const candidate of mapping.candidates){const path=`${PILOT}/evidence/${candidate.pilotCode}.json`,bytes=await readFile(path),evidence=JSON.parse(bytes);check(sealedValid(evidence),'ORIGINAL_EVIDENCE_SEAL_STOP');evidenceItems.push({candidate,evidence,evidenceText:bytes.toString('utf8'),binding:{evidencePath:path,evidenceFileSha256:baseline.hashes[path],candidateSha256:sha(JSON.stringify(candidate)),mappingPath,mappingFileSha256:baseline.hashes[mappingPath],mappingPacketSha256:mapping.packetSha256}});}
  for(const item of evidenceItems)item.binding.providerIdOccurrences=evidenceItems.filter(x=>x.evidence.providerRecord?.id===item.evidence.providerRecord?.id).length;
  const comparisonIds=new Set(evidenceItems.map(x=>typeof x.evidence.providerRecord?.assessorID==='string'?x.evidence.providerRecord.assessorID.replace(/[ -]/g,''):null));
  const apn9s=new Set(mapping.candidates.map(c=>c.county.apn9)),atns=new Set(mapping.candidates.map(c=>c.county.atn));
  const tables={},selected={},stats={};
  async function readTable(name,fields,keep){const ref=SOURCES[name],s=await schema(ref.path),rows=[];const scan=await scanDbf(ref.path,fields,(values,ordinal)=>{if(keep(values)){rows.push({values,reference:{path:ref.path,sha256:ref.sha256,ordinal,byteOffset:s.headerBytes+(ordinal-1)*s.recordBytes,projectionSha256:sha(JSON.stringify(values))}});}});check(scan.active===ref.rows&&scan.deleted===0,'COUNTY_CENSUS_CHANGED');tables[name]={path:ref.path,sha256:ref.sha256,scannedRows:scan.active,deletedRows:scan.deleted,headerBytes:s.headerBytes,recordBytes:s.recordBytes,rows};selected[name]=rows;}
  await readTable('parcel',['APN','APN9','APN_LABEL'],r=>{const keep=comparisonIds.has(r.APN)||apn9s.has(r.APN9);if(keep)apn9s.add(r.APN9);return keep;});
  const apnCounts=new Map(),atnCounts=new Map();
  await readTable('land',['ATN','APN9','ADDR_SITUS','USE_CODE','ROLL'],r=>{apnCounts.set(r.APN9,(apnCounts.get(r.APN9)??0)+1);atnCounts.set(r.ATN,(atnCounts.get(r.ATN)??0)+1);return apn9s.has(r.APN9)||atns.has(r.ATN);});
  await readTable('history',['APN9','EVT_NUM_CR','EVT_TYP_CR','DT_CREATE','EVT_NUM_IN','EVT_TYP_IN','DT_INACT'],r=>apn9s.has(r.APN9));
  stats.land={rows:tables.land.scannedRows,distinctAtns:atnCounts.size,distinctApn9s:apnCounts.size,repeatedApn9Groups:[...apnCounts.values()].filter(n=>n>1).length};
  check(stats.land.distinctAtns===426054&&stats.land.distinctApn9s===424125&&stats.land.repeatedApn9Groups===1095,'RELATIONSHIP_CENSUS_CHANGED');
  // The pinned XML contains the explicit APN/APN9 definitions and APN9 join
  // contract. No HTML, web request, address search or computed check digit.
  const xml=await readFile(SOURCES.metadata.path,'utf8');check(xml.includes('extended with final check-digit')&&xml.includes('APN9 field as the SQL join key'),'COUNTY_DOCUMENTATION_MISSING');
  return {source:{edition:'2026_FINAL',jurisdiction:'KERN_CA',fingerprints,tables,stats,metadataReference:{...SOURCES.metadata,sections:['attr/APN','attr/APN9','idAbs']},historyResolutionPolicy:'NO_CHAIN_INFERENCE'},items:evidenceItems.map(x=>({...x,mappingText}))};
}
