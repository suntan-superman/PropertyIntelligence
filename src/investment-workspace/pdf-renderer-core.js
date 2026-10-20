import {appendSupportingDocuments,markQaNotForDistribution} from './document-appendices.js';

const DEFAULT_TIMEOUT_MS=45_000;
const footerText=html=>html.match(/<meta name="pi-footer" content="([^"]{1,500})">/)?.[1]??'Property Intelligence · Preliminary analyst scenario';

export class PdfRenderError extends Error{
  constructor(code,status=503){super(code);this.code=code;this.status=status;}
}

/** Shared certified renderer used by local Puppeteer and the bounded Netlify runtime. */
export async function renderPdfWithBrowser({puppeteer,launchOptions,html,appendices=[],qaNotForDistribution=false,timeoutMs=DEFAULT_TIMEOUT_MS}){
  if(!puppeteer?.launch)throw new PdfRenderError('PDF_RENDERER_NOT_CONFIGURED');
  let browser,page,timedOut=false;
  const watchdog=setTimeout(()=>{timedOut=true;void browser?.close().catch(()=>{});},Math.max(1_000,Math.min(Number(timeoutMs)||DEFAULT_TIMEOUT_MS,55_000)));
  try{
    browser=await puppeteer.launch(launchOptions);
    if(timedOut)throw new PdfRenderError('PDF_RENDER_TIMEOUT',504);
    page=await browser.newPage();
    let blockedRequests=0;
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request',request=>{blockedRequests++;void request.abort().catch(()=>{});});
    await page.setContent(html,{waitUntil:'load',timeout:Math.min(Number(timeoutMs)||DEFAULT_TIMEOUT_MS,50_000)});
    const footer=footerText(html),bytes=await page.pdf({format:'Letter',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:`<div style="font:7px Arial;color:#526673;width:100%;padding:0 42px;display:flex;justify-content:space-between;gap:12px"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${footer} · Not investment advice</span>${appendices.length?'':`<span style="white-space:nowrap"><span class="pageNumber"></span> / <span class="totalPages"></span></span>`}</div>`,margin:{top:'.55in',bottom:'.6in',left:'.58in',right:'.58in'}});
    if(timedOut)throw new PdfRenderError('PDF_RENDER_TIMEOUT',504);
    const merged=await appendSupportingDocuments(bytes,appendices),finalBytes=qaNotForDistribution?await markQaNotForDistribution(merged.bytes,{skipFirstPage:html.includes('<!-- PI_FULL_PACKAGE_COVER_START -->')}):merged.bytes;
    return {bytes:finalBytes,blockedRequests,browserVersion:await browser.version(),appendixPages:merged.appendixPages,totalPages:merged.totalPages};
  }catch(error){
    if(timedOut||/Target closed|Session closed|Protocol error/i.test(String(error?.message)))throw new PdfRenderError('PDF_RENDER_TIMEOUT',504);
    if(error instanceof PdfRenderError)throw error;
    throw new PdfRenderError('PDF_RENDER_FAILED');
  }finally{
    clearTimeout(watchdog);
    page?.removeAllListeners();
    await browser?.close().catch(()=>{});
  }
}
