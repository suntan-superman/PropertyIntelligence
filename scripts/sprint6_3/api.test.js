import '../sprint6_2/offline.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {filters,safeAssessor,safeOpportunity,safeOpportunityDetail,safeOpportunityList,assessorOptions} from '../../src/persistence/assessorOpportunityRepository.js';
import {safeOpportunityMetrics} from '../../src/services/opportunityService.js';
import {createApi} from '../../src/workbench/api/router.js';
test('presets filter original High priority and exact conservative use categories',()=>{
  assert.deepEqual(filters({preset:'HIGH_SFR'}),{priority:'HIGH_REVIEW_PRIORITY',categories:['RESIDENTIAL_SINGLE_FAMILY'],exact:'MATCHED_EXACT',hasSitus:false,geometry:false,review:false});
  assert.equal(filters({preset:'HIGH_RESIDENTIAL'}).categories.length,3);
  assert.deepEqual(filters({category:'OTHER_UNKNOWN'}).categories,['OTHER','UNKNOWN']);
  assert.throws(()=>filters({category:"'; DROP TABLE public.properties;--"}),/INVALID_ASSESSOR_FILTER/);
});
test('detail projection excludes source owners, contact payloads and review notes',()=>{
  const input={id:'test',atn:'00000000001',normalized_owner_name:'PRIVATE_SENTINEL',records:[{id:'r',source_row_number:2,owner_name:'PRIVATE_SENTINEL',raw_payload:{contact:'PRIVATE_SENTINEL'}}],signals:[{id:'s',signal_type:'ATN_PRESENT',evidence_payload:{owner:'PRIVATE_SENTINEL'}}],reviews:[{id:'v',notes:'PRIVATE_SENTINEL'}]};
  const safe=safeOpportunity(input);assert.doesNotMatch(JSON.stringify(safe),/PRIVATE_SENTINEL|owner|contact|raw_payload/);assert.equal(safe.records[0].source_row_number,2);
});
test('candidate detail contract exposes screening evidence without raw persistence fields',()=>{
  const detail=safeOpportunityDetail({id:'c',atn:'00000000001',candidate_key:'k',priority_band:'HIGH_REVIEW_PRIORITY',screening_score:65,score_version:'kern-screen-v1',identity_status:'UNRESOLVED',candidate_status:'NEEDS_ADDRESS',resolved_property_id:null,records:[{id:'r',source_row_number:2,source_page:7,edition:'2026 Final',source_date:'2026-06-26',amount_owed:'0.00',owner_name:'PRIVATE'}],canonical_address:null,linked_deal_count:0},{id:'a',crosswalk_status:'UNMATCHED',situs_raw:null,situs_status:'SITUS_MISSING',county_acres:'0.00000',county_acres_status:'EXPLICIT_ZERO',owner_name:'PRIVATE',provenance_payload:{secret:'PRIVATE'}});
  assert.equal(detail.distress.amountOwed,'0.00');assert.equal(detail.distress.source,'KERN_POWER_TO_SELL');assert.equal(detail.distress.sourceEdition,'2026 Final');assert.equal(detail.assessor.county_acres_status,'EXPLICIT_ZERO');assert.equal(detail.linkage.dealCount,0);assert.equal(detail.addressResolution.status,'NOT_RESOLVED');assert.doesNotMatch(JSON.stringify(detail),/PRIVATE|provenance_payload|owner_name|raw_payload/i);
});
test('county Analyze requires both confirmations before database or provider access',async()=>{
  let calls=0;const api=createApi({persistence:{transaction:()=>{calls++;throw new Error('UNEXPECTED_DATABASE_CALL');}},live:{analyze:()=>{calls++;throw new Error('UNEXPECTED_PROVIDER_CALL');}}});
  for(const body of [{},{confirmProviderCall:true},{acknowledgeQuota:true}]){
    const result=await api(new Request('http://127.0.0.1/api/opportunities/00000000-0000-4000-8000-000000000001/analyze',{method:'POST',headers:{Origin:'http://127.0.0.1','Content-Type':'application/json'},body:JSON.stringify(body)}));
    assert.equal(result.status,409);assert.equal((await result.json()).error,'ENRICHMENT_CONFIRMATION_REQUIRED');
  }
  assert.equal(calls,0);
});
test('API filter parameters are explicitly allowlisted',()=>{
  const options=assessorOptions(new URL('http://localhost/?category=COMMERCIAL&owner=PRIVATE&hasSitus=true'));
  assert.equal(options.category,'COMMERCIAL');assert.equal(options.hasSitus,'true');assert.equal(options.owner,undefined);
});
test('Opportunity API projections allowlist hostile provenance and preserve approved evidence',()=>{
  const hostile={id:'a',candidate_id:'c',import_batch_id:'b',assessor_source_edition:'2026 Final',assessor_source_date:'2026-06-26',pts_atn_raw:'123-456-78-90-1',pts_atn_normalized:'12345678901',assessor_atn_raw:'12345678901',assessor_atn_normalized:'12345678901',crosswalk_status:'MATCHED_EXACT',apn9:'123456789',situs_raw:'1 Safe St',situs_status:'SITUS_PRESENT',use_code:'0100',use_description:'SFR',research_use_category:'RESIDENTIAL_SINGLE_FAMILY',mapping_version:'kern-use-map-v1',land_assessment:'1.00000',improvement_assessment:'2.00000',net_assessment:'3.00000',base_year_status:'VALUE_MISSING',county_acres:'0.00000',county_acres_status:'EXPLICIT_ZERO',geometry_status:'GEOMETRY_EXACT',shape_sqft:'1.00000',shape_acres:'1.00000',acreage_delta:'0.00000',review_flags:[],source_reference:'C:\\Users\\private\\data\\raw\\private-source.csv',owner_name:'PRIVATE_OWNER',billing_address:'PRIVATE_BILLING',care_of:'PRIVATE_CARE',dba:'PRIVATE_DBA',phone:'555',email:'private@example.com',raw_payload:{nested:'PRIVATE_RAW'},provenance_payload:{future_owner_name:'PRIVATE_FUTURE'},future_key:'PRIVATE_FUTURE'};
  const safe=safeAssessor(hostile);const list=safeOpportunityList({id:'c',candidate_key:'k',atn:'12345678901',priority_band:'HIGH_REVIEW_PRIORITY',screening_score:65,score_version:'kern-screen-v1',identity_status:'UNRESOLVED',candidate_status:'NEEDS_ADDRESS',assessor:hostile,provenance_payload:{future:'PRIVATE'}});const metrics=safeOpportunityMetrics({source:{provenance_payload:hostile,source_name:'PRIVATE',source_file_hash:'PRIVATE'},counts:{records:1,candidates:1},quality:{records:1}});const serialized=JSON.stringify({safe,list,metrics});
  assert.doesNotMatch(serialized,/owner_name|billing_address|care_of|dba|phone|email|raw_payload|provenance_payload|data\/raw|C:\\Users|private-source\.csv|PRIVATE_/i);
  assert.equal(safe.pts_atn_normalized,'12345678901');assert.equal(safe.apn9,'123456789');assert.equal(safe.research_use_category,'RESIDENTIAL_SINGLE_FAMILY');assert.equal(safe.source_type,'KERN_COUNTY_ASSESSOR');assert.equal(safe.county,'Kern County');
  assert.deepEqual(metrics,{counts:{records:1,candidates:1},quality:{records:1}});assert.equal(list.assessor.net_assessment,'3.00000');
});
