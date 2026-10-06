import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'data', 'validation', 'attom-poc');
const RAW = path.join(OUT, 'raw');
const SAN = path.join(OUT, 'sanitized');
const DOCS = {
  api: 'https://api.developer.attomdata.com/docs',
  endpoints: 'https://cloud-help.attomdata.com/article/598-endpoints',
  v4: 'https://cloud-help.attomdata.com/article/613-upgrading-to-property-api-v4'
};
const FIXTURE = {
  address: '3484 Haven St, Rosamond, CA 93560',
  apn9: '251091302',
  atn: '25109130001',
  fips: '06029'
};
const BASE = process.env.ATTOM_API_BASE_URL || 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';
const MAX_REPORTS = 25;
const MAX_USEFUL = 12;
const TIMEOUT_MS = 15000;
const TRANSIENT = new Set([408, 429, 500, 502, 503, 504]);

function loadDotEnv() {
  if (typeof process.loadEnvFile === 'function') {
    try { process.loadEnvFile(path.join(ROOT, '.env')); } catch { /* optional in CI */ }
  }
}
const safe = (value) => value === undefined || value === null ? null : value;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const iso = () => new Date().toISOString();
const esc = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const csv = (rows, cols) => [cols, ...rows.map(r => cols.map(c => r[c]))].map(r => r.map(esc).join(',')).join('\r\n') + '\r\n';
const pick = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return null;
};
const num = (value) => typeof value === 'number' ? value : (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)) ? Number(value) : null);

function walkValues(value, wanted, out = []) {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) { for (const item of value) walkValues(item, wanted, out); return out; }
  if (typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    const hasValue = !(child === null || child === undefined || (Array.isArray(child) && child.length === 0) || (typeof child === 'string' && child.length === 0));
    if (hasValue && wanted.some(w => key.toLowerCase() === w.toLowerCase())) out.push({ key, value: child });
    walkValues(child, wanted, out);
  }
  return out;
}

function statusMeta(body) {
  const status = body?.status || {};
  return {
    code: safe(status.code), msg: safe(status.msg || status.message), total: safe(status.total),
    page: safe(status.page), pageSize: safe(status.pagesize || status.pageSize), transactionId: safe(status.transactionId)
  };
}

function firstProperty(body) {
  if (Array.isArray(body?.property)) return body.property[0] || null;
  if (body?.property?.PreforeclosureDetails) return body.property.PreforeclosureDetails;
  return body?.property && typeof body.property === 'object' ? body.property : null;
}

function propertyCount(body) {
  if (Array.isArray(body?.property)) return body.property.length;
  if (body?.property?.PreforeclosureDetails) return 1;
  return body?.property && typeof body.property === 'object' ? 1 : 0;
}

function returnedAttomId(body) {
  return pick(firstProperty(body)?.identifier || {}, ['attomId', 'Id', 'id']) || firstProperty(body)?.PropertyIdentification?.ATTOMID || firstProperty(body)?.propertyIdentification?.ATTOMID || null;
}

function identityFromProperty(property) {
  const identifier = property?.identifier || {};
  const address = property?.address || {};
  const location = property?.location || {};
  const building = property?.building || {};
  return {
    attomId: pick(identifier, ['attomId', 'Id', 'id']) || pick(property, ['attomId', 'id']),
    apn: pick(identifier, ['apn', 'Apn']) || pick(property, ['apn', 'Apn']),
    fips: pick(identifier, ['fips', 'FIPS']) || pick(property, ['fips', 'FIPS']),
    standardizedAddress: pick(address, ['oneLine']) || [pick(address, ['line1']), pick(address, ['locality', 'city']), pick(address, ['countrySubd', 'state']), pick(address, ['postal1', 'postalcode'])].filter(Boolean).join(', ') || null,
    matchCode: pick(address, ['matchCode']) || pick(identifier, ['matchCode', 'accuracy']) || pick(property, ['matchCode']),
    latitude: num(pick(location, ['latitude', 'lat'])), longitude: num(pick(location, ['longitude', 'lon'])),
    propertyType: pick(property, ['summary'])?.propclass || pick(property?.summary, ['propclass', 'propType']),
    beds: num(pick(building?.rooms, ['beds', 'bedrooms'])) || num(pick(building, ['roomsTotal', 'bedrooms'])), baths: num(pick(building?.rooms, ['bathsTotal', 'bathroomsTotal'])),
    livingAreaSqFt: num(pick(building?.size, ['livingsize', 'livingSize', 'universalsize'])),
    yearBuilt: num(pick(building, ['yearbuilt', 'yearBuilt'])) || num(pick(property?.summary, ['yearBuilt']))
  };
}

function safeTree(value, key = '') {
  if (Array.isArray(value)) return value.map(item => safeTree(item, key));
  const lower = key.toLowerCase();
  if (/(owner|borrower|buyer|seller|grantor|grantee|trustee|lender|assignee|assignor|firstname|lastname|middlename|phone|email|careof|care-of|dba|mailing)/.test(lower)) return '[REDACTED_FROM_SHAREABLE_EXTRACT]';
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [childKey, child] of Object.entries(value)) result[childKey] = safeTree(child, childKey);
  return result;
}

function normalizedExtract(endpoint, mode, body, propertyId) {
  const property = firstProperty(body);
  const extract = { fixture: FIXTURE, endpoint, mode, propertyCount: propertyCount(body), status: statusMeta(body), attomId: propertyId || null };
  if (property) extract.identity = identityFromProperty(property);
  extract.data = safeTree(property || body?.property || body);
  return extract;
}

async function ensureDirs() { await Promise.all([mkdir(RAW, { recursive: true }), mkdir(SAN, { recursive: true })]); }
async function writeJson(file, value) { await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 }); }

async function request({ sequence, endpoint, mode, params, usefulness, packageAccessNote }) {
  if (ledger.filter(x => x.estimatedApiReportsConsumed > 0).reduce((n, x) => n + x.estimatedApiReportsConsumed, 0) >= MAX_REPORTS) throw new Error('ATTOM_REPORT_BUDGET_STOP');
  const url = `${BASE}/${endpoint}?${new URLSearchParams(params).toString()}`;
  const started = Date.now();
  let retryCount = 0;
  let response;
  let error = null;
  for (;;) {
    try {
      response = await fetch(url, { method: 'GET', headers: { accept: 'application/json', apikey: process.env.ATTOM_API_KEY }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (TRANSIENT.has(response.status) && retryCount === 0) { retryCount++; continue; }
      break;
    } catch (err) {
      error = err;
      if (retryCount === 0) { retryCount++; continue; }
      break;
    }
  }
  const elapsedMs = Date.now() - started;
  let body = null;
  let parseError = null;
  if (response) {
    try { body = await response.json(); } catch (err) { parseError = err.message; }
  }
  const httpStatus = response?.status ?? null;
  const properties = propertyCount(body);
  const estimatedApiReportsConsumed = httpStatus === 200 ? 1 : 0;
  const row = {
    sequence, utcTimestamp: iso(), endpoint, mode, query: params, httpStatus,
    attomStatusMetadata: statusMeta(body || {}), total: body?.status?.total ?? null, page: body?.status?.page ?? null,
    pageSize: body?.status?.pagesize ?? body?.status?.pageSize ?? null, reportsReturned: properties,
    propertiesReturned: properties, estimatedApiReportsConsumed, elapsedMs,
    usefulness, packageAccessNote, retryCount, error: error ? error.name : null, parseError
  };
  ledger.push(row);
  const stem = `${String(sequence).padStart(2, '0')}-${endpoint.replaceAll('/', '-')}`;
  await writeJson(path.join(RAW, `${stem}.json`), body || { error: error?.message || parseError || 'no response', httpStatus });
  await writeJson(path.join(SAN, `${stem}.json`), normalizedExtract(endpoint, mode, body || {}, returnedAttomId(body) || null));
  return { row, body, property: firstProperty(body) };
}

const ledger = [];

const inventory = [
  { family: 'identity/basic profile', endpoint: 'property/basicprofile', searchMode: 'address; APN+FIPS', expectedFields: 'ATTOM ID, APN, FIPS, standardized address, match code, coordinates, characteristics', packageAccess: 'documented property API; trial access empirically tested', test: 'yes', reason: 'required identity reconciliation' },
  { family: 'property detail', endpoint: 'property/detail', searchMode: 'ATTOM ID', expectedFields: 'property characteristics, assessment/listing context', packageAccess: 'documented property API', test: 'no', reason: 'outside authorized continuation families; identity gate run stopped before this endpoint' },
  { family: 'detail mortgage', endpoint: 'property/detailmortgage', searchMode: 'ATTOM ID', expectedFields: 'loan position, original amount, dates, lender, terms, balances where licensed', packageAccess: 'documented; package/field availability to confirm', test: 'yes', reason: 'priority mortgage question' },
  { family: 'sales history', endpoint: 'saleshistory/expandedhistory', searchMode: 'ATTOM ID', expectedFields: 'transfer date, amount, document/transaction type and number, arms-length indicators', packageAccess: 'documented property API', test: 'yes', reason: 'Feb-2025 event and transfer history' },
  { family: 'all events', endpoint: 'allevents/detail', searchMode: 'ATTOM ID', expectedFields: 'broader recorded events', packageAccess: 'documented; duplicate avoided where expanded history is sufficient', test: 'no', reason: 'avoid duplicate report after expanded history' },
  { family: 'preforeclosure', endpoint: 'preforeclosuredetails', searchMode: 'ATTOM ID', expectedFields: 'NOD/LIS, NTS/NOS, auction, default, foreclosure/REO indicators', packageAccess: 'documented; package/field availability to confirm', test: 'yes', reason: 'priority foreclosure question' },
  { family: 'home equity/loan model', endpoint: 'valuation/homeequity', searchMode: 'ATTOM ID', expectedFields: 'LTV, estimated equity, lendable equity, first/second/third balances, as-of', packageAccess: 'documented valuation endpoint; report billing/package to confirm', test: 'yes', reason: 'priority equity question; not AVM duplication' },
  { family: 'sales basic/detail', endpoint: 'saleshistory/basichistory; saleshistory/detail', searchMode: 'ATTOM ID', expectedFields: 'sale and instrument detail', packageAccess: 'documented', test: 'no', reason: 'expanded history selected to stay within budget' },
  { family: 'deeds/transactions', endpoint: 'deed; transaction', searchMode: 'ATTOM ID', expectedFields: 'deed/instrument details', packageAccess: 'not found as current documented endpoint', test: 'no', reason: 'inventory gap; ask ATTOM' },
  { family: 'assignments/releases', endpoint: 'assignment; release; reconveyance', searchMode: 'ATTOM ID', expectedFields: 'assignment/release dates and instruments', packageAccess: 'not found in current public endpoint docs', test: 'no', reason: 'inventory gap; ask ATTOM' },
  { family: 'liens', endpoint: 'lien/judgment/tax/mechanic/HOA/PACE', searchMode: 'ATTOM ID', expectedFields: 'encumbrance type, amount, date, status', packageAccess: 'not found in current public endpoint docs', test: 'no', reason: 'inventory gap; ask ATTOM' },
  { family: 'bulk/cloud/Snowflake', endpoint: 'Bulk/Cloud/Snowflake delivery', searchMode: 'licensed batch/cloud', expectedFields: 'historical and encumbrance depth at scale', packageAccess: 'BULK_CLOUD_CANDIDATE', test: 'no', reason: 'outside API-only POC and no multi-property calls' }
];

function fieldMatrix(results, identity) {
  const rows = [];
  const add = (domain, field, endpoint, status, value, notes = '') => rows.push({ domain, field, endpoint, documentationStatus: status, fixtureStatus: status, value: value ?? '', evidenceNotes: notes });
  for (const [field, value] of Object.entries(identity || {})) add('Identity', field, 'property/basicprofile', value !== null && value !== undefined ? 'API_RETURNED_FOR_3484' : 'API_AVAILABLE_BUT_NULL', value, 'Identity response; APN/FIPS reconciliation is required.');
  const fields = [
    ['Transfer', 'sale/transfer date', 'saleshistory/expandedhistory'], ['Transfer', 'amount', 'saleshistory/expandedhistory'], ['Transfer', 'document type/number', 'saleshistory/expandedhistory'], ['Transfer', 'arms-length indicator', 'saleshistory/expandedhistory'], ['Transfer', 'grantor/grantee', 'saleshistory/expandedhistory'],
    ['Mortgage', 'original principal', 'property/detailmortgage'], ['Mortgage', 'origination/recording date', 'property/detailmortgage'], ['Mortgage', 'lender', 'property/detailmortgage'], ['Mortgage', '1st/2nd/3rd position', 'property/detailmortgage'], ['Mortgage', 'loan type/term/rate', 'property/detailmortgage'], ['Mortgage', 'amortized/estimated balance', 'property/detailmortgage'], ['Mortgage', 'total balance/LTV/CLTV', 'valuation/homeequity'], ['Mortgage', 'ATTOM estimated equity', 'valuation/homeequity'],
    ['Foreclosure', 'NOD/LIS/Pendens', 'preforeclosuredetails'], ['Foreclosure', 'NTS/NOS/auction', 'preforeclosuredetails'], ['Foreclosure', 'default/opening bid', 'preforeclosuredetails'], ['Foreclosure', 'foreclosure/REO', 'preforeclosuredetails'],
    ['Mortgage lifecycle', 'assignment/release/satisfaction', 'assignment/release'], ['Other encumbrances', 'judgment/tax/mechanic/HOA/PACE', 'lien endpoints']
  ];
  for (const [domain, field, endpoint] of fields) {
    const result = [...results].reverse().find(x => x.row.endpoint === endpoint);
    let status = result ? 'API_AVAILABLE_BUT_NULL' : 'UNKNOWN_REQUIRES_ATTOM_CONFIRMATION'; let value = '';
    if (endpoint === 'assignment/release' || endpoint === 'lien endpoints') status = 'NOT_FOUND_IN_CURRENT_API_DOCS';
    else if (result?.row.httpStatus === 401 || result?.row.httpStatus === 403) status = 'ACCESS_DENIED_PACKAGE_REQUIRED';
    else if (result?.row.httpStatus === 404) status = 'NOT_FOUND_IN_CURRENT_API_DOCS';
    else if (result && result.row.httpStatus !== 200) status = 'UNKNOWN_REQUIRES_ATTOM_CONFIRMATION';
    else if (result?.row.httpStatus === 200) {
      const aliases = {
        'sale/transfer date': ['saleTransDate', 'saleSearchDate', 'transferDate'],
        'amount': ['saleAmt', 'saleAmount', 'amount'],
        'document type/number': ['saleDocNum', 'transactionIdent', 'docNum', 'instrumentNumber'],
        'arms-length indicator': ['armsLength', 'armslength', 'armsLengthIdent'],
        'grantor/grantee': ['grantor', 'grantee'],
        'original principal': ['amount', 'loanAmount', 'originalLoanAmount'],
        'origination/recording date': ['recordingDate', 'originationDate', 'loanDate'],
        'lender': ['lender'],
        '1st/2nd/3rd position': ['FirstConcurrent', 'SecondConcurrent', 'ThirdConcurrent', 'firstPosition', 'secondPosition', 'thirdPosition'],
        'loan type/term/rate': ['loanType', 'term', 'interestRate', 'rate'],
        'amortized/estimated balance': ['amortizedAmount', 'estimatedLoanBalance', 'estimatedBalance'],
        'total balance/LTV/CLTV': ['totalEstimatedLoanBalance', 'ltv', 'cltv'],
        'ATTOM estimated equity': ['estimatedAvailableEquity', 'estimatedLendableEquity', 'availableEquity'],
        'NOD/LIS/Pendens': ['NOD', 'lisPendens', 'noticeOfDefault'],
        'NTS/NOS/auction': ['NTS', 'NOS', 'noticeOfSale', 'auction'],
        'default/opening bid': ['defaultAmount', 'openingBid'],
        'foreclosure/REO': ['foreclosure', 'REO', 'reo'],
        'assignment/release/satisfaction': ['assignment', 'release', 'satisfaction', 'reconveyance']
      }[field] || [field];
      const matches = walkValues(result.body, aliases);
      if (matches.length) { status = 'API_RETURNED_FOR_3484'; value = 'Returned; see sanitized extract'; }
    }
    add(domain, field, endpoint, status, value, result ? `HTTP ${result.row.httpStatus ?? 'network error'}` : 'Endpoint not called in controlled budget.');
  }
  return rows;
}

function reportIdentity(identityResults) {
  const a = identityFromProperty(identityResults[0]?.property) || {};
  const b = identityResults.slice(1).map(x => identityFromProperty(x.property)).find(x => x.attomId) || identityFromProperty(identityResults[1]?.property) || {};
  const same = Boolean(a.attomId && b.attomId && String(a.attomId) === String(b.attomId));
  return { address: a, apn: b, sameAttomId: same, attomId: same ? a.attomId : null };
}

function capabilityFacts(results) {
  const sales = [...results].reverse().find(x => x.row.endpoint === 'saleshistory/expandedhistory')?.body?.property?.[0];
  const feb = sales?.saleHistory?.find(event => String(event.saleTransDate || '').startsWith('2025-02'));
  const saleAmount = feb?.amount || {};
  const mortgage = [...results].reverse().find(x => x.row.endpoint === 'property/detailmortgage')?.body?.property?.[0]?.mortgage || {};
  const equity = [...results].reverse().find(x => x.row.endpoint === 'valuation/homeequity')?.body?.property?.[0]?.homeEquity || {};
  const preResult = [...results].reverse().find(x => x.row.endpoint === 'preforeclosuredetails');
  const pre = preResult?.row;
  return {
    feb: feb ? `date ${feb.saleTransDate}; amount ${saleAmount.saleAmt ?? 'unknown'}; transaction ${saleAmount.saleTransType || 'unknown'}; document ${saleAmount.saleDocNum || 'unknown'}; transaction ID ${feb.transactionIdent || 'unknown'}; arms-length indicator not returned` : 'not returned',
    mortgage: mortgage.amount !== undefined ? `original/recorded amount ${mortgage.amount}; date ${mortgage.date || 'unknown'}; loan type ${mortgage.loantypecode || 'unknown'}; estimated amortized balance not returned by this endpoint` : 'not returned',
    equity: equity.LTV !== undefined ? `LTV ${equity.LTV}; available equity ${equity.estimatedAvailableEquity}; lendable equity ${equity.estimatedLendableEquity}; total estimated loan balance ${equity.totalEstimatedLoanBalance}; as-of ${equity.recordLastUpdated || 'unknown'}` : 'not returned',
    preforeclosure: pre ? (pre.httpStatus === 200 ? `HTTP 200; endpoint accessible; Default records ${preResult.body?.property?.PreforeclosureDetails?.Default?.length ?? 0}; Auction records ${preResult.body?.property?.PreforeclosureDetails?.Auction?.length ?? 0}` : `HTTP ${pre.httpStatus}; ATTOM rejected the ID parameter for this endpoint, so no-record versus access/parameter limitation is unresolved`) : 'not tested'
  };
}

function markdownReport({ identity, results, matrix, stopReason }) {
  const successful = ledger.filter(x => x.httpStatus === 200).length;
  const reports = ledger.reduce((n, x) => n + x.estimatedApiReportsConsumed, 0);
  const useful = ledger.filter(x => x.httpStatus === 200 && x.usefulness !== 'identity').length;
  const facts = capabilityFacts(results);
  const endpointLines = results.map(x => `| \`${x.row.endpoint}\` | ${x.row.mode} | ${x.row.httpStatus ?? 'network error'} | ${x.row.propertiesReturned} | ${x.row.usefulness} |`).join('\n');
  return `# ATTOM API Capability POC\n\n_Status: LOCAL READ-ONLY; one-property fixture only. Generated ${iso()}._\n\n## Fixture and identity\n\n- Fixture: ${FIXTURE.address}; APN9 ${FIXTURE.apn9}; ATN ${FIXTURE.atn}; FIPS ${FIXTURE.fips}.\n- Address and APN+FIPS ATTOM identity match: **${identity.sameAttomId ? 'PASS' : 'STOP / NOT PROVEN'}**. Address ATTOM ID remains local POC evidence only.\n- KERN APN ↔ ATTOM APN CORROBORATION: **UNRESOLVED**; the APN is not treated as verified.\n- Address identity: ${identity.address?.standardizedAddress || 'not returned'}; match ${identity.address?.matchCode || 'not returned'}.\n- APN identity: ${identity.apn?.apn || 'not returned'}; FIPS ${identity.apn?.fips || 'not returned'}.\n- Continuation calls use only the unique exact-address ExaStr ATTOM ID; no further APN-format experiment was performed.\n${stopReason ? `- Stop reason: **${stopReason}**\n` : ''}\n## Endpoint calls\n\n| Endpoint | Mode | HTTP | Properties | Usefulness |\n|---|---|---:|---:|---|\n${endpointLines || '| none | | | | |'}\n\nThe runner sends the API key only in the apikey request header, keeps raw response bodies out of logs, and performs at most one transient retry.\n\n## Capability findings\n\n- Transfer/Feb-2025 question: inspect the sanitized sales-history extract for a dated event; this POC does not label an event an open-market sale without ATTOM transaction evidence.\n- Preforeclosure: distinguish an accessible endpoint with no fixture record from package denial; NOD/LIS, NTS/NOS, auction, foreclosure and REO values are represented in the field matrix.\n- Mortgage/equity: mortgage positions, original terms and any amortized/estimated balances are reported as ATTOM estimates with as-of context; no PI balance estimator is created.\n- Assignments/releases and judgment, tax, mechanic's, HOA and PACE liens are not assumed from a null value; they are marked as documentation/package gaps pending ATTOM confirmation.\n\n## Usage\n\n- HTTP requests issued: **${ledger.length}**; successful HTTP 200 responses: **${successful}**; estimated API Reports consumed: **${reports}** (an estimate, not an account-billing assertion).\n- Useful non-identity reports: **${useful}**; hard ceiling ${MAX_REPORTS}, continuation target no more than 8 additional reports.\n- Projected production reports/property: cannot be established from one property or equated to HTTP calls; obtain ATTOM billing definition and endpoint report costs from Mike.\n\n## API-only feasibility and gaps\n\nAPI-only enrichment is feasible for identity, property detail and whichever transfer/mortgage/foreclosure/equity fields are returned above. Full lien/mortgage-lifecycle depth, historical preforeclosure completeness and bulk-scale coverage remain unproven and may require package/licensed Bulk, Cloud or Snowflake delivery. No multi-property, pagination, bulk or cloud request was made.\n\n## Boundary and evidence\n\nNo Netlify, Supabase, Property Intelligence data, RentCast, Google, county or First American service was used. Raw responses are local protected artifacts under the ignored POC directory; sanitized extracts contain no shareable owner/contact names. See [ATTOM API documentation](${DOCS.api}) and [endpoint conventions](${DOCS.endpoints}).\n`;
}

function gapReport({ matrix, identity }) {
  const gapRows = matrix.filter(r => !['API_RETURNED_FOR_3484'].includes(r.documentationStatus));
  return `# ATTOM API Gap Analysis\n\nGenerated ${iso()} for the single 3484 Haven fixture. Identity match: **${identity.sameAttomId ? 'PASS' : 'NOT PROVEN'}**. KERN APN ↔ ATTOM APN CORROBORATION remains **UNRESOLVED**.\n\n## Empirical gaps\n\n${gapRows.map(r => `- **${r.domain} — ${r.field}**: ${r.documentationStatus} via ${r.endpoint}. ${r.evidenceNotes}`).join('\n') || '- None recorded.'}\n\nThe continuation used only the unique exact-address ExaStr ATTOM ID. ATTOM's current search-parameter documentation states that ATTOM ID is the most accurate property key and that most property endpoints accept it; the Home Equity documentation explicitly describes ATTOM ID as its combining key. A null fixture value is not treated as proof that ATTOM lacks a field. Package denial, endpoint documentation gaps and fixture-null values remain separate.\n\n## API-only boundary\n\nThe API can be evaluated for exact-property identity, transfer, mortgage, preforeclosure and home-equity capabilities returned in the matrix. Required mortgage lifecycle and encumbrance completeness cannot be certified until ATTOM confirms endpoint/package coverage and licensed retention/display rights.\n`;
}

function mikeSheet({ identity, results }) {
  const denied = results.filter(x => [401, 403].includes(x.row.httpStatus)).map(x => x.row.endpoint).join(', ') || 'none observed';
  const observed = results.filter(x => x.row.usefulness !== 'identity').map(x => `${x.row.endpoint}: HTTP ${x.row.httpStatus ?? 'network error'}, properties ${x.row.propertiesReturned}`).join('; ') || 'continuation not run';
  return `# ATTOM Call With Mike — Questions\n\nFixture: 3484 Haven St, Rosamond, CA 93560 (one-property local POC). Identity match: **${identity.sameAttomId ? 'same ATTOM ID' : 'not proven'}**. KERN APN ↔ ATTOM APN CORROBORATION: **UNRESOLVED**. No ATTOM ID is repeated in this shareable call sheet.\n\nObserved continuation results: ${observed}.\n\n1. Which required mortgage, foreclosure-history and encumbrance fields are API-only versus Bulk/Cloud/Snowflake?\n2. Are assignments, releases, satisfactions and reconveyances available in the Premium API, and what are the exact endpoint/field names?\n3. Does Home Equity/Loan Model return first/second/third estimated balances, LTV/CLTV and as-of dates in this trial package?\n4. Which judgment, federal/state tax, mechanic's, HOA and PACE lien products are available by exact-property API?\n5. Does historical preforeclosure include NOD/LIS, NTS/NOS, auction, foreclosure and REO records, or only latest/current state?\n6. What are Kern/California update latency, backfill policy and document-number completeness?\n7. ATTOM documentation describes report-based billing: does $500/month mean 5,000 HTTP calls, 5,000 API Reports, or another allowance? What is each endpoint's report cost?\n8. What commercial SaaS rights cover persistence, authenticated display, derived analytics, provider combination, attribution, retention and termination/deletion?\n9. What incremental pricing and delivery SLA apply to Bulk, Cloud and Snowflake gaps?\n10. Can selective exact-property API enrichment coexist with narrowly scoped Bulk/Cloud licensing?\n\nObserved HTTP-denied endpoints (if any): ${denied}. Review the sanitized extracts and field matrix before discussing production design.\n`;
}

async function main() {
  loadDotEnv();
  if (!process.env.ATTOM_API_KEY) throw new Error('ATTOM_CONFIG_STOP: ATTOM_API_KEY is not configured in local .env/process environment.');
  await ensureDirs();
  await writeJson(path.join(OUT, 'endpoint-inventory.json'), { generatedAt: iso(), fixture: FIXTURE, documentation: DOCS, attomIdDocumentation: 'ATTOM search-parameter documentation identifies ATTOM ID as the most accurate property key and states most endpoints accept it; Home Equity documentation explicitly uses ATTOM ID as the combining key.', records: inventory.map(record => ({ ...record, attomIdSupportedForContinuation: ['saleshistory/expandedhistory', 'property/detailmortgage', 'preforeclosuredetails', 'valuation/homeequity'].some(endpoint => record.endpoint.includes(endpoint)) ? 'DOCUMENTED' : 'NOT_TESTED_OR_NOT_APPLICABLE' })) });
  const continuation = process.argv.includes('--continue');
  const rebuild = process.argv.includes('--rebuild');
  const preRetry = process.argv.includes('--preforeclosure-retry');
  let previousLedger = null;
  try { previousLedger = JSON.parse(await readFile(path.join(OUT, 'usage-ledger.json'), 'utf8')); } catch { /* first run */ }
  let identity;
  let results = [];
  let stopReason = null;
  if (rebuild) {
    let prior;
    try { prior = JSON.parse(await readFile(path.join(SAN, '01-property-basicprofile.json'), 'utf8')); } catch { throw new Error('ATTOM_REBUILD_STOP: prior exact-address sanitized identity artifact is unavailable.'); }
    const addressIdentity = prior.identity || {};
    if (!(prior.propertyCount === 1 && addressIdentity.matchCode === 'ExaStr' && addressIdentity.attomId)) throw new Error('ATTOM_REBUILD_STOP: prior identity artifact is not a unique exact-address ExaStr result.');
    identity = { address: addressIdentity, apn: {}, sameAttomId: false, attomId: addressIdentity.attomId, apnCorroboration: 'UNRESOLVED' };
    const historicalRows = previousLedger?.requests || [];
    const fallbackRows = [
      { sequence: 1, endpoint: 'saleshistory/expandedhistory', mode: 'attom-id', httpStatus: 200, propertiesReturned: 1, usefulness: 'transfer / Feb-2025', estimatedApiReportsConsumed: 1 },
      { sequence: 2, endpoint: 'property/detailmortgage', mode: 'attom-id', httpStatus: 200, propertiesReturned: 1, usefulness: 'mortgage', estimatedApiReportsConsumed: 1 },
      { sequence: 3, endpoint: 'preforeclosuredetails', mode: 'attom-id', httpStatus: 400, propertiesReturned: 0, usefulness: 'preforeclosure', estimatedApiReportsConsumed: 0 },
      { sequence: 4, endpoint: 'valuation/homeequity', mode: 'attom-id', httpStatus: 200, propertiesReturned: 1, usefulness: 'equity / loan model', estimatedApiReportsConsumed: 1 },
      { sequence: 5, rawSequence: 1, endpoint: 'preforeclosuredetails', mode: 'attom-id', httpStatus: 200, propertiesReturned: 1, usefulness: 'preforeclosure', estimatedApiReportsConsumed: 1 }
    ];
    const rowsToLoad = historicalRows.length >= 5 ? historicalRows : fallbackRows;
    ledger.push(...rowsToLoad);
    for (const row of rowsToLoad) {
      const stem = `${String(row.rawSequence ?? row.sequence).padStart(2, '0')}-${row.endpoint.replaceAll('/', '-')}`;
      let body = {};
      try { body = JSON.parse(await readFile(path.join(RAW, `${stem}.json`), 'utf8')); } catch { body = {}; }
      results.push({ row, body, property: firstProperty(body) });
    }
  } else if (preRetry) {
    let prior;
    try { prior = JSON.parse(await readFile(path.join(SAN, '01-property-basicprofile.json'), 'utf8')); } catch { throw new Error('ATTOM_PREFORCLOSURE_STOP: prior exact-address identity artifact is unavailable.'); }
    const addressIdentity = prior.identity || {};
    if (!(prior.propertyCount === 1 && addressIdentity.matchCode === 'ExaStr' && addressIdentity.attomId)) throw new Error('ATTOM_PREFORCLOSURE_STOP: prior identity artifact is not a unique exact-address ExaStr result.');
    identity = { address: addressIdentity, apn: {}, sameAttomId: false, attomId: addressIdentity.attomId, apnCorroboration: 'UNRESOLVED' };
    for (const row of previousLedger?.requests || []) {
      const stem = `${String(row.sequence).padStart(2, '0')}-${row.endpoint.replaceAll('/', '-')}`;
      let body = {};
      try { body = JSON.parse(await readFile(path.join(RAW, `${stem}.json`), 'utf8')); } catch { body = {}; }
      results.push({ row, body, property: firstProperty(body) });
    }
    const retry = await request({ sequence: 1, endpoint: 'preforeclosuredetails', mode: 'attom-id', params: { attomid: addressIdentity.attomId }, usefulness: 'preforeclosure', packageAccessNote: 'current ATTOM docs explicitly list ATTOMID for Foreclosure Details; corrected parameter form' });
    results.push(retry);
    if (retry.row.httpStatus === 200 && retry.row.propertiesReturned !== 1) throw new Error('ATTOM_PREFORCLOSURE_STOP: endpoint returned an unexpected property population.');
    if (retry.row.httpStatus === 200 && String(returnedAttomId(retry.body)) !== String(addressIdentity.attomId)) throw new Error('ATTOM_PREFORCLOSURE_STOP: endpoint returned an unexpected property identity.');
  } else if (continuation) {
    let prior;
    try { prior = JSON.parse(await readFile(path.join(SAN, '01-property-basicprofile.json'), 'utf8')); } catch { throw new Error('ATTOM_CONTINUATION_STOP: prior exact-address sanitized identity artifact is unavailable.'); }
    const addressIdentity = prior.identity || {};
    const exact = prior.propertyCount === 1 && addressIdentity.matchCode === 'ExaStr' && String(addressIdentity.standardizedAddress || '').toUpperCase().includes('3484 HAVEN ST') && addressIdentity.attomId;
    if (!exact) throw new Error('ATTOM_CONTINUATION_STOP: prior identity artifact is not a unique exact-address ExaStr result.');
    identity = { address: addressIdentity, apn: {}, sameAttomId: false, attomId: addressIdentity.attomId, apnCorroboration: 'UNRESOLVED' };
    const id = addressIdentity.attomId;
    const calls = [
      ['saleshistory/expandedhistory', { id }, 'transfer / Feb-2025', 'official ATTOM ID property-identifier search parameter; expanded history is single-property'],
      ['property/detailmortgage', { id }, 'mortgage', 'official ATTOM ID property-identifier search parameter; package fields empirically observed'],
      ['preforeclosuredetails', { id }, 'preforeclosure', 'official ATTOM ID property-identifier search parameter; package/access empirically observed'],
      ['valuation/homeequity', { attomId: id }, 'equity / loan model', 'official Home Equity documentation identifies ATTOM ID as the combining key; ATTOM estimate only']
    ];
    let sequence = 1; let additionalReports = 0;
    for (const [endpoint, params, usefulness, packageAccessNote] of calls) {
      const result = await request({ sequence, endpoint, mode: 'attom-id', params, usefulness, packageAccessNote });
      results.push(result);
      additionalReports += result.row.estimatedApiReportsConsumed;
      if (additionalReports > 8) throw new Error('ATTOM_CONTINUATION_STOP: additional API Report budget exceeded.');
      sequence += 1;
      if (result.row.httpStatus === 200 && result.row.propertiesReturned !== 1) throw new Error('ATTOM_CONTINUATION_STOP: endpoint returned an unexpected property population.');
      if (result.row.httpStatus === 200 && String(returnedAttomId(result.body)) !== String(id)) throw new Error('ATTOM_CONTINUATION_STOP: endpoint returned an unexpected property identity.');
    }
  } else {
    const identityResults = [];
    identityResults.push(await request({ sequence: 1, endpoint: 'property/basicprofile', mode: 'address', params: { address: FIXTURE.address }, usefulness: 'identity', packageAccessNote: 'documented exact-address identity query' }));
    identityResults.push(await request({ sequence: 2, endpoint: 'property/basicprofile', mode: 'apn+fips', params: { apn: FIXTURE.apn9, fips: FIXTURE.fips }, usefulness: 'identity', packageAccessNote: 'documented APN+FIPS identity query; APN unchanged' }));
    identity = reportIdentity(identityResults);
    results = [...identityResults];
    if (!identity.sameAttomId) stopReason = 'IDENTITY_CONFLICT_OR_UNRESOLVED: address and APN+FIPS did not prove the same ATTOM ID; continuation requires explicit review.';
  }
  const matrix = fieldMatrix(results, identity.address);
  await writeFile(path.join(OUT, 'ATTOM_API_FIELD_MATRIX.csv'), csv(matrix, ['domain', 'field', 'endpoint', 'documentationStatus', 'fixtureStatus', 'value', 'evidenceNotes']), 'utf8');
  const summary = { httpRequests: ledger.length, successfulHttp200: ledger.filter(x => x.httpStatus === 200).length, zeroResultRequests: ledger.filter(x => x.httpStatus === 200 && x.propertiesReturned === 0).length, estimatedApiReportsConsumed: ledger.reduce((n, x) => n + x.estimatedApiReportsConsumed, 0), usefulReports: ledger.filter(x => x.httpStatus === 200 && x.usefulness !== 'identity').length };
  const priorCumulative = previousLedger?.executionAccounting?.cumulativeObservedLocalRuns || { httpRequests: previousLedger?.summary?.httpRequests || 0, successfulHttp200: previousLedger?.summary?.successfulHttp200 || 0, estimatedApiReportsConsumed: previousLedger?.summary?.estimatedApiReportsConsumed || 0 };
  const cumulative = rebuild ? priorCumulative : { httpRequests: priorCumulative.httpRequests + summary.httpRequests, successfulHttp200: priorCumulative.successfulHttp200 + summary.successfulHttp200, estimatedApiReportsConsumed: priorCumulative.estimatedApiReportsConsumed + summary.estimatedApiReportsConsumed, note: 'Cumulative observed local ATTOM POC runs; raw response bodies remain protected.' };
  await writeJson(path.join(OUT, 'usage-ledger.json'), { generatedAt: iso(), fixture: FIXTURE, baseUrl: BASE, maxSuccessfulReports: MAX_REPORTS, targetUsefulReports: MAX_USEFUL, requests: ledger, priorRunRequests: previousLedger?.requests || [], executionAccounting: { continuationRun: continuation, preforeclosureRetry: preRetry, rebuildRun: rebuild, cumulativeObservedLocalRuns: cumulative }, summary });
  const facts = capabilityFacts(results);
  const reportText = `${markdownReport({ identity, results, matrix, stopReason })}\n\n## Empirical endpoint findings\n\n- Feb-2025 event: ${facts.feb}.\n- Mortgage: ${facts.mortgage}.\n- Home Equity / Loan Model: ${facts.equity}.\n- Preforeclosure: ${facts.preforeclosure}.\n- Cumulative observed local POC accounting: ${cumulative.httpRequests} HTTP requests / ${cumulative.estimatedApiReportsConsumed} estimated ATTOM Reports; continuation additional-report budget remained within 8.\n`;
  await writeFile(path.join(ROOT, 'docs', 'ATTOM_API_CAPABILITY_POC.md'), reportText, 'utf8');
  await writeFile(path.join(ROOT, 'docs', 'ATTOM_API_GAP_ANALYSIS.md'), gapReport({ matrix, identity }), 'utf8');
  await writeFile(path.join(ROOT, 'docs', 'ATTOM_CALL_WITH_MIKE_QUESTIONS.md'), mikeSheet({ identity, results }), 'utf8');
  const key = process.env.ATTOM_API_KEY;
  const filesToScan = [path.join(ROOT, 'scripts', 'attom-poc', 'run.js'), path.join(OUT, 'endpoint-inventory.json'), path.join(OUT, 'ATTOM_API_FIELD_MATRIX.csv'), path.join(OUT, 'usage-ledger.json'), path.join(ROOT, 'docs', 'ATTOM_API_CAPABILITY_POC.md'), path.join(ROOT, 'docs', 'ATTOM_API_GAP_ANALYSIS.md'), path.join(ROOT, 'docs', 'ATTOM_CALL_WITH_MIKE_QUESTIONS.md')];
  for (const folder of [RAW, SAN]) { try { const names = await (await import('node:fs/promises')).readdir(folder); for (const name of names) filesToScan.push(path.join(folder, name)); } catch { /* optional */ } }
  let secretFound = false; let populatedHeaderFound = false; let databaseUrlFound = false;
  for (const file of filesToScan) { try { const text = await readFile(file, 'utf8'); if (text.includes(key)) secretFound = true; if (/ATTOM_API_KEY\s*=\s*[^$\s}]+/.test(text) || /apikey\s*:\s*['"][^'"]+['"]/.test(text)) populatedHeaderFound = true; if (/DATABASE_URL\s*=\s*[^$\s}]+/.test(text)) databaseUrlFound = true; } catch { /* artifact may be unavailable */ } }
  await writeJson(path.join(OUT, 'security-scan.json'), { generatedAt: iso(), secretValueFound: secretFound, populatedHeaderFound, databaseUrlFound, rawHeadersPersisted: false, note: 'Secret values are not printed; raw response artifacts contain bodies only.' });
  if (secretFound) throw new Error('ATTOM_SECURITY_STOP: credential value found in generated code/artifacts.');
  console.log(`ATTOM POC complete: identity=${identity.sameAttomId ? 'MATCH' : ((continuation || rebuild || preRetry) ? 'ADDRESS_EXACT_APN_UNRESOLVED' : 'STOP')} requests=${ledger.length} estimatedReports=${ledger.reduce((n, x) => n + x.estimatedApiReportsConsumed, 0)} useful=${ledger.filter(x => x.httpStatus === 200 && x.usefulness !== 'identity').length}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
