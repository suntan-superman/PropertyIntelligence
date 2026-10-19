const SUFFIXES=Object.freeze({
  road:'Rd',drive:'Dr',street:'St',avenue:'Ave',boulevard:'Blvd',lane:'Ln',court:'Ct',trail:'Trl',highway:'Hwy',parkway:'Pkwy',place:'Pl',circle:'Cir',terrace:'Ter'
});
const RESERVED=/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

function dateInZone(value,timeZone){
  const parsed=new Date(value);
  if(Number.isNaN(parsed.getTime()))throw new Error('A valid report-generation timestamp is required.');
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(parsed).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function safePart(value){
  let text=String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/\.{2,}/g,' ').replace(/[^A-Za-z0-9-]+/g,'_').replace(/^[_\. -]+|[_\. -]+$/g,'').replace(/_+/g,'_');
  if(RESERVED.test(text))text=`Property_${text}`;
  return text;
}
function normalizeStreet(street){
  const words=String(street??'').trim().split(/\s+/);
  for(let index=0;index<words.length;index++){const key=words[index].toLowerCase().replace(/[.,]$/g,''),next=words[index+1]??'';if(SUFFIXES[key]&&(index===words.length-1||/^(?:unit|apt|apartment|suite|ste|#)/i.test(next)))words[index]=SUFFIXES[key];}
  return words.join(' ');
}
function addressParts(property){
  const structured=property?.addressComponents??{};
  if(structured.street||structured.city||structured.state||structured.zip)return {street:structured.street,city:structured.city,state:structured.state,zip:structured.zip};
  const parts=String(property?.address??'').split(',').map(part=>part.trim()),stateZip=(parts[2]??'').match(/^([A-Za-z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/);
  return {street:parts[0],city:parts[1],state:stateZip?.[1],zip:stateZip?.[2]};
}
function compactReference(value){return safePart(value).replace(/^(?:PROPERTY|RESEARCH|GABE)[_-]?/i,'').slice(-12)||'Property';}

export function reportFilename({property,scenario,kind,generatedAt=new Date().toISOString(),timeZone='America/Los_Angeles'}={}){
  if(!property||!scenario||!['brief','full'].includes(kind)||!Number.isInteger(Number(scenario.revision))||Number(scenario.revision)<1)throw new Error('A saved property, revision and supported report kind are required.');
  const address=addressParts(property),location=[safePart(normalizeStreet(address.street)),safePart(address.city),safePart(address.state),safePart(address.zip)].filter(Boolean),fallback=`Property_${compactReference(property.ref??scenario.propertyRef)}`;
  const propertyName=location.length>=2?location.join('_'):fallback,label=kind==='brief'?'Opportunity_Brief':'Full_Investor_Package',suffix=`_${label}_${dateInZone(generatedAt,timeZone)}_R${Number(scenario.revision)}.pdf`,maximum=180;
  const allowed=Math.max(24,maximum-suffix.length),trimmed=propertyName.slice(0,allowed).replace(/[_\. -]+$/g,'')||fallback.slice(0,allowed);
  return `${trimmed}${suffix}`;
}

export function resolveReportFilenameCollision(filename,existing=[],propertyRef='Property'){
  const used=new Set(existing.map(value=>String(value).toLowerCase()));
  if(!used.has(filename.toLowerCase()))return filename;
  const suffix=`_${compactReference(propertyRef)}`,extension='.pdf',stem=filename.slice(0,-extension.length),candidate=`${stem.slice(0,180-extension.length-suffix.length)}${suffix}${extension}`;
  if(!used.has(candidate.toLowerCase()))return candidate;
  for(let ordinal=2;ordinal<1000;ordinal++){
    const numbered=`_${compactReference(propertyRef)}_${ordinal}`,next=`${stem.slice(0,180-extension.length-numbered.length)}${numbered}${extension}`;
    if(!used.has(next.toLowerCase()))return next;
  }
  throw new Error('Unable to allocate a unique report filename.');
}

