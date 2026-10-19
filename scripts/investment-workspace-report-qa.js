import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {loadEvidence,sha} from '../src/investment-workspace/evidence.js';
import {reportModel,workspaceReportHtml,renderWorkspacePdf} from '../src/investment-workspace/reports.js';
import {reportMatrix} from '../tests/fixtures/workspaceReports.js';
import {offlineStatus} from '../src/analysis/offline.js';

// Ordinary report QA, not a new certification/approval system. All outputs go
// to a fresh private directory; a pre-edit capture is required for drift checks.
const before=process.argv[2];assert.ok(before,'Supply the private pre-change QA directory.');
const original=JSON.parse(await readFile(path.join(before,'financial-outputs.json')));
const hashes=JSON.parse(await readFile(path.join(before,'preservation.json')));
const base=path.resolve('data/runtime/investment-workspace-v1-1');await mkdir(base,{recursive:true});
const output=await mkdtemp(path.join(base,'qa-')),evidence=await loadEvidence(),matrix=reportMatrix(evidence);
const checks=[],failures=[],reports=[];
const check=(name,ok)=>{(ok?checks:failures).push(name);};
const put=(name,content)=>writeFile(path.join(output,name),content,{flag:'wx'});
const normalized=x=>x.replace(/\s+/g,' ').trim();
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
let externalAttempts=0;
try{
  for(const x of matrix){
    const result=reportModel(x.property,x.scenario);
    assert.deepEqual(result.analysis,original.find(o=>o.name===x.name).analysis,`Financial drift: ${x.name}`);
    check(`${x.name}: exact pre-change full financial/MC output`,true);
    await put(`${x.name}-scenario.json`,JSON.stringify(x.scenario,null,2));
    await put(`${x.name}-model.json`,JSON.stringify(result,null,2));
    for(const kind of ['brief','full']){
      const name=`${x.name}-${kind}`,html=workspaceReportHtml(x.property,x.scenario,evidence,kind);
      await put(`${name}.html`,html);
      const rendered=await renderWorkspacePdf(html);check(`${name}: zero resource requests`,rendered.blockedRequests===0);
      await put(`${name}.pdf`,rendered.bytes);
      const page=await browser.newPage();await page.setJavaScriptEnabled(false);await page.setRequestInterception(true);page.on('request',r=>{externalAttempts++;r.abort();});await page.emulateMediaType('print');await page.setContent(html);
      const layout=await page.evaluate(()=>({
        sections:[...document.querySelectorAll('.page')].map(p=>({class:p.className,height:p.getBoundingClientRect().height})),
        overflow:[...document.querySelectorAll('td,th,table,.metric,.workspace-page-id')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.tagName),
        counts:[...document.querySelectorAll('[data-count]')].map(e=>Number(e.dataset.count)),
        svgOverflow:[...document.querySelectorAll('svg')].flatMap(svg=>[...svg.querySelectorAll('text,rect,line')].filter(e=>!e.closest('defs')).map(e=>{const b=e.getBBox(),v=svg.viewBox.baseVal;return b.x< -1||b.y< -1||b.x+b.width>v.width+1||b.y+b.height>v.height+1;})).filter(Boolean).length,
        county:document.querySelector('.county-text').innerText
      }));await page.close();
      check(`${name}: all county notice text unchanged`,normalized(layout.county)===normalized(evidence.disclaimer));
      check(`${name}: no horizontal overflow`,layout.overflow.length===0);
      check(`${name}: no SVG clipping`,layout.svgOverflow===0);
      if(kind==='full'&&result.analysis.monteCarlo)check(`${name}: exact histogram sample count`,layout.counts.reduce((a,b)=>a+b,0)===x.scenario.risk.iterations);
      const pdf=await getDocument({data:new Uint8Array(rendered.bytes),useSystemFonts:true}).promise,pages=[];
      for(let n=1;n<=pdf.numPages;n++){
        const pp=await pdf.getPage(n),vp=pp.getViewport({scale:1}),items=(await pp.getTextContent()).items.filter(i=>i.str?.trim()),text=items.map(i=>i.str).join(' ');
        const bad=items.filter(i=>i.transform[4]<0||i.transform[4]+i.width>vp.width+2||i.transform[5]<0||i.transform[5]>vp.height+2);
        const view=pp.getViewport({scale:4/3}),canvas=createCanvas(Math.ceil(view.width),Math.ceil(view.height));await pp.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
        const image=`${name}-page-${n}.png`;await put(image,canvas.toBuffer('image/png'));pages.push({n,image,characters:text.length,outOfBounds:bad.length,text});
      }
      check(`${name}: no blank pages or out-of-bounds text`,pages.every(p=>p.characters>200&&p.outOfBounds===0));
      check(`${name}: no unintended section spill pages`,pdf.numPages===layout.sections.length);
      check(`${name}: executive snapshot fits first page`,/Top three diligence questions/.test(pages[0].text)&&/Hurdle-specific MAO/.test(pages[0].text));
      const fullText=normalized(pages.map(p=>p.text).join(' '));
      // PDF text items insert spaces at line-wrap hyphens ("up- to-date").
      // Compare all non-whitespace characters; the HTML check above is exact.
      check(`${name}: complete county notice survived PDF rendering`,fullText.replace(/\s/g,'').includes(evidence.disclaimer.replace(/\s/g,'')));
      check(`${name}: no misleading probability wording`,!/probability of (positive profit|loss)/i.test(fullText));
      await put(`${name}-layout.json`,JSON.stringify({layout,pages},null,2));
      // Two-page sheets at original 4/3 display scale; also keep individual PNGs.
      const sheets=[];for(let i=0;i<pages.length;i+=2){const batch=pages.slice(i,i+2),sheet=createCanvas(832*batch.length,1080),ctx=sheet.getContext('2d');ctx.fillStyle='#e5eaee';ctx.fillRect(0,0,sheet.width,sheet.height);for(let j=0;j<batch.length;j++)ctx.drawImage(await loadImage(path.join(output,batch[j].image)),8+j*832,12);const file=`${name}-sheet-${1+i/2}.png`;await put(file,sheet.toBuffer('image/png'));sheets.push(file);}
      reports.push({name,evidenceKind:x.evidenceKind,pages:pages.length,pdf:`${name}.pdf`,sha256:sha(rendered.bytes),sheets,images:pages.map(p=>p.image)});
      console.log(JSON.stringify({report:name,pages:pages.length,heights:layout.sections.map(p=>Math.round(p.height)),failures:failures.filter(f=>f.startsWith(name))}));
      await pdf.destroy();
    }
  }
  const changed=[];for(const [file,expected] of Object.entries(hashes))if(sha(await readFile(file))!==expected)changed.push(file);
  // Only the existing workspace adapter is intentionally replaced. Original
  // financial/identity/report engines and all pre-existing QA stay immutable.
  assert.deepEqual(changed,['src/investment-workspace/reports.js']);
  check(`${Object.keys(hashes).length-1} original protected/source/evidence files unchanged`,true);
  check('zero provider/database/network attempts',offlineStatus().networkAttempts===0&&externalAttempts===0);
  const result={status:failures.length?'FAIL':'PASS',at:new Date().toISOString(),node:process.version,browser:await browser.version(),before,checks,failures,reports,preservation:{checked:Object.keys(hashes).length,intentionallyChanged:changed},providerCalls:0,databaseConnections:0};
  await put('qa-results.json',JSON.stringify(result,null,2));
  await put('visual-index.html',`<!doctype html><html><head><meta charset="utf-8"><title>V1.1 private visual QA</title><style>body{font:16px Arial;background:#eef2f3;margin:24px}img{display:block;max-width:100%;margin:15px 0}section{margin-bottom:50px}a{color:#126957}</style></head><body><h1>V1.1 private visual QA</h1><p>All PDFs use artificial financial assumptions. QA-* variants are synthetic edge cases, not additional vendor evidence. Review every page at normal reading scale; individual PNGs preserve 816 × 1056 pixels.</p>${reports.map(r=>`<section><h2>${r.name} · ${r.pages} pages</h2><p>${r.evidenceKind} · <a href="${r.pdf}">PDF</a></p>${r.images.map((src,i)=>`<p>Page ${i+1}</p><img src="${src}" width="816" height="1056">`).join('')}</section>`).join('')}</body></html>`);
  console.log(JSON.stringify({status:result.status,output,checks:checks.length,failures}));if(failures.length)process.exitCode=1;
}catch(e){await put('failure.json',JSON.stringify({message:e.message,checks,failures,reports},null,2));console.error(JSON.stringify({status:'FAIL',output,error:e.message}));process.exitCode=1;
}finally{await browser.close();}
