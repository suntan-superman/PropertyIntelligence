import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
import {fixture,preservation} from '../src/workbench/model.js';
import {synthetic} from '../src/workbench/synthetic.js';
import {generateReport} from '../src/reports/pdf.js';
import {reportHtml} from '../src/reports/html.js';
import {resolve,writeJson} from '../src/io/files.js';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
const directory='data/validation/sprint3_2-visual/pdf';await mkdir(resolve(directory),{recursive:true});
const results=[];
for(const model of [await fixture('fantasia'),await fixture('bass'),await fixture('joyce'),await synthetic('long'),await synthetic('many-comps')]){
  assert.doesNotMatch(reportHtml(model),/investment recommendation|offering memorandum|guaranteed return|investment approval/i);
  const report=await generateReport(model),saved=JSON.parse(await readFile(resolve(report.path.replace('.pdf','.model.json')),'utf8'));
  assert.deepEqual(saved,model,'Report must retain exact shared screen model');
  const doc=await getDocument({data:new Uint8Array(await readFile(resolve(report.path))),useSystemFonts:true,isEvalSupported:false}).promise;
  assert.equal(doc.numPages,report.pages);
  const pages=[],texts=[];let compPages=0;
  for(let i=1;i<=doc.numPages;i++){
    const page=await doc.getPage(i),view=page.getViewport({scale:1.35}),content=await page.getTextContent();
    const words=content.items.filter(x=>x.str?.trim()),text=words.map(x=>x.str).join(' ');texts.push(text);
    assert.ok(text.length>180,`${model.id}: blank / near-empty page ${i}`);
    assert.ok(text.includes(`Page ${i} of ${doc.numPages}`),`Page ${i} footer missing`);
    for(const w of words){const x=w.transform[4],y=w.transform[5];assert.ok(x>=25&&x+w.width<=590,`${model.id} page ${i} text crosses horizontal bounds`);assert.ok(y>=15&&y<=780,`${model.id} page ${i} text crosses vertical bounds`);}
    if(text.includes('# / address')&&text.includes('Provider-listed'))compPages++;
    const canvas=createCanvas(Math.ceil(view.width),Math.ceil(view.height));
    await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
    const image=`${directory}/${model.id}-page-${String(i).padStart(2,'0')}.png`;await writeFile(resolve(image),canvas.toBuffer('image/png'));
    pages.push({page:i,image,words:words.length});
  }
  const all=texts.join('\n');
  for(const comp of model.comps)assert.ok(all.includes(comp.address.replaceAll('—','—')),`Missing comp ${comp.number}`);
  if(model.id==='fantasia'){assert.ok(doc.numPages>=8&&doc.numPages<=12,`Fantasia page target: ${doc.numPages}`);assert.match(all,/-\$58,000/);assert.match(all,/180,000/);}
  if(model.id==='synthetic-many-comps')assert.ok(compPages>=3,'Repeated headers on multipage comp table');
  const thumbWidth=245,thumbHeight=320,cols=4,rows=Math.ceil(pages.length/cols),sheet=createCanvas(cols*thumbWidth,rows*thumbHeight);
  const ctx=sheet.getContext('2d');ctx.fillStyle='#cbd4ce';ctx.fillRect(0,0,sheet.width,sheet.height);
  const {loadImage}=await import('@napi-rs/canvas');
  for(const item of pages){const img=await loadImage(resolve(item.image));ctx.drawImage(img,((item.page-1)%cols)*thumbWidth,Math.floor((item.page-1)/cols)*thumbHeight,thumbWidth-5,thumbHeight-5);}
  const contact=`${directory}/${model.id}-contact.png`;await writeFile(resolve(contact),sheet.toBuffer('image/png'));
  results.push({...report,id:model.id,pageCount:doc.numPages,compPages,pageImages:pages,contact,checks:'PASS: model equality, page count, text bounds, nonblank pages, footers, retained comps, terminology'});
  console.log(`${model.id}: ${doc.numPages} pages, ${model.comps.length} comps, PASS`);await doc.destroy();
}
await writeJson('data/validation/sprint3_2-pdf-qa.json',{at:new Date().toISOString(),liveCalls:0,preservation:await preservation(),results,visualInspection:'PNG pages/contact sheets generated; reviewer findings recorded in docs/PDF_QA_CHECKLIST.md'});
