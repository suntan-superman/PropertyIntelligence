import {readFile} from 'node:fs/promises';
import {fileHash,ZIP,ZIP_HASH,PTS,PTS_HASH,requireHash,hash,CACHE} from '../sprint6_2/io.js';
import {scanDbf} from '../sprint6_2/dbf.js';
import {normalizeAtn,normalizeApn9,situsStatus,officialCategory} from '../sprint6_2/core.js';
import {parseCsv,parseAmount} from '../../src/sources/kern/csv.js';
import {screenCandidate} from '../../src/opportunities/screening.js';
export const HIGH_HASH='3d1d7be5c8d84cd0c63834d45f278efbbeb174bec0f59e383831c61416cc8dd3';
export const numericText=raw=>raw===''||raw==null?null:/^-?\d+(?:\.\d{1,11})?$/.test(raw)?raw:(()=>{throw new Error('COUNTY_DECIMAL_INVALID');})();
export const valueStatus=v=>v===null?'VALUE_MISSING':/^[-+]?0+(?:\.0+)?$/.test(v)?'EXPLICIT_ZERO':'VALUE_PRESENT';
export function reviewFlags(r){const flags=[];if(r.crosswalk_status==='UNMATCHED')return ['ASSESSOR_UNMATCHED'];
  if(['SITUS_MISSING','SITUS_MALFORMED'].includes(r.situs_status))flags.push(r.situs_status);
  if(['UNKNOWN','OTHER'].includes(r.research_use_category))flags.push('USE_CATEGORY_REVIEW');
  if(r.acreage_delta!==null&&Math.abs(Number(r.acreage_delta))>0.01)flags.push('ACREAGE_DELTA_GT_0_01');
  if(r.base_year_status==='VALUE_MISSING')flags.push('BASE_YEAR_VALUE_MISSING');if(r.county_acres_status==='EXPLICIT_ZERO')flags.push('ROLL_ACRES_EXPLICIT_ZERO');return flags;
}
export async function buildPlan(){
  requireHash(await fileHash(ZIP),ZIP_HASH);requireHash(await fileHash(PTS),PTS_HASH);
  const baseline=JSON.parse(await readFile('data/runtime/sprint6_3/baseline.json'));
  for(const f of baseline.files.filter(f=>/sprint6_2[-_/]|SPRINT6_2_/.test(f.path)))requireHash(await fileHash(f.path),f.sha256);
  const audit=JSON.parse(await readFile('data/validation/sprint6_2-kern-assessor-source-audit.json'));
  const domain=new Map(audit.dbfProfiles.TaxRoll_UseCodes_2026final.domain.map(r=>[r.USE_CODE,r.USE_DESC]));
  const crosswalk=parseCsv(await readFile('data/validation/sprint6_2-kern-atn-crosswalk.csv','utf8'));
  const certified=new Map(crosswalk.rows.map(row=>{const c=Object.fromEntries(crosswalk.headers.map((h,i)=>[h,row[i]]));return [c.normalized_pts_atn,c];}));
  const pts=parseCsv(await readFile(PTS,'utf8')),group=new Map();
  for(const row of pts.rows){const raw=row[pts.headers.indexOf('atn')],atn=normalizeAtn(raw),amount=parseAmount(row[pts.headers.indexOf('parcel_amount_owed')]);if(!atn||typeof amount!=='number')throw new Error('PTS_INVALID');const prior=group.get(atn);if(!prior||amount>prior.amount)group.set(atn,{raw,atn,amount});}
  if(pts.rows.length!==11321||group.size!==11316||certified.size!==11316)throw new Error('PTS_COUNT_STOP');
  const member=`${CACHE}/extracted/TaxRoll_Land_2026final/TaxRoll_Land_2026final.dbf`;
  const memberHash=await fileHash(member);requireHash(memberHash,audit.sourceFiles.find(f=>f.path===member)?.sha256);
  const selected=new Map();await scanDbf(member,['ATN','APN9','ADDR_SITUS','USE_CODE','LAND_VAL','IMP_VAL','NET_VAL','BASEYR_VAL','ACRES'],(row,index)=>{
    const atn=normalizeAtn(row.ATN);if(!group.has(atn))return;if(selected.has(atn))throw new Error('MULTIPLE_MATCH_STOP');selected.set(atn,{...row,index});
  });
  const rows=[],situsCounts={},categoryCounts={},flags={},high={total:0,exact:0,unmatched:0,situs:0,residential:0,singleFamily:0,singleFamilySitus:0},highAtns=[];
  for(const p of group.values()){
    const c=certified.get(p.atn),r=selected.get(p.atn),exact=!!r,score=screenCandidate({atn:p.atn,parcelAmountOwed:p.amount}),isHigh=score.priorityBand==='HIGH_REVIEW_PRIORITY';
    if(!c||c.match_status!==(exact?'MATCHED_EXACT':'UNMATCHED')||Number(c.score)!==score.score||c.priority!==score.priorityBand)throw new Error('CROSSWALK_SCORE_RECONCILIATION_STOP');
    const use=exact?officialCategory(r.USE_CODE,domain):null,situs=exact?situsStatus(r.ADDR_SITUS):'NOT_APPLICABLE';
    if(exact&&(r.ATN!==c.matched_assessor_atn||normalizeApn9(r.APN9)!==c.apn9||r.index!==Number(c.assessor_rows)||situs!==c.situs_status||use.category!==c.use_category||use.description!==c.use_description))throw new Error('SOURCE_ROW_RECONCILIATION_STOP');
    const base=exact?numericText(r.BASEYR_VAL):null,acres=exact?numericText(r.ACRES):null;
    for(const [source,field] of [['LAND_VAL','land_value'],['IMP_VAL','improvement_value'],['NET_VAL','net_value'],['BASEYR_VAL','baseyear_value'],['ACRES','acreage']])if(exact){const actual=numericText(r[source]),prior=c[field]===''?null:Number(c[field]);if((actual===null?null:Number(actual))!==prior)throw new Error('COUNTY_VALUE_RECONCILIATION_STOP');}
    const row={source_reference:'KernCountyAssessor_GisParcels_2026final.zip/TaxRoll_Land_2026final.zip/TaxRoll_Land_2026final.dbf',disclaimer_reference:'docs/SPRINT6_2_SOURCE_DISCLAIMER.md',assessor_source_edition:'2026 Final',assessor_source_date:'2026-06-26',county_zip_sha256:ZIP_HASH,county_member_sha256:memberHash,source_row_locator:exact?r.index:null,source_row_fingerprint:hash(JSON.stringify({atn:p.atn,row:r??null,countyZip:ZIP_HASH,member:memberHash})),pts_atn_raw:p.raw,pts_atn_normalized:p.atn,assessor_atn_raw:r?.ATN??null,assessor_atn_normalized:exact?normalizeAtn(r.ATN):null,crosswalk_status:exact?'MATCHED_EXACT':'UNMATCHED',crosswalk_reason:exact?'EXACT_ATN_SINGLE_LAND_RECORD':'NO_EXACT_LAND_ATN;KIPS_AND_HISTORY_UNPROVEN',apn9:r?.APN9??null,situs_raw:exact&&r.ADDR_SITUS!==''?r.ADDR_SITUS:null,situs_status:situs,use_code:r?.USE_CODE??null,use_description:use?.description??null,research_use_category:use?.category??null,mapping_version:exact?'kern-use-map-v1':null,mapping_reason:exact?'Certified Sprint 6.2 conservative official-description-only mapping; no numeric-prefix inference':null,land_assessment:exact?numericText(r.LAND_VAL):null,improvement_assessment:exact?numericText(r.IMP_VAL):null,net_assessment:exact?numericText(r.NET_VAL):null,base_year_value:base,base_year_status:exact?valueStatus(base):'NOT_APPLICABLE',county_acres:acres,county_acres_status:exact?valueStatus(acres):'NOT_APPLICABLE',geometry_status:exact?'GEOMETRY_EXACT':'NOT_APPLICABLE',geometry_source_apn9:exact?c.apn9:null,shape_sqft:exact?numericText(c.shape_sqft):null,shape_acres:exact?numericText(c.shape_acres):null,acreage_delta:exact?numericText(c.acreage_delta):null};
    if(exact&&c.geometry_status!=='GEOMETRY_EXACT')throw new Error('GEOMETRY_RECONCILIATION_STOP');row.review_flags=reviewFlags(row);rows.push(row);
    situsCounts[situs]=(situsCounts[situs]??0)+1;const cat=use?.category??'NOT_APPLICABLE';categoryCounts[cat]=(categoryCounts[cat]??0)+1;for(const f of row.review_flags)flags[f]=(flags[f]??0)+1;
    if(isHigh){highAtns.push(p.atn);high.total++;high[exact?'exact':'unmatched']++;if(situs==='SITUS_PRESENT')high.situs++;if(['RESIDENTIAL_SINGLE_FAMILY','RESIDENTIAL_MULTI_FAMILY','MANUFACTURED_MOBILE'].includes(cat))high.residential++;if(cat==='RESIDENTIAL_SINGLE_FAMILY'){high.singleFamily++;if(situs==='SITUS_PRESENT')high.singleFamilySitus++;}}
  }
  requireHash(hash(highAtns.sort().join('\n')),HIGH_HASH);
  if(selected.size!==11263||rows.length-selected.size!==53||situsCounts.SITUS_PRESENT!==1270||JSON.stringify(high)!==JSON.stringify({total:312,exact:309,unmatched:3,situs:258,residential:118,singleFamily:81,singleFamilySitus:81}))throw new Error('CERTIFIED_COUNTS_STOP');
  const manifest={importerVersion:'kern-assessor-import-v1',sourceEdition:'2026 Final',sourceDate:'2026-06-26',countyZipSha256:ZIP_HASH,countyMemberSha256:memberHash,ptsSha256:PTS_HASH,highPopulationSha256:HIGH_HASH,candidatePopulationSha256:hash([...group.keys()].sort().join('\n')),payloadSha256:hash(JSON.stringify(rows)),candidateCount:rows.length,exactCount:selected.size,unmatchedCount:rows.length-selected.size,geometryExact:selected.size,situsCounts,categoryCounts,high,reviewFlagCounts:flags,reviewRequired:rows.filter(r=>r.review_flags.length).length,proposedNewBatch:{inserts:11316,supersessions:0,rejections:0},discrepancies:[],providerCalls:0,networkCalls:0};
  return {manifest,rows};
}
