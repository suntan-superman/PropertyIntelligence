export const LEAD_CONTRACT_VERSION='pi.lead-intake.v1';
export const LEAD_STATES=Object.freeze(['NEW','NEEDS_REVIEW','IN_RESEARCH','UNDERWRITTEN','ARCHIVED']);
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/,ZIP=/^\d{5}(?:-\d{4})?$/,ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{5,119}$/;
const text=(value,max)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const url=value=>{try{const parsed=new URL(text(value,800));return parsed.protocol==='https:'?parsed.toString():'';}catch{return '';}};
const boolean=value=>value===true;

export function validateLeadEnvelope(input){
  const source=input&&typeof input==='object'?input:{},errors={};
  const lead={
    contractVersion:text(source.contractVersion,40),
    source:text(source.source,80).toLowerCase(),
    externalLeadId:text(source.externalLeadId,120),
    submittedAt:text(source.submittedAt,40),
    origin:{site:text(source.origin?.site,100).toLowerCase(),form:text(source.origin?.form,80),landingPath:text(source.origin?.landingPath,240)},
    address:{line1:text(source.address?.line1,240),city:text(source.address?.city,100),state:text(source.address?.state,2).toUpperCase(),postalCode:text(source.address?.postalCode,10)},
    contact:{name:text(source.contact?.name,160),preferred:text(source.contact?.preferred,10),email:text(source.contact?.email,160).toLowerCase(),phone:text(source.contact?.phone,30)},
    consent:{privacyAcknowledged:boolean(source.consent?.privacyAcknowledged),privacyVersion:text(source.consent?.privacyVersion,60),marketingConsent:boolean(source.consent?.marketingConsent),capturedAt:text(source.consent?.capturedAt,40)},
    sellerStatements:{propertyType:text(source.sellerStatements?.propertyType,80),condition:text(source.sellerStatements?.condition,120),occupancy:text(source.sellerStatements?.occupancy,80),desiredTiming:text(source.sellerStatements?.desiredTiming,80),comments:text(source.sellerStatements?.comments,2000)},
    photoReferences:Array.isArray(source.photoReferences)?source.photoReferences.slice(0,20).map(item=>({reference:text(item?.reference,160),url:url(item?.url),mediaType:text(item?.mediaType,80)})):[]
  };
  if(lead.contractVersion!==LEAD_CONTRACT_VERSION)errors.contractVersion='Unsupported lead contract version.';
  if(lead.source!=='sellmykernhome.com'||lead.origin.site!=='sellmykernhome.com')errors.source='Unexpected lead source.';
  if(!ID.test(lead.externalLeadId))errors.externalLeadId='External lead ID is invalid.';
  const submitted=Date.parse(lead.submittedAt);if(!Number.isFinite(submitted)||Math.abs(Date.now()-submitted)>7*24*60*60*1000)errors.submittedAt='Submission time is missing or outside the accepted intake window.';
  if(lead.address.line1.length<4)errors.address='Street address is required.';
  if(lead.address.city.length<2||lead.address.state!=='CA'||!ZIP.test(lead.address.postalCode))errors.address='A valid California city, state and ZIP are required.';
  if(lead.contact.name.length<2)errors.contact='Seller name is required.';
  if(!['email','phone'].includes(lead.contact.preferred))errors.contact='Preferred contact must be email or phone.';
  if(lead.contact.preferred==='email'&&!EMAIL.test(lead.contact.email))errors.contact='A valid preferred email is required.';
  if(lead.contact.preferred==='phone'&&lead.contact.phone.replace(/\D/g,'').length<10)errors.contact='A valid preferred phone is required.';
  if(!lead.consent.privacyAcknowledged||!lead.consent.privacyVersion||!Number.isFinite(Date.parse(lead.consent.capturedAt)))errors.consent='Privacy consent evidence is required.';
  if(lead.photoReferences.some(item=>!item.reference||!item.url))errors.photoReferences='Photos must be private HTTPS references; binary uploads are not accepted.';
  return {valid:Object.keys(errors).length===0,lead,errors};
}

export function sellMyKernHomeRecordToEnvelope(record){
  return {
    contractVersion:LEAD_CONTRACT_VERSION,source:'sellmykernhome.com',externalLeadId:record.submission_token,submittedAt:record.created_at,
    origin:{site:record.source_site,form:'seller_inquiry',landingPath:record.attribution?.landing_url?new URL(record.attribution.landing_url).pathname:''},
    address:{line1:record.property_address,city:record.property_city,state:'CA',postalCode:record.property_zip},
    contact:{name:[record.first_name,record.last_name].filter(Boolean).join(' '),preferred:record.preferred_contact,email:record.email,phone:record.phone},
    consent:{privacyAcknowledged:record.consent?.privacy_acknowledged===true,privacyVersion:record.consent?.privacy_version,marketingConsent:record.consent?.marketing_consent===true,capturedAt:record.consent?.privacy_at},
    sellerStatements:{propertyType:record.property_type,condition:record.property_condition,occupancy:record.occupancy,desiredTiming:record.desired_timing,comments:record.message},photoReferences:[]
  };
}
