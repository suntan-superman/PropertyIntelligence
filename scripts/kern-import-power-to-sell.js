import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseCsv,normalizePowerToSellRow,sha256} from '../src/sources/kern/csv.js';
import {createDatabase} from '../src/persistence/db.js';
import {importSource,opportunityStatus} from '../src/services/opportunityService.js';

try{process.loadEnvFile(path.resolve('.env'));}catch{}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourcePath=process.argv[3]??path.join(root,'data','raw','kern_power_to_sell_2026-09-15.csv');
const command=process.argv[2]??'dry-run';
const manifestPath=path.join(root,'data','validation','sprint6-kern-import-dry-run.json');

async function readSource(){
  const bytes=await readFile(sourcePath),parsed=parseCsv(bytes.toString('utf8'));const records=[];const rejected=[];const fingerprints=new Set();
  for(let index=0;index<parsed.rows.length;index++){
    const row=parsed.rows[index];if(row.length!==parsed.headers.length){rejected.push({rowNumber:index+2,reason:'FIELD_COUNT'});continue;}
    const item=normalizePowerToSellRow(parsed.headers,row,index+2);const fingerprint=sha256(JSON.stringify(item.raw));
    if(item.criticalMalformed.length){rejected.push({rowNumber:index+2,reason:'MALFORMED_CRITICAL_FIELD',fields:item.criticalMalformed});continue;}
    if(!item.normalized.atn&&!item.normalized.apn){rejected.push({rowNumber:index+2,reason:'MISSING_STABLE_IDENTIFIER'});continue;}
    if(item.raw.atn&&!/^\d{3}-\d{3}-\d{2}-\d{2}-\d$/.test(String(item.raw.atn).trim())){rejected.push({rowNumber:index+2,reason:'MALFORMED_ATN'});continue;}
    const duplicate=fingerprints.has(fingerprint);fingerprints.add(fingerprint);
    records.push({sourceRowNumber:index+2,sourcePage:item.normalized.sourcePage?Number(item.normalized.sourcePage):null,externalIdentifier:item.normalized.atn?`ATN:${item.normalized.atn}`:`APN:${item.normalized.apn}`,atn:item.normalized.atn,apn:item.normalized.apn,ownerName:item.normalized.ownerName,amountOwed:item.normalized.parcelAmountOwed,rawPayload:item.raw,normalizedPayload:item.normalized,recordFingerprint:fingerprint,duplicate});
  }
  const duplicateRows=records.filter(item=>item.duplicate).length;const candidates=new Set(records.map(item=>item.atn?`ATN:${item.atn}`:item.apn?`APN:${item.apn}`:`ROW:${item.recordFingerprint}`));
  const sourceDate=records.find(item=>item.normalizedPayload.sourceDate)?.normalizedPayload.sourceDate??null;const sourceName=records.find(item=>item.normalizedPayload.source)?.normalizedPayload.source??'Kern County Power to Sell Listing';
  const sourceFileHash=sha256(bytes);const summary={at:new Date().toISOString(),status:rejected.length?'REJECTED_ROWS':'PASS',sourceFile:path.relative(root,sourcePath).replaceAll('\\','/'),sourceFileHash,recordCount:parsed.rows.length,validCount:records.length,rejectedCount:rejected.length,rejectedSample:rejected.slice(0,20),exactDuplicateRows:duplicateRows,uniqueCandidateEstimate:candidates.size,sourceName,sourceDate,columns:parsed.headers,providerCalls:0,records};
  return {bytes,summary,records:records.map(({duplicate,...record})=>record),source:{sourceType:'KERN_POWER_TO_SELL',jurisdiction:'KERN',sourceName,edition:sourceDate??'UNKNOWN_EDITION',sourceDate,sourceFileHash,recordCount:parsed.rows.length,provenancePayload:{sourceFile:path.relative(root,sourcePath).replaceAll('\\','/'),sourceFileHash,header:parsed.headers,recordCount:parsed.rows.length,validCount:records.length,rejectedCount:rejected.length,importer:'sprint6-kern-import-v1'}}};
}

const loaded=await readSource();
if(command==='dry-run'){
  const manifest={...loaded.summary,records:undefined};await writeFile(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);console.log(JSON.stringify(manifest,null,2));
}else if(command==='import'){
  const prior=JSON.parse(await readFile(manifestPath,'utf8').catch(()=>'{"status":"MISSING"}'));
  if(prior.status!=='PASS'||prior.sourceFileHash!==loaded.summary.sourceFileHash||prior.recordCount!==loaded.summary.recordCount||prior.validCount!==loaded.summary.validCount)throw new Error('SOURCE_RECONCILIATION_REQUIRED');
  if(loaded.summary.rejectedCount)throw new Error('SOURCE_REJECTED_ROWS');
  const db=createDatabase();if(!db)throw new Error('DATABASE_NOT_CONFIGURED');
  try{const result=await importSource({db,source:loaded.source,records:loaded.records,requestKey:`KERN_IMPORT:${loaded.summary.sourceFileHash}`});console.log(JSON.stringify({...result,reconciliation:{sourceFileHash:loaded.summary.sourceFileHash,recordCount:loaded.summary.recordCount,validCount:loaded.summary.validCount,rejectedCount:loaded.summary.rejectedCount},providerCalls:0},null,2));}finally{await db.closePoolForTests();}
}else if(command==='status'){
  const db=createDatabase();if(!db)throw new Error('DATABASE_NOT_CONFIGURED');try{console.log(JSON.stringify(await opportunityStatus({db,sourceFileHash:loaded.summary.sourceFileHash}),null,2));}finally{await db.closePoolForTests();}
}else throw new Error(`UNKNOWN_COMMAND:${command}`);
