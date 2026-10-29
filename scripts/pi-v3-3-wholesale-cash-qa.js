import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import puppeteer from 'puppeteer';
import {workspaceReportHtml,renderWorkspacePdf} from '../src/investment-workspace/reports.js';
import {analyze} from '../src/investment-workspace/analysis.js';

const root=path.resolve('data/validation/pi-v3-3-wholesale-cash-certified');
await mkdir(root,{recursive:true});
const fixture=JSON.parse(await readFile('tests/fixtures/pi-v3-2-taft-property-photo-qa.json','utf8'));
const property=fixture.evidence.properties[0],scenario={...fixture.scenario,id:'33000000-0000-4000-8000-000000000033',name:'Tyler V3.3 isolated wholesale cash QA',revision:1,savedAt:'2026-10-29T18:00:00.000Z',evaluationMode:'WHOLESALE_CASH',financingMode:'CASH',wholesaleFeeTreatment:'INCLUDED',wholesaleFeeAmount:'',expenseTreatments:{acquisitionFixed:'NOT_INCLUDED',acquisitionRate:'NOT_INCLUDED',contingency:'NOT_INCLUDED',propertyTaxes:'NOT_INCLUDED',insurance:'NOT_INCLUDED',utilities:'NOT_INCLUDED',maintenance:'NOT_INCLUDED',otherHolding:'NOT_INCLUDED',sellingCommissionRate:'NOT_INCLUDED',sellerClosingFixed:'NOT_INCLUDED',sellerClosingRate:'NOT_INCLUDED',transferCost:'NOT_INCLUDED',otherUpfront:'NOT_INCLUDED',otherAtExit:'NOT_INCLUDED'},inputs:{...fixture.scenario.inputs,purchasePrice:'111000',rehabCost:'20000',exitValue:'176000'},risk:{...fixture.scenario.risk,variables:{...fixture.scenario.risk.variables,exitValue:{min:'158400',mode:'176000',max:'184800'},rehabCost:{min:'18000',mode:'20000',max:'26000'}}},notes:'Isolated local V3.3 presentation QA. Existing retained evidence is reused without provider requests or durable writes.'};
const generatedAt='2026-10-29T18:00:00.000Z',before=JSON.stringify({property,scenario}),analysis=analyze(scenario,{risk:true}),outputs=[];
if(analysis.deterministic.grossSale-Number(scenario.inputs.purchasePrice)-Number(scenario.inputs.rehabCost)!==45000)throw new Error('GROSS_SPREAD_QA_FAILED');

for(const kind of ['brief','full']){
  const html=workspaceReportHtml(property,scenario,fixture.evidence,kind,{generatedAt,qaNotForDistribution:true});
  const rendered=await renderWorkspacePdf(html,{qaNotForDistribution:true});
  const label=kind==='brief'?'Opportunity_Brief':'Full_Investor_Package',pdfName=`603_Tyler_St_Taft_CA_93268_${label}_V3_3_LOCAL_QA.pdf`,htmlName=pdfName.replace(/\.pdf$/,'.html');
  await writeFile(path.join(root,pdfName),rendered.bytes,{flag:'wx'});await writeFile(path.join(root,htmlName),html,{flag:'wx'});
  outputs.push({kind,pdf:pdfName,html:htmlName,totalPages:rendered.totalPages,sha256:createHash('sha256').update(rendered.bytes).digest('hex')});
}

const browser=await puppeteer.launch({headless:true,pipe:true,args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
try{
  const page=await browser.newPage();await page.setViewport({width:1275,height:1650,deviceScaleFactor:1});
  for(const [output,prefix] of [[outputs[0],'opportunity-brief'],[outputs[1],'full-package']]){
    const htmlName=output.html;
    await page.setContent(await readFile(path.join(root,htmlName),'utf8'),{waitUntil:'load'});
    const pages=await page.$$('.page');
    for(let index=0;index<pages.length;index++)await pages[index].screenshot({path:path.join(root,`${prefix}-page-${String(index+1).padStart(2,'0')}.png`)});
  }
}finally{await browser.close();}

if(JSON.stringify({property,scenario})!==before)throw new Error('FIXTURE_MUTATION_STOP');
const screenshots=['opportunity-brief-page-01.png',...Array.from({length:outputs[1].totalPages},(_,index)=>`full-package-page-${String(index+1).padStart(2,'0')}.png`)];
const results={status:'PASS',milestone:'PI V3.3 local wholesale/cash certification',generatedAt,address:property.address,scenario:{id:scenario.id,revision:scenario.revision,evaluationMode:scenario.evaluationMode,financingMode:scenario.financingMode,feeTreatment:scenario.wholesaleFeeTreatment},financials:{purchasePrice:111000,rehabilitation:20000,resaleAssumption:176000,potentialGrossInvestmentSpread:45000,modeledResult:analysis.deterministic.modeledProfit,roi:analysis.deterministic.roi,monteCarloIterations:analysis.monteCarlo.simulation.iterations},outputs,checks:['Isolated local fixture; no live Firebase writes','No provider requests','No uploads','No deployment','Potential gross spread equals resale minus purchase minus rehabilitation','Fee included in purchase price and not double counted','Cash financing fields treated as not applicable','Opportunity Brief generated as one page','Full Investor Package generated and every page captured for visual inspection','Financial and Monte Carlo engines unchanged'],screenshots};
await writeFile(path.join(root,'qa-results.json'),JSON.stringify(results,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(results,null,2));
