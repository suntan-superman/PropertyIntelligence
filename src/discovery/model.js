import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseCsv,parseAmount} from '../sources/kern/csv.js';
import {normalizeAtn,normalizeApn9} from '../../scripts/sprint6_2/core.js';
import {isResidentialCategory,scoreResidentialScreening} from './screening.js';
import {DISCOVERY_LIMITS} from './config.js';

const PATHS=Object.freeze({
  manifest:'data/runtime/mls-round1/private-candidate-eligibility.json',
  crosswalk:'data/validation/sprint6_2-kern-atn-crosswalk.csv',
  powerToSell:'data/raw/kern_power_to_sell_2026-09-15.csv',
  situs:'data/runtime/sprint6_2-kern-assessor/exact-situs.json',
  exclusion:'data/validation/sprint6_3_3-reconciliation-dry-run.json'
});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const records=text=>{const parsed=parseCsv(text);return parsed.rows.map(values=>Object.fromEntries(parsed.headers.map((key,index)=>[key,values[index]??''])));};
const assert=(condition,message)=>{if(!condition)throw new Error(`DISCOVERY_SOURCE_STOP:${message}`);};
const amount=value=>{const n=parseAmount(value);return n&&typeof n==='object'&&n.invalid?null:n;};
const safeDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value??''))?String(value):null;

export function parseCountySitus(raw){
  const text=String(raw??'').trim();if(!text)return {rawCountySitus:'',street:'',city:'',state:'CA',postalCode:null,postalCodeExtension:null,formatted:'No county situs',stateBasis:'KERN_COUNTY_JURISDICTION',postalStatus:'NOT_PRESENT'};
  const parts=text.split(',').map(v=>v.trim()).filter(Boolean),street=parts.shift()??'';
  const locale=parts.join(', '),match=locale.match(/^(.*?)(?:\s+(\d{5})(?:-(\d{4}))?)?$/),city=match?.[1]?.trim()??locale,postalCode=match?.[2]??null;
  return {rawCountySitus:text,street,city,state:'CA',postalCode,postalCodeExtension:match?.[3]??null,
    formatted:[street,city,`CA${postalCode?` ${postalCode}`:''}`].filter(Boolean).join(', '),
    stateBasis:'KERN_COUNTY_JURISDICTION',postalStatus:postalCode?'COUNTY_SITUS_VALUE_PRESENT_NOT_POSTAL_VALIDATED':'NOT_PRESENT'};
}

export function discoveryProperty(candidate,fingerprint){
  return {ref:candidate.id,evidenceFingerprint:fingerprint,subjectKind:'DISCOVERY_CANDIDATE',address:candidate.address.formatted,city:candidate.address.city,
    attributes:{propertyType:candidate.propertyType.description||'Single Family Residence',bedrooms:null,bathrooms:null,squareFootage:null,lotSize:candidate.assessor.shapeSquareFeet,yearBuilt:null,lastSaleDate:null,lastSalePrice:null},
    avm:{price:null,low:null,high:null},propertyRef:`${candidate.source.name} · ${candidate.source.reference}`,valuationRef:'Valuation not checked',
    propertyRetrievedAt:null,valuationRetrievedAt:null,providerAsOf:null,valuationAsOf:null,reviewDate:null,
    identityStatus:'Preliminary county candidate; county identifiers retained separately and legal parcel identity is not verified',
    historicalTrigger:{kind:'HISTORICAL_POWER_TO_SELL',amount:candidate.historicalAmount,sourceDate:candidate.source.observedDate,sourceRef:candidate.source.reference,
      meaning:'Historical county list appearance; not a current tax balance, current default, foreclosure status, seller availability or motivation'},
    countyUse:{code:candidate.propertyType.code,sourceRef:`${candidate.source.assessorEdition} · ${candidate.source.assessorDate}`},sales:[],listings:[],
    saleSearch:{retrievedAt:null,returned:null,eligible:null,radius:null,partial:null},findings:[...candidate.evidenceGaps],discovery:candidate};
}

function discoveryDetail(property,fingerprint){
  const c=property.discovery;
  return {id:c.id,subjectRef:c.id,subjectKind:'DISCOVERY_CANDIDATE',evidenceSnapshotId:fingerprint,evidenceFingerprint:fingerprint,digest:fingerprint+c.id,
    mode:'property',state:'READY_PROPERTY',resolutionStatus:'PRELIMINARY COUNTY CANDIDATE',address:property.address,
    property:{...property.attributes,squareFeet:property.attributes.squareFootage,coordinates:null,valuation:property.avm},comps:[],metrics:[],
    provenance:[{source:c.source.name}],cache:{retrievedAt:[c.source.observedDate],source:`${c.source.name} · retained local snapshot`},
    valuationReference:'Not checked / not available',valuationAsOf:null,valuationStatus:'NOT_CHECKED',findings:property.findings};
}

export function addDiscoveryEvidence(evidence,discovery){
  const properties=discovery.candidates.map(c=>discoveryProperty(c,discovery.fingerprint));
  return {...evidence,discovery,properties:[...evidence.properties,...properties],propertyDetails:[...(evidence.propertyDetails??[]),...properties.map(p=>discoveryDetail(p,discovery.fingerprint))]};
}

export async function loadDiscovery(root=process.cwd()){
  const entries=await Promise.all(Object.entries(PATHS).map(async([key,relative])=>{const bytes=await readFile(path.join(root,relative));return [key,{relative,bytes,hash:sha(bytes)}];})),files=Object.fromEntries(entries);
  const manifest=JSON.parse(files.manifest.bytes),crosswalk=records(files.crosswalk.bytes.toString('utf8')),pts=records(files.powerToSell.bytes.toString('utf8')),
    situs=JSON.parse(files.situs.bytes),exclusion=JSON.parse(files.exclusion.bytes);
  assert(manifest.artifact==='PI_MLS_VALIDATION_R1_PRIVATE_ELIGIBILITY_GATE1','private eligibility manifest identity changed');
  assert(manifest.candidates?.length===81&&manifest.sourceScope?.evaluatedPopulation===81,'expected 81 reviewed high-priority SFR records');
  assert(pts.length===11321&&crosswalk.length===11316,'retained county source cardinality changed');
  const excludedAtn=normalizeAtn(exclusion?.candidate?.atn);assert(excludedAtn,'certified fixture exclusion is missing');
  const situsByAtn=new Map(situs.map(row=>[normalizeAtn(row.atn),row.rawCountySitus]));
  const ptsByAtn=new Map();for(const row of pts){const atn=normalizeAtn(row.atn);if(!atn)continue;if(!ptsByAtn.has(atn))ptsByAtn.set(atn,[]);ptsByAtn.get(atn).push(row);}
  const cohort=crosswalk.filter(row=>row.priority==='HIGH_REVIEW_PRIORITY'&&row.use_category==='RESIDENTIAL_SINGLE_FAMILY').sort((a,b)=>a.local_ref.localeCompare(b.local_ref));
  assert(cohort.length===81,'high-priority SFR cohort changed');
  const selected=cohort.filter(row=>normalizeAtn(row.normalized_pts_atn)!==excludedAtn);assert(selected.length===80,'pilot must contain exactly 80 non-excluded records');
  const sourceDates=[...new Set(pts.map(row=>safeDate(row.source_date)).filter(Boolean))];assert(sourceDates.length===1,'source snapshot date is ambiguous');
  const candidates=selected.map((row,index)=>{
    const atn=normalizeAtn(row.normalized_pts_atn),apn9=normalizeApn9(row.apn9),sourceRows=ptsByAtn.get(atn)??[],rawSitus=situsByAtn.get(atn),address=parseCountySitus(rawSitus);
    assert(atn&&apn9&&row.match_status==='MATCHED_EXACT'&&rawSitus&&sourceRows.length,'candidate evidence relationship is incomplete');
    const amounts=sourceRows.map(r=>amount(r.parcel_amount_owed)).filter(Number.isFinite),historicalAmount=amounts.length?Math.max(...amounts):null;
    const timeline=sourceRows.map((source,sequence)=>({id:`${row.local_ref}:PTS:${sequence+1}`,signalType:'HISTORICAL_POWER_TO_SELL',observedDate:safeDate(source.source_date),retrievedAt:null,
      documentReference:null,status:'historical',source:`${source.source} · page ${source.source_page}`,amount:amount(source.parcel_amount_owed),
      explanation:'Appeared in the dated county Power-to-Sell source. This does not establish a current tax balance or present availability.'}));
    const completeness=['COUNTY_IDENTIFIER','ASSESSOR_EXACT_MATCH','COUNTY_SITUS','PROPERTY_CLASSIFICATION','HISTORICAL_SIGNAL',...(address.postalCode?['COUNTY_SITUS_ZIP_PRESENT']:[])];
    return {id:`KERN-PILOT-${String(index+1).padStart(3,'0')}`,candidateReference:row.local_ref,sourceIdentity:{localRef:row.local_ref,atn,apn9,rawAtn:row.raw_pts_atn},address:{...address,state:'CA',evidenceState:'COUNTY_SITUS_PARSED',provenance:'Kern County Assessor 2026 Final exact ATN relationship',confidence:'SOURCE_PARSED_NOT_POSTAL_VALIDATED'},
      propertyType:{code:row.use_code,description:row.use_description,category:row.use_category},historicalAmount,
      strategySuitability:{preset:'RESIDENTIAL_FIX_AND_FLIP',status:'SUPPORTED_CLASSIFICATION',reason:'County use classification is residential single family. Condition, occupancy, resale and profitability remain unverified.'},
      discoveryReason:{type:'HISTORICAL_POWER_TO_SELL',label:'Historical Power-to-Sell list appearance',status:'historical',explanation:'Dated county screening signal only; not current delinquency, foreclosure, equity, motivation or availability.'},
      signals:timeline,timeline,source:{name:'Kern County Power-to-Sell',observedDate:sourceDates[0],retrievedAt:null,reference:`${row.local_ref} · ${sourceRows.map(r=>`page ${r.source_page}`).join(', ')}`,assessorEdition:'2026 Final',assessorDate:'2026-06-26'},
      assessor:{matchStatus:row.match_status,netAssessment:amount(row.net_value),shapeSquareFeet:amount(row.shape_sqft),acreage:amount(row.acreage),reviewRequired:row.manual_review_required==='true'||row.manual_review_required==='1',notes:row.notes||null},
      currentEvidence:{taxDefault:'NOT_CHECKED',nod:'NOT_AVAILABLE_IN_RETAINED_COHORT',trusteeSaleNotice:'NOT_AVAILABLE_IN_RETAINED_COHORT',lien:'NOT_CHECKED',mortgage:'NOT_CHECKED',ownership:'NOT_CHECKED',valuation:'NOT_AVAILABLE'},
      evidenceGaps:['Current tax status not checked.','Recorded NOD and trustee-sale notice coverage unavailable in this retained cohort.','Mortgage, lien/release, ownership and current payoff not checked.','Independent valuation and recorded-sale research not acquired.','County situs is not postal or legal parcel verification.'],
      researchPriority:{band:'HIGH_REVIEW_PRIORITY',completenessCount:completeness.length,completeness,sourceDate:sourceDates[0],reason:'Exact county identifier relationship, county situs, SFR classification and dated historical source signal. No profitability or seller motivation is inferred.'},
      researchStatus:'UNREVIEWED',shortlisted:false};
  });
  assert(new Set(candidates.map(c=>c.id)).size===80&&new Set(candidates.map(c=>c.sourceIdentity.atn)).size===80&&new Set(candidates.map(c=>c.sourceIdentity.apn9)).size===80,'pilot identities are not unique');
  const universe={total:crosswalk.length,countySitusPresent:crosswalk.filter(r=>r.situs_status==='SITUS_PRESENT').length,countySitusMissing:crosswalk.filter(r=>r.situs_status==='SITUS_MISSING').length,countySitusMalformed:crosswalk.filter(r=>r.situs_status==='SITUS_MALFORMED').length,assessorUnmatched:crosswalk.filter(r=>r.match_status==='UNMATCHED').length,geometryAvailable:crosswalk.filter(r=>r.geometry_status==='GEOMETRY_EXACT').length,canonicalOrDurable:'NOT_MEASURED_BY_RETAINED_CROSSWALK'};
  assert(universe.total===11316&&universe.countySitusPresent===1270&&universe.countySitusMissing===9990&&universe.countySitusMalformed===3&&universe.assessorUnmatched===53&&universe.geometryAvailable===11263,'retained source-universe counts changed');
  const counterexampleRow=crosswalk.find(r=>normalizeAtn(r.normalized_pts_atn)==='30927104008');assert(counterexampleRow?.use_description==='CANNABIS PRODUCTION'&&counterexampleRow.geometry_status==='GEOMETRY_EXACT'&&counterexampleRow.situs_status==='SITUS_MISSING','nonresidential counterexample changed');
  const counterexamples=[{reference:'NONRESIDENTIAL-COUNTEREXAMPLE',sourceIdentity:{atn:normalizeAtn(counterexampleRow.normalized_pts_atn),apn9:normalizeApn9(counterexampleRow.apn9)},propertyType:{code:counterexampleRow.use_code,description:counterexampleRow.use_description,category:counterexampleRow.use_category},priority:counterexampleRow.priority,historicalSignal:'HISTORICAL_POWER_TO_SELL',addressState:'NO_COUNTY_SITUS',geometryState:'GEOMETRY_EXACT',geometryContext:{kind:'PARCEL_GEOMETRY',squareFeet:amount(counterexampleRow.shape_sqft),acreage:amount(counterexampleRow.acreage),label:'Parcel geometry available; no street address may be inferred from its centroid or shape.'},strategySuitability:{preset:'RESIDENTIAL_FIX_AND_FLIP',status:'EXCLUDED_NONRESIDENTIAL',reason:'County use description is Cannabis Production; investigation priority is not residential flip suitability.'},reviewFlags:String(counterexampleRow.notes??'').split('|').filter(Boolean)}];
  const candidateByAtn=new Map(candidates.map(candidate=>[candidate.sourceIdentity.atn,candidate]));
  const recordsV16=crosswalk.map((row,index)=>{
    const atn=normalizeAtn(row.normalized_pts_atn),apn9=normalizeApn9(row.apn9),sourceRows=ptsByAtn.get(atn)??[],rawSitus=situsByAtn.get(atn)??'',address=parseCountySitus(rawSitus),pilot=candidateByAtn.get(atn),amounts=sourceRows.map(item=>amount(item.parcel_amount_owed)).filter(Number.isFinite);
    const evidenceState=row.match_status==='UNMATCHED'?'ASSESSOR_UNMATCHED':row.situs_status==='SITUS_MALFORMED'?'MALFORMED_COUNTY_SITUS':address.street&&address.city?'COUNTY_SITUS_PARSED':'NO_COUNTY_SITUS';
    const record={id:pilot?.id??`KERN-COUNTY-${atn||String(index+1).padStart(5,'0')}`,candidateReference:row.local_ref,underwritingReady:!!pilot,
      sourceIdentity:{localRef:row.local_ref,atn:atn||null,apn9:apn9||null},address:{...address,evidenceState,provenance:'Kern County Assessor 2026 Final crosswalk',confidence:address.street?'SOURCE_PARSED_NOT_POSTAL_VALIDATED':'NO_STREET_EVIDENCE'},
      propertyType:{code:row.use_code||null,description:row.use_description||'Unknown',category:row.use_category||'UNKNOWN'},historicalAmount:amounts.length?Math.max(...amounts):null,
      discoveryReason:{type:'HISTORICAL_POWER_TO_SELL',label:'Historical Power-to-Sell list appearance',status:'historical'},source:{name:'Kern County Power-to-Sell',observedDate:sourceDates[0],assessorDate:'2026-06-26'},
      assessor:{matchStatus:row.match_status,reviewRequired:row.manual_review_required==='true'||row.manual_review_required==='1',notes:row.notes||null},
      geometry:{status:row.geometry_status||'UNKNOWN',present:row.geometry_present==='true',sourceIds:row.shapefile_ids||null,squareFeet:amount(row.shape_sqft),acreage:amount(row.shape_acres)||amount(row.acreage),coordinates:null,payloadIncluded:false},
      priorEnrichment:'NONE',researchStatus:'NOT_RESEARCHED',shortlisted:false,isResidentialOpportunity:isResidentialCategory(row.use_category),reviewFlags:String(row.notes??'').split('|').filter(Boolean)};
    record.screening=scoreResidentialScreening(record);return record;
  });
  assert(recordsV16.length===11316&&new Set(recordsV16.map(record=>record.id)).size===11316,'V1.6 source-universe identities changed');
  const fingerprint=sha(Buffer.from(Object.values(files).map(f=>`${f.relative}:${f.hash}`).join('\n'))),cityCounts=Object.fromEntries([...new Set(recordsV16.map(c=>c.address.city).filter(Boolean))].sort().map(city=>[city,recordsV16.filter(c=>c.address.city===city).length]));
  const residentialCount=recordsV16.filter(record=>record.isResidentialOpportunity).length,needsResearchCount=recordsV16.filter(record=>record.address.evidenceState!=='COUNTY_SITUS_PARSED'||record.assessor.matchStatus!=='MATCHED_EXACT'||record.assessor.reviewRequired).length;
  return {version:'PI_DISCOVERY_V1_6',generatedAt:new Date().toISOString(),fingerprint,screeningAsOf:'2026-10-14',sourceSnapshotDate:sourceDates[0],limits:{...DISCOVERY_LIMITS},selection:{rule:'Default Residential Opportunities includes assessor-classified SFR, multi-family, manufactured/mobile and vacant residential records. The preserved 80-record high-readiness SFR pilot remains the underwriting-compatible subset.',eligibleBeforeExclusion:81,excludedFixtures:1,pilotCount:80},universe,counterexamples,
    counts:{candidates:80,bakersfield:candidates.filter(c=>c.address.city==='BAKERSFIELD').length,zipPresent:candidates.filter(c=>c.address.postalCode).length,zip93312:candidates.filter(c=>c.address.postalCode==='93312').length,valuationAvailable:0,currentNodCoverage:0,shortlisted:0},cityCounts,
    filterSupport:{geography:{supported:true},propertyType:{supported:true},historicalTaxList:{supported:true},recordedNod:{supported:false,label:'Unavailable — retained cohort has no current NOD feed'},trusteeSaleNotice:{supported:false,label:'Unavailable — retained cohort has no trustee-sale notice feed'},freshness:{supported:true},researchCompleteness:{supported:true},valuation:{supported:false,label:'Unavailable — no valuation evidence acquired for the pilot'},zip:{supported:false,partial:false,label:'Unavailable — the retained 80-candidate county situs cohort contains no supported ZIP values; ZIP 93312 cannot be evaluated'}},
    importCapability:{csv:true,xlsx:false,pdf:false,explanation:'CSV is supported locally. No existing safe XLSX or reliable PDF extraction library is installed, so those formats are not offered.'},
    viewCounts:{residential:residentialCount,allCountyRecords:recordsV16.length,needsResearch:needsResearchCount},
    sourceFiles:Object.fromEntries(Object.entries(files).map(([key,f])=>[key,{path:f.relative,sha256:f.hash}])),records:recordsV16,candidates};
}
