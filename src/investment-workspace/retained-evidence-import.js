import {loadEvidence} from './evidence.js';
import {addPropertyDetails} from './property-detail.js';
import {addRetainedPropertyResearch} from './retained-property-research.js';
import {addCachedPropertyResearch,restoreDurablePropertyEvidence} from './automatic-property-research.js';
import {createRetainedEvidenceRecord} from './firestore-retained-evidence.js';

export async function buildLocalRetainedEvidenceRecords({root=process.cwd(),organizationId,durableRecords=[],importedAt=new Date().toISOString(),importedBy}={}){
  let evidence=await loadEvidence(root);
  evidence=await addPropertyDetails(evidence,root);
  evidence=await addRetainedPropertyResearch(evidence,root);
  evidence=await addCachedPropertyResearch(evidence);
  evidence=await restoreDurablePropertyEvidence(evidence,durableRecords);
  const details=new Map((evidence.propertyDetails??[]).map(detail=>[detail.subjectRef,detail])),durableRefs=new Set(durableRecords.map(item=>item.sourceSubjectRef));
  const records=evidence.properties.map(property=>createRetainedEvidenceRecord({organizationId,property,propertyDetail:details.get(property.ref)??null,classification:durableRefs.has(property.ref)||property.subjectKind==='DURABLE_SAVED'?'DURABLE_SAVED':property.ref.startsWith('GABE-')?'QA_RETAINED_FIXTURE':'RETAINED_RESEARCH',importedAt,importedBy}));
  if(new Set(records.map(record=>record.subjectRef)).size!==records.length)throw new Error('DUPLICATE_RETAINED_SUBJECT');
  return {records,evidence};
}
