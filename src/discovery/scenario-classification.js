const QA_NAME=/(^|\b)(QA|FIXTURE|SYNTHETIC)(\b|$)|ARTIFICIAL DEMONSTRATION/i;
const QA_NOTES=/\b(QA DEMONSTRATION|ARTIFICIAL QA|SYNTHETIC OFFLINE|TEST FIXTURE)\b/i;

export function classifyScenarioRecord(record={}){
  const reasons=[];
  if(record.demonstration===true)reasons.push('demonstration=true');
  if(QA_NAME.test(String(record.name??'')))reasons.push('QA/test name marker');
  if(QA_NOTES.test(String(record.notes??'')))reasons.push('QA/test notes marker');
  if(['QA','TEST','FIXTURE','SYNTHETIC'].includes(String(record.sourceMetadata?.purpose??record.sourcePurpose??'').toUpperCase()))reasons.push('explicit source metadata marker');
  return {classification:reasons.length?'CONFIRMED_QA':'USER_OR_UNCLASSIFIED',reasons};
}

export const ordinaryScenario=record=>classifyScenarioRecord(record).classification!=='CONFIRMED_QA';
