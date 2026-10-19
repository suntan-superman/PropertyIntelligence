import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import puppeteer from 'puppeteer';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {SYNTHETIC_NOTICE} from '../src/reports/investor-v1/analysisTrust.js';
import {usd} from '../src/reports/investor-v1/monteCarloHtml.js';
import {PRESENTATION_VERSION,LOSS_QUALIFICATION,TIED_LABEL} from '../src/reports/investor-v1/presentation.js';

export async function inspectLayout(html,{calculated=true}={}){
  const browser=await puppeteer.launch({headless:true,pipe:true,args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
  try{
    const page=await browser.newPage(),errors=[],requests=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
    await page.setJavaScriptEnabled(false);await page.setRequestInterception(true);page.on('request',r=>{requests.push(r.resourceType());r.abort();});
    await page.emulateMediaType('print');await page.setContent(html,{waitUntil:'load'});
    const layout=await page.evaluate(()=>({
      pages:[...document.querySelectorAll('.page')].map((p,i)=>({page:i+1,height:p.getBoundingClientRect().height,scroll:p.scrollHeight})),
      horizontal:[...document.querySelectorAll('table,td,.datum')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.tagName),
      orphanHeadings:[...document.querySelectorAll('h2,h3')].filter(e=>!e.nextElementSibling?.textContent?.trim()).map(e=>e.textContent),
      footerOverlap:[...document.querySelectorAll('.mc-page')].flatMap((p,i)=>{const footer=p.querySelector('.mc-page-id'),prev=footer.previousElementSibling;return prev.getBoundingClientRect().bottom>footer.getBoundingClientRect().top-4?[i+1]:[];}),
      svgOverflow:[...document.querySelectorAll('svg')].flatMap((svg,i)=>[...svg.querySelectorAll('text,rect,line')].filter(e=>!e.closest('defs')).map(e=>{const b=e.getBBox(),v=svg.viewBox.baseVal;return {chart:i+1,type:e.tagName,x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height,width:v.width,height:v.height};})).filter(b=>b.x< -1||b.y< -1||b.right>b.width+1||b.bottom>b.height+1),
      histogramCount:document.querySelectorAll('svg.histogram').length,sensitivityCount:document.querySelectorAll('svg.mc-sensitivity').length,
      binCounts:[...document.querySelectorAll('[data-count]')].map(e=>Number(e.dataset.count))
    }));
    return {layout,errors,requests,calculated};
  }finally{await browser.close();}
}
export async function inspectPdf(bytes,{model,html,outputDir,calculated=true,kind='full'}={}){
  const polished=model.reportMeta?.reportVersion===PRESENTATION_VERSION,appendix=polished&&kind==='appendix';
  await mkdir(outputDir,{recursive:true});
  const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise,images=[],pages=[];
  for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n),vp=page.getViewport({scale:1}),items=(await page.getTextContent()).items.filter(x=>x.str?.trim());
    const text=items.map(x=>x.str).join(' '),outOfBounds=items.filter(x=>x.transform[4]< -1||x.transform[4]+x.width>vp.width+2||x.transform[5]< -2||x.transform[5]>vp.height+2);
    const body=items.filter(x=>x.transform[5]>35&&x.transform[5]<vp.height-35),ys=body.map(x=>x.transform[5]);
    const coverage=ys.length?(Math.max(...ys)-Math.min(...ys))/vp.height:0;
    const viewport=page.getViewport({scale:1.4}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    const name=`page-${n}.png`;await writeFile(join(outputDir,name),canvas.toBuffer('image/png'),{flag:'wx'});images.push(join(outputDir,name));
    pages.push({page:n,characters:text.length,coverage,outOfBounds:outOfBounds.map(x=>x.str),text});
  }
  const cols=2,w=510,h=660,gap=16,canvas=createCanvas(cols*w+3*gap,Math.ceil(images.length/cols)*(h+gap)+gap),ctx=canvas.getContext('2d');ctx.fillStyle='#e9edef';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<images.length;i++){const im=await loadImage(images[i]);ctx.drawImage(im,gap+i%cols*(w+gap),gap+Math.floor(i/cols)*(h+gap),w,h);}
  await writeFile(join(outputDir,'contact-sheet.png'),canvas.toBuffer('image/png'),{flag:'wx'});
  const layout=await inspectLayout(html,{calculated}),qa={pages:pdf.numPages,pageResults:pages,layout,images,visualReview:'PENDING_HUMAN_OR_AGENT_IMAGE_INSPECTION'};
  await writeFile(join(outputDir,'automated-qa.json'),JSON.stringify(qa,null,2),{flag:'wx'});
  assert.equal(pdf.numPages,calculated?(polished?(appendix?1:5):6):html.includes('Full Due-Diligence Report')?8:3,'PAGE_COUNT');
  assert.equal(layout.errors.length,0,'BROWSER_ERRORS');assert.equal(layout.requests.length,0,'EXTERNAL_REQUESTS');
  assert.equal(layout.layout.horizontal.length,0,'HORIZONTAL_OVERFLOW');assert.equal(layout.layout.footerOverlap.length,0,'FOOTER_OVERLAP');
  assert.equal(layout.layout.svgOverflow.length,0,`SVG_OVERFLOW ${JSON.stringify(layout.layout.svgOverflow)}`);
  assert.equal(layout.layout.orphanHeadings.length,0,'ORPHAN_HEADING');assert.ok(layout.layout.pages.every(p=>p.height<=9.85*96+4),'PAGE_CONTENT_OVERFLOW');
  assert.equal(layout.layout.histogramCount,appendix?0:1,'HISTOGRAM_MISSING_OR_DUPLICATED');
  for(const p of pages){assert.ok(p.characters>230&&p.coverage>.22,'BLANK_OR_SPARSE_PAGE');assert.equal(p.outOfBounds.length,0,'PDF_TEXT_BOUNDS');assert.doesNotMatch(p.text,/\b(?:undefined|NaN|Infinity|null)\b|\uFFFD/,'INVALID_PDF_TEXT');}
  if(calculated){
    for(const p of pages)assert.ok(p.text.includes(SYNTHETIC_NOTICE),'SYNTHETIC_BANNER_MISSING');
    if(appendix){
      assert.equal(layout.layout.sensitivityCount,0);assert.deepEqual(layout.layout.binCounts,[]);
      const text=pages.map(p=>p.text).join('').replace(/\s+/g,''),a=model.certifiedAnalysis;
      for(const v of [a.execution.scenarioId,model.reportMeta.reportId,a.execution.modelVersion,a.execution.economicsVersion,a.execution.assumptionsVersion,a.result.simulation.generatorVersion,a.execution.seed,a.execution.runtime,a.execution.inputFingerprint,a.execution.modelFingerprint,a.execution.sourceBundleFingerprint,a.execution.resultFingerprint,model.modelFingerprint])assert.ok(text.includes(String(v).replace(/\s+/g,'')),`APPENDIX_IDENTITY_MISSING ${v}`);
      assert.ok(text.includes('scripts/verify-investor-mc-package.js'));assert.ok(text.includes('separatetrustedreceipt'));
    }else{
    assert.equal(layout.layout.sensitivityCount,1);const r=model.certifiedAnalysis.result;
    assert.deepEqual(layout.layout.binCounts,r.results.profitDistribution.map(b=>b.count));
    const text=pages.map(p=>p.text).join(' ').replace(/\s+/g,'');
    for(const v of [r.deterministic.modeledProfit,r.mao.deterministic.purchasePrice,r.riskAdjustedMao.purchasePrice,r.results.profit.p10,r.results.profit.p50,r.results.profit.p90])assert.ok(text.includes(usd(v).replace(/\s+/g,'')),`FINANCIAL_TEXT_MISSING ${usd(v)}`);
    for(const v of [r.results.probabilityOfProfit,r.results.probabilityOfLoss,r.results.probabilityMeetingTarget])assert.ok(text.includes(`${(v*100).toFixed(2)}%`),'PROBABILITY_TEXT_MISSING');
    if(polished){
      assert.ok(text.includes(TIED_LABEL.replace(/\s+/g,'')));assert.doesNotMatch(pages.map(p=>p.text).join(' '),/UNRESOLVED_OR_TIED|\bAVAILABLE\b|NOT_ASSESSED|SYNTHETIC_TEST_FIXTURE|\bpp\b/);
      assert.ok(text.includes(LOSS_QUALIFICATION.replace(/\s+/g,'')));assert.ok(text.includes('InvestmentDecisionSnapshot'));
    }else assert.ok(text.includes('UNRESOLVED_OR_TIED'));
    assert.ok(text.includes('notannualized'));
    }
  }
  await pdf.destroy();return {...qa,status:'AUTOMATED_PASS'};
}
