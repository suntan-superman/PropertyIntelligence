import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {GoogleAuth} from 'google-auth-library';

const root=path.resolve(import.meta.dirname,'..');
process.chdir(root);
try{process.loadEnvFile(path.join(root,'.env'));}catch(error){if(error.code!=='ENOENT')throw error;}

const endpoint=String(process.argv[2]??'').replace(/\/$/,'');
const expectedVersion=process.argv[3]??'1.4.6';
const audience=String(process.argv[4]??process.env.PI_MALWARE_SCANNER_AUDIENCE??'').replace(/\/$/,'');
const outputLabel=String(process.argv[5]??'candidate-verification');
assert.match(endpoint,/^https:\/\/[a-z0-9-]+\.a\.run\.app$/);
assert.match(audience,/^https:\/\/[a-z0-9-]+\.a\.run\.app$/);
assert.match(outputLabel,/^[a-z0-9-]+$/);

const auth=new GoogleAuth(),client=await auth.getIdTokenClient(audience),identityHeaders=await client.getRequestHeaders(),authorization=typeof identityHeaders.get==='function'?identityHeaders.get('authorization'):identityHeaders.authorization??identityHeaders.Authorization;
assert.match(String(authorization),/^Bearer\s+\S+/);
const request=async(url,options={})=>fetch(url,{...options,signal:AbortSignal.timeout(65_000)});
const authenticated=async(pathname,options={})=>request(`${endpoint}${pathname}`,{...options,headers:{Authorization:authorization,...options.headers}});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

const unauthenticated=await request(`${endpoint}/v1/health`,{method:'POST'});
assert.ok([401,403].includes(unauthenticated.status));

const healthResponse=await authenticated('/v1/health',{method:'POST'});assert.equal(healthResponse.status,200);const health=await healthResponse.json();
assert.equal(health.status,'ready');assert.equal(health.engine,'ClamAV');assert.equal(health.engineVersion,expectedVersion);
const signatureAgeMs=Date.now()-Date.parse(health.signatureUpdatedAt);assert.ok(Number.isFinite(signatureAgeMs)&&signatureAgeMs>=0&&signatureAgeMs<=24*60*60*1000);

async function scan(bytes,declaredSha=sha(bytes)){
  const response=await authenticated('/v1/scan',{method:'POST',headers:{'Content-Type':'application/octet-stream','Content-Length':String(bytes.length),'X-PI-Scanner-Protocol':'1','X-PI-Content-SHA256':declaredSha,'X-PI-Filename':Buffer.from('security-maintenance-test.bin').toString('base64url')},body:bytes}),body=await response.json();return {response,body};
}

const harmless=Buffer.from('Property Intelligence ClamAV 1.4.6 harmless synthetic maintenance check.','utf8'),clean=await scan(harmless);
assert.equal(clean.response.status,200);assert.equal(clean.body.result,'CLEAN');assert.equal(clean.body.clean,true);assert.equal(clean.body.sha256,sha(harmless));assert.equal(clean.body.engineVersion,expectedVersion);

const eicar=Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*','ascii'),infected=await scan(eicar);
assert.equal(infected.response.status,200);assert.equal(infected.body.result,'INFECTED');assert.equal(infected.body.clean,false);assert.equal(infected.body.sha256,sha(eicar));assert.equal(infected.body.engineVersion,expectedVersion);

const rejected=await scan(harmless,'0'.repeat(64));
assert.equal(rejected.response.status,422);assert.equal(rejected.body.error,'SCANNER_HASH_MISMATCH');assert.notEqual(rejected.body.result,'CLEAN');assert.notEqual(rejected.body.clean,true);

const result={status:'PASS',verifiedAt:new Date().toISOString(),endpoint,engine:health.engine,engineVersion:health.engineVersion,signatureVersion:health.signatureVersion,signatureUpdatedAt:health.signatureUpdatedAt,signatureAgeHours:Number((signatureAgeMs/3600000).toFixed(3)),unauthenticatedStatus:unauthenticated.status,clean:{status:clean.response.status,result:clean.body.result,sha256:clean.body.sha256},eicar:{status:infected.response.status,result:infected.body.result,sha256:infected.body.sha256},failure:{status:rejected.response.status,error:rejected.body.error,producedClean:false}};
const output=path.join(root,'data','validation','pi-v2-5-clamav-upgrade',`${outputLabel}.json`);await mkdir(path.dirname(output),{recursive:true});await writeFile(output,`${JSON.stringify(result,null,2)}\n`);console.log(`PI_V2_5_CLAMAV_VERIFY=${JSON.stringify({...result,endpoint:undefined,output})}`);
