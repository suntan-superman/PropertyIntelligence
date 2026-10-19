import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import puppeteer from 'puppeteer';
import {analyze} from '../src/investment-workspace/analysis.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {reportModel,workspaceReportHtml,renderWorkspacePdf} from '../src/investment-workspace/reports.js';
import {reportScenario} from '../tests/fixtures/workspaceReports.js';
import {offlineStatus} from '../src/analysis/offline.js';

const root=process.cwd();
const base=path.join(root,'data/runtime/pi-v2-investor-report-quality');
const scenarioPath=path.join(root,'data/runtime/investment-workspace-v1/scenarios/0f75719a-293b-4b29-bace-d3c5b71a4b20.r1.json');
const hash=value=>createHash('sha256').update(value).digest('hex');
const normalized=value=>value.replace(/\s+/g,' ').trim();
const put=(directory,name,value)=>writeFile(path.join(directory,name),value,{flag:'wx'});

async function pagesFromPdf(bytes,directory,prefix){
  const document=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise,pages=[];
  try{
    for(let number=1;number<=document.numPages;number++){
      const page=await document.getPage(number),viewport=page.getViewport({scale:1});
      const items=(await page.getTextContent()).items.filter(item=>item.str?.trim());
      const text=items.map(item=>item.str).join(' ');
      const outOfBounds=items.filter(item=>item.transform[4]<0||item.transform[4]+item.width>viewport.width+2||item.transform[5]<0||item.transform[5]>viewport.height+2).length;
      const view=page.getViewport({scale:4/3}),canvas=createCanvas(Math.ceil(view.width),Math.ceil(view.height));
      await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
      const image=`${prefix}-page-${number}.png`;await put(directory,image,canvas.toBuffer('image/png'));
      pages.push({number,image,characters:text.length,outOfBounds,text});
    }
  }finally{await document.destroy();}
  return pages;
}

async function sheet(directory,prefix,pages){
  const images=[];
  for(const page of pages)images.push(await loadImage(path.join(directory,page.image)));
  const columns=2,width=832*columns,height=1080*Math.ceil(images.length/columns),canvas=createCanvas(width,height),context=canvas.getContext('2d');
  context.fillStyle='#dce5e5';context.fillRect(0,0,width,height);
  images.forEach((image,index)=>context.drawImage(image,8+(index%columns)*832,12+Math.floor(index/columns)*1080));
  const name=`${prefix}-all-pages.png`;await put(directory,name,canvas.toBuffer('image/png'));return name;
}

async function baseline(){
  await mkdir(base,{recursive:true});const output=await mkdtemp(path.join(base,'baseline-'));
  const evidence=await loadEvidence(root),scenario=JSON.parse(await readFile(scenarioPath,'utf8')),property=evidence.properties.find(item=>item.ref===scenario.propertyRef),reports=[];
  assert.ok(property,'Crestview evidence is required.');assert.deepEqual(analyze(scenario,{risk:true}),scenario.analysis,'Saved scenario analysis drifted before the quality pass.');
  for(const kind of ['brief','full']){
    const html=workspaceReportHtml(property,scenario,evidence,kind),rendered=await renderWorkspacePdf(html),prefix=`GABE-01-${kind}-before`;
    await put(output,`${prefix}.html`,html);await put(output,`${prefix}.pdf`,rendered.bytes);
    const pages=await pagesFromPdf(rendered.bytes,output,prefix),allPages=await sheet(output,prefix,pages);
    reports.push({kind,pdf:`${prefix}.pdf`,pages:pages.length,images:pages.map(page=>page.image),allPages,sha256:hash(rendered.bytes),blockedRequests:rendered.blockedRequests});
  }
  const result={status:'BASELINE_CAPTURED',at:new Date().toISOString(),scenarioPath:path.relative(root,scenarioPath).replaceAll('\\','/'),scenarioSha256:hash(await readFile(scenarioPath)),reports};
  await put(output,'baseline.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,output,reports:reports.map(({kind,pages})=>({kind,pages}))}));
}

async function findBaseline(){
  const explicit=process.argv.find(value=>value.startsWith('--baseline='))?.slice(11);
  if(explicit)return path.resolve(explicit);
  const entries=(await readdir(base,{withFileTypes:true})).filter(entry=>entry.isDirectory()&&entry.name.startsWith('baseline-')).map(entry=>entry.name).sort();
  assert.ok(entries.length,'Run this script once with --capture-baseline before changing the renderer.');return path.join(base,entries.at(-1));
}

async function compareImage(output,beforeFile,afterFile,name){
  const before=await loadImage(beforeFile),after=await loadImage(afterFile),canvas=createCanvas(before.width+after.width+36,Math.max(before.height,after.height)+54),context=canvas.getContext('2d');
  context.fillStyle='#dce5e5';context.fillRect(0,0,canvas.width,canvas.height);context.fillStyle='#173f4e';context.font='bold 18px Arial';context.fillText('BEFORE',10,25);context.fillText('AFTER',before.width+28,25);context.drawImage(before,8,38);context.drawImage(after,before.width+28,38);
  await put(output,name,canvas.toBuffer('image/png'));return name;
}

async function finalQa(){
  const baselineDirectory=await findBaseline(),baselineResult=JSON.parse(await readFile(path.join(baselineDirectory,'baseline.json'),'utf8'));
  await mkdir(base,{recursive:true});const output=await mkdtemp(path.join(base,'qa-')),evidence=await loadEvidence(root),saved=JSON.parse(await readFile(scenarioPath,'utf8'));
  const property=evidence.properties.find(item=>item.ref===saved.propertyRef),boron=evidence.properties.find(item=>item.ref==='GABE-05');
  assert.ok(property&&boron,'Crestview and Boron retained evidence are required.');assert.equal(hash(await readFile(scenarioPath)),baselineResult.scenarioSha256,'The saved Crestview revision changed after baseline capture.');
  const checks=[],reports=[],remoteAttempts=[];const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
  check('saved scenario still matches the certified deterministic and Monte Carlo engines',JSON.stringify(analyze(saved,{risk:true}))===JSON.stringify(saved.analysis));
  const crestview=reportModel(property,saved);check('Crestview financial outputs are exact',crestview.analysis.deterministic.modeledProfit===67155&&crestview.analysis.deterministic.totalProjectCost===212845&&crestview.analysis.mao.deterministic.purchasePrice===199783.25);
  check('Crestview has zero analyst-selected sale examples',crestview.model.research.included===0&&crestview.model.research.available===4);
  check('seller-supplied balance is presented from actual provenance',crestview.model.analystEvidence.entries.some(entry=>entry.displayLabel==='Seller-reported estimated balance'&&entry.displayVerification==='Seller-reported — not a verified payoff'));
  check('assessor-only original mortgage entry is not presented as recorded-document evidence',crestview.model.sellerFinancialPosition.originalPrincipalPresentation.documentSupported===false&&crestview.model.sellerFinancialPosition.originalPrincipalPresentation.label==='Entered original mortgage amount');
  const sparse={...reportScenario(evidence,4),id:'00000000-0000-4000-8000-000000000905',name:'Boron sparse-evidence quality fixture',revision:1,savedAt:'2026-10-15T12:00:00.000Z',riskRequested:false,risk:{seed:'',iterations:1000,variables:{},rationale:''},compReviews:{},analystEvidence:[],notes:'Synthetic assumptions for sparse-evidence report QA; retained property evidence remains unchanged.'};
  const selected=structuredClone(saved);selected.compReviews={[property.sales[0].evidenceRef]:{include:true,notes:'Fixture-only selection; transfer and condition still require verification.'}};
  const payoff=structuredClone(saved);payoff.analystEvidence=payoff.analystEvidence.filter(entry=>entry.category!=='ALGORITHMIC_BALANCE');payoff.analystEvidence.push({id:'00000000-0000-4000-8000-000000009999',category:'VERIFIED_PAYOFF',status:'PRESENT',value:'118500',sourceName:'Synthetic lender payoff demand fixture',sourceDate:'2026-10-15',retrievedAt:'2026-10-15',verificationClass:'INDEPENDENTLY_VERIFIED',notes:'Synthetic QA fixture only.',attachmentReference:'local-fixture/synthetic-lender-payoff-demand.pdf',includeInReport:true,sensitive:false});
  const stressProperty=structuredClone(property);stressProperty.ref='QA-LAYOUT-STRESS';stressProperty.address='12345 West Extraordinary Investor Research Boulevard Extension, Bakersfield, CA 93305-1234';stressProperty.sales=stressProperty.sales.map((sale,index)=>({...sale,address:`${9000+index} Exceptionally Long Comparable Research Avenue Suite ${index+100}, Bakersfield, CA 93305-1234`,reason:`Synthetic layout-only source description ${'with deliberately long explanatory language '.repeat(3)}`.trim()}));
  const stress=structuredClone(saved);stress.id='00000000-0000-4000-8000-000000000906';stress.propertyRef=stressProperty.ref;stress.name='Synthetic long-content and large-number layout fixture';stress.inputs={...stress.inputs,purchasePrice:'9000000',rehabCost:'1234567',exitValue:'15000000'};stress.riskRequested=false;stress.compReviews=Object.fromEntries(stressProperty.sales.map((sale,index)=>[sale.evidenceRef,{include:index===0,notes:`Synthetic ${index?'exclusion':'selection'} rationale for layout testing; no ARV adjustment inferred.`}]));stress.analystEvidence=[...stress.analystEvidence,...Array.from({length:6},(_,index)=>({id:`00000000-0000-4000-8000-${String(7000+index).padStart(12,'0')}`,category:'LIEN',status:index===5?'UNKNOWN':'PRESENT',value:index===5?'':String(125000+index*11111),sourceName:`Synthetic recorded-document source ${index+1} with a deliberately descriptive reference`,sourceDate:'2026-10-15',retrievedAt:'2026-10-15',verificationClass:index===5?'UNVERIFIED_NOTE':'RECORDED_DOCUMENT',notes:'Layout-only lien fixture; current status and priority are not established.',attachmentReference:'',includeInReport:true,sensitive:false}))];stress.notes='Synthetic stress fixture for long addresses, large numbers, long source descriptions, selected and excluded comparable records, and zero-to-many liens. Not investment evidence.';
  check('selected-comparable fixture remains a selection, not an adjusted ARV',reportModel(property,selected).model.resaleSupport.status==='SELECTED_RESEARCH_NOT_ADJUSTED_ARV');
  check('synthetic verified-payoff fixture is explicitly distinguished',reportModel(property,payoff).model.sellerFinancialPosition.mortgage.status==='VERIFIED_PAYOFF');
  check('sparse fixture leaves missing seller obligations unknown',reportModel(boron,sparse).model.sellerFinancialPosition.calculationStatus==='INCOMPLETE_UNKNOWN_OBLIGATIONS');
  check('layout stress fixture retains multiple liens without treating an unknown lien as zero',reportModel(stressProperty,stress).model.sellerFinancialPosition.liens.amount===null);

  const renderCases=[{name:'GABE-01',property,scenario:saved,kinds:['brief','full']},{name:'GABE-05-sparse',property:boron,scenario:sparse,kinds:['full']},{name:'QA-layout-stress',property:stressProperty,scenario:stress,kinds:['full']}];
  const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
  const browserVersion=await browser.version();
  try{
    for(const item of renderCases)for(const kind of item.kinds){
      const prefix=`${item.name}-${kind}-quality`,html=workspaceReportHtml(item.property,item.scenario,evidence,kind),rendered=await renderWorkspacePdf(html);
      await put(output,`${prefix}.html`,html);await put(output,`${prefix}.pdf`,rendered.bytes);
      const page=await browser.newPage();await page.setJavaScriptEnabled(false);await page.setRequestInterception(true);page.on('request',request=>{remoteAttempts.push(request.url());request.abort();});await page.emulateMediaType('print');await page.setContent(html);
      const layout=await page.evaluate(()=>({sections:[...document.querySelectorAll('.page')].map(section=>({className:section.className,height:section.getBoundingClientRect().height})),overflow:[...document.querySelectorAll('td,th,table,.metric,.workspace-page-id,.chart-card')].filter(element=>element.scrollWidth>element.clientWidth+2).map(element=>element.tagName),svgOverflow:[...document.querySelectorAll('svg')].flatMap(svg=>[...svg.querySelectorAll('text,rect,line,polyline')].map(element=>{const box=element.getBBox(),view=svg.viewBox.baseVal;return box.x< -1||box.y< -1||box.x+box.width>view.width+1||box.y+box.height>view.height+1;})).filter(Boolean).length,county:document.querySelector('.county-text')?.innerText??''}));await page.close();
      const pages=await pagesFromPdf(rendered.bytes,output,prefix),allPages=await sheet(output,prefix,pages),fullText=normalized(pages.map(value=>value.text).join(' '));
      check(`${prefix}: no remote asset requests`,rendered.blockedRequests===0);
      check(`${prefix}: no blank or out-of-bounds PDF pages`,pages.every(value=>value.characters>200&&value.outOfBounds===0));
      check(`${prefix}: no HTML or SVG overflow`,layout.overflow.length===0&&layout.svgOverflow===0);
      check(`${prefix}: pagination is intentional`,item.name==='QA-layout-stress'?pages.length>=layout.sections.length:pages.length===layout.sections.length);
      check(`${prefix}: complete county notice retained`,normalized(layout.county)===normalized(evidence.disclaimer)&&fullText.replace(/\s/g,'').includes(evidence.disclaimer.replace(/\s/g,'')));
      check(`${prefix}: preliminary status and immutable revision metadata retained`,/Preliminary/i.test(fullText)&&fullText.includes(item.scenario.name)&&fullText.includes(`r${item.scenario.revision}`));
      if(item.name==='GABE-01'){
        check(`${prefix}: exact Crestview scenario values retained`,['$175,000','$15,000','$280,000','$212,845','$67,155','31.6%','34.3%','$199,783.25'].every(value=>fullText.includes(value)));
        check(`${prefix}: resale remains unsupported by selected comps`,/no comparable sales selected|zero selected/i.test(fullText)&&/not independently supported/i.test(fullText));
        check(`${prefix}: county amount is not promoted to current distress`,/not current delinquency/i.test(fullText));
        if(kind==='full'){
          check(`${prefix}: seller balance is not mislabeled algorithmic`,!fullText.includes('Algorithmic estimated balance')&&fullText.includes('Seller-reported estimated balance'));
          check(`${prefix}: simulation is conditional, not a success guarantee`,/0 losses in 1,000 simulated outcomes under the entered ranges/i.test(fullText)&&!/100% success/i.test(fullText));
        }
      }else if(item.name==='GABE-05-sparse')check(`${prefix}: sparse evidence is candid`,/unknown/i.test(fullText)&&/No analyst research entries/i.test(fullText));
      else check(`${prefix}: synthetic stress fixture is visibly identified`,/Synthetic long-content and large-number layout fixture/i.test(fullText)&&/Synthetic stress fixture/i.test(fullText));
      reports.push({name:item.name,kind,pdf:`${prefix}.pdf`,html:`${prefix}.html`,pages:pages.length,images:pages.map(value=>value.image),allPages,sha256:hash(rendered.bytes),blockedRequests:rendered.blockedRequests});
      await put(output,`${prefix}-layout.json`,JSON.stringify({layout,pages},null,2)+'\n');
    }
    check('browser and renderer made zero remote requests',remoteAttempts.length===0&&offlineStatus().networkAttempts===0);
  }finally{await browser.close();}

  const comparisons=[];
  for(const kind of ['brief','full']){
    const before=baselineResult.reports.find(report=>report.kind===kind),after=reports.find(report=>report.name==='GABE-01'&&report.kind===kind);
    comparisons.push(await compareImage(output,path.join(baselineDirectory,before.images[0]),path.join(output,after.images[0]),`GABE-01-${kind}-first-page-before-after.png`));
    comparisons.push(await compareImage(output,path.join(baselineDirectory,before.allPages),path.join(output,after.allPages),`GABE-01-${kind}-all-pages-before-after.png`));
  }
  const acceptance=[
    ['Investment hypothesis','Generic assumptions dashboard','Conditional purchase / rehab / exit hypothesis with explicit evidence limits','PASS'],
    ['Resale support','Sale examples mixed into market context','Explicit zero-selected status; exit remains an unsupported analyst assumption','PASS'],
    ['Seller evidence','Raw enums and source/category conflict','Human labels follow source and verification class; unknown liens block equity','PASS'],
    ['Simulation','Prominent positive-profit frequency','Observed-loss statement qualified by entered ranges, plus P10/P50/P90 and omitted risks','PASS'],
    ['Visual hierarchy','Dense tables and unused space','Investor dashboard, cost composition, downside bars, compact comp table','PASS'],
    ['Notices and provenance','Required county notice retained','Notice retained verbatim; source dates, scenario revision and preliminary status preserved','PASS']
  ];
  const evidenceAssertions={property:'RentCast provider-reported property facts',valuation:'RentCast provider model estimate; as-is, not ARV',sales:'Four source-reported Sale events; not independently verified escrow closings',county:'Historical Power-to-Sell amount; not current delinquency, payoff, foreclosure or motivation',mortgageOriginal:'Analyst-entered original amount with Tax Assessor source; recorded-document support not established',mortgageBalance:'Seller-reported estimate; not lender payoff',liens:'Unknown; not coerced to zero',resale:'Analyst assumption; no selected comps',simulation:'Conditional on bounded entered ranges; not calibrated probability'};
  const financialAssertions={purchase:175000,rehab:15000,resale:280000,totalProjectCost:212845,modeledProfit:67155,projectRoi:crestview.analysis.deterministic.roi,cashOnCash:crestview.analysis.deterministic.cashOnCash,mao:199783.25,breakEven:crestview.analysis.mao.breakEven.purchasePrice,simulations:1000,losses:0};
  const result={status:'PASS',at:new Date().toISOString(),node:process.version,browser:browserVersion,baselineDirectory,reports,comparisons,checks,acceptance,financialAssertions,evidenceAssertions,providerCalls:0,databaseConnections:0,productionWrites:0,financialEngineChanges:0,skippedTests:0};
  await put(output,'qa-results.json',JSON.stringify(result,null,2)+'\n');
  const reportSections=reports.map(report=>`<section><h2>${report.name} · ${report.kind} · ${report.pages} pages</h2><p><a href="${report.pdf}">PDF</a> · <a href="${report.html}">HTML preview</a></p>${report.images.map((image,index)=>`<h3>Page ${index+1}</h3><img src="${image}" alt="${report.name} ${report.kind} page ${index+1}">`).join('')}</section>`).join('');
  await put(output,'visual-qa-index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PI V2.0 investor report visual QA</title><style>body{font:16px Arial;color:#173f4e;background:#edf2f1;margin:24px;max-width:1100px}section{background:#fff;padding:20px;margin:24px 0}img{display:block;max-width:100%;border:1px solid #bdcecd;margin:12px 0}a{color:#08705f}</style></head><body><h1>PI V2.0 Investor Report Quality Pass</h1><p>Private offline visual QA. Every generated page is shown below; provider calls and remote assets: zero.</p>${comparisons.map(image=>`<section><h2>Before / after</h2><img src="${image}" alt="Before and after report comparison"></section>`).join('')}${reportSections}</body></html>`);
  console.log(JSON.stringify({status:result.status,output,checks:checks.length,reports:reports.map(({name,kind,pages})=>({name,kind,pages})),comparisons}));
}

if(process.argv.includes('--capture-baseline'))await baseline();else await finalQa();
