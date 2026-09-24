import {network} from './offline.js';
import {readFile,writeFile,stat,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {CACHE,ZIP,ZIP_HASH,PTS,PTS_HASH,gateZip,fileHash,hash,json} from './io.js';
import {schema,scanDbf} from './dbf.js';
import {parseCsv,parseAmount,normalizeIdentifier} from '../../src/sources/kern/csv.js';
import {screenCandidate,SCREEN_VERSION} from '../../src/opportunities/screening.js';
import {normalizeAtn,normalizeApn9,matchAtn,situsStatus,numeric,kipsStatus,historyStatus,geometryMatch,officialCategory,CATEGORIES,increment,countIds} from './core.js';

const start=performance.now(),times={},audit=JSON.parse(await readFile(`${CACHE}/inventory.json`)),profiles=JSON.parse(await readFile(`${CACHE}/profiles.json`));
await gateZip();if(await fileHash(PTS)!==PTS_HASH)throw new Error('PTS_HASH_STOP');
const dbf=name=>`${CACHE}/extracted/${name}/${name}.dbf`,landFile=dbf('TaxRoll_Land_2026final');
const input=parseCsv(await readFile(PTS,'utf8')),col=n=>input.headers.indexOf(n);
if(col('atn')<0||input.headers.some(h=>/address|^apn$/i.test(h)))throw new Error('PTS_SCHEMA_STOP');
const groups=new Map();
for(const [i,r] of input.rows.entries()){
  const raw=r[col('atn')],id=normalizeAtn(raw),legacy=normalizeIdentifier(raw);
  if(id!==legacy)throw new Error('PTS_NORMALIZATION_DIVERGENCE_STOP');
  const parcelAmount=parseAmount(r[col('parcel_amount_owed')]),ownerTotal=parseAmount(r[col('owner_total_owed')]);
  if(typeof parcelAmount!=='number'||typeof ownerTotal!=='number')throw new Error('PTS_AMOUNT_STOP');
  const record={rawAtn:raw,atn:id,sourceRow:i+2,sourcePage:r[col('source_page')],parcelAmount,ownerTotal};
  const key=id??`INVALID_ROW:${i+2}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record);
}
const duplicates=[...groups.values()].filter(r=>r.length>1);
if(input.rows.length!==11321||groups.size!==11316||duplicates.length!==5)throw new Error('PTS_COUNT_STOP');
const priorities={},candidates=[...groups.entries()].map(([atn,sourceRows])=>{
  // Same record selection as opportunityService.importEdition: maximum parcel amount, first on ties.
  const selected=sourceRows.reduce((a,b)=>b.parcelAmount>a.parcelAmount?b:a);
  const s=screenCandidate({normalized:{atn,parcelAmountOwed:selected.parcelAmount}});increment(priorities,s.priorityBand);
  return {local_ref:`ATN:${atn}`,raw_pts_atn:selected.rawAtn,pts_atn:atn,sourceRows,priority:s.priorityBand,score:s.score};
});
if(priorities.HIGH_REVIEW_PRIORITY!==312||priorities.MEDIUM_REVIEW_PRIORITY!==701||priorities.LOW_REVIEW_PRIORITY!==10303)throw new Error('SCREEN_BASELINE_STOP');
const landIndex=new Map(),atns=[],apns=[],availability={},useCodes={},rollTypes={};
const valueFields=['LAND_VAL','IMP_VAL','NET_VAL','BASEYR_VAL','MIN_VAL','OIFIX_VAL','PP_VAL','EX_VAL','ACRES','CITRUS_AC'];
const fields=['ATN','APN9','TE_NO','ROLL','USE_CODE','ADDR_SITUS','LEGAL_DESC',...valueFields];
for(const f of valueFields)availability[f]={present:0,missing:0,malformed:0,zero:0,negative:0,positive:0};
const landSummary={situs:{},useCodePopulated:0,legalDescriptionPresent:0,identifierAsciiOnly:true,situsNonAscii:0};
let time=performance.now();
const landSchema=await scanDbf(landFile,fields,(row,n)=>{
  const atn=normalizeAtn(row.ATN),apn=normalizeApn9(row.APN9);
  atns.push([row.ATN,atn]);apns.push([row.APN9,apn]);
  increment(landSummary.situs,situsStatus(row.ADDR_SITUS));if(row.USE_CODE)landSummary.useCodePopulated++;if(row.LEGAL_DESC)landSummary.legalDescriptionPresent++;
  if(/[^\x00-\x7f]/.test(row.ADDR_SITUS))landSummary.situsNonAscii++;
  increment(useCodes,row.USE_CODE||'(missing)');increment(rollTypes,row.ROLL||'(missing)');
  for(const f of valueFields){const v=numeric(row[f]),a=availability[f];if(!row[f])a.missing++;else if(v===null)a.malformed++;else {a.present++;increment(a,v===0?'zero':v<0?'negative':'positive');}}
  if(groups.has(atn)){
    // Owner/billing columns are never decoded. Preserve raw safe source values in memory/cache only.
    const safe={...row,rowNumber:n};if(!landIndex.has(atn))landIndex.set(atn,[]);landIndex.get(atn).push(safe);
  }
});
times.dbfLoadProfileMs=performance.now()-time;
landSummary.identifiers={ATN:countIds(atns),APN9:countIds(apns)};atns.length=0;apns.length=0;
landSummary.assessmentAvailability=availability;landSummary.rollDistribution=rollTypes;
time=performance.now();
for(const c of candidates){const m=matchAtn(c.raw_pts_atn,landIndex);c.match_status=m.status;c.matching_land_row_numbers=m.rows.map(r=>r.rowNumber);c.land=m.status==='MATCHED_EXACT'?m.rows[0]:null;c.situs_status=c.land?situsStatus(c.land.ADDR_SITUS):'NOT_APPLICABLE';}
times.atnJoinMs=performance.now()-time;
// KIPS schema identifies TE_NO, as does land DBF. No supplied relationship contract
// defines equivalence/coercion of N(19,5) to C(10); similarity/overlap is not proof.
time=performance.now();
const kipsText=await readFile(`${CACHE}/extracted/KIPS_Situs_2026-06-26/SITS.TXT`,'latin1');
const kipsLines=kipsText.split(/\r?\n/);if(kipsLines.at(-1)==='')kipsLines.pop();
const kipsLengths={},teFormats={},teCounts=new Map();let invalidTe=0;
for(const line of kipsLines){increment(kipsLengths,line.length);const key=line.slice(0,10).trim();increment(teFormats,key.length);if(!/^\d+$/.test(key))invalidTe++;teCounts.set(key,(teCounts.get(key)??0)+1);}
const kipsAudit={rows:kipsLines.length,lineLengths:kipsLengths,teNoLengths:teFormats,invalidTe,distinctTe:teCounts.size,duplicateTe:[...teCounts.values()].filter(n=>n>1).length,joinStatus:'KIPS_JOIN_UNPROVEN',incrementalSitus:0,reason:'Both tables contain TE_NO but package docs do not state the cross-file relationship or conversion contract; never substitute ATN/APN.'};
for(const c of candidates)c.kips_status=kipsStatus(c.match_status,c.situs_status);
times.kipsAuditMs=performance.now()-time;times.kipsFallbackMs=0;
time=performance.now();
const historyAudit={createTypes:{},inactivateTypes:{},apn9Invalid:0,applicability:'No PTS APN supplied; no documented ATN-to-historical-APN transform. No history identity recovered.',chainsApplied:0};
const historyApns=new Map();
await scanDbf(dbf('TaxRoll_ParcelHistory_2026final'),['APN9','EVT_TYP_CR','EVT_TYP_IN','EVT_NUM_CR','EVT_NUM_IN'],r=>{
  if(!normalizeApn9(r.APN9))historyAudit.apn9Invalid++;historyApns.set(r.APN9,(historyApns.get(r.APN9)??0)+1);
  increment(historyAudit.createTypes,r.EVT_TYP_CR||'(missing)');increment(historyAudit.inactivateTypes,r.EVT_TYP_IN||'(missing)');
});
historyAudit.distinctApn9=historyApns.size;historyAudit.duplicateApn9=[...historyApns.values()].filter(n=>n>1).length;
for(const c of candidates)c.history_status=historyStatus(c.match_status);
times.historyAuditFallbackMs=performance.now()-time;
time=performance.now();
const shapeDir=`${CACHE}/extracted/Shapefile_Parcels_Land_2026final/parcels_land_2026final`;
const shp=await readFile(`${shapeDir}.shp`),shx=await readFile(`${shapeDir}.shx`);
if(shp.readInt32BE(0)!==9994||shp.readInt32LE(28)!==1000||shp.readInt32LE(32)!==5||shp.readInt32BE(24)*2!==shp.length||shx.readInt32BE(24)*2!==shx.length)throw new Error('SHAPE_HEADER_STOP');
const wantedApns=new Set(candidates.flatMap(c=>c.land?[normalizeApn9(c.land.APN9)]:[])),geometry=new Map(),shapeIds=[],geometryAudit={records:0,nullShapes:0,apnPrefixMismatches:0};
const shapeSchema=await scanDbf(`${shapeDir}.dbf`,['APN','APN9','SHAPE_SQFT','SHAPE_ACRE'],(r,n)=>{
  const pos=100+(n-1)*8;if(pos+8>shx.length)throw new Error('SHAPE_INDEX_STOP');
  const offset=shx.readInt32BE(pos)*2,bytes=shx.readInt32BE(pos+4)*2;
  if(offset<100||offset+8+bytes>shp.length||shp.readInt32BE(offset)!==n||shp.readInt32BE(offset+4)*2!==bytes)throw new Error('SHAPE_RECORD_STOP');
  const type=shp.readInt32LE(offset+8);if(![0,5].includes(type))throw new Error('SHAPE_TYPE_STOP');
  if(type===0)geometryAudit.nullShapes++;geometryAudit.records++;
  const apn=normalizeApn9(r.APN9);shapeIds.push([r.APN9,apn]);if(r.APN!==r.APN9.slice(0,8))geometryAudit.apnPrefixMismatches++;
  if(wantedApns.has(apn)){if(!geometry.has(apn))geometry.set(apn,[]);geometry.get(apn).push({fid:n-1,present:type===5,sqft:numeric(r.SHAPE_SQFT),acres:numeric(r.SHAPE_ACRE)});}
});
if((shx.length-100)/8!==shapeSchema.count)throw new Error('SHAPE_COUNT_STOP');
geometryAudit.identifiers=countIds(shapeIds);shapeIds.length=0;
for(const c of candidates){const g=geometryMatch(c.land?.APN9,geometry);c.geometry_status=c.land?g.status:'GEOMETRY_NOT_APPLICABLE';c.geometry=g.rows;}
times.geometryLoadJoinMs=performance.now()-time;
const domainRows=profiles.TaxRoll_UseCodes_2026final.domain,domain=new Map(domainRows.map(r=>[r.USE_CODE,r.USE_DESC]));
if(domain.size!==domainRows.length)throw new Error('USE_DOMAIN_DUPLICATE_STOP');
for(const c of candidates){const u=officialCategory(c.land?.USE_CODE,domain);c.use_description=u.description;c.use_category=u.category;
  c.acreage_delta=c.land&&c.geometry_status==='GEOMETRY_EXACT'&&numeric(c.land.ACRES)!==null?Number((c.geometry[0].acres-numeric(c.land.ACRES)).toFixed(5)):null;
  c.anomalies=[];if(c.match_status!=='MATCHED_EXACT')c.anomalies.push(c.match_status);
  else {if(c.situs_status!=='SITUS_PRESENT')c.anomalies.push(c.situs_status);if(c.geometry_status!=='GEOMETRY_EXACT')c.anomalies.push(c.geometry_status);if(['UNKNOWN','OTHER'].includes(c.use_category))c.anomalies.push('USE_CATEGORY_REVIEW');if(c.acreage_delta!==null&&Math.abs(c.acreage_delta)>0.01)c.anomalies.push('ACREAGE_DELTA_GT_0_01');}
  c.manual_review_required=c.anomalies.length>0;
}
const pct=(n,d)=>d?Number((100*n/d).toFixed(4)):0;
function summarize(rows){
  const n=rows.length,exact=rows.filter(c=>c.match_status==='MATCHED_EXACT'),count=fn=>rows.filter(fn).length;
  const counts={'Unique PTS candidates':n};for(const s of ['MATCHED_EXACT','MATCHED_MULTIPLE','UNMATCHED','SOURCE_INVALID'])counts[s]=count(c=>c.match_status===s);
  counts['Exact match with TaxRoll situs']=count(c=>c.situs_status==='SITUS_PRESENT');counts['Additional KIPS-resolved situs']=count(c=>c.kips_status==='KIPS_RESOLVED_EXACT');counts['Exact parcel geometry match']=count(c=>c.geometry_status==='GEOMETRY_EXACT');counts['History-resolvable unmatched']=count(c=>c.match_status==='UNMATCHED'&&c.history_status==='HISTORY_RESOLVABLE');counts['Still unresolved']=count(c=>c.match_status!=='MATCHED_EXACT'&&c.history_status!=='HISTORY_RESOLVABLE');
  const categories=Object.fromEntries(CATEGORIES.map(k=>[k,{count:0,situsPresent:0,LAND_VAL:0,IMP_VAL:0,NET_VAL:0,BASEYR_VAL:0}])),assessment={},situs={},history={},kips={},geo={},anomalies={};
  for(const f of valueFields)assessment[f]={present:0,missing:0,zero:0,negative:0};
  for(const c of rows){increment(situs,c.situs_status);increment(history,c.history_status);increment(kips,c.kips_status);increment(geo,c.geometry_status);for(const a of c.anomalies)increment(anomalies,a);if(!c.land)continue;
    const cat=categories[c.use_category];cat.count++;if(c.situs_status==='SITUS_PRESENT')cat.situsPresent++;
    for(const f of valueFields){const v=numeric(c.land[f]),a=assessment[f];if(v===null)a.missing++;else {a.present++;if(v===0)a.zero++;if(v<0)a.negative++;if(f in cat)cat[f]++;}}
  }
  for(const cat of Object.values(categories))cat.situsRate=cat.count?pct(cat.situsPresent,cat.count):null;
  let funnelRows=rows;const funnel=[];
  for(const [stage,fn] of [['Power-to-Sell',()=>true],['Exact Assessor ATN',c=>c.match_status==='MATCHED_EXACT'],['APN9',c=>!!normalizeApn9(c.land.APN9)],['Situs',c=>c.situs_status==='SITUS_PRESENT'],['Geometry',c=>c.geometry_status==='GEOMETRY_EXACT'],['Use Category',c=>!['UNKNOWN','OTHER'].includes(c.use_category)]]){const previous=funnelRows.length;funnelRows=funnelRows.filter(fn);funnel.push({stage,count:funnelRows.length,percentAll:pct(funnelRows.length,n),percentPrevious:pct(funnelRows.length,previous)});}
  return {denominator:n,exactDenominator:exact.length,table:Object.entries(counts).map(([metric,count])=>({metric,count,percent:pct(count,n)})),situs,history,kips,geometry:geo,categories,assessmentAvailability:assessment,legalDescriptionPresent:count(c=>!!c.land?.LEGAL_DESC),anomalies,manualReviewRequired:count(c=>c.manual_review_required),residentialCount:count(c=>c.land&&['RESIDENTIAL_SINGLE_FAMILY','RESIDENTIAL_MULTI_FAMILY','MANUFACTURED_MOBILE'].includes(c.use_category)),residentialDefinition:'Explicit residential-building categories only; excludes parks, zoning-only descriptions, vacant residential, OTHER/UNKNOWN. Conservative lower bound.',landOnlyAssessment:count(c=>c.land&&numeric(c.land.LAND_VAL)>0&&numeric(c.land.IMP_VAL)===0),situsRateAmongExact:pct(count(c=>c.situs_status==='SITUS_PRESENT'),exact.length),funnel};
}
const high=candidates.filter(c=>c.priority==='HIGH_REVIEW_PRIORITY'),allSummary=summarize(candidates),highSummary=summarize(high);
const duplicateAudit=duplicates.map(rs=>{const c=candidates.find(c=>c.pts_atn===rs[0].atn);return {atn:rs[0].atn,sourceRows:rs,parcelAmountsDiffer:new Set(rs.map(r=>r.parcelAmount)).size>1,ownerTotalsDiffer:new Set(rs.map(r=>r.ownerTotal)).size>1,matchStatus:c.match_status,apn9:c.land?.APN9??null,selectedScore:c.score,priority:c.priority,groupingConclusion:'One candidate per exact source ATN; retain every source row, maximum parcel amount for v1 score. No owner-based merge and no summation.'};});
const safeRow=c=>({local_ref:c.local_ref,raw_pts_atn:c.raw_pts_atn,normalized_pts_atn:c.pts_atn,source_rows:c.sourceRows.map(r=>r.sourceRow).join('|'),priority:c.priority,score:c.score,match_status:c.match_status,matched_assessor_atn:c.land?.ATN??null,apn9:c.land?.APN9??null,assessor_rows:c.matching_land_row_numbers.join('|'),situs_present:c.situs_status==='SITUS_PRESENT',situs_status:c.situs_status,use_code:c.land?.USE_CODE??null,use_description:c.use_description,use_category:c.use_category,roll_type:c.land?.ROLL??null,land_value:c.land?numeric(c.land.LAND_VAL):null,improvement_value:c.land?numeric(c.land.IMP_VAL):null,net_value:c.land?numeric(c.land.NET_VAL):null,baseyear_value:c.land?numeric(c.land.BASEYR_VAL):null,acreage:c.land?numeric(c.land.ACRES):null,legal_description_present:!!c.land?.LEGAL_DESC,history_status:c.history_status,kips_status:c.kips_status,geometry_status:c.geometry_status,geometry_present:c.geometry.some(g=>g.present),shapefile_ids:c.geometry.map(g=>g.fid).join('|'),shape_acres:c.geometry_status==='GEOMETRY_EXACT'?c.geometry[0].acres:null,shape_sqft:c.geometry_status==='GEOMETRY_EXACT'?c.geometry[0].sqft:null,acreage_delta:c.acreage_delta,manual_review_required:c.manual_review_required,notes:c.anomalies.join('|')||'EXACT_IDENTIFIERS_ONLY;COUNTY_FACTS_NOT_MARKET_VALUE'});
const safe=candidates.map(safeRow),examples=[],examplePaths=[['exact+situs',c=>c.situs_status==='SITUS_PRESENT'],['exact+missing situs',c=>c.situs_status==='SITUS_MISSING'],['malformed situs',c=>c.situs_status==='SITUS_MALFORMED'],['exact geometry',c=>c.geometry_status==='GEOMETRY_EXACT'],['no geometry',c=>c.geometry_status==='GEOMETRY_NONE'],['multiple geometry',c=>c.geometry_status==='GEOMETRY_MULTIPLE'],['duplicate PTS',c=>c.sourceRows.length>1],['unmatched/history unproven',c=>c.match_status==='UNMATCHED'],['ambiguous land',c=>c.match_status==='MATCHED_MULTIPLE'],...CATEGORIES.map(k=>[k,c=>c.land&&c.use_category===k])];
const absentExamplePaths=[];for(const [path,predicate] of examplePaths){const c=candidates.find(predicate);if(c)examples.push({path,...safeRow(c)});else absentExamplePaths.push(path);}
const prefix='data/validation/sprint6_2';await mkdir('data/validation',{recursive:true});
const baseline=JSON.parse(await readFile(`${CACHE}/repository-baseline.json`));const changed=[];
for(const f of baseline.files){try{if(f.missing||await fileHash(f.path)!==f.sha256)changed.push(f.path);}catch(e){if(!f.missing)changed.push(f.path);}}
if(changed.length)throw new Error('PROTECTED_BASELINE_CHANGED_STOP');
await gateZip();if(await fileHash(PTS)!==PTS_HASH)throw new Error('PTS_CHANGED_STOP');if(network.attempts)throw new Error('NETWORK_ATTEMPT_STOP');
const sourceFiles=[];for(const folder of Object.keys(profiles)){const name=folder==='Shapefile_Parcels_Land_2026final'?`${shapeDir}.dbf`:dbf(folder);sourceFiles.push({path:name,sha256:await fileHash(name)});}
const sourceAudit={zip:{path:ZIP,sha256:ZIP_HASH,bytes:(await stat(ZIP)).size,edition:'2026 Final; README/extract date 2026-06-26; land metadata updated 2026-08-12'},pts:{path:PTS,sha256:PTS_HASH,rows:input.rows.length,uniqueAtns:groups.size,duplicateAtnValues:duplicates.length,headers:input.headers,priorities,scoreVersion:SCREEN_VERSION},inventory:audit.inventory,dbfProfiles:profiles,land:{schema:landSchema,...landSummary},kips:kipsAudit,history:historyAudit,geometry:geometryAudit,sourceFiles,encoding:'DBF language-driver=0 (unspecified); identifiers ASCII only; text decoded CP1252 for diagnostics, raw sources preserved. No postal normalization.',protectedBaseline:{files:baseline.files.length,unchanged:true},providerCalls:0,networkAttempts:network.attempts,dbConnections:0,dbWrites:0};
await json(`${prefix}-kern-assessor-source-audit.json`,sourceAudit);
await json(`${prefix}-crosswalk-summary.json`,{...allSummary,sourceZipSha256:ZIP_HASH,ptsSha256:PTS_HASH,priorities,duplicateAudit,examples,absentExamplePaths,historyAudit,kipsAudit,geometryAudit,providerCalls:0});
await json(`${prefix}-high-priority-312.json`,{...highSummary,populationHash:hash(high.map(c=>c.pts_atn).sort().join('\n')),scoreVersion:SCREEN_VERSION,candidates:high.map(safeRow),providerCalls:0});
const distribution=new Map();for(const c of candidates.filter(c=>c.land)){const k=c.land.USE_CODE;if(!distribution.has(k))distribution.set(k,{useCode:k,...officialCategory(k,domain),all:0,high:0,situsPresent:0});const d=distribution.get(k);d.all++;if(c.priority==='HIGH_REVIEW_PRIORITY')d.high++;if(c.situs_status==='SITUS_PRESENT')d.situsPresent++;}
await json(`${prefix}-use-code-summary.json`,{officialDomain:domainRows,countyWideUseDistribution:useCodes,candidateDistribution:[...distribution.values()].sort((a,b)=>b.all-a.all||a.useCode.localeCompare(b.useCode)),all:allSummary.categories,high:highSummary.categories,rule:'Description-based conservative research categories; no numeric-prefix or zoning-to-building inference. SAME AS/unknown descriptions require review.',scoreChanged:false});
const headers=Object.keys(safe[0]),cell=v=>v===null?'':`"${String(v).replaceAll('"','""')}"`;
await writeFile(`${prefix}-kern-atn-crosswalk.csv`,headers.join(',')+'\n'+safe.map(r=>headers.map(k=>cell(r[k])).join(',')).join('\n')+'\n');
// Raw county situs retained in ignored cache only; no publication/contact export.
await json(`${CACHE}/exact-situs.json`,candidates.filter(c=>c.land).map(c=>({atn:c.pts_atn,rawCountySitus:c.land.ADDR_SITUS})));
await json(`${prefix}-performance.json`,{zipAuditExtractMs:audit.auditExtractMs,...times,totalRunMs:performance.now()-start,processPeakRssBytes:process.resourceUsage().maxRSS*1024,method:'4 MiB DBF batches; candidate-only land records; ID counters; SHP+SHX read for record existence only. Timings are observational, not benchmark guarantees.',networkAttempts:network.attempts,providerCalls:0,dbConnections:0,dbWrites:0});
console.log(JSON.stringify({all:allSummary,high:highSummary,kips:kipsAudit,history:historyAudit,geometry:geometryAudit,duplicates:duplicateAudit,examples:examples.length,protectedFiles:baseline.files.length,providerCalls:0},null,2));
