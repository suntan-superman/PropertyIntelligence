import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import {investorFixtures} from '../src/reports/investor-v1/fixtures.js';
import {investorReportHtml} from '../src/reports/investor-v1/html.js';
import {renderInvestorPdf} from '../src/reports/investor-v1/pdf.js';

const puppeteerPackage=JSON.parse(await readFile(new URL('../node_modules/puppeteer/package.json',import.meta.url),'utf8'));
const outputDir='data/validation/investor-report-v1/v1.1';
const forbidden=/\b(undefined|null)\b|�|�/;
async function inspect(bytes){
  const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise,pages=[];let sparse=[];
  for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n),content=await page.getTextContent(),text=content.items.map(x=>x.str).join(' ');pages.push(text);
    assert(!forbidden.test(text),`invalid token/glyph on page ${n}`);assert(text.trim().length>90,`blank/near-blank page ${n}`);
    const vp=page.getViewport({scale:1}),ys=[];for(const item of content.items){if(!item.str.trim())continue;const [, , , ,x,y]=item.transform;if(x< -2||x>vp.width+2||y< -4||y>vp.height+4)throw new Error(`PDF_TEXT_OUT_OF_BOUNDS_PAGE_${n}`);if(y>30&&y<vp.height-30)ys.push(y);}
    const verticalCoverage=ys.length?(Math.max(...ys)-Math.min(...ys))/vp.height:0;if(text.trim().length<230||verticalCoverage<.22)sparse.push({page:n,characters:text.trim().length,verticalCoverage:Number(verticalCoverage.toFixed(2))});
  }
  return {pages:pdf.numPages,text:pages.join('\n'),pageTexts:pages,sparse};
}
async function renderPage(pdfBytes,pageNumber,target){const pdf=await getDocument({data:new Uint8Array(pdfBytes)}).promise,page=await pdf.getPage(pageNumber),viewport=page.getViewport({scale:1.35}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;await mkdir(path.dirname(target),{recursive:true});await writeFile(target,canvas.toBuffer('image/png'));}
async function makeContactSheet(paths,target){const cols=2,thumbW=425,thumbH=550,gap=18,rows=Math.ceil(paths.length/cols),canvas=createCanvas(cols*thumbW+(cols+1)*gap,rows*thumbH+(rows+1)*gap),ctx=canvas.getContext('2d'),{loadImage}=await import('@napi-rs/canvas');ctx.fillStyle='#e9edef';ctx.fillRect(0,0,canvas.width,canvas.height);for(let i=0;i<paths.length;i++){const image=await loadImage(paths[i]);const x=gap+(i%cols)*(thumbW+gap),y=gap+Math.floor(i/cols)*(thumbH+gap),scale=Math.min(thumbW/image.width,thumbH/image.height);ctx.fillStyle='#fff';ctx.fillRect(x,y,thumbW,thumbH);ctx.drawImage(image,x+(thumbW-image.width*scale)/2,y+(thumbH-image.height*scale)/2,image.width*scale,image.height*scale);}await writeFile(target,canvas.toBuffer('image/png'));}
async function layoutCheck(model,kind){const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-background-networking','--no-first-run']});try{const page=await browser.newPage();await page.setJavaScriptEnabled(false);await page.setRequestInterception(true);page.on('request',r=>r.abort());await page.setContent(investorReportHtml(model,{kind}),{waitUntil:'load'});return await page.evaluate(()=>({
  pageOverflow:[...document.querySelectorAll('.page')].map((p,i)=>({page:i+1,scroll:p.scrollHeight,limit:Math.ceil(9.85*96)})).filter(x=>x.scroll>x.limit+4),
  tableOverflow:[...document.querySelectorAll('table')].map((t,i)=>({table:i+1,scroll:t.scrollWidth,client:t.clientWidth})).filter(x=>x.scroll>x.clientWidth+2),
  chartCount:document.querySelectorAll('svg.histogram').length,
  chartClipping:[...document.querySelectorAll('svg.histogram')].flatMap((svg,i)=>[...svg.querySelectorAll('rect,line,text')].map(el=>{const r=el.getBBox(),vb=svg.viewBox.baseVal;return {chart:i+1,element:el.tagName,x:r.x,y:r.y,right:r.x+r.width,bottom:r.y+r.height,width:vb.width,height:vb.height};})).filter(x=>x.x< -1||x.y< -1||x.right>x.width+1||x.bottom>x.height+1),
  orphanHeadings:[...document.querySelectorAll('h2,h3')].filter(h=>!h.nextElementSibling||!h.nextElementSibling.textContent.trim()).map(h=>h.textContent.trim())
}));}finally{await browser.close();}}
let providerCalls=0;const originalFetch=globalThis.fetch;globalThis.fetch=async(...args)=>{providerCalls++;throw new Error(`NETWORK_FORBIDDEN ${args[0]}`);};
try{
  await mkdir(outputDir,{recursive:true});const results=[];
  for(let i=0;i<investorFixtures.length;i++){
    const model=investorFixtures[i],caseName=i===3?'stress':model.disposition.value.toLowerCase();
    for(const kind of ['brief','full']){
      const fileName=i===0?(kind==='brief'?'PI_INVESTOR_OPPORTUNITY_BRIEF_V1_1.pdf':'PI_FULL_DUE_DILIGENCE_REPORT_V1_1.pdf'):`${caseName}-${kind.toUpperCase()}-V1_1.pdf`;
      const outputPath=path.join(outputDir,fileName),rendered=await renderInvestorPdf(model,{kind});
      await writeFile(outputPath,rendered.bytes,{mode:0o600});const qa=await inspect(rendered.bytes),layout=await layoutCheck(model,kind),imagePaths=[];
      const safeBase=fileName.replace(/\.pdf$/,'');for(let n=1;n<=qa.pages;n++){const imagePath=path.join(outputDir,`${safeBase}.page-${n}.png`);await renderPage(rendered.bytes,n,imagePath);imagePaths.push(imagePath);}
      const contactSheet=path.join(outputDir,`${safeBase}.contact-sheet.png`);await makeContactSheet(imagePaths,contactSheet);
      if(kind==='brief')assert.equal(qa.pages,3,`${model.reportMeta.reportId}: Brief must remain exactly 3 pages`);
      else assert(qa.pages>=7&&qa.pages<=10,`${model.reportMeta.reportId}: Full report page count ${qa.pages} outside 7–10`);
      assert.equal(qa.sparse.length,0,`${model.reportMeta.reportId}/${kind}: suspiciously sparse page ${JSON.stringify(qa.sparse)}`);
      assert.equal(layout.pageOverflow.length,0,`${model.reportMeta.reportId}/${kind}: page content overflow ${JSON.stringify(layout.pageOverflow)}`);
      assert.equal(layout.tableOverflow.length,0,`${model.reportMeta.reportId}/${kind}: table overflow ${JSON.stringify(layout.tableOverflow)}`);
      assert.equal(layout.chartClipping.length,0,`${model.reportMeta.reportId}/${kind}: chart clipping ${JSON.stringify(layout.chartClipping)}`);
      assert.equal(layout.orphanHeadings.length,0,`${model.reportMeta.reportId}/${kind}: orphan headings ${JSON.stringify(layout.orphanHeadings)}`);
      assert.equal(layout.chartCount,1,`${model.reportMeta.reportId}/${kind}: histogram missing or duplicated`);
      for(const phrase of [model.disposition.value,'Not checked','not an appraisal','$'])assert(qa.text.toLowerCase().includes(phrase.toLowerCase()),`missing PDF text: ${phrase}`);
      const headlineAmounts=[model.valuation.estimate,model.economics.mao,model.economics.profit,model.monteCarlo.percentiles.p10,model.monteCarlo.percentiles.p50,model.monteCarlo.percentiles.p90].filter(x=>typeof x?.value==='number').map(x=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(x.value));
      const compactText=qa.text.replace(/\s+/g,'');for(const amount of headlineAmounts)assert(compactText.includes(amount.replace(/\s+/g,'')),`headline financial amount is missing currency formatting: ${amount}`);
      for(const phrase of ['P10','P50','P90','Sensitivity ranking','What could kill this deal?'])assert(qa.text.toLowerCase().includes(phrase.toLowerCase()),`missing modeled risk presentation: ${phrase}`);
      if(kind==='full')for(const phrase of ['Known / estimated / unknown','KNOWN','ESTIMATED','UNKNOWN','Sources & methodology'])assert(qa.text.toLowerCase().includes(phrase.toLowerCase()),`missing full-report feature: ${phrase}`);
      assert(!qa.text.includes('��'),'replacement glyph found');
      results.push({case:caseName,id:model.reportMeta.reportId,kind,pages:qa.pages,bytes:rendered.byteLength,pdf:outputPath,pageImages:imagePaths,contactSheet,sparsePages:qa.sparse,layout});
    }
  }
  assert.equal(providerCalls,0,'provider/network requests must remain zero');
  const report={status:'PASS',version:'1.1',puppeteer:puppeteerPackage.version,checks:{investigate:'PASS',watch:'PASS',pass:'PASS',stress:'PASS',monteCarloHistogram:'PASS',sensitivityVisualization:'PASS',knownEstimatedUnknown:'PASS',sparsePageQa:'PASS',currencyFormatting:'PASS'},providerCalls,deployment:0,results};
  await writeFile(path.join(outputDir,'V1_1_QA.json'),JSON.stringify(report,null,2),{mode:0o600});
  console.log(JSON.stringify(report,null,2));
}finally{globalThis.fetch=originalFetch;}
