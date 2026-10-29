import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {paginateChecklistItems,propertyPhotoCaption,propertyPhotoDateLabel,workspaceReportHtml} from '../src/investment-workspace/report-html.js';
import {reportModel} from '../src/investment-workspace/report-model.js';
import {createCommercialService,ACKNOWLEDGMENT_TEXT,ACKNOWLEDGMENT_VERSION} from '../src/commercial/commercial-service.js';
import {createMemoryCommercialRepository} from '../src/commercial/memory-commercial-repository.js';

const fixture=JSON.parse(await readFile(new URL('./fixtures/pi-v3-2-taft-property-photo-qa.json',import.meta.url),'utf8'));

test('photo captions use professional category fallbacks and distinguish unknown photo dates',()=>{
  assert.equal(propertyPhotoCaption({caption:'',category:'EXTERIOR'}),'Exterior Photo');
  assert.equal(propertyPhotoCaption({category:'REPAIRS_DAMAGE'}),'Property Condition Photo');
  assert.equal(propertyPhotoCaption({caption:'Rear elevation',category:'EXTERIOR'}),'Rear elevation');
  assert.equal(propertyPhotoDateLabel({captureDate:null,uploadedAt:'2026-10-29T10:00:00.000Z'}),'Photo date not provided');
  assert.equal(propertyPhotoDateLabel({captureDate:'2026-10-27',uploadedAt:'2026-10-29T10:00:00.000Z'}),'Photo date: 2026-10-27 · analyst supplied');
  assert.equal(propertyPhotoDateLabel({captureDate:'2026-10-27',captureDateSource:'FILE_METADATA',uploadedAt:'2026-10-29T10:00:00.000Z'}),'Photo date: 2026-10-27 · file metadata');
});

test('checklist pagination is balanced for 3, 6, 9, 12 and 18 item shapes',()=>{
  for(const count of [3,6,9,12,18]){
    const rows=Array.from({length:count},(_,index)=>({category:`Category ${index+1}`,missingInformation:`Missing evidence ${index+1}`,why:'This evidence affects possession, condition, title or investment risk.',recommendedAction:'Obtain and review the current source documentation.',status:'Missing'})),pages=paginateChecklistItems(rows);
    assert.equal(pages.flat().length,count);
    assert.ok(pages.every(page=>page.length<=9));
    if(count<=9)assert.equal(pages.length,1);
    if(pages.length>1)assert.ok(pages.every(page=>page.length>=2),'continuation pages must not be orphaned');
  }
});

test('incomplete-cost terminology changes presentation without changing certified projections',()=>{
  const generatedAt='2026-10-29T18:00:00.000Z',before=reportModel(fixture.property,fixture.scenario,{generatedAt}),html=workspaceReportHtml(fixture.property,fixture.scenario,fixture.evidence,'full',{generatedAt}),after=reportModel(fixture.property,fixture.scenario,{generatedAt});
  assert.match(html,/Gross spread before unentered expenses/);
  assert.match(html,/Illustrative ROI — incomplete costs/);
  assert.deepEqual(after.analysis,before.analysis);
  const projectionHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(projectionHash(after.analysis),projectionHash(before.analysis));
});

test('professional profile remains organization-authorized and is used by new finalizations',async()=>{
  const repository=createMemoryCommercialRepository(),user={uid:'user-one',email:'analyst@example.test',displayName:'Firebase Name',organizationId:'property-intelligence-local',organizationName:'property-intelligence-local',role:'Analyst'};
  await repository.createOrganization({id:user.organizationId,name:'Workside Software, LLC',status:'ACTIVE',billingPolicy:'OWNER_FUNDED',createdBy:user.uid,createdAt:'2026-10-29T00:00:00.000Z'});
  const service=createCommercialService({repository,flags:{ownerOrganizationId:user.organizationId},clock:()=>new Date('2026-10-29T19:00:00.000Z')}),profile=await service.updateProfile({user,displayName:'Professional Analyst',professionalTitle:'Investment Analyst'});
  assert.deepEqual(profile,{displayName:'Professional Analyst',professionalTitle:'Investment Analyst',organizationName:'Workside Software, LLC'});
  const finalization=await service.finalize({user,derived:{outstanding:[]},propertyId:'property-one',scenarioId:'scenario-one',revision:1,evidenceSnapshotId:'snapshot-one',checklistVersion:0,acknowledgment:{accepted:true,version:ACKNOWLEDGMENT_VERSION,text:ACKNOWLEDGMENT_TEXT}});
  assert.equal(finalization.preparedBy.displayName,'Professional Analyst');
  assert.equal(finalization.preparedBy.professionalTitle,'Investment Analyst');
  assert.equal(finalization.organizationName,'Workside Software, LLC');
});

test('occupancy, advertised delivery and possession remain independent evidence facts',()=>{
  const scenario=structuredClone(fixture.scenario);scenario.analystEvidence=[
    {id:'11111111-1111-4111-8111-111111111111',category:'OCCUPANCY',status:'PRESENT',value:'Tenant occupied',verificationClass:'SOURCE_REPORTED',sourceName:'Seller communication',sourceDate:'2026-10-28',includeInReport:true,sensitive:false},
    {id:'22222222-2222-4222-8222-222222222222',category:'DELIVERY_CONDITION',status:'PRESENT',value:'Vacant',verificationClass:'SOURCE_REPORTED',sourceName:'Wholesaler marketing information',sourceDate:'2026-10-28',includeInReport:true,sensitive:false}
  ];
  const model=reportModel(fixture.property,scenario).model;
  assert.equal(model.occupancyDelivery.currentOccupancy.value,'Tenant occupied');
  assert.equal(model.occupancyDelivery.deliveryCondition.value,'Vacant');
  assert.equal(model.occupancyDelivery.deliveryCondition.verification,'Source-reported / not independently verified');
  assert.equal(model.occupancyDelivery.possessionConfirmation,null);
  assert.ok(model.dueDiligenceChecklist.outstanding.some(item=>/possession/i.test(`${item.missingInformation} ${item.recommendedAction}`)));
});

test('UI exposes the focused occupancy workflow, report single-flight guards and modern Google markers',async()=>{
  const [workspace,checklist,map]=await Promise.all([readFile(new URL('../apps/web/src/features/investment-workspace/Workspace.jsx',import.meta.url),'utf8'),readFile(new URL('../apps/web/src/features/investment-workspace/InteractiveChecklist.jsx',import.meta.url),'utf8'),readFile(new URL('../apps/web/src/features/comps-map/googleMap.js',import.meta.url),'utf8')]);
  assert.match(workspace,/Record advertised vacant delivery/);
  assert.match(workspace,/Wholesaler marketing information/);
  assert.match(workspace,/reportRequest=useRef\(false\)/);
  assert.match(checklist,/Finalization is already in progress/);
  assert.match(map,/AdvancedMarkerElement/);
  assert.doesNotMatch(map,/new maps\.Marker/);
});
