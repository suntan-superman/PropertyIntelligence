// Synthetic local QA only. No vendor content or real county identities.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {sha,CODES} from './review-model.js';
import {REVIEW_SCOPE,RETENTION_BASIS} from './google-suggestion.js';
export async function addSyntheticSuggestions(directory,{now=Date.now()}={}){
  if(!/[/\\]identity-review-qa[/\\]synthetic-/.test(directory))throw new Error('SYNTHETIC_ONLY');
  const grants=[];
  for(const code of CODES){
    const packetFile=join(directory,`${code}-review.json`),p=JSON.parse(await readFile(packetFile));
    if(code==='IP-P3'){
      p.addressReview.components.street='3 Synthetic Example CI';p.addressReview.rawCountySitus='3 Synthetic Example CI, Example City';
      delete p.packetSha256;p.packetSha256=sha(JSON.stringify(p));await writeFile(packetFile,JSON.stringify(p,null,2)+'\n');
      const decisionFile=join(directory,`${code}-analyst-decision.json`),decision=JSON.parse(await readFile(decisionFile));decision.packetSha256=p.packetSha256;await writeFile(decisionFile,JSON.stringify(decision,null,2)+'\n');
    }
    const street=code==='IP-P3'?'3 Synthetic Example Circle':p.addressReview.components.street;
    const number=street.split(' ')[0],route=street.slice(number.length+1),receivedAt=new Date(now-60000).toISOString(),expiresAt=new Date(now+3600000).toISOString();
    const pair=(longName,shortName=longName)=>({longName,shortName});
    const diagnostic={pilotCode:code,packetSha256:p.packetSha256,receivedAt,httpStatus:200,googleStatus:'OK',candidateCount:1,
      request:{components:'administrative_area:CA|country:US',suppliedZip:false},
      retention:{deleteOrReviewBy:expiresAt,rawResponseStored:false,noRedistributionOrSharedReuse:true,restrictedTo:'Initiating authorized reviewer; not a shared cache, canonical database or public artifact',terms:'https://cloud.google.com/maps-platform/terms/maps-service-terms#6.-geocoding-api'},
      assessment:{classification:code==='IP-P3'?'PARTIAL/AMBIGUOUS':'EXACT ADDRESS CANDIDATE'},
      candidates:[{formattedAddress:`${street}, Example City, CA 99999, USA`,locationType:'ROOFTOP',partialMatchFieldPresent:false,partialMatch:null,
        components:{street_number:pair(number),route:pair(route,code==='IP-P3'?'Synthetic Example Cir':route),locality:pair('Example City'),administrative_area_level_1:pair('California','CA'),postal_code:pair('99999')},
        owner:'FORBIDDEN_OWNER_SENTINEL',apiKey:'FORBIDDEN_CREDENTIAL_SENTINEL',placeId:'FORBIDDEN_PLACE_ID',coordinates:{latitude:1,longitude:2}}]};
    const folder=join(directory,`google-geocoding-${code.toLowerCase()}`);await mkdir(folder);
    const content=JSON.stringify(diagnostic,null,2)+'\n';await writeFile(join(folder,'diagnostic.json'),content);
    grants.push({pilotCode:code,packetSha256:p.packetSha256,evidenceSha256:sha(content),reviewer:'Synthetic Reviewer',scope:REVIEW_SCOPE,permittedBasis:RETENTION_BASIS,receivedAt,expiresAt,rawResponseStored:false});
  }
  await writeFile(join(directory,'google-review-access.json'),JSON.stringify({schemaVersion:1,authorization:'ASSISTED_ADDRESS_VERIFICATION_V1_LOCAL_REVIEW_ONLY',grants},null,2)+'\n');
  return {directory,now};
}
