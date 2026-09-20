import {spawn} from 'node:child_process';
import {writeJson} from '../src/io/files.js';

const certifiedPreviewDeploy='6ab06aaecf22df927764b7d9';
const result=await new Promise(resolve=>{
  const args=['netlify','deploy','--prod','--build','--json'];
  const child=spawn(process.platform==='win32'?'cmd.exe':'npx',process.platform==='win32'?['/d','/s','/c','npx',...args]:args,{windowsHide:true});
  let output='';
  child.stdout.on('data',chunk=>{output+=chunk.toString();});
  child.stderr.on('data',chunk=>{output+=chunk.toString();});
  child.on('error',()=>resolve({code:1,output:''}));
  child.on('close',code=>resolve({code,output}));
});
const credentialPattern=/postgres(?:ql)?:\/\/[^\s]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:password|api[_-]?key)\s*[=:]\s*["']?[A-Za-z0-9+/=_-]{16}/i;
const provisioning=/createSiteDatabase|provisioning.{0,60}(?:netlify\s+)?database/i.test(result.output);
const credentialScan=credentialPattern.test(result.output)?'STOP':'PASS';
let deploy=null;
for(const line of result.output.split(/\r?\n/).reverse()){
  const trimmed=line.trim();
  if(!trimmed.startsWith('{'))continue;
  try{const parsed=JSON.parse(trimmed);if(parsed.deploy_id||parsed.url||parsed.deploy_url){deploy=parsed;break;}}catch{/* sanitize and continue */}
}
if(!deploy){
  const id=result.output.match(/"deploy_id"\s*:\s*"([a-f0-9]+)"/i)?.[1];
  const url=result.output.match(/"(?:deploy_url|url)"\s*:\s*"(https:\/\/[^"\s]+)"/i)?.[1];
  if(id)deploy={deploy_id:id,deploy_url:url};
}
const report={at:new Date().toISOString(),status:result.code===0&&deploy?.deploy_id&&!provisioning&&credentialScan==='PASS'?'PASS':'STOP',site:'worksidepropertyintelligence',production:true,certifiedPreviewDeploy,productionDeployId:deploy?.deploy_id??null,productionUrl:deploy?.url??deploy?.deploy_url??'https://worksidepropertyintelligence.netlify.app',exitCode:result.code,buildLogCredentialScan:credentialScan,netlifyDatabaseProvisioning:provisioning,rawCliOutputRetained:false,migrationsRun:0};
await writeJson('data/validation/sprint6_1_1-production-deploy.json',report);
console.log(JSON.stringify(report));
if(report.status!=='PASS')process.exitCode=1;
