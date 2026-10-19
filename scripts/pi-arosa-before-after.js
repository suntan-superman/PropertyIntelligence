import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';

const root=process.cwd(),output=path.join(root,'reports/PI_AROSA_REPORT_REVIEW_2026-10-16');
const cases=[
  {kind:'brief',before:'C:/Users/sjroy/Downloads/RESEARCH-5E20929A08C8-brief-r1.pdf',after:'21950_Arosa_Rd_Tehachapi_CA_93561_Opportunity_Brief_2026-10-16_R1.pdf'},
  {kind:'full',before:'C:/Users/sjroy/Downloads/RESEARCH-5E20929A08C8-full-r1.pdf',after:'21950_Arosa_Rd_Tehachapi_CA_93561_Full_Investor_Package_2026-10-16_R1.pdf'}
];
const put=(name,value)=>writeFile(path.join(output,name),value,{flag:'wx'});

async function render(file,prefix){
  const document=await getDocument({data:new Uint8Array(await readFile(file)),useSystemFonts:true}).promise,names=[];
  try{for(let number=1;number<=document.numPages;number++){const page=await document.getPage(number),viewport=page.getViewport({scale:1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const name=`${prefix}-page-${number}.png`;await put(name,canvas.toBuffer('image/png'));names.push(name);}}finally{await document.destroy();}
  const images=[];for(const name of names)images.push(await loadImage(path.join(output,name)));const columns=2,width=images[0].width*columns+24,height=images[0].height*Math.ceil(images.length/columns)+24,canvas=createCanvas(width,height),ctx=canvas.getContext('2d');ctx.fillStyle='#dfe8e5';ctx.fillRect(0,0,width,height);images.forEach((image,index)=>ctx.drawImage(image,8+(index%columns)*images[0].width,8+Math.floor(index/columns)*images[0].height));const contact=`${prefix}-all-pages.png`;await put(contact,canvas.toBuffer('image/png'));return {names,contact};
}
for(const item of cases){
  const before=await render(item.before,`before-${item.kind}`),after=await loadImage(path.join(output,`${item.kind}-all-pages.png`)),prior=await loadImage(path.join(output,before.contact)),header=48,canvas=createCanvas(prior.width+after.width+32,Math.max(prior.height,after.height)+header+16),ctx=canvas.getContext('2d');ctx.fillStyle='#dfe8e5';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#173f4e';ctx.font='bold 20px Arial';ctx.fillText(`BEFORE · ${before.names.length} pages`,8,30);ctx.fillText(`AFTER · ${item.kind==='brief'?2:9} pages`,prior.width+24,30);ctx.drawImage(prior,8,header);ctx.drawImage(after,prior.width+24,header);await put(`${item.kind}-before-after-all-pages.png`,canvas.toBuffer('image/png'));
}
console.log(JSON.stringify({status:'PASS',output,comparisons:cases.map(item=>`${item.kind}-before-after-all-pages.png`)}));

