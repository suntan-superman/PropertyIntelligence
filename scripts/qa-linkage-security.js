import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {writeJson} from '../src/io/files.js';
try{process.loadEnvFile('.env');}catch{}
const production=/^https:\/\/worksidepropertyintelligence\.netlify\.app$/.test(process.argv[2]??''),base=process.argv[2]??JSON.parse(await readFile('data/validation/sprint6_1_1-deploy.json','utf8')).previewUrl;
if(!production&&!/^https:\/\/[a-f0-9]+--worksidepropertyintelligence\.netlify\.app$/.test(base??''))throw new Error('DEPLOYMENT_URL_REQUIRED');
// Secret material is handled in memory by this scanner only. Never emit matches.
const secrets=[process.env.DATABASE_URL,process.env.RENTCAST_API_KEY,process.env.MARKET_DATA_API_KEY].filter(Boolean);
try{const password=decodeURIComponent(new URL(process.env.DATABASE_URL).password);if(password)secrets.push(password);}catch{}
const variants=[...new Set(secrets.flatMap(s=>[s,encodeURIComponent(s),Buffer.from(s).toString('base64'),JSON.stringify(s).slice(1,-1)]))];
const scan=body=>{for(const value of variants)assert.ok(!body.includes(value),'SECRET_SCAN_STOP');assert.doesNotMatch(body,/postgres(?:ql)?:\/\/[^\s'"<>]+:[^\s'"<>]+@|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i);};
const hash=body=>createHash('sha256').update(body).digest('hex');
try{
  let browserAssets=0,localFiles=0;
  const html=await(await fetch(base)).text();scan(html);
  for(const match of html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css))"/g)){scan(await(await fetch(new URL(match[1],base))).text());browserAssets++;}
  async function walk(path){for(const e of await readdir(path,{withFileTypes:true})){const f=`${path}/${e.name}`;if(e.isDirectory())await walk(f);else if(/\.(js|jsx|json|md|html|css|sql|toml)$/.test(f)){scan(await readFile(f,'utf8'));localFiles++;}}}
  await walk('apps/web/dist');await walk('src');await walk('netlify/functions');
  for(const f of ['docs/SPRINT6_1_1_HISTORICAL_LINK_AUDIT.md',...((await readdir('data/validation')).filter(f=>/^sprint6_1_1-.*\.json$/.test(f)).map(f=>`data/validation/${f}`))])scan(await readFile(f,'utf8'));
  try{scan(await readFile('docs/SPRINT6_1_1_COMPLETION_REPORT.md','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const zip=await readFile('.netlify/functions/api.zip');let end=-1;for(let i=zip.length-22;i>=Math.max(0,zip.length-65557);i--)if(zip.readUInt32LE(i)===0x06054b50){end=i;break;}assert.ok(end>=0);
  let at=zip.readUInt32LE(end+16),entries=zip.readUInt16LE(end+10);
  for(let i=0;i<entries;i++){assert.equal(zip.readUInt32LE(at),0x02014b50);const method=zip.readUInt16LE(at+10),size=zip.readUInt32LE(at+20),n=zip.readUInt16LE(at+28),extra=zip.readUInt16LE(at+30),comment=zip.readUInt16LE(at+32),local=zip.readUInt32LE(at+42),name=zip.subarray(at+46,at+46+n).toString();assert.doesNotMatch(name,/(^|\/)\.env|data\/(raw|reports)/);const offset=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28),packed=zip.subarray(offset,offset+size);assert.ok([0,8].includes(method));scan((method===8?inflateRawSync(packed,{maxOutputLength:20000000}):packed).toString());at+=46+n+extra+comment;}
  const baseline=JSON.parse(await readFile('data/validation/sprint6_1-protected.json','utf8'));for(const f of baseline.files)assert.equal(hash(await readFile(f.file)),f.sha256);
  const logs=await new Promise(resolve=>{const args=['netlify','logs','--source','functions','--function','api','--since','30m','--url',base,'--json'];const child=spawn(process.platform==='win32'?'cmd.exe':'npx',process.platform==='win32'?['/d','/s','/c',`npx ${args.join(' ')}`]:args,{windowsHide:true});let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.on('close',code=>resolve({code,output}));child.on('error',()=>resolve({code:1,output:''}));});
  scan(logs.output);assert.equal(logs.code,0,'LOG_ACCESS_STOP');assert.doesNotMatch(logs.output,/https:\/\/api\.rentcast\.(?:io|com)\/v1/i);
  const result={at:new Date().toISOString(),status:'PASS',mode:production?'production':'preview',previewUrl:base,browserAssets,localFiles,functionZipBytes:zip.length,functionZipEntries:entries,functionZipHash:hash(zip),credentialVariantsChecked:true,databaseUriAndPasswordCheckedInMemory:true,providerCredentialsChecked:true,privateKeysScan:'PASS',protectedFiles:baseline.files.length,protectedHashes:'UNCHANGED',functionLogExitCode:logs.code,functionLogLines:logs.output.split('\n').filter(Boolean).length,functionLogsScan:'PASS_AVAILABLE_LOGS',rawLogsRetained:false,providerCalls:0};await writeJson(`data/validation/sprint6_1_1-${production?'production':'preview'}-security.json`,result);console.log(JSON.stringify(result));
}catch{console.log(JSON.stringify({status:'STOP',error:'SANITIZED_SECURITY_QA_FAILURE'}));process.exitCode=1;}
