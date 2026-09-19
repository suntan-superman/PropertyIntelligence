import assert from 'node:assert/strict';
import {createRuntime} from '../src/workbench/api/runtime.js';
import {createDatabase} from '../src/persistence/db.js';
import {writeJson} from '../src/io/files.js';
import {resolve} from '../src/io/files.js';

try { process.loadEnvFile(resolve('.env')); } catch { /* Netlify/CI injects DATABASE_URL */ }
const url=process.env.DATABASE_URL;if(!url)throw new Error('DATABASE_URL is required');
const db=createDatabase({connectionString:url,env:{DATABASE_URL:url}});
await db.query('TRUNCATE audit_events,idempotency_keys,diligence_items,analysis_snapshots,deal_claims,deals,comparables,comparable_snapshots,valuations,evidence_snapshots,property_aliases,properties RESTART IDENTITY CASCADE');
const api=createRuntime({runtime:'netlify',env:{DATABASE_URL:url}});
const req=(path,body)=>new Request(`https://pi.example/api/${path}`,body===undefined?{}:{method:'POST',headers:{Origin:'https://pi.example','Content-Type':'application/json','Idempotency-Key':body.requestKey ?? ''},body:JSON.stringify(body)});
const get=async path=>api(new Request(`https://pi.example/api/${path}`));
const post=async(path,body)=>{const res=await api(req(path,body));return {status:res.status,body:await res.json()};};
const fixture=await post('fixture',{id:'fantasia',mode:'property'});assert.equal(fixture.status,200);
const saved=await post('properties',{sessionId:fixture.body.sessionId,requestKey:'api-save-property'});assert.equal(saved.status,200);assert.ok(saved.body.propertyId);
const properties=await (await get('properties')).json();assert.equal(properties.properties.length,1);
const dealFixture=await post('fixture',{id:'fantasia',mode:'deal'});const deal=await post('deals',{sessionId:dealFixture.body.sessionId,propertyId:saved.body.propertyId,evidenceSnapshotId:saved.body.evidenceSnapshotId,name:'API QA Deal',requestKey:'api-save-deal'});assert.equal(deal.status,200);assert.ok(deal.body.analysisSnapshotId);
const opened=await (await get(`deals/${deal.body.dealId}`)).json();assert.equal(opened.deal.id,deal.body.dealId);const history=await (await get(`deals/${deal.body.dealId}/analyses`)).json();assert.equal(history.analyses.length,1);
const replay=await post('deals',{sessionId:dealFixture.body.sessionId,propertyId:saved.body.propertyId,evidenceSnapshotId:saved.body.evidenceSnapshotId,name:'API QA Deal',requestKey:'api-save-deal'});assert.equal(replay.body.dealId,deal.body.dealId);assert.equal(replay.body.idempotentReplay,true);
const invalid=await (await get('properties/not-a-uuid')).json();assert.equal(invalid.error,'INVALID_UUID');
const report={at:new Date().toISOString(),status:'PASS',checks:['POST/GET property persistence','POST/GET deal persistence','analysis history endpoint','API idempotent replay','UUID validation'],propertyId:saved.body.propertyId,dealId:deal.body.dealId};
await writeJson('data/validation/sprint4-persistence-api-qa.json',report);console.log(JSON.stringify(report,null,2));
await db.close?.();
