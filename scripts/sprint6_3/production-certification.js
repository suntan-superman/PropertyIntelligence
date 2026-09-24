import assert from 'node:assert/strict';
import {digest} from './certification.js';
export const enrichmentTables=['opportunity_assessor_enrichments','opportunity_assessor_import_batches'];
export const migration004='004_kern_assessor_opportunity_enrichment.sql';
export async function existingFingerprint(query,names){
  const metadata=[],data=[];
  for(const name of [...names].sort()){
    assert.match(name,/^[a-z_][a-z0-9_]*$/);
    const relation=(await query(`SELECT c.oid,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text,c.relowner FROM pg_class c WHERE c.oid=$1::regclass`,[`public.${name}`])).rows[0];
    const columns=(await query(`SELECT a.attname,a.atttypid,a.atttypmod,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) AS default_expression FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=$1 AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`,[relation.oid])).rows;
    const constraints=(await query('SELECT conname,contype,convalidated,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid=$1 ORDER BY conname',[relation.oid])).rows;
    const indexes=(await query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=$1 ORDER BY indexname",[name])).rows;
    const triggers=(await query('SELECT tgname,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid=$1 AND NOT tgisinternal ORDER BY tgname',[relation.oid])).rows;
    const policies=(await query("SELECT * FROM pg_policies WHERE schemaname='public' AND tablename=$1 ORDER BY policyname",[name])).rows;
    metadata.push({relation,columns,constraints,indexes,triggers,policies});
    // The sole authorized durable data addition is the 004 migration ledger row.
    const where=name==='property_intelligence_schema_migrations'?` WHERE filename<>'${migration004}'`:'';
    const fingerprint=(await query(`SELECT count(*)::int AS rows,md5(COALESCE(string_agg(h,'' ORDER BY h),'')) AS fingerprint FROM (SELECT md5(row_to_json(t)::text) AS h FROM public."${name}" t${where}) safe`)).rows[0];data.push({table:name,...fingerprint});
  }
  return {metadataSha256:digest(JSON.stringify(metadata)),dataSha256:digest(JSON.stringify(data)),tableCount:names.length,rows:data.reduce((n,r)=>n+r.rows,0)};
}
export async function certifyProductionSchema(query,sql,certificate){
  const tables=(await query("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY tablename",[enrichmentTables])).rows;
  assert.deepEqual(tables.map(t=>t.tablename),enrichmentTables);assert.ok(tables.every(t=>t.rowsecurity));
  const columns=(await query("SELECT table_name,column_name,data_type,numeric_precision,numeric_scale,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position",[enrichmentTables])).rows;
  for(const name of enrichmentTables){const body=sql.split(`CREATE TABLE ${name} (`)[1].split('\n);')[0],expected=[...body.matchAll(/^  ([a-z_][a-z0-9_]*) (?:uuid|text|date|integer|jsonb|timestamptz|numeric)\b/gm)].map(m=>m[1]);assert.deepEqual(columns.filter(c=>c.table_name===name).map(c=>c.column_name),expected);}
  assert.ok(columns.filter(c=>['land_assessment','improvement_assessment','net_assessment','base_year_value'].includes(c.column_name)).every(c=>c.data_type==='numeric'&&c.numeric_precision===19&&c.numeric_scale===5));
  const indexes=(await query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY indexname",[enrichmentTables])).rows;
  assert.deepEqual(indexes.map(i=>i.indexname),certificate.schema.newIndexes);
  assert.equal(indexes.length,10);assert.ok(indexes.some(i=>i.indexname==='opportunity_assessor_current_candidate_idx'&&/UNIQUE/.test(i.indexdef)&&/superseded_at IS NULL/.test(i.indexdef)));
  assert.ok(indexes.some(i=>i.indexname==='opportunity_assessor_apn9_idx'&&!/UNIQUE/.test(i.indexdef)));
  const constraints=(await query(`SELECT c.conname,c.contype,c.convalidated,c.confdeltype,n.nspname AS target_schema,t.relname AS target_table,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class own ON own.oid=c.conrelid LEFT JOIN pg_class t ON t.oid=c.confrelid LEFT JOIN pg_namespace n ON n.oid=t.relnamespace WHERE own.relnamespace='public'::regnamespace AND own.relname=ANY($1::text[]) ORDER BY c.conname`,[enrichmentTables])).rows;
  const counts={};for(const c of constraints){assert.equal(c.convalidated,true);counts[c.contype]=(counts[c.contype]??0)+1;}
  assert.deepEqual(counts,{c:(sql.match(/\bCHECK\s*\(/g)??[]).length,f:3,p:2,u:2});
  const fks=constraints.filter(c=>c.contype==='f');assert.ok(fks.every(c=>c.target_schema==='public'&&c.confdeltype==='r'));assert.deepEqual(fks.map(c=>c.target_table).sort(),['discovery_sources','opportunity_assessor_import_batches','opportunity_candidates'].sort());
  const triggers=(await query(`SELECT t.tgname,t.tgenabled,p.proname,n.nspname AS function_schema,pg_get_triggerdef(t.oid) AS definition,p.prosrc FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE c.relnamespace='public'::regnamespace AND c.relname=ANY($1::text[]) AND NOT t.tgisinternal ORDER BY t.tgname`,[enrichmentTables])).rows;
  assert.equal(triggers.length,2);for(const t of triggers){assert.equal(t.function_schema,'public');assert.equal(t.tgenabled,'O');assert.match(t.definition,/BEFORE INSERT OR DELETE OR UPDATE|BEFORE INSERT OR UPDATE OR DELETE/);const functionBody=sql.split(`CREATE FUNCTION ${t.proname}() RETURNS trigger LANGUAGE plpgsql AS $$`)[1]?.split('$$;')[0];assert.equal(t.prosrc,functionBody);}
  const grants=(await query(`SELECT c.relname,a.privilege_type FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE c.relnamespace='public'::regnamespace AND c.relname=ANY($1::text[]) AND (a.grantee=0 OR r.rolname IN ('anon','authenticated'))`,[enrichmentTables])).rows;assert.equal(grants.length,0);
  const policies=(await query("SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename=ANY($1::text[])",[enrichmentTables])).rows;assert.equal(policies.length,0);
  const empty=(await query('SELECT (SELECT count(*)::int FROM public.opportunity_assessor_import_batches) AS batches,(SELECT count(*)::int FROM public.opportunity_assessor_enrichments) AS observations')).rows[0];assert.deepEqual(empty,{batches:0,observations:0});
  return {tables,columns,indexes,constraintCounts:counts,constraints,triggers:triggers.map(({prosrc,...t})=>t),triggerBodiesMatchCertifiedSql:true,publicApiGrants:0,policies:0,rowCounts:empty};
}
