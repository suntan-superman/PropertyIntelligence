import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseCsv,normalizePowerToSellRow,sha256} from '../src/sources/kern/csv.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourcePath=process.argv[2]??path.join(root,'data','raw','kern_power_to_sell_2026-09-15.csv');
const bytes=await readFile(sourcePath);const text=bytes.toString('utf8');const parsed=parseCsv(text);
const expected=['owner_name','atn','parcel_amount_owed','owner_total_owed','source_date','source','source_page'];
const rowCounts={};const malformedRows=[];const normalized=[];
for(let index=0;index<parsed.rows.length;index++){
  const row=parsed.rows[index];rowCounts[row.length]=(rowCounts[row.length]??0)+1;
  if(row.length!==parsed.headers.length){malformedRows.push(index+2);continue;}
  normalized.push(normalizePowerToSellRow(parsed.headers,row,index+2));
}
const duplicateFingerprintCounts=new Map();const atnCounts=new Map();const ownerCounts=new Map();
for(const item of normalized){
  const fp=sha256(JSON.stringify(item.raw));duplicateFingerprintCounts.set(fp,(duplicateFingerprintCounts.get(fp)??0)+1);
  if(item.normalized.atn)atnCounts.set(item.normalized.atn,(atnCounts.get(item.normalized.atn)??0)+1);
  if(item.normalized.ownerName)ownerCounts.set(item.normalized.ownerName,(ownerCounts.get(item.normalized.ownerName)??0)+1);
}
const nullRates={};for(const header of parsed.headers){const count=normalized.filter(item=>!String(item.raw[header]??'').trim()).length;nullRates[header]={nullCount:count,nonNullCount:normalized.length-count,rate:normalized.length?Number((count/normalized.length).toFixed(6)):null};}
const amounts={};for(const field of ['parcel_amount_owed','owner_total_owed']){const values=normalized.map(item=>item.raw[field]).filter(value=>String(value??'').trim());const parsedValues=values.map(value=>{const amount=String(value).replace(/[$,\s]/g,'');return /^-?\d+(?:\.\d+)?$/.test(amount)?Number(amount):null;});amounts[field]={nonNull:values.length,zeroCount:parsedValues.filter(value=>value===0).length,negativeCount:parsedValues.filter(value=>typeof value==='number'&&value<0).length,invalidCount:parsedValues.filter(value=>value===null).length};}
const sourceDates=[...new Set(normalized.map(item=>item.normalized.sourceDate).filter(Boolean))].sort();
const sourceNames=[...new Set(normalized.map(item=>item.normalized.source).filter(Boolean))].sort();
const pages=normalized.map(item=>Number(item.normalized.sourcePage)).filter(Number.isFinite);
const audit={
  auditedAt:new Date().toISOString(),sourceFile:path.relative(root,sourcePath).replaceAll('\\','/'),bytes:bytes.length,sha256:sha256(bytes),
  header:parsed.headers,expectedHeaderMatch:JSON.stringify(parsed.headers)===JSON.stringify(expected),recordCount:parsed.rows.length,validRowCount:normalized.length,
  rowFieldCounts:rowCounts,malformedRowCount:malformedRows.length,malformedRows:malformedRows.slice(0,20),nullRates,
  edition:{sourceNames,sourceDates,sourceDateInterpretation:'Observed source_date field only; no edition semantics inferred.'},
  identifiers:{atnFieldPresent:parsed.headers.includes('atn'),apnFieldPresent:parsed.headers.includes('apn'),atnNonNull:normalized.filter(item=>item.normalized.atn).length,apnNonNull:normalized.filter(item=>item.normalized.apn).length,uniqueAtn:atnCounts.size,duplicateAtnValues:[...atnCounts.entries()].filter(([,count])=>count>1).length,stableIdentifierRule:'ATN is normalized for comparison only; APN is absent in this artifact and no ATN/APN equivalence is assumed.'},
  ownerName:{fieldPresent:parsed.headers.includes('owner_name'),nonNull:normalized.filter(item=>item.normalized.ownerName).length,uniqueNormalized:ownerCounts.size,repeatNameValues:[...ownerCounts.entries()].filter(([,count])=>count>1).length,mergeRule:'Owner name is provenance only and never merges parcels.'},
  amounts,addresses:{addressFields:parsed.headers.filter(header=>/address|situs|street|city|zip/i.test(header)),availability:'No address/situs field is present; address cannot be inferred from identifiers or owner name.'},
  provenance:{sourcePagePresent:normalized.filter(item=>item.normalized.sourcePage).length,sourcePageNumericCount:pages.length,sourcePageMin:pages.length?Math.min(...pages):null,sourcePageMax:pages.length?Math.max(...pages):null,sourceFieldPresent:normalized.filter(item=>item.normalized.source).length,sourceDatePresent:normalized.filter(item=>item.normalized.sourceDate).length},
  duplicates:{exactRowDuplicateGroups:[...duplicateFingerprintCounts.values()].filter(count=>count>1).length,exactDuplicateExtraRows:[...duplicateFingerprintCounts.values()].filter(count=>count>1).reduce((sum,count)=>sum+count-1,0),atnDuplicateRows:normalized.length-new Set(normalized.map(item=>item.normalized.atn).filter(Boolean)).size},
  parsing:{criticalMalformedRows:normalized.filter(item=>item.criticalMalformed.length).length,criticalMalformedFields:[...new Set(normalized.flatMap(item=>item.criticalMalformed))],notes:'Raw values are retained; malformed critical amount fields are rejected by the importer rather than coerced.'}
};
const auditPath=path.join(root,'docs','SPRINT6_KERN_SOURCE_AUDIT.md');
const lines=['# Sprint 6 Kern Source Audit','',`Audited: ${audit.auditedAt}`,'Source file: '+audit.sourceFile,'SHA-256: '+audit.sha256,`Bytes: ${audit.bytes}`,`Record count (rows excluding header): ${audit.recordCount}`,`Valid-width rows: ${audit.validRowCount}`,`Header matches audited schema: ${audit.expectedHeaderMatch?'yes':'no'}`,'','## Observed columns','',audit.header.join(', '),'',`Edition/source names: ${audit.edition.sourceNames.join(', ')||'none observed'}`,`Observed source dates: ${audit.edition.sourceDates.join(', ')||'none observed'}`,`ATN non-null: ${audit.identifiers.atnNonNull}; unique normalized ATNs: ${audit.identifiers.uniqueAtn}; duplicate ATN values: ${audit.identifiers.duplicateAtnValues}`,`APN field present: ${audit.identifiers.apnFieldPresent?'yes':'no'}; APN non-null: ${audit.identifiers.apnNonNull}`,`Owner name non-null: ${audit.ownerName.nonNull}; distinct normalized names: ${audit.ownerName.uniqueNormalized} (names are not identity keys)`,`Address/situs fields: ${audit.addresses.addressFields.join(', ')||'none'}`,`Source-page non-null: ${audit.provenance.sourcePagePresent}; numeric page range: ${audit.provenance.sourcePageMin??'unknown'}–${audit.provenance.sourcePageMax??'unknown'}`,`Exact duplicate row groups: ${audit.duplicates.exactRowDuplicateGroups}; extra duplicate rows: ${audit.duplicates.exactDuplicateExtraRows}`,`Malformed-width rows: ${audit.malformedRowCount}; malformed critical amount rows: ${audit.parsing.criticalMalformedRows}`,'',`The current artifact contains ${audit.recordCount} records, not an assumed count. No county scraping or provider enrichment was performed. Owner names, identifiers and amounts are not copied into this audit narrative.`,''];
await writeFile(auditPath,lines.join('\n'));
await writeFile(path.join(root,'data','validation','sprint6-kern-source-audit.json'),`${JSON.stringify(audit,null,2)}\n`);
console.log(JSON.stringify(audit,null,2));
