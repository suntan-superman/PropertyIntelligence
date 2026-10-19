import {readFile,readdir,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {configuration} from '../../src/sources/rentcast/config.js';
import {check,sha} from './core.js';
import {fileHash} from '../sprint6_2/io.js';

export async function localCredential(){
  // Do not call loadLocalEnvironment: it also loads unrelated database secrets.
  const selected={};
  const lines=createInterface({input:createReadStream('.env'),crlfDelay:Infinity});
  for await(const line of lines){const match=line.match(/^\s*(?:export\s+)?(RENTCAST_API_KEY|MARKET_DATA_API_KEY|RENTCAST_BASE_URL)\s*=\s*(.*?)\s*$/);if(!match)continue;let v=match[2];if(/^(['"]).*\1$/.test(v))v=v.slice(1,-1);else v=v.replace(/\s+#.*$/,'');selected[match[1]]=v;}
  const config=configuration(selected);check(config.apiKey.length>=12,'CREDENTIAL_FORMAT_STOP');return {...config,maxRetries:0,maxCalls:3};
}
export async function exposureAudit(apiKey){
  execFileSync('git',['check-ignore','--quiet','.env'],{stdio:'pipe'});
  const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  check(!tracked.some(p=>/(^|\/)\.env(?:$|\.)/.test(p)&&!p.endsWith('.example')),'TRACKED_CREDENTIAL_FILE_STOP');
  const paths=new Set(tracked);
  async function walk(p){try{for(const e of await readdir(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isDirectory())await walk(f);else if(e.isFile())paths.add(f);}}catch(e){if(e.code!=='ENOENT')throw e;}}
  for(const p of ['apps/web/src','apps/web/dist','src','scripts','docs','netlify/functions'])await walk(p);
  let files=0;const variants=[apiKey,encodeURIComponent(apiKey),Buffer.from(apiKey).toString('base64')].map(x=>Buffer.from(x));
  for(const p of paths){try{const b=await readFile(p);files++;check(!variants.some(v=>b.includes(v)),'ACTUAL_CREDENTIAL_EXPOSURE_STOP');}catch(e){if(e.code!=='ENOENT')throw e;}}
  return {credentialAvailable:true,source:'LOCAL_ENV_ALLOWLIST_ONLY',databaseEnvironmentLoaded:false,filesScanned:files,actualCredentialExposures:0,keyPrinted:false,keyRotated:false,dashboardRestriction:'USER_REPORTED_UNRESTRICTED'};
}
export async function protect(){const hashes={};async function walk(p){for(const e of await readdir(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isDirectory())await walk(f);else if(e.isFile())hashes[f.replaceAll('\\','/')]=await fileHash(f);}}
  for(const d of ['src','config','netlify','apps/web/src','scripts/durable-identity-pilot','scripts/identity-resolution-pilot','scripts/mls-validation-round1','data/runtime/identity-resolution-pilot','data/runtime/identity-persistence-test','data/runtime/durable-identity-pilot','data/runtime/mls-round1','data/validation/investor-report-v1','data/validation/monte-carlo-v1'])await walk(d);
  for(const p of ['.gitignore','package.json','package-lock.json','netlify.toml','data/runtime/sprint6_2-kern-assessor/repository-baseline.json','data/runtime/sprint6_3/baseline.json'])hashes[p]=await fileHash(p);
  return hashes;
}
export async function verifyProtection(hashes){for(const [p,h] of Object.entries(hashes))check(await fileHash(p)===h,'PROTECTED_FILE_CHANGED');return {status:'PASS',paths:Object.keys(hashes).length,changed:0};}
export const readJson=async p=>JSON.parse(await readFile(p,'utf8'));
