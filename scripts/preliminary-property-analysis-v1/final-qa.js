import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,relative,dirname} from 'node:path';
import {ROOT,readJson,newJson,filesUnder,verifyPreservation} from './guard.js';
import {sha} from '../rentcast-controlled-pilot/core.js';
import {validateResultSeal,assertIdentity,DISABLED} from './core.js';
import {offlineStatus} from '../../src/analysis/offline.js';

const directory=resolve(process.argv[2]??''),rel=relative(resolve(ROOT),directory);
assert(process.argv.length===3&&/^run-[a-zA-Z0-9]+$/.test(rel),'OWNED_RUN_REQUIRED');
const sourceNames=['guard','core','local','view','run','workflow.test','qa','ui-qa','final-qa'];
const sources=sourceNames.map(n=>`scripts/preliminary-property-analysis-v1/${n}.js`);
const docs=['docs/PI_PRELIMINARY_PROPERTY_ANALYSIS_V1.md','docs/PI_PRELIMINARY_PROPERTY_ANALYSIS_V1_QA.md','docs/PI_PRELIMINARY_PROPERTY_ANALYSIS_V1_GAPS.md'];
const checks=[];const check=(name,ok)=>{assert(ok,name);checks.push({name,status:'PASS'});};
const preservation=await verifyPreservation();check('all original protected hashes unchanged',preservation.status==='PASS');
const before=await readJson(`${ROOT}/preservation-before.json`),allowed=new Set([...sources,...docs]);
const current=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).map(p=>p.replaceAll('\\','/'));
check('no unexpected nonignored additions',current.every(p=>Object.hasOwn(before.hashes,p)||allowed.has(p)));
execFileSync('git',['check-ignore','--quiet',`${ROOT}/private.json`],{stdio:'pipe'});check('private root gitignored',true);
check('no private output tracked',!execFileSync('git',['ls-files','--',ROOT],{encoding:'utf8'}).trim());
const mapping=await readJson('data/runtime/rentcast-controlled-pilot/candidate-mapping.json'),privateValues=[];
for(const c of mapping.candidates){const e=await readJson(`data/runtime/rentcast-controlled-pilot/evidence/${c.pilotCode}.json`);privateValues.push(c.candidateId,c.county.atn,c.county.apn9,c.assessor.id,c.countyAddressReview.rawCountySitus,c.requestAddress.street,e.providerRecord.id,e.providerRecord.assessorID,e.providerRecord.addressLine1,e.providerRecord.formattedAddress,e.providerRecord.zipCode);}
const sensitive=[...new Set(privateValues.filter(x=>typeof x==='string'&&x.length>=5))];
function contains(text,value){return /^\d+$/.test(value)?new RegExp(`(^|[^a-zA-Z0-9])${value}(?=$|[^a-zA-Z0-9])`,'i').test(text):text.toLowerCase().includes(value.toLowerCase());}
const publicFiles=[...sources,...docs,`${directory}/real-readiness.html`,...await filesUnder(`${directory}/synthetic`)];
for(const p of publicFiles){const text=await readFile(p,'utf8');check('private value scan: '+p.replace(directory,'RUN'),!sensitive.some(v=>contains(text,v)));}
const identity=await readJson(`${directory}/identity.private.json`),real=await readJson(`${directory}/real-readiness.private.json`),synthetic=await readJson(`${directory}/synthetic/result.json`);
assertIdentity(identity);validateResultSeal(real.readiness);validateResultSeal(synthetic);check('versioned identities/results intact',true);
function forbiddenKey(value){if(!value||typeof value!=='object')return false;return Object.entries(value).some(([k,v])=>/^(?:owner|ownerName|ownerContact|email|phone|phoneNumber|contact)$/i.test(k)||forbiddenKey(v));}
check('no owner or contact fields in new property artifacts',![identity,real,synthetic].some(forbiddenKey));
check('no final authority and no real financial result',JSON.stringify(identity.authorizations)===JSON.stringify(DISABLED)&&JSON.stringify(real.readiness.authorizations)===JSON.stringify(DISABLED)&&JSON.stringify(synthetic.authorizations)===JSON.stringify(DISABLED)&&real.readiness.analysis===null&&real.readiness.realFinancialAnalysisExecuted===false);
for(const p of docs){const text=await readFile(p,'utf8');for(const match of text.matchAll(/\]\(([^)]+)\)/g)){if(/^https?:/.test(match[1]))continue;await access(resolve(dirname(p),match[1]));}}
check('documentation links resolve',true);
check('zero network attempts',offlineStatus().networkAttempts===0);
const hashes={};for(const p of [...sources,...docs])hashes[p]=sha(await readFile(p));
const output=await mkdtemp(`${ROOT}/qa-final-`),result={status:'PASS',directory:rel,at:new Date().toISOString(),checks:checks.length,failures:0,results:checks,sensitiveValuesChecked:sensitive.length,preservation,sourceAndDocumentHashes:hashes,network:offlineStatus(),databaseWrites:0,round1Selections:0};
await newJson(`${output}/result.json`,result);console.log(JSON.stringify({status:result.status,checks:result.checks,failures:0,sensitiveValuesChecked:sensitive.length,preservation,output}));
