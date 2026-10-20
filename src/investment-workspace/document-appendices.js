import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';

const esc=value=>String(value??'Unknown').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const label=value=>String(value??'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,character=>character.toUpperCase());
export const INVESTOR_SUPPORTING_DOCUMENT_DISCLAIMER='Supporting documents and property information are provided for informational purposes and may contain inaccuracies or omissions. Property Intelligence does not independently guarantee their authenticity, completeness or current validity. Investors should conduct their own due diligence, including appropriate title, legal, financial, property-condition and valuation reviews, before making investment decisions.';

export function supportingEvidenceHtml(documents,{kind='full'}={}){
  const row=item=>{const document=item.document??item,version=document.currentVersionMetadata??item.version,claims=(item.claims??[]).map(claim=>claim.fieldLabel).filter(Boolean);return `<tr><td><b>${esc(`Appendix ${item.index??''}`)}</b></td><td>${esc(label(document.documentType))}<br><span>${esc(document.description||'No description supplied')}</span></td><td>${esc(document.source||'Source not supplied')}<br>${esc(document.sourceDate||'Source date not supplied')}</td><td>${esc(claims.join('; ')||'Property-level supporting evidence')}</td><td>${esc(label(document.reviewStatus))}<br>Immutable version ${esc(version?.version??document.currentVersion)}</td></tr>`;};
  const message=kind==='brief'?'Supporting evidence is referenced below but attachments are not embedded in the Opportunity Brief.':'Only analyst-selected documents that are reviewed, approved for redistribution and not confidential or provider-restricted are appended.';
  const disclaimer=kind==='full'?`<div class="notice supporting-document-disclaimer"><b>Investor due-diligence notice.</b> ${esc(INVESTOR_SUPPORTING_DOCUMENT_DISCLAIMER)}</div>`:'';
  if(!documents.length)return `<section class="page supporting-document-index ${kind==='brief'?'brief-references':''}"><div class="workspace-page-id">PROPERTY INTELLIGENCE <span>SUPPORTING EVIDENCE REGISTER</span></div><h1>${kind==='brief'?'Supporting evidence references (not attached)':'Supporting document appendix index'}</h1><p>${esc(message)} A document supports diligence but does not by itself establish a verified claim.</p>${disclaimer}<p class="notice">No approved supporting documents are selected for investor distribution.</p></section>`;
  const pageCount=Math.ceil(documents.length/5),minimum=Math.floor(documents.length/pageCount),extra=documents.length%pageCount,chunks=[];let offset=0;
  for(let index=0;index<pageCount;index++){const size=minimum+(index<extra?1:0);chunks.push(documents.slice(offset,offset+size));offset+=size;}
  return chunks.map((chunk,index)=>{const first=chunks.slice(0,index).reduce((sum,items)=>sum+items.length,0)+1,last=first+chunk.length-1;return `<section class="page supporting-document-index ${kind==='brief'?'brief-references':''}"><div class="workspace-page-id">PROPERTY INTELLIGENCE <span>SUPPORTING EVIDENCE REGISTER</span></div><h1>${kind==='brief'?'Supporting evidence references (not attached)':`Supporting document appendix index${index?' — continued':''}`}</h1>${index===0?`<p>${esc(message)} A document supports diligence but does not by itself establish a verified claim.</p>${disclaimer}`:`<p>Approved supporting documents ${first}–${last} of ${documents.length}. Eligibility is checked again when the package is assembled.</p>`}<table><thead><tr><th>Reference</th><th>Document / description</th><th>Source / date</th><th>Supported claim(s)</th><th>Review / immutable version</th></tr></thead><tbody>${chunk.map(row).join('')}</tbody></table></section>`;}).join('');
}

export function addSupportingEvidenceToHtml(html,documents,{kind='full'}={}){
  if(!Array.isArray(documents))return html;
  const section=supportingEvidenceHtml(documents,{kind});return html.replace('</body>',`${section}</body>`);
}

export function addQaAcceptanceLabel(html){
  const label='<div class="pi-qa-acceptance-label" role="note">QA / NOT FOR DISTRIBUTION · Synthetic document acceptance package</div>';
  const style='<style>.pi-qa-acceptance-label{position:fixed;z-index:1000;top:8px;right:42px;border:1px solid #b75c14;background:#fff1d6;color:#7a2d08;padding:4px 9px;font:700 8px Arial,sans-serif;letter-spacing:.06em}.pi-qa-acceptance-notice{border:2px solid #b75c14;background:#fff8e8;color:#5c260b;padding:10px 14px;margin:0 0 14px;font:700 11px Arial,sans-serif}</style>';
  const notice='<div class="pi-qa-acceptance-notice">QA / NOT FOR DISTRIBUTION — This package contains synthetic test material and is not suitable for investor reliance.</div>',hasCover=String(html).includes('<!-- PI_FULL_PACKAGE_COVER_END -->'),source=String(html).replace('</head>',`${style}</head>`).replace(/<body([^>]*)>/,hasCover?'<body$1>':`<body$1>${label}`);
  return hasCover?source.replace('<!-- PI_FULL_PACKAGE_COVER_END -->',`<!-- PI_FULL_PACKAGE_COVER_END -->${notice}`):source.replace(label,`${label}${notice}`);
}

function wrap(text,width=86){const words=String(text??'').split(/\s+/),lines=[];let line='';for(const word of words){if(`${line} ${word}`.trim().length>width){lines.push(line);line=word;}else line=`${line} ${word}`.trim();}if(line)lines.push(line);return lines.slice(0,8);}

export async function appendSupportingDocuments(baseBytes,appendices=[]){
  if(!appendices.length)return {bytes:baseBytes,appendixPages:0,totalPages:(await PDFDocument.load(baseBytes)).getPageCount()};
  const output=await PDFDocument.load(baseBytes),font=await output.embedFont(StandardFonts.Helvetica),bold=await output.embedFont(StandardFonts.HelveticaBold);let appendixPages=0;
  for(const item of appendices){
    const document=item.document,version=item.version,title=`Appendix ${item.index}: ${label(document.documentType)}`,cover=output.addPage([612,792]);appendixPages++;
    cover.drawText(title,{x:54,y:716,size:18,font:bold,color:rgb(.05,.25,.31)});let y=674;
    for(const [name,value] of [['Property document',document.description||version.filename],['Source',document.source||'Not supplied'],['Source date',document.sourceDate||'Not supplied'],['Supported claims',(item.claims??[]).map(claim=>claim.fieldLabel).filter(Boolean).join('; ')||'Property-level supporting evidence'],['Review',label(document.reviewStatus)],['Document version',`v${version.version} · uploaded ${String(version.uploadedAt).slice(0,10)}`],['SHA-256',version.sha256]]){cover.drawText(`${name}:`,{x:54,y,size:10,font:bold,color:rgb(.16,.31,.36)});for(const line of wrap(value)){cover.drawText(line,{x:160,y,size:10,font,color:rgb(.1,.2,.25)});y-=14;}y-=8;}
    cover.drawText('This attachment preserves its source identity and review status. Inclusion does not establish title, payoff, condition, value, or any other verified claim.',{x:54,y:90,size:8,font,color:rgb(.32,.4,.43),maxWidth:500,lineHeight:11});
    if(version.mimeType==='application/pdf'){
      const source=await PDFDocument.load(item.bytes,{ignoreEncryption:false,updateMetadata:false}),pages=await output.copyPages(source,source.getPageIndices());for(const page of pages){output.addPage(page);appendixPages++;}
    }else{
      const page=output.addPage([612,792]),image=version.mimeType==='image/png'?await output.embedPng(item.bytes):await output.embedJpg(item.bytes),available={width:504,height:690},scale=Math.min(available.width/image.width,available.height/image.height,1),width=image.width*scale,height=image.height*scale;page.drawText(title,{x:54,y:750,size:9,font:bold,color:rgb(.05,.25,.31)});page.drawImage(image,{x:(612-width)/2,y:(720-height)/2+18,width,height});appendixPages++;
    }
  }
  const totalPages=output.getPageCount();for(const [index,page] of output.getPages().entries())page.drawText(`Page ${index+1} of ${totalPages}`,{x:520,y:18,size:7,font,color:rgb(.35,.43,.46)});
  return {bytes:Buffer.from(await output.save({useObjectStreams:true,addDefaultPage:false})),appendixPages,totalPages};
}

export async function markQaNotForDistribution(bytes,{skipFirstPage=false}={}){
  const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false}),font=await pdf.embedFont(StandardFonts.HelveticaBold);
  for(const [index,page] of pdf.getPages().entries()){
    if(skipFirstPage&&index===0)continue;
    const {width,height}=page.getSize();
    page.drawRectangle({x:Math.max(24,width-238),y:height-22,width:202,height:14,color:rgb(.98,.91,.76),borderColor:rgb(.73,.35,.05),borderWidth:.5});
    page.drawText('QA / NOT FOR DISTRIBUTION',{x:Math.max(31,width-223),y:height-18,size:7,font,color:rgb(.55,.18,.03)});
  }
  pdf.setTitle('QA / NOT FOR DISTRIBUTION — Property Intelligence Full Investor Package');
  pdf.setSubject('Synthetic document acceptance package; not suitable for investor reliance');
  return Buffer.from(await pdf.save({useObjectStreams:true,addDefaultPage:false}));
}
