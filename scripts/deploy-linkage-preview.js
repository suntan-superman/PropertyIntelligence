import {spawn} from 'node:child_process';
import {writeJson} from '../src/io/files.js';

// Preview ONLY. Capture CLI output privately; never retain or print raw build logs.
const run=await new Promise(resolve=>{
  const child=spawn(process.platform==='win32'?'cmd.exe':'npx',process.platform==='win32'?['/d','/s','/c','npx netlify deploy --build --json']:['netlify','deploy','--build','--json'],{windowsHide:true});
  let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);child.on('close',code=>resolve({code,output}));child.on('error',()=>resolve({code:1,output:''}));
});
const credentialPattern=/postgres(?:ql)?:\/\/[^\s]+|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|(?:password|api[_-]?key)\s*[=:]\s*["']?[A-Za-z0-9+/=_-]{16}/i;
const provisioning=/createSiteDatabase|provisioning.{0,40}(?:netlify\s+)?database/i.test(run.output);
const leaked=credentialPattern.test(run.output);
const start=run.output.lastIndexOf('\n{');let deploy=null;try{deploy=JSON.parse(run.output.slice(start<0?0:start));}catch{}
const result={at:new Date().toISOString(),status:run.code===0&&deploy?.deploy_id&&!leaked&&!provisioning?'PASS':'STOP',exitCode:run.code,deployId:deploy?.deploy_id??null,previewUrl:deploy?.deploy_url??null,production:false,buildLogCredentialScan:leaked?'STOP':'PASS',netlifyDatabaseProvisioning:provisioning,rawLogsRetained:false};
await writeJson('data/validation/sprint6_1_1-deploy.json',result);console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;
