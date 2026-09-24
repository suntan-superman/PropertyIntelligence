export function normalizeAtn(raw){
  if(typeof raw!=='string')return null;const s=raw.trim();
  if(/^\d{11}$/.test(s))return s;
  return /^\d{3}-\d{3}-\d{2}-\d{2}-\d$/.test(s)?s.replaceAll('-',''):null;
}
export function normalizeApn9(raw){return typeof raw==='string'&&/^\d{9}$/.test(raw.trim())?raw.trim():null;}
export function matchAtn(raw,index){const id=normalizeAtn(raw);if(!id)return {status:'SOURCE_INVALID',rows:[]};const rows=index.get(id)??[];return {status:rows.length===1?'MATCHED_EXACT':rows.length>1?'MATCHED_MULTIPLE':'UNMATCHED',rows};}
export function situsStatus(raw){
  if(typeof raw!=='string'||!raw.trim())return 'SITUS_MISSING';
  const s=raw.trim();
  // Presence is not postal validity: only reject explicit placeholders/control text.
  return /[\x00-\x1f\x7f\ufffd]/.test(s)||/^(?:0+|N\/?A|NONE|UNKNOWN|NOT AVAILABLE|NULL|[-?]+)$/i.test(s)||!/[A-Za-z]/.test(s)?'SITUS_MALFORMED':'SITUS_PRESENT';
}
export function numeric(raw){return typeof raw==='string'&&/^-?\d+(?:\.\d+)?$/.test(raw.trim())&&Number.isFinite(Number(raw))?Number(raw):null;}
export function kipsStatus(match,situs,proof=null){
  if(match!=='MATCHED_EXACT'||situs!=='SITUS_MISSING')return 'KIPS_NOT_APPLICABLE';
  if(!proof?.documentedRelationship||!proof?.exactKey)return 'KIPS_JOIN_UNPROVEN';
  // A proven relation still requires one valid situs, never a tie break.
  return proof.rows?.length===1&&situsStatus(proof.rows[0])==='SITUS_PRESENT'?'KIPS_RESOLVED_EXACT':proof.rows?.length>1?'KIPS_AMBIGUOUS':'KIPS_UNRESOLVED';
}
export function historyStatus(match,proof=null){
  if(match==='MATCHED_EXACT'||match==='SOURCE_INVALID')return 'HISTORY_NOT_APPLICABLE';
  if(!proof?.documentedRelationship||!proof?.startApn9||!normalizeApn9(proof.startApn9))return 'HISTORY_UNPROVEN';
  const chains=proof.chains??[];
  if(chains.length!==1||chains.some(c=>c.branch||c.merge||c.cycle||!c.terminalExact))return 'HISTORY_AMBIGUOUS';
  return 'HISTORY_RESOLVABLE';
}
export function geometryMatch(apn,index){
  const key=normalizeApn9(apn),rows=key?(index.get(key)??[]):[];
  return {status:rows.length>1?'GEOMETRY_MULTIPLE':rows.length===1&&rows[0].present?'GEOMETRY_EXACT':'GEOMETRY_NONE',rows};
}
export const CATEGORIES=['RESIDENTIAL_SINGLE_FAMILY','RESIDENTIAL_MULTI_FAMILY','MANUFACTURED_MOBILE','VACANT_RESIDENTIAL','VACANT_OTHER','COMMERCIAL','INDUSTRIAL','AGRICULTURAL','GOVERNMENT_EXEMPT','MINERAL','OTHER','UNKNOWN'];
// Description-only, conservative research rules. Never interpret numeric prefixes.
export function categoryForDescription(desc){
  if(!desc||/UNKNOWN|NOT USED|NO USE CODE|INACTIVATED|REPLACED BY|^SAME AS/.test(desc))return 'UNKNOWN';
  if(/^VAC/.test(desc))return /MANUFTD HOME SUBDIVISION|RESIDENTIAL/.test(desc)?'VACANT_RESIDENTIAL':'VACANT_OTHER';
  if(/^UNDEVELOPED LAND/.test(desc))return 'VACANT_OTHER';
  if(/^(SGL FAM RES|SFR (?:NOT|ON))/.test(desc))return 'RESIDENTIAL_SINGLE_FAMILY';
  if(/DUPLEX|TRIPLEX|FOURPLEX|\b[234] SEPARATE RES|\b[234] LIV UN|\bUNIT COMPLEX|RES COMBO/.test(desc))return 'RESIDENTIAL_MULTI_FAMILY';
  if(/^MH (NO PERM|PERM)|^MLTP MHS|^MODULAR HOME|^UNSECURED MH|^LICENSED MH|^MS & T ZONING W\/LIC MH/.test(desc))return 'MANUFACTURED_MOBILE';
  if(/^(U S A|STATE OF CALIFORNIA|COUNTY OF KERN|INCORPORATED CITY|SCHOOL OWNED|SPECIAL DISTRICTS|REDEVELOPMENT AGENCY|QUASI GOVERNMENT PROPERTY)$|\bEXEMPT\b/.test(desc))return 'GOVERNMENT_EXEMPT';
  if(/MINERAL RIGHTS|RESERVE MR|MINING CLAIMS|^MINE & QUARRIES/.test(desc))return 'MINERAL';
  if(/ORCHARD|CITRUS|FRUIT|ALMOND|PISTACHIO|WALNUT|PECAN|ORANGE|LEMON|GRAPEFRUIT|TANGERINE|MANDARIN|PLUM|PEACH|NECTARINE|APRICOT|CHERRY|PRUNE|APPLE|PEAR|OLIVE|^FIG$|PERSIMMON|POMEGRANATE|GRAPE VINES|TABLE GRAPE|WINE GRAPE|RAISIN|^VINE AND|VINDYARDS|BLUEBERRY|IRRIGATED LAND|^IRR LAND|GRAZING|DRY FARM|^DAIRY$|^FEEDLOT|^LIVESTOCK|^CATTLE$|^HORSES$|RANCH HDQTRS|FARM LABOR|^AG POSSESSORY|TIMBER PRODUCTION/.test(desc)&&! /RETAIL|STAND|PLANT|PROCESSING/.test(desc))return 'AGRICULTURAL';
  if(/INDUSTRIAL|^LIGHT MFG|^HEAVY |FOUNDRY|FABRICATION|REFINERIES|SAW MILL|PLANING MILL|FOOD PROCESSING|WAREHOUSE|^STORAGE|ENERGY GENERATION|WIND PARK|SOLAR PARK|GEOTHERMAL|CO-GENERATION|BATTERY STORAGE|OIL PUMPING|GAS PLANT|COTTON GIN|PACKING SHED/.test(desc))return 'INDUSTRIAL';
  if(/COMMERCIAL|\bRETAIL\b|^OFFICE |SHOPPING CENTER|^MARKETS$|SUPERMARKET|GROCERY|^HOTEL|^MOTEL|RESTAURANT|^CAFES|COFFEE SHOP|BAR OR TAVERN|^BANK$|SAVINGS & LOAN|^SALES-|\bSALES\b|SERVICE\/REPAIR|AUTO REPAIR|CAR WASH|MANUFACTURED HOME PARK|MANUFTD HOME PARK|RV\/TRAILER PARK|RV\/MH PARK/.test(desc))return 'COMMERCIAL';
  return 'OTHER';
}
export function officialCategory(code,domain){const description=domain.get(code);return {description:description??null,category:categoryForDescription(description)};}
export function increment(o,k){o[k]=(o[k]??0)+1;}
export function countIds(values){const counts=new Map();let missing=0,invalid=0;for(const [raw,id] of values){if(!raw)missing++;else if(!id)invalid++;else counts.set(id,(counts.get(id)??0)+1);}return {nonNull:values.length-missing,missing,invalid,distinct:counts.size,duplicateValues:[...counts.values()].filter(n=>n>1).length,duplicateExcess:[...counts.values()].reduce((a,n)=>a+Math.max(0,n-1),0)};}
