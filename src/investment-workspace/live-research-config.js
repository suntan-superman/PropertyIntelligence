import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,realpath,stat} from 'node:fs/promises';
import {configuration} from '../sources/rentcast/config.js';
import {createClient} from '../sources/rentcast/client.js';
import {filesystemStore} from '../sources/rentcast/stores.js';
import {createAccessControl,fixedLocalSession} from '../auth/access-control.js';
import {createPropertyResearchService} from './property-research.js';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const privateRoot='data/runtime/pi-v2-2';

async function readEvidence(root,reference){
  if(!reference||typeof reference.path!=='string'||!/^[a-f0-9]{64}$/.test(reference.sha256))throw new Error('OPERATIONAL_EVIDENCE_REFERENCE_INVALID');
  const absolute=path.resolve(root,reference.path),relative=path.relative(root,absolute).replaceAll('\\','/');
  if(relative.startsWith('../')||(!relative.startsWith('source_docs/')&&!relative.startsWith(`${privateRoot}/`)))throw new Error('OPERATIONAL_EVIDENCE_PATH_INVALID');
  const actual=await realpath(absolute);if(actual.toLowerCase()!==absolute.toLowerCase()||(await stat(absolute)).isSymbolicLink())throw new Error('OPERATIONAL_EVIDENCE_SYMLINK_STOP');
  if(sha(await readFile(absolute))!==reference.sha256)throw new Error('OPERATIONAL_EVIDENCE_HASH_MISMATCH');
}

export async function loadLocalResearchConfiguration({root=process.cwd(),file=`${privateRoot}/operator/research-access.json`,env=null,clock=()=>new Date()}={}){
  const absolute=path.resolve(root,file),bytes=await readFile(absolute),record=JSON.parse(bytes);
  if(record.version!=='PI_LOCAL_PROPERTY_RESEARCH_V1'||record.mode!=='EXPLICIT_LOCAL_DEVELOPMENT'||record.provider!=='RentCast'||record.endpoint!=='/properties')throw new Error('LIVE_RESEARCH_CONFIGURATION_INVALID');
  if(!record.localUser||!record.operationalEvidence||!record.authorization||!record.limits)throw new Error('LIVE_RESEARCH_CONFIGURATION_INCOMPLETE');
  for(const kind of ['account','usage','rights','fees','authorization'])if(!record.evidence?.[kind])throw new Error(`OPERATIONAL_${kind.toUpperCase()}_EVIDENCE_REQUIRED`);
  for(const reference of Object.values(record.evidence))await readEvidence(root,reference);
  const observed=Date.parse(record.operationalEvidence.observedAt),now=clock().getTime();if(!Number.isFinite(observed)||observed>now||now-observed>24*60*60*1000)throw new Error('CURRENT_ACCOUNT_EVIDENCE_EXPIRED');
  if(!env){process.loadEnvFile(path.join(root,'.env'));env=process.env;}
  const rentcast=configuration(env),store=filesystemStore(),client=createClient({...rentcast,maxRetries:0,maxCalls:record.limits.requestsPerProviderPerDay,timeoutMs:Math.min(rentcast.timeoutMs,15000)},{store,cachePrefix:'data/raw/rentcast/property-research-v2-2'}),accessControl=createAccessControl({verifySession:fixedLocalSession(record.localUser)});
  return createPropertyResearchService({enabled:true,accessControl,client,store,ledgerDirectory:path.join(root,privateRoot,'usage'),operationalEvidence:record.operationalEvidence,authorization:record.authorization,limits:record.limits,clock});
}
