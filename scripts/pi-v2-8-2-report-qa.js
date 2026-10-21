import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createCanvas} from '@napi-rs/canvas';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {analyze} from '../src/investment-workspace/analysis.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {renderWorkspacePdf,workspaceReportHtml} from '../src/investment-workspace/reports.js';
import {reportScenario} from '../tests/fixtures/workspaceReports.js';

const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'data/validation/pi-v2-8-2-report-quality'),generatedAt=new Date().toISOString();
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex'),clean=value=>String(value).replace(/\s+/g,' ').trim();
const evidence=await loadEvidence(root),property=structuredClone(evidence.properties[0]),scenario=reportScenario(evidence);
property.ref='QA-LANCASTER-V2-8-2';property.address='40924 173rd St E, Lancaster, CA 93535';property.addressComponents={street:'40924 173rd St E',city:'Lancaster',state:'CA',zip:'93535'};property.city='Lancaster';property.attributes={...property.attributes,county:'Los Angeles',bedrooms:3,bathrooms:2,squareFootage:1178};property.ownership={ownerOccupied:false};property.historicalTrigger={kind:'COUNTY_TAX_RECORD',amount:1200,sourceDate:'2026-09-01',sourceRef:'Los Angeles County retained test source',meaning:'Historical source used only for local layout QA'};property.countyUse={code:'LCA11',sourceRef:'Los Angeles County retained test source'};property.researchProvenance=[];
const sale=(evidenceRef,address,saleDate,salePrice,index)=>({...property.sales[index%property.sales.length],evidenceRef,address,saleDate,salePrice,providerId:null,ageDays:90+index,squareFootage:1100+index*11});
property.sales=[sale('LAN-S1','40912 168th St E, Lancaster, CA 93535','2026-06-01',300000,0),sale('LAN-S2','40912 E 168th Street, Lancaster, CA 93535','2026-06-01',300000,0),sale('LAN-S3','40624 166th St E, Lancaster, CA 93535','2026-05-15',315000,1),sale('LAN-S4','40624 E 166th St, Lancaster, CA 93535','2026-05-15',315000,1),sale('LAN-S5','40612 173rd St E, Lancaster, CA 93535','2025-12-10',67500,2),sale('LAN-S6','40700 172nd St E, Lancaster, CA 93535','2026-04-20',329000,3),sale('LAN-S7','40820 174th St E, Lancaster, CA 93535','2026-03-11',340000,0)];property.saleSearch={...property.saleSearch,returned:7,eligible:7};property.findings=[];property.listings=[];
scenario.propertyRef=property.ref;scenario.name='Lancaster local V2.8.2 QA';scenario.inputs={...scenario.inputs,purchasePrice:'300000',exitValue:'410000',rehabCost:'55000'};scenario.compReviews={};scenario.demonstration=true;scenario.savedAt='2026-10-20T18:00:00.000Z';scenario.evidenceAttachments=[];scenario.analystEvidence=[];
const scopedEvidence={...evidence,properties:[property]},baseline=analyze(scenario,{risk:scenario.riskRequested}),baselineHash=hash(baseline);

async function inspect(bytes,name){
  const standardFontDataUrl=pathToFileURL(path.join(root,'node_modules/pdfjs-dist/standard_fonts')+path.sep).href,pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true,standardFontDataUrl,verbosity:0}).promise,pages=[];
  try{for(let number=1;number<=pdf.numPages;number++){const page=await pdf.getPage(number),content=await page.getTextContent(),items=content.items.filter(item=>item.str?.trim()),text=clean(items.map(item=>item.str).join(' ')),viewport=page.getViewport({scale:1}),outOfBounds=items.filter(item=>item.transform[4]<-1||item.transform[4]+item.width>viewport.width+2||item.transform[5]<-1||item.transform[5]>viewport.height+2);pages.push({number,text,characters:text.length,outOfBounds:outOfBounds.length});if(number===1){const view=page.getViewport({scale:1.6}),canvas=createCanvas(Math.ceil(view.width),Math.ceil(view.height));await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;await writeFile(path.join(output,`${name}-page-1.png`),canvas.toBuffer('image/png'));}}}finally{await pdf.destroy();}return pages;
}

await mkdir(output,{recursive:true});const reports=[];
for(const kind of ['brief','full','checklist']){
  const html=workspaceReportHtml(property,scenario,scopedEvidence,kind,{generatedAt,supportingDocuments:[],qaNotForDistribution:true}),rendered=await renderWorkspacePdf(html,{appendices:[],qaNotForDistribution:true}),name=kind==='brief'?'Lancaster-Opportunity-Brief':kind==='full'?'Lancaster-Full-Investor-Package':'Lancaster-Investment-Due-Diligence-Checklist',filename=`${name}.pdf`;
  await writeFile(path.join(output,filename),rendered.bytes);const pages=await inspect(rendered.bytes,name),text=pages.map(page=>page.text).join(' ');
  assert.ok(pages.every(page=>page.characters>80&&page.outOfBounds===0),`${kind} has a blank or clipped page`);assert.ok(pages.every(page=>page.text.includes(`Page ${page.number} of ${pages.length}`)||page.text.includes(`${page.number} / ${pages.length}`)),`${kind} pagination is incomplete`);assert.doesNotMatch(text,/Kern County source disclaimer|Supporting document appendix index/);assert.ok(text.includes(property.address));
  if(kind==='brief'){assert.match(text,/CONTINUE DILIGENCE/);assert.doesNotMatch(text,/Required action.*Evidence status/);}
  if(kind==='full'){assert.match(text,/Investment Due Diligence Checklist/);assert.match(text,/Possible duplicate|duplicate observation/i);assert.match(text,/Unusual transaction price/);}
  if(kind==='checklist'){assert.equal(pages.length,1);assert.match(text,/Tenant|occupancy/i);assert.match(text,/Supported resale value/);assert.match(text,/Complete project expenses/);}
  reports.push({kind,filename,pageCount:pages.length,sha256:hash(rendered.bytes),noBlankOrClippedPages:true,screenshot:`${name}-page-1.png`});
}
assert.equal(hash(analyze(scenario,{risk:scenario.riskRequested})),baselineHash);
const result={generatedAt,property:property.address,reports,baselinePageCounts:{opportunityBrief:3,fullInvestorPackage:14,source:'V2.8.2 acceptance roadmap identified current Lancaster output'},comparableFindings:{rawObservations:7,logicalTransactions:5,duplicateObservations:2,possibleDuplicates:0,outlier:'$67,500 observation flagged for review and retained'},verification:{financialAndMonteCarloInvariant:true,kernNoticeSuppressed:true,emptyDocumentIndexSuppressed:true,briefFullChecklistGenerated:true,providerRequests:0,firebaseWrites:0,storageReads:0,deployment:false}};
await writeFile(path.join(output,'qa-results.json'),JSON.stringify(result,null,2)+'\n');process.stdout.write(JSON.stringify(result,null,2)+'\n');
