import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {blankInputs} from '../src/investment-workspace/analysis.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {validateDraft} from '../src/investment-workspace/store.js';
import {createDurablePropertyService} from '../src/investment-workspace/durable-properties.js';
import {createMemoryDurablePropertyRepository} from '../src/investment-workspace/memory-durable-properties.js';
import {createMemoryPrivateDocumentStorage,createMemorySupportingDocumentRepository} from '../src/investment-workspace/memory-supporting-documents.js';
import {createMockMalwareScanner,createSupportingDocumentService} from '../src/investment-workspace/supporting-documents.js';
import {workspaceReportHtml} from '../src/investment-workspace/report-html.js';
import {supportingEvidenceHtml} from '../src/investment-workspace/document-appendices.js';

const user={uid:'inline-analyst',role:'Analyst',organizationId:'inline-organization'};
const evidence=await loadEvidence();
const attachment=(overrides={})=>({id:randomUUID(),fieldKey:'SELLER.VERIFIED_PAYOFF',fieldLabel:'Verified payoff',documentId:'document-one',version:1,filename:'payoff.pdf',description:'Lender payoff',source:'Example Bank',sourceDate:'2026-10-18',reviewStatus:'REVIEWED',confidentiality:'STANDARD',redistributionPermission:'APPROVED',scanStatus:'CLEAN',linkedAt:'2026-10-18T20:00:00.000Z',...overrides});
const scenario=()=>({id:randomUUID(),propertyRef:evidence.properties[0].ref,name:'Inline evidence QA',revision:0,evidenceFingerprint:evidence.fingerprint,inputs:{...blankInputs(),purchasePrice:'180000',exitValue:'300000',rehabCost:'35000'},targetType:'PROFIT_MARGIN_ON_SALE',notes:'',risk:{seed:'inline',iterations:100,variables:{},rationale:''},compReviews:{},analystEvidence:[],evidenceAttachments:[attachment()],sellerValuationBasis:'PROVIDER_AVM',demonstration:true,riskRequested:false});
async function pdfBytes(text){const pdf=await PDFDocument.create(),page=pdf.addPage();page.drawText(text);return Buffer.from(await pdf.save());}
async function fixture(){let next=0;const durable=createDurablePropertyService({repository:createMemoryDurablePropertyRepository()}),subject={ref:'INLINE-SUBJECT',address:'400 Decatur St, Bakersfield, CA 93308',subjectKind:'PRELIMINARY_RESEARCH',addressComponents:{street:'400 Decatur St',city:'Bakersfield',state:'CA',zip:'93308'},evidenceFingerprint:'inline-snapshot',attributes:{propertyType:'Single Family'}},property=await durable.promote({user,subject}),repository=createMemorySupportingDocumentRepository(),storage=createMemoryPrivateDocumentStorage(),documents=createSupportingDocumentService({repository,storage,malwareScanner:createMockMalwareScanner(),durableProperties:durable,idFactory:()=> `document-${++next}`});return {property,repository,storage,documents};}
const metadata={documentType:'MORTGAGE_PAYOFF',description:'Synthetic payoff evidence',source:'Example Bank',sourceDate:'2026-10-18',reviewStatus:'PENDING_REVIEW',confidentiality:'STANDARD',redistributionPermission:'NOT_APPROVED',evidenceClaim:'MORTGAGE_PAYOFF'};

test('scenario revisions preserve safe immutable field links without changing financial inputs',()=>{
  const draft=scenario();draft.evidenceAttachments[0]={...draft.evidenceAttachments[0],documentAmount:134912.66,documentAmountCurrency:'USD',documentAmountSemanticType:'LENDER_PAYOFF_AMOUNT',documentAmountSourcePage:1,documentAmountSourceNote:'Payoff total',documentAmountAnalystConfirmed:true,documentAmountConfirmedAt:'2026-10-19T20:00:00.000Z'};draft.evidenceAttachments.push(attachment({id:randomUUID(),fieldKey:`SELLER.LIEN:${randomUUID()}`}));const clean=validateDraft(draft,evidence);assert.deepEqual(clean.evidenceAttachments,draft.evidenceAttachments);assert.deepEqual(clean.inputs,draft.inputs);
  assert.throws(()=>validateDraft({...draft,evidenceAttachments:[attachment({fieldKey:'../../private/path'})]},evidence),/invalid/);
  assert.throws(()=>validateDraft({...draft,evidenceAttachments:[draft.evidenceAttachments[0],{...draft.evidenceAttachments[0],id:randomUUID()}]},evidence),/cannot be linked twice/);
  assert.throws(()=>validateDraft({...draft,evidenceAttachments:[attachment({documentAmount:100,documentAmountCurrency:'USD',documentAmountSemanticType:'LENDER_PAYOFF_AMOUNT',documentAmountAnalystConfirmed:true})]},evidence),/source page or note/);
  assert.throws(()=>validateDraft({...draft,evidenceAttachments:[attachment({documentAmount:100,documentAmountCurrency:'EUR',documentAmountSemanticType:'LENDER_PAYOFF_AMOUNT'})]},evidence),/claim mapping/);
});

test('one immutable document version supports multiple fields and is read once for one appendix',async()=>{
  const f=await fixture(),uploaded=await f.documents.upload({user,propertyId:f.property.id,metadata,file:{filename:'payoff.pdf',mimeType:'application/pdf',bytes:await pdfBytes('Synthetic payoff')}});await f.documents.update({user,propertyId:f.property.id,documentId:uploaded.id,patch:{reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true}});
  const references=[attachment({documentId:uploaded.id,fieldKey:'SELLER.VERIFIED_PAYOFF',fieldLabel:'Verified payoff'}),attachment({documentId:uploaded.id,fieldKey:'SELLER.ALGORITHMIC_BALANCE',fieldLabel:'Estimated outstanding mortgage balance'})],appendices=await f.documents.reportDocuments({user,propertyId:f.property.id,references});
  assert.equal(appendices.length,1);assert.equal(appendices[0].claims.length,2);assert.equal(f.repository._state.audit.filter(item=>item.action==='DOCUMENT_INCLUDED_IN_REPORT').length,1);
  const html=supportingEvidenceHtml(appendices);assert.equal((html.match(/Appendix 1/g)??[]).length,1);assert.match(html,/Verified payoff; Estimated outstanding mortgage balance/);
});

test('report document snapshot retains analyst transcription with its exact claim and immutable version',async()=>{
  const f=await fixture(),uploaded=await f.documents.upload({user,propertyId:f.property.id,metadata,file:{filename:'payoff.pdf',mimeType:'application/pdf',bytes:await pdfBytes('Synthetic payoff')}});await f.documents.update({user,propertyId:f.property.id,documentId:uploaded.id,patch:{reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true}});
  const reference=attachment({documentId:uploaded.id,documentAmount:134912.66,documentAmountCurrency:'USD',documentAmountSemanticType:'LENDER_PAYOFF_AMOUNT',documentAmountSourcePage:1,documentAmountSourceNote:'Total payoff',documentAmountAnalystConfirmed:true,documentAmountConfirmedAt:'2026-10-19T20:00:00.000Z'}),[appendix]=await f.documents.reportDocuments({user,propertyId:f.property.id,references:[reference]});
  assert.deepEqual(appendix.claims[0],{fieldKey:'SELLER.VERIFIED_PAYOFF',fieldLabel:'Verified payoff',documentAmount:134912.66,documentAmountCurrency:'USD',documentAmountSemanticType:'LENDER_PAYOFF_AMOUNT',documentAmountSourcePage:1,documentAmountSourceNote:'Total payoff',documentAmountAnalystConfirmed:true,documentAmountConfirmedAt:'2026-10-19T20:00:00.000Z'});
});

test('multiple approved immutable documents may support one exact claim',async()=>{
  const f=await fixture(),first=await f.documents.upload({user,propertyId:f.property.id,metadata,file:{filename:'payoff.pdf',mimeType:'application/pdf',bytes:await pdfBytes('Payoff')}}),second=await f.documents.upload({user,propertyId:f.property.id,metadata:{...metadata,description:'Payoff supplement'},file:{filename:'payoff-supplement.pdf',mimeType:'application/pdf',bytes:await pdfBytes('Supplement')}});for(const document of [first,second])await f.documents.update({user,propertyId:f.property.id,documentId:document.id,patch:{reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true}});
  const references=[first,second].map(document=>attachment({documentId:document.id,fieldKey:'SELLER.VERIFIED_PAYOFF',fieldLabel:'Verified payoff'})),appendices=await f.documents.reportDocuments({user,propertyId:f.property.id,references});assert.equal(appendices.length,2);assert.ok(appendices.every(item=>item.claims.length===1&&item.claims[0].fieldKey==='SELLER.VERIFIED_PAYOFF'));
});

test('report inclusion resolves the exact linked version rather than silently moving to current',async()=>{
  const f=await fixture(),first=await f.documents.upload({user,propertyId:f.property.id,metadata,file:{filename:'payoff-v1.pdf',mimeType:'application/pdf',bytes:await pdfBytes('Version one')}});await f.documents.update({user,propertyId:f.property.id,documentId:first.id,patch:{reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true}});
  const second=await f.documents.upload({user,propertyId:f.property.id,documentId:first.id,metadata,file:{filename:'payoff-v2.pdf',mimeType:'application/pdf',bytes:await pdfBytes('Version two')}});await f.documents.update({user,propertyId:f.property.id,documentId:second.id,patch:{reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true}});
  const [appendix]=await f.documents.reportDocuments({user,propertyId:f.property.id,references:[attachment({documentId:first.id,version:1})]});assert.equal(appendix.version.version,1);assert.equal(appendix.document.currentVersion,1);assert.equal(appendix.document.currentVersionMetadata.filename,'payoff-v1.pdf');
});

test('approved claim links appear next to report claims without exposing document IDs',()=>{
  const draft={...scenario(),savedAt:'2026-10-18T20:00:00.000Z',revision:1},document={id:'private-document-id',documentType:'MORTGAGE_PAYOFF',description:'Synthetic payoff evidence',source:'Example Bank',sourceDate:'2026-10-18',reviewStatus:'REVIEWED',currentVersionMetadata:{filename:'payoff.pdf'}},supportingDocuments=[{index:1,document,claims:[{fieldKey:'SELLER.VERIFIED_PAYOFF',fieldLabel:'Verified payoff'},{fieldKey:'UNDERWRITING.REHABCOST',fieldLabel:'Estimated rehabilitation cost'}]}],html=workspaceReportHtml(evidence.properties[0],draft,evidence,'full',{supportingDocuments});
  assert.match(html,/Linked \(1\) · Appendix 1/);assert.doesNotMatch(html,/private-document-id|payoff\.pdf/);assert.match(html,/Rehab \(\$\).*Linked \(1\)/s);
});
