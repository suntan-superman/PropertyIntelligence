import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';

export const migrationNames=[
  '001_persistent_intelligence.sql','002_acquisition_decisions.sql','003_opportunity_discovery.sql',
  '004_kern_assessor_opportunity_enrichment.sql','005_candidate_address_resolutions.sql',
  '006_opportunity_property_links.sql'
];
export const certifiedChecksums=Object.freeze({
  '001_persistent_intelligence.sql':'10388d31537f8f65cfadc1b8c6ab590d84707a65ea6ff18e886f23147b85ebfe',
  '002_acquisition_decisions.sql':'3ef7649d10f76297d74c12b8e8527e936407f39a7b195482014b545dbeda6ce7',
  '003_opportunity_discovery.sql':'d7ac242d9ff2230a5ffe78290ccbedcd6bb002e73a99cd325baa6ef56901ed77',
  '004_kern_assessor_opportunity_enrichment.sql':'df557e0aec7d276e628ebced3c1fcc43e743f974d60c51290e3b369bd4e08c18',
  '005_candidate_address_resolutions.sql':'d123cb84e38dca2bffab0559d7fe579bcea612186b37007581ad0a26ac2b29e1',
  '006_opportunity_property_links.sql':'00d0402c5506f0a62b36e208ffbae67017da0287ecf785136715e7aec0c082b6'
});
export const digest=value=>createHash('sha256').update(String(value)).digest('hex');
export function qaName(){return `qa_sprint6_3_3_${randomUUID().replaceAll('-','')}`;}
export function quotedSchema(name){if(!/^qa_sprint6_3_3_[a-f0-9]{32}$/.test(name))throw new Error('QA_NAMESPACE_GUARD_STOP');return `"${name}"`;}
function audit(sql){const clean=sql.replace(/--[^\r\n]*/g,'');if(/\b(?:DROP\s+(?:DATABASE|SCHEMA)|TRUNCATE|DELETE\s+FROM|ALTER\s+SYSTEM|CREATE\s+(?:SCHEMA|DATABASE|ROLE|EXTENSION))\b|\bpublic\s*\./i.test(clean))throw new Error('MIGRATION_NAMESPACE_INCOMPATIBLE');}
export async function migrations(){
  const output=[];
  for(const filename of migrationNames){const sql=await readFile(`netlify/database/migrations/${filename}`,'utf8'),checksum=digest(sql);if(checksum!==certifiedChecksums[filename])throw new Error(`MIGRATION_CHECKSUM_${filename.slice(0,3)}_STOP`);if(Number(filename.slice(0,3))<6&&filename!=='006_opportunity_property_links.sql')audit(sql);output.push({filename,sql,checksum});}
  return output;
}
export async function verifiedClient(db){const client=await db.getPool().connect(),stream=client.connection?.stream;if(!stream?.encrypted||stream.authorized!==true){client.release();throw new Error('VERIFIED_TLS_REQUIRED');}return client;}
export async function setNamespace(client,quoted){const path=`${quoted}, pg_catalog`;await client.query("SELECT pg_catalog.set_config('search_path',$1,true)",[path]);const row=(await client.query('SELECT current_schema() AS current,current_schemas(false) AS schemas')).rows[0];if(row.current!==quoted.replaceAll('"','')||!row.schemas.includes(quoted.replaceAll('"','')))throw new Error('QA_NAMESPACE_RESOLUTION_STOP');return row;}
