import pg from 'pg';
import {parse as parseConnectionString} from 'pg-connection-string';
import {rootCertificates} from 'node:tls';
import {SUPABASE_ROOT_CA_2021} from './supabase-ca.js';

const {Pool}=pg;

export function sslFor(connectionString, env = process.env) {
  if (env.DATABASE_SSL === 'disable') return false;
  try {
    const host=new URL(connectionString).hostname;
    if (/^(localhost|127(?:\.\d+){3}|::1)$/i.test(host)) return false;
    const ssl={rejectUnauthorized:true};
    // Supabase documents verify-full with its project CA for pooler endpoints.
    // Keep Node's public roots as well, while adding only the public Supabase
    // root needed for the pooler's certificate chain.
    if (/\.pooler\.supabase\.com$|\.supabase\.co$/i.test(host)) {
      ssl.ca=[...rootCertificates, env.DATABASE_CA_CERT || SUPABASE_ROOT_CA_2021];
    } else if (env.DATABASE_CA_CERT) ssl.ca=env.DATABASE_CA_CERT;
    return ssl;
  } catch { return {rejectUnauthorized:true}; }
}

/**
 * Server-only database boundary.  All callers pass SQL text and a values array
 * to query(); no repository is allowed to interpolate user input into SQL.
 */
export function createDatabase({connectionString, pool, env=process.env} = {}) {
  let rawPool = pool;
  if (!rawPool) {
    const value = connectionString ?? env.DATABASE_URL;
    if (!value) return null;
    // Parse first so a connection-string sslmode cannot overwrite the verified
    // CA configuration supplied below (pg merges connectionString last).
    const parsed=parseConnectionString(value);
    rawPool = new Pool({...parsed,max:3,connectionTimeoutMillis:5000,idleTimeoutMillis:10000,keepAlive:true,ssl:sslFor(value,env)});
  }
  const query = (text, values = []) => rawPool.query(text, values);
  const withTransaction = async (work) => {
    if (typeof rawPool.connect !== 'function') return work({query});
    const client = await rawPool.connect();
    const tx = {query: (text, values = []) => client.query(text, values)};
    try {
      await client.query('BEGIN');
      const value = await work(tx);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* retain original error */ }
      throw error;
    } finally { client.release?.(); }
  };
  const closePoolForTests = async () => rawPool.end?.();
  return {pool: rawPool, getPool:()=>rawPool, query, withTransaction, transaction:withTransaction,
    closePoolForTests, close:closePoolForTests, provider:'postgresql'};
}

export function requireDatabase(options) {
  const db = createDatabase(options);
  if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
  return db;
}

export function safeDatabaseError(error) {
  const code=error?.code;
  const transportCode=['ECONNREFUSED','ENETUNREACH','ETIMEDOUT','ECONNRESET','ENOTFOUND','SELF_SIGNED_CERT_IN_CHAIN','ERR_TLS_CERT_ALTNAME_INVALID','UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(code)?code:null;
  return {error:'DATABASE_UNAVAILABLE',sqlState:/^[0-9A-Z]{5}$/.test(code??'')?code:null,transportCode};
}

export const isUuid = value => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function idempotent(tx, requestKey, operation, work) {
  if (!requestKey || typeof requestKey !== 'string' || requestKey.length > 180) return work();
  // Serialize retries for the same operation before looking up the key. This
  // avoids two concurrent requests both observing an absent idempotency row.
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${operation}:${requestKey}`]);
  const prior = await tx.query(
    'SELECT response_status, response_payload FROM idempotency_keys WHERE request_key = $1 AND operation = $2 FOR UPDATE',
    [requestKey, operation]);
  if (prior.rows[0]) return {...prior.rows[0].response_payload, idempotentReplay: true};
  const result = await work();
  await tx.query(
    'INSERT INTO idempotency_keys (request_key, operation, response_status, response_payload) VALUES ($1, $2, $3, $4::jsonb)',
    [requestKey, operation, 200, JSON.stringify(result)]);
  return result;
}

export async function audit(tx, {aggregateType, aggregateId = null, eventType, payload = {}, requestKey = null}) {
  await tx.query(
    'INSERT INTO audit_events (aggregate_type, aggregate_id, event_type, event_payload, request_key) VALUES ($1, $2, $3, $4::jsonb, $5)',
    [aggregateType, aggregateId, eventType, JSON.stringify(payload), requestKey]);
}

export function rowJson(row) {
  if (!row) return null;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (typeof value === 'string' && /^[{[]/.test(value)) { try { return [key, JSON.parse(value)]; } catch { /* scalar */ } }
    return [key, value];
  }));
}
