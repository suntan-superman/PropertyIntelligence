import {createDatabase} from '../src/persistence/db.js';
import {investmentReportModel} from '../src/services/investmentReportService.js';
import {writeJson} from '../src/io/files.js';
try{process.loadEnvFile('.env');}catch{}
const db=createDatabase();
try{
  const rows=(await db.query('SELECT id,analysis_snapshot_id,deal_id,evidence_snapshot_id FROM acquisition_decisions ORDER BY created_at DESC LIMIT 50')).rows;
  const linked=rows.filter(r=>r.analysis_snapshot_id&&r.deal_id);const results=[];
  for(const row of linked.slice(0,3)){try{const model=await investmentReportModel({db,decisionId:row.id});results.push({decisionId:row.id,status:'PASS',comps:model.comparables.all.length,fingerprint:model.reportMeta.reportModelFingerprint});}catch(e){results.push({decisionId:row.id,status:'STOP',error:/^REPORT_[A-Z_]+$/.test(e.message)?e.message:'SANITIZED_FAILURE'});}}
  const report={examined:rows.length,linked:linked.length,missingHistoricalLink:rows.length-linked.length,results,providerCalls:0};await writeJson('data/validation/sprint6_1-durable-links.json',report);console.log(JSON.stringify(report));
}catch{console.log(JSON.stringify({status:'STOP',error:'SANITIZED_DATABASE_FAILURE'}));process.exitCode=1;}finally{await db?.close();}
