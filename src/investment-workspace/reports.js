import puppeteer from 'puppeteer';
import {appendSupportingDocuments,markQaNotForDistribution} from './document-appendices.js';
export {reportModel,NOTICE} from './report-model.js';
export {workspaceReportHtml} from './report-html.js';
export {reportFilename,resolveReportFilenameCollision} from '../../apps/web/src/features/investment-workspace/report-filename.js';

// Existing network-blocked Puppeteer renderer. Model and HTML adapters are
// independent of the browser and leave the certified synthetic renderer intact.
export async function renderWorkspacePdf(html,{appendices=[],qaNotForDistribution=false}={}){
  const footerMatch=html.match(/<meta name="pi-footer" content="([^"]{1,500})">/),footer=footerMatch?.[1]??'Property Intelligence · Preliminary analyst scenario';
  const browser=await puppeteer.launch({headless:true,pipe:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--font-render-hinting=medium']});
  let page;
  try{page=await browser.newPage();let blockedRequests=0;await page.setJavaScriptEnabled(false);await page.setRequestInterception(true);page.on('request',r=>{blockedRequests++;r.abort().catch(()=>{});});await page.setContent(html,{waitUntil:'load'});
    const bytes=await page.pdf({format:'Letter',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:`<div style="font:7px Arial;color:#526673;width:100%;padding:0 42px;display:flex;justify-content:space-between;gap:12px"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${footer} · Not investment advice</span>${appendices.length?'':`<span style="white-space:nowrap"><span class="pageNumber"></span> / <span class="totalPages"></span></span>`}</div>`,margin:{top:'.55in',bottom:'.6in',left:'.58in',right:'.58in'}}),merged=await appendSupportingDocuments(bytes,appendices);
    const finalBytes=qaNotForDistribution?await markQaNotForDistribution(merged.bytes):merged.bytes;
    return {bytes:finalBytes,blockedRequests,browserVersion:await browser.version(),appendixPages:merged.appendixPages,totalPages:merged.totalPages};
  }finally{page?.removeAllListeners();await browser.close();}
}
