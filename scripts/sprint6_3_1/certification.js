import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {auditSql,namespaceGuard,fingerprintPublic} from '../sprint6_3/certification.js';
const digest=value=>createHash('sha256').update(value).digest('hex');
export const migrationNames=['001_persistent_intelligence.sql','002_acquisition_decisions.sql','003_opportunity_discovery.sql','004_kern_assessor_opportunity_enrichment.sql','005_candidate_address_resolutions.sql'];
export async function migrationInputs631(){
  const baseline=JSON.parse(await readFile('data/runtime/sprint6_3/baseline.json','utf8'));
  return Promise.all(migrationNames.map(async filename=>{const path=`netlify/database/migrations/${filename}`,sql=await readFile(path,'utf8'),checksum=digest(sql);const prior=baseline.files.find(f=>f.path===path);if(prior&&prior.sha256!==checksum)throw new Error('PRIOR_MIGRATION_CHANGED_STOP');auditSql(sql);return {filename,sql,checksum};}));
}
export function qaName631(){return `qa_sprint6_3_1_${randomUUID().replaceAll('-','')}`;}
export function quote631(name,enabled){if(enabled!==true||!/^[a-z][a-z0-9_]{10,60}$/.test(name))throw new Error('QA_NAMESPACE_GUARD_STOP');return `"${name}"`;}
