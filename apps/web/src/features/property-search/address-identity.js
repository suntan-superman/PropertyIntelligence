const SUFFIXES=Object.freeze({
  STREET:'ST',ST:'ST',AVENUE:'AVE',AVE:'AVE',DRIVE:'DR',DR:'DR',ROAD:'RD',RD:'RD',
  BOULEVARD:'BLVD',BLVD:'BLVD',LANE:'LN',LN:'LN',COURT:'CT',CT:'CT',CIRCLE:'CIR',CIR:'CIR',
  PARKWAY:'PKWY',PKWY:'PKWY',HIGHWAY:'HWY',HWY:'HWY',WAY:'WAY',PLACE:'PL',PL:'PL',
  TERRACE:'TER',TER:'TER',TRAIL:'TRL',TRL:'TRL'
});

const words=value=>String(value??'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
const canonicalText=value=>words(value).join(' ');
const canonicalStreet=value=>{
  const tokens=words(value);
  if(tokens.length&&SUFFIXES[tokens.at(-1)])tokens[tokens.length-1]=SUFFIXES[tokens.at(-1)];
  return tokens.join(' ');
};
const canonicalState=value=>({CALIFORNIA:'CA'}[canonicalText(value)]??canonicalText(value));
const canonicalZip=value=>String(value??'').replace(/\D/g,'').slice(0,5);

export function addressParts(subject={}){
  const supplied=subject.addressComponents??subject.address;
  if(supplied&&typeof supplied==='object')return {
    street:supplied.street??supplied.addressLine1??'',city:supplied.city??subject.city??'',state:supplied.state??'CA',zip:supplied.zip??supplied.postalCode??''
  };
  const parts=String(subject.address??'').split(',').map(part=>part.trim()),tail=parts.slice(2).join(' '),zip=tail.match(/\b\d{5}(?:-\d{4})?\b/)?.[0]??'';
  return {street:parts[0]??'',city:subject.city??parts[1]??'',state:tail.replace(zip,'').trim()||'CA',zip};
}

export function canonicalAddress(value={}){
  const parts=typeof value.address==='string'&&value.street==null?addressParts(value):value;
  return {street:canonicalStreet(parts.street),city:canonicalText(parts.city),state:canonicalState(parts.state||'CA'),zip:canonicalZip(parts.zip??parts.postalCode)};
}

export function retainedAddressIndex(subjects=[]){
  return subjects.map(subject=>({subject,canonical:canonicalAddress(addressParts(subject))})).filter(item=>item.canonical.street&&item.canonical.city&&item.canonical.state);
}

export function retainedSubjectKind(subject={}){
  if(['DURABLE_SAVED','PRELIMINARY_RESEARCH','DISCOVERY_CANDIDATE'].includes(subject.subjectKind))return subject.subjectKind;
  const reviewedPreliminary=typeof subject.propertyRef==='string'&&subject.propertyRef.length>0
    &&typeof subject.valuationRef==='string'&&subject.valuationRef.length>0
    &&typeof subject.reviewDate==='string'&&subject.reviewDate.length>0
    &&/^reviewed preliminary address\b/i.test(String(subject.identityStatus??''));
  return reviewedPreliminary?'PRELIMINARY_RESEARCH':null;
}

export function searchRetainedAddress(input,subjects=[]){
  const query=canonicalAddress(input);
  if(!query.street||!query.city||query.state!=='CA')return {status:'INVALID',query,matches:[]};
  const exact=retainedAddressIndex(subjects).filter(({canonical})=>canonical.street===query.street&&canonical.city===query.city&&canonical.state===query.state&&(!query.zip||!canonical.zip||canonical.zip===query.zip)).map(item=>item.subject);
  const established=exact.filter(subject=>['DURABLE_SAVED','PRELIMINARY_RESEARCH'].includes(retainedSubjectKind(subject)));
  if(established.length===1)return {status:'MATCH',query,matches:established,relatedMatches:exact.filter(subject=>subject!==established[0])};
  return {status:exact.length===1?'MATCH':exact.length>1?'AMBIGUOUS':'NO_MATCH',query,matches:exact,relatedMatches:[]};
}

