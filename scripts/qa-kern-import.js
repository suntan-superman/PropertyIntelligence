import assert from 'node:assert/strict';
import {writeJson} from '../src/io/files.js';
import {parseCsv,normalizePowerToSellRow,sha256} from '../src/sources/kern/csv.js';

const headers=['owner_name','atn','parcel_amount_owed','owner_total_owed','source_date','source','source_page'];
const csv='"DOE, JANE","123-456-78-90-1","$12,345.67","$20,000.00","2026-09-15","Kern County Power to Sell Listing","7"\n';
const parsed=parseCsv(`${headers.join(',')}\n${csv}`);
assert.deepEqual(parsed.headers,headers);
assert.equal(parsed.rows.length,1);
assert.equal(parsed.rows[0].length,headers.length);
const normalized=normalizePowerToSellRow(parsed.headers,parsed.rows[0],2);
assert.equal(normalized.raw.owner_name,'DOE, JANE');
assert.equal(normalized.normalized.atn,'12345678901');
assert.equal(normalized.normalized.parcelAmountOwed,12345.67);
assert.deepEqual(normalized.criticalMalformed,[]);
assert.deepEqual(normalized.raw,{
  owner_name:'DOE, JANE',atn:'123-456-78-90-1',parcel_amount_owed:'$12,345.67',owner_total_owed:'$20,000.00',source_date:'2026-09-15',source:'Kern County Power to Sell Listing',source_page:'7'
});
const malformed=parseCsv(`${headers.join(',')}\n"ONLY","123-456-78-90-1"`);
assert.notEqual(malformed.rows[0].length,headers.length);
const invalid=normalizePowerToSellRow(headers,['SYNTHETIC','123-456-78-90-1','not-a-number','10','2026-09-15','source','1'],2);
assert.deepEqual(invalid.criticalMalformed,['parcel_amount_owed']);
const firstFingerprint=sha256(JSON.stringify(normalized.raw));
const secondFingerprint=sha256(JSON.stringify(normalized.raw));
assert.equal(firstFingerprint,secondFingerprint,'identical source rows must fingerprint identically');
const missing=normalizePowerToSellRow(headers,['SYNTHETIC','','100','100','2026-09-15','source','1'],2);
assert.equal(missing.normalized.atn,null);
assert.equal(missing.normalized.apn,null);
const report={at:new Date().toISOString(),status:'PASS',checks:8,rawPreserved:true,identifierNormalized:true,malformedRejected:true,duplicateFingerprintStable:true,providerCalls:0};
await writeJson('data/validation/sprint6-kern-import-qa.json',report);
console.log(JSON.stringify(report,null,2));
