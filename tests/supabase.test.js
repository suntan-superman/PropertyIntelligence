import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from '../src/io/files.js';
import {createDatabase,safeDatabaseError,sslFor} from '../src/persistence/db.js';

test('pg adapter has a safe missing-config failure and provider-neutral surface',()=>{
  assert.equal(createDatabase({env:{}}),null);
  const pool={query:async()=>({rows:[]}),end:async()=>{}};const db=createDatabase({pool});
  assert.equal(db.provider,'postgresql');assert.equal(db.getPool(),pool);assert.equal(typeof db.withTransaction,'function');assert.equal(typeof db.closePoolForTests,'function');
});

test('pg adapter commits and rolls back through one pooled client',async()=>{
  const calls=[];let fail=false;const client={query:async(sql)=>{calls.push(sql);if(fail&&sql==='SELECT fail')throw new Error('sentinel');return {rows:[]};},release:()=>calls.push('RELEASE')};
  const pool={query:async()=>({rows:[]}),connect:async()=>client,end:async()=>{}};const db=createDatabase({pool});
  await db.withTransaction(async tx=>tx.query('SELECT ok'));assert.deepEqual(calls,['BEGIN','SELECT ok','COMMIT','RELEASE']);
  fail=true;await assert.rejects(()=>db.withTransaction(async tx=>tx.query('SELECT fail')),/sentinel/);assert.deepEqual(calls.slice(-2),['ROLLBACK','RELEASE']);
});

test('database errors are sanitized without exposing connection text',()=>{
  const secret='postgres://user:password@pooler.supabase.com/db';const safe=safeDatabaseError(Object.assign(new Error(secret),{code:'08001'}));assert.deepEqual(safe,{error:'DATABASE_UNAVAILABLE',sqlState:'08001',transportCode:null});assert.doesNotMatch(JSON.stringify(safe),/password|pooler/);
});

test('Supabase pooler TLS uses a verified CA chain and survives sslmode query parameters',async()=>{
  const ssl=sslFor('postgresql://user:password@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=verify-full',{});
  assert.equal(ssl.rejectUnauthorized,true);
  assert.ok(Array.isArray(ssl.ca));
  assert.ok(ssl.ca.some(certificate=>certificate.includes('BEGIN CERTIFICATE')));
  assert.notEqual(ssl.rejectUnauthorized,false);
  const db=createDatabase({connectionString:'postgresql://user:password@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=verify-full'});
  assert.equal(db.pool.options.ssl.rejectUnauthorized,true);
  assert.ok(db.pool.options.ssl.ca.length>1);
  await db.closePoolForTests();
});

test('database runtime uses DATABASE_URL, never the old Netlify provider',async()=>{
  const db=await readFile(resolve('src/persistence/db.js'),'utf8'),runtime=await readFile(resolve('src/workbench/api/runtime.js'),'utf8'),pkg=await readFile(resolve('package.json'),'utf8');
  assert.match(db,/from 'pg'/);assert.match(db,/DATABASE_URL/);assert.doesNotMatch(db,/@netlify\/database|NETLIFY_DB_URL/);assert.match(runtime,/env\.DATABASE_URL/);assert.doesNotMatch(runtime,/NETLIFY_DB_URL/);assert.match(pkg,/"pg"/);
});

test('migration runner refuses destructive SQL and owns an ordered checksum ledger',async()=>{
  const script=await readFile(resolve('scripts/db-migrate.js'),'utf8');assert.match(script,/property_intelligence_schema_migrations/);assert.match(script,/checksum/);assert.match(script,/sort/);assert.match(script,/DESTRUCTIVE_MIGRATION_REJECTED/);assert.doesNotMatch(script,/database reset/);
});
