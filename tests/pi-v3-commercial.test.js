import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {ACKNOWLEDGMENT_TEXT,ACKNOWLEDGMENT_VERSION,createCommercialService,createStripeCheckoutClient,verifyStripeWebhook} from '../src/commercial/commercial-service.js';
import {createStripeReadinessClient} from '../src/commercial/stripe-readiness.js';
import {createMemoryCommercialRepository} from '../src/commercial/memory-commercial-repository.js';
import {ROLES} from '../src/auth/access-control.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {workspaceReportHtml} from '../src/investment-workspace/report-html.js';
import {reportScenario} from './fixtures/workspaceReports.js';

const clock=()=>new Date('2026-10-20T19:30:00.000Z');
const platform={uid:'platform-one',role:ROLES.PLATFORM_ADMINISTRATOR,organizationId:'workside',displayName:'Stan Roy',organizationName:'Workside Software, LLC'};
const analyst={uid:'analyst-one',role:ROLES.ANALYST,organizationId:'gabe-test',displayName:'Beta Analyst',organizationName:'Gabe Test Organization'};
const viewer={uid:'viewer-one',role:ROLES.REPORT_VIEWER,organizationId:'gabe-test'};
const derived={overallStatus:'Preliminary — Material diligence outstanding',counts:{critical:1,important:1,total:2},outstanding:[{priority:'Critical',category:'Title',missingInformation:'Current payoff',why:'Changes proceeds',recommendedAction:'Obtain payoff',status:'Missing'},{priority:'Important',category:'Condition',missingInformation:'Inspection',why:'Changes rehab',recommendedAction:'Inspect',status:'Missing'}],completed:[]};
const bound={propertyId:'property-one',scenarioId:'scenario-one',revision:1,evidenceSnapshotId:'snapshot-one'};

test('Phase A persists checklist progress with optimistic concurrency and immutable finalization attribution',async()=>{
  const repository=createMemoryCommercialRepository(),service=createCommercialService({repository,clock}),first=await service.checklist({user:analyst,derived,...bound});assert.equal(first.persistence.version,0);
  const title=first.outstanding[0].id,saved=await service.saveChecklist({user:analyst,derived,...bound,expectedVersion:0,items:{[title]:{notes:'Requested from lender',assigneeUid:'analyst-one',dueDate:'2026-10-24',status:'UNAVAILABLE'}}});assert.equal(saved.persistence.version,1);assert.equal(saved.outstanding[0].progress.status,'UNAVAILABLE');
  await assert.rejects(()=>service.saveChecklist({user:analyst,derived,...bound,expectedVersion:0,items:{[title]:{status:'REVIEWED'}}}),/CHECKLIST_VERSION_CONFLICT/);
  const finalization=await service.finalize({user:analyst,derived,...bound,checklistVersion:1,acknowledgment:{accepted:true,version:ACKNOWLEDGMENT_VERSION,text:ACKNOWLEDGMENT_TEXT}});assert.equal(finalization.status,'FINALIZED_WITH_OUTSTANDING_DILIGENCE');assert.equal(finalization.preparedBy.displayName,'Beta Analyst');assert.equal(finalization.counts.critical,1);assert.equal(finalization.acknowledgment.text,ACKNOWLEDGMENT_TEXT);
  assert.deepEqual(await service.finalization({user:analyst,id:finalization.id}),finalization);
  await assert.rejects(()=>service.saveChecklist({user:viewer,derived,...bound,expectedVersion:1,items:{}}),/ROLE_NOT_AUTHORIZED/);
});

test('a pristine derived checklist can be finalized at version zero without a false conflict',async()=>{
  const repository=createMemoryCommercialRepository(),service=createCommercialService({repository,clock}),initial=await service.checklist({user:analyst,derived,...bound});
  assert.equal(initial.persistence.version,0);assert.equal(initial.persistence.id,null);
  const finalization=await service.finalize({user:analyst,derived,...bound,checklistVersion:0,acknowledgment:{accepted:true,version:ACKNOWLEDGMENT_VERSION,text:ACKNOWLEDGMENT_TEXT}});
  assert.equal(finalization.checklistVersion,0);assert.equal(finalization.counts.total,2);assert.equal(finalization.status,'FINALIZED_WITH_OUTSTANDING_DILIGENCE');
  assert.equal((await service.checklist({user:analyst,derived,...bound})).persistence.version,0);
});

test('finalization still rejects a stale version after checklist progress is persisted',async()=>{
  const repository=createMemoryCommercialRepository(),service=createCommercialService({repository,clock}),initial=await service.checklist({user:analyst,derived,...bound}),firstId=initial.outstanding[0].id;
  await service.saveChecklist({user:analyst,derived,...bound,expectedVersion:0,items:{[firstId]:{status:'REVIEWED'}}});
  await assert.rejects(()=>service.finalize({user:analyst,derived,...bound,checklistVersion:0,acknowledgment:{accepted:true,version:ACKNOWLEDGMENT_VERSION,text:ACKNOWLEDGMENT_TEXT}}),/CHECKLIST_VERSION_CONFLICT/);
});

test('Phase B grants credits once, reserves atomically, preserves duplicates and releases failed research',async()=>{
  const repository=createMemoryCommercialRepository(),service=createCommercialService({repository,clock});
  await service.grantCredits({user:platform,organizationId:'gabe-test',amount:3,reason:'Initial beta allowance',sourceId:'gabe-initial-three'});await service.grantCredits({user:platform,organizationId:'gabe-test',amount:3,reason:'Duplicate delivery',sourceId:'gabe-initial-three'});assert.equal((await service.creditBalance({user:analyst})).available,3);
  const reserved=await service.reserveCredit({user:analyst,propertyKey:'400 decatur st|bakersfield|ca|93308',requestId:'request-000001'});assert.equal((await service.creditBalance({user:analyst})).available,2);await service.consumeCredit({user:analyst,reservationId:reserved.id,propertyId:'property-one'});assert.equal((await service.creditBalance({user:analyst})).available,2);
  const duplicate=await service.reserveCredit({user:analyst,propertyKey:'400 DECATUR ST | Bakersfield | CA | 93308',requestId:'request-000002'});assert.equal(duplicate.status,'ALREADY_UNLOCKED');assert.equal((await service.creditBalance({user:analyst})).available,2);
  const failed=await service.reserveCredit({user:analyst,propertyKey:'new-property',requestId:'request-000003'});await service.releaseCredit({user:analyst,reservationId:failed.id,reason:'NO_USABLE_ANALYSIS'});assert.equal((await service.creditBalance({user:analyst})).available,2);
});

test('Stripe webhook verification is fail-closed and duplicate events grant exactly once',async()=>{
  const secret='whsec_test_fixture',payload=JSON.stringify({id:'evt_test_001',type:'checkout.session.completed',data:{object:{id:'cs_test_001',payment_intent:'pi_test_001',payment_status:'paid',metadata:{organizationId:'gabe-test',creditQuantity:'1'}}}}),timestamp=Math.floor(clock().getTime()/1000),signature=createHmac('sha256',secret).update(`${timestamp}.${payload}`).digest('hex'),event=verifyStripeWebhook({payload,signature:`t=${timestamp},v1=${signature}`,secret,clock});assert.equal(event.id,'evt_test_001');assert.throws(()=>verifyStripeWebhook({payload,signature:`t=${timestamp},v1=bad`,secret,clock}),/STRIPE_SIGNATURE_INVALID/);
  const repository=createMemoryCommercialRepository(),service=createCommercialService({repository,clock});await service.applyStripeEvent({event});await service.applyStripeEvent({event});assert.equal((await repository.creditBalance('gabe-test')).available,1);assert.equal((await repository.creditBalance('gabe-test')).entries.length,1);
});

test('Stripe Checkout is server-priced, test-mode bounded and refund events use compensating ledger entries',async()=>{
  let request=null;const checkout=createStripeCheckoutClient({secretKey:'sk_test_fixture',priceId:'price_test_credit',successUrl:'https://example.test/success',cancelUrl:'https://example.test/cancel',enabled:true,fetchImpl:async(url,options)=>{request={url,options,body:Object.fromEntries(options.body)};return {ok:true,json:async()=>({id:'cs_test_001',url:'https://checkout.stripe.test/session',mode:'payment',payment_status:'unpaid'})};}}),created=await checkout.create({organizationId:'gabe-test',userId:'analyst-one',quantity:2});assert.equal(created.id,'cs_test_001');assert.equal(request.body['line_items[0][price]'],'price_test_credit');assert.equal(request.body['metadata[organizationId]'],'gabe-test');assert.match(request.options.headers.Authorization,/sk_test_fixture/);assert.equal(Object.hasOwn(request.body,'amount'),false);
  await assert.rejects(()=>createStripeCheckoutClient({secretKey:'sk_live_fixture',priceId:'price_live',successUrl:'x',cancelUrl:'x',enabled:true}).create({organizationId:'gabe-test',userId:'analyst-one'}),/STRIPE_LIVE_MODE_DISABLED/);
  await assert.rejects(()=>createStripeCheckoutClient({enabled:false}).create({organizationId:'gabe-test',userId:'analyst-one'}),/STRIPE_CHECKOUT_DISABLED/);
  const repository=createMemoryCommercialRepository(),service=createCommercialService({repository,clock}),paid={id:'evt_paid',type:'checkout.session.completed',data:{object:{id:'cs_paid',payment_intent:'pi_paid',payment_status:'paid',metadata:{organizationId:'gabe-test',creditQuantity:'2'}}}},refund={id:'evt_refund',type:'charge.refunded',data:{object:{payment_intent:'pi_paid'}}};await assert.rejects(()=>service.applyStripeEvent({event:refund}),/STRIPE_PURCHASE_TRANSACTION_NOT_FOUND/);await service.applyStripeEvent({event:paid});await service.applyStripeEvent({event:refund});await service.applyStripeEvent({event:refund});const balance=await repository.creditBalance('gabe-test');assert.equal(balance.available,0);assert.deepEqual(balance.entries.map(row=>row.kind),['PURCHASED_CREDITS','REFUND_ADJUSTMENT']);assert.equal((await service.applyStripeEvent({event:{id:'evt_failed',type:'payment_intent.payment_failed',data:{object:{metadata:{organizationId:'gabe-test'}}}}})).ignored,true);
});

test('Stripe readiness inspects Price and webhook metadata without exposing credentials or creating objects',async()=>{
  const requests=[],client=createStripeReadinessClient({secretKey:'sk_live_private_fixture',priceId:'price_live_credit',webhookSecret:'whsec_private_fixture',successUrl:'https://pi.example/#billing-success',cancelUrl:'https://pi.example/#billing',origin:'https://pi.example',fetchImpl:async(url,options)=>{requests.push({url,method:options?.method??'GET',authorization:options?.headers?.Authorization});if(url.includes('/prices/'))return {ok:true,json:async()=>({id:'price_live_credit',active:true,livemode:true,type:'one_time',recurring:null,currency:'usd',unit_amount:999,product:{id:'prod_credit',name:'Property analysis credit',active:true}})};return {ok:true,json:async()=>({data:[{url:'https://pi.example/api/commercial/stripe/webhook',status:'enabled',livemode:true,enabled_events:['checkout.session.completed','charge.refunded','charge.dispute.created']}]})};}}),result=await client.inspect();
  assert.equal(result.ready,true);assert.deepEqual(result.price,{id:'price_live_credit',active:true,livemode:true,type:'one_time',oneTime:true,currency:'USD',unitAmount:999,product:{id:'prod_credit',name:'Property analysis credit',active:true}});assert.equal(result.webhook.eventCoverage,true);assert.equal(Object.hasOwn(result.configuration,'secretKey'),false);assert.equal(JSON.stringify(result).includes('sk_live_private_fixture'),false);assert.equal(JSON.stringify(result).includes('whsec_private_fixture'),false);assert.deepEqual(requests.map(item=>item.method),['GET','GET']);
});

test('Phase C enforces platform-only organization creation and cross-organization administration',async()=>{
  const repository=createMemoryCommercialRepository(),service=createCommercialService({repository,clock});await service.createOrganization({user:platform,id:'gabe-test',name:'Gabe Test Organization'});assert.equal((await service.listOrganizations({user:platform})).length,1);await assert.rejects(()=>service.createOrganization({user:analyst,id:'forbidden',name:'Forbidden'}),/PLATFORM_ADMINISTRATOR_REQUIRED/);await assert.rejects(()=>service.listMembers({user:analyst,organizationId:'workside'}),/ORGANIZATION_NOT_AUTHORIZED/);
  const invitation=await service.invite({user:platform,organizationId:'gabe-test',email:'analyst@example.test',role:ROLES.ANALYST});assert.equal(invitation.status,'PENDING');assert.equal(invitation.tokenHash,undefined);assert.ok(Date.parse(invitation.expiresAt)>clock().getTime());
});

test('Phase C controls role changes, suspension, password reset, invitation resend/revoke and organization suspension',async()=>{
  const repository=createMemoryCommercialRepository(),service=createCommercialService({repository,clock,flags:{ownerOrganizationId:'workside'}});await service.createOrganization({user:platform,id:'gabe-test',name:'Gabe Test Organization'});const sent=[];const sendInvitation=async invitation=>{sent.push(invitation);return {uid:'member-one',displayName:'Beta Member'};};const invitation=await service.invite({user:platform,organizationId:'gabe-test',email:'member@example.test',role:ROLES.ANALYST,sendInvitation});assert.equal((await repository.getMember('gabe-test','member-one')).role,ROLES.ANALYST);
  let identityRole=null;await service.changeMemberRole({user:platform,organizationId:'gabe-test',uid:'member-one',role:ROLES.REPORT_VIEWER,applyIdentityRole:async input=>{identityRole=input;}});assert.equal(identityRole.role,ROLES.REPORT_VIEWER);
  await service.setMemberSuspended({user:platform,organizationId:'gabe-test',uid:'member-one',suspended:true,applyIdentitySuspension:async()=>{}});assert.equal((await repository.getMember('gabe-test','member-one')).status,'SUSPENDED');await service.setMemberSuspended({user:platform,organizationId:'gabe-test',uid:'member-one',suspended:false,restoreRole:ROLES.REPORT_VIEWER,applyIdentitySuspension:async()=>{}});assert.equal((await repository.getMember('gabe-test','member-one')).role,ROLES.REPORT_VIEWER);
  let reset=false;await service.sendPasswordReset({user:platform,organizationId:'gabe-test',uid:'member-one',sendPasswordReset:async()=>{reset=true;}});assert.equal(reset,true);await service.resendInvitation({user:platform,organizationId:'gabe-test',id:invitation.id,sendInvitation});assert.equal(sent.length,2);await service.revokeInvitation({user:platform,organizationId:'gabe-test',id:invitation.id});assert.equal((await repository.getInvitation('gabe-test',invitation.id)).status,'REVOKED');await service.setOrganizationStatus({user:platform,organizationId:'gabe-test',status:'SUSPENDED'});assert.equal((await repository.getOrganization('gabe-test')).status,'SUSPENDED');await assert.rejects(()=>service.setOrganizationStatus({user:platform,organizationId:'workside',status:'SUSPENDED'}),/OWNER_ORGANIZATION_CANNOT_BE_SUSPENDED/);
});

test('Report Viewer receives only explicitly granted immutable reports and cannot edit',async()=>{
  const repository=createMemoryCommercialRepository(),service=createCommercialService({repository,clock}),report={id:'report-one',propertyId:'property-one',propertyAddress:'Synthetic Test Property',scenarioId:'scenario-one',scenarioName:'Scenario 1',revision:1,status:'FINALIZED_WITH_OUTSTANDING_DILIGENCE',filename:'report.pdf',generatedAt:clock().toISOString()};await repository.putMember('gabe-test',{uid:viewer.uid,role:ROLES.REPORT_VIEWER,status:'ACTIVE'});await service.registerReport({user:analyst,report,storage:{sha256:'abc',sizeBytes:123}});assert.deepEqual(await service.authorizedReports({user:viewer}),[]);await service.grantReportAccess({user:analyst,reportId:'report-one',viewerUid:viewer.uid,propertyId:'property-one'});const visible=await service.authorizedReports({user:viewer});assert.equal(visible.length,1);assert.equal((await service.authorizeReportDownload({user:viewer,reportId:'report-one'})).storage.sha256,'abc');await assert.rejects(()=>service.saveChecklist({user:viewer,derived,...bound,expectedVersion:0,items:{}}),/ROLE_NOT_AUTHORIZED/);
});

test('finalized report attribution discloses unresolved diligence without exposing UID or changing calculations',async()=>{const evidence=await loadEvidence(),property=evidence.properties[0],scenario=reportScenario(evidence),before=structuredClone(scenario.analysis),finalization={status:'FINALIZED_WITH_OUTSTANDING_DILIGENCE',preparedBy:{uid:'private-firebase-uid',displayName:'Beta Analyst',role:ROLES.ANALYST},organizationName:'Gabe Test Organization',finalizedAt:'2026-10-20T19:30:00.000Z',counts:{critical:2,important:3,total:5}},html=workspaceReportHtml(property,scenario,evidence,'full',{generatedAt:'2026-10-20T19:31:00.000Z',finalization});assert.match(html,/Prepared by:<\/b> Beta Analyst/);assert.match(html,/Finalized with Outstanding Diligence/);assert.match(html,/5 unresolved diligence item/);assert.doesNotMatch(html,/private-firebase-uid/);assert.deepEqual(scenario.analysis,before);});
