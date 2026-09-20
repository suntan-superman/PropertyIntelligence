import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createCanvas,DOMMatrix,ImageData,Path2D,loadImage} from '@napi-rs/canvas';
import {buildInvestmentModel} from '../src/reports/investment/model.js';
import {renderInvestmentPdf} from '../src/reports/investment/pdf.js';
import {investmentFixture,fixtureNames,fixtureDatabase,ids} from '../tests/fixtures/investment.js';
import {createApi} from '../src/workbench/api/router.js';
import {writeJson,hash} from '../src/io/files.js';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
const dir='data/validation/sprint6_1-pdf';await mkdir(dir,{recursive:true});
const results=[];let externalCalls=0;const originalFetch=globalThis.fetch;globalThis.fetch=()=>{externalCalls++;throw new Error('Report QA forbids network');};
try{
for(const name of fixtureNames){
  const model=buildInvestmentModel(investmentFixture(name),'2026-09-20T00:00:00.000Z'),result=await renderInvestmentPdf(model);
  await writeFile(`${dir}/${name}.pdf`,result.bytes);await writeJson(`${dir}/${name}.model.json`,model);
  const doc=await getDocument({data:new Uint8Array(result.bytes),useSystemFonts:true,isEvalSupported:false}).promise;assert.equal(doc.numPages,result.pages);
  const texts=[],images=[];
  for(let i=1;i<=doc.numPages;i++){
    const page=await doc.getPage(i),content=await page.getTextContent(),words=content.items.filter(w=>w.str?.trim()),text=words.map(w=>w.str).join(' ');texts.push(text);
    assert.ok(text.length>140,`${name}: near-empty page ${i}`);assert.ok(text.includes(`Page ${i} of ${doc.numPages}`),`${name}: page numbering`);
    for(const w of words){assert.ok(w.transform[4]>=25&&w.transform[4]+w.width<=588,`${name} page ${i} horizontal bounds: ${w.str.slice(0,30)}`);assert.ok(w.transform[5]>=12&&w.transform[5]<=780,`${name} page ${i} vertical bounds`);}
    const view=page.getViewport({scale:1}),canvas=createCanvas(Math.ceil(view.width),Math.ceil(view.height));await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;const image=`${dir}/${name}-${i}.png`;await writeFile(image,canvas.toBuffer('image/png'));images.push(image);
  }
  const text=texts.join('\n');for(const c of model.comparables.all)assert.ok(text.includes(c.address),`${name}: comp omitted`);
  if(name==='long-legal')assert.ok(text.includes('LEGAL-END'));if(name==='long-sources')assert.ok(text.includes('SOURCE-END'));
  if(name==='large-rehab')assert.ok(text.includes('Category 65'));if(name==='many-diligence')assert.ok(text.includes('Question 95'));
  assert.doesNotMatch(text,/DATABASE_URL|postgres(?:ql)?:\/\/|BEGIN .*PRIVATE KEY|SYNTHETIC_SECRET/);
  const cols=4,width=244,height=316,sheet=createCanvas(cols*width,Math.ceil(images.length/cols)*height),ctx=sheet.getContext('2d');ctx.fillStyle='#ccd6d2';ctx.fillRect(0,0,sheet.width,sheet.height);for(let i=0;i<images.length;i++)ctx.drawImage(await loadImage(images[i]),i%cols*width,Math.floor(i/cols)*height,width-4,height-4);await writeFile(`${dir}/${name}-contact.png`,sheet.toBuffer('image/png'));
  results.push({fixture:name,pages:doc.numPages,renderMs:result.renderMs,bytes:result.byteLength,comps:model.comparables.all.length,status:'PASS'});console.log(JSON.stringify(results.at(-1)));await doc.destroy();
}
// Complete, sparse and long-content binary flow through the real shared local API.
for(const name of ['complete','sparse','long-legal']){
  const api=createApi({runtime:'local',persistence:fixtureDatabase([investmentFixture(name)]),reportService:{investment:renderInvestmentPdf}});
  const response=await api(new Request('http://127.0.0.1/api/reports/investment',{method:'POST',headers:{Origin:'http://127.0.0.1','Content-Type':'application/json'},body:JSON.stringify({decisionId:ids.decision})}));assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'application/pdf');assert.ok(Buffer.from(await response.arrayBuffer()).subarray(0,4).equals(Buffer.from('%PDF')));
}
const baseline=JSON.parse(await readFile('data/validation/sprint6_1-protected.json','utf8'));for(const item of baseline.files)assert.equal(hash(await readFile(item.file)),item.sha256,`Protected artifact changed: ${item.file}`);
assert.equal(externalCalls,0);await writeJson('data/validation/sprint6_1-pdf-qa.json',{status:'PASS',at:new Date().toISOString(),results,localApiFixtures:3,protectedFiles:baseline.files.length,providerCalls:externalCalls,visualDirectory:dir});
}finally{globalThis.fetch=originalFetch;}
