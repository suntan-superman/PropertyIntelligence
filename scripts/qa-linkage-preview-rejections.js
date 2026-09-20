import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {writeJson} from '../src/io/files.js';
const base=process.argv[2],production=/^https:\/\/worksidepropertyintelligence\.netlify\.app$/.test(base??''),preview=/^https:\/\/[a-f0-9]+--worksidepropertyintelligence\.netlify\.app$/.test(base??'');
if(!production&&!preview)throw new Error('DEPLOYMENT_URL_REQUIRED');
const qa=JSON.parse(await readFile(`data/validation/sprint6_1_1-${production?'production':'preview'}-qa.json`,'utf8'));
try{
  const checks=[];
  for(const [field,code] of [['propertyId','PROPERTY_MISMATCH'],['dealId','DEAL_MISMATCH'],['evidenceSnapshotId','EVIDENCE_MISMATCH'],['analysisSnapshotId','LINK_REQUIRED']]){
    const body={propertyId:qa.propertyId,dealId:qa.dealId,evidenceSnapshotId:qa.evidenceSnapshotId,analysisSnapshotId:qa.analysisIds[0],input:{},sessionId:`cold:${randomUUID()}`,[field]:randomUUID()};
    const response=await fetch(`${base}/api/properties/${body.propertyId}/acquisition-decisions`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();assert.equal(response.status,409);assert.equal(result.error,`DECISION_ANALYSIS_${code}`);checks.push(result.error);
  }
  const history=await(await fetch(`${base}/api/properties/${qa.propertyId}/acquisition-decisions`)).json();assert.equal(history.decisions.filter(d=>d.deal_id===qa.dealId).length,2);
  const result={at:new Date().toISOString(),status:'PASS',mode:production?'production':'preview',url:base,checks,historyCount:2,additionalDecisions:0,providerCalls:0};await writeJson(`data/validation/sprint6_1_1-${production?'production':'preview'}-rejections.json`,result);console.log(JSON.stringify(result));
}catch{console.log(JSON.stringify({status:'STOP',error:'SANITIZED_NEGATIVE_GATE_FAILURE'}));process.exitCode=1;}
