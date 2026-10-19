import puppeteer from 'puppeteer';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {investorReportHtml} from './html.js';
import {resolve} from '../../io/files.js';

function executablePath(){return process.env.PI_CHROME_PATH||process.env.PUPPETEER_EXECUTABLE_PATH||undefined;}
export async function renderInvestorPdf(model,{kind='brief',outputPath=null}={}){
  if(!model?.modelFingerprint)throw new Error('NORMALIZED_REPORT_MODEL_REQUIRED');
  const launchOptions={headless:true,pipe:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--font-render-hinting=medium']};
  const exe=executablePath();if(exe){if(!existsSync(exe))throw new Error('CONFIGURED_CHROME_NOT_FOUND');launchOptions.executablePath=exe;}
  const browser=await puppeteer.launch(launchOptions);
  try{
    const page=await browser.newPage();await page.setViewport({width:1280,height:1660});
    const diagnostics={requests:0,consoleErrors:[],pageErrors:[],browserVersion:await browser.version()};
    page.on('console',m=>{if(m.type()==='error')diagnostics.consoleErrors.push(m.text());});page.on('pageerror',e=>diagnostics.pageErrors.push(e.message));
    await page.setJavaScriptEnabled(false);await page.setRequestInterception(true);page.on('request',request=>{diagnostics.requests++;request.abort();});
    await page.setContent(investorReportHtml(model,{kind}),{waitUntil:'load',timeout:30000});
    const bytes=await page.pdf({format:'Letter',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,
      headerTemplate:'<div style="font-family:Arial,sans-serif;font-size:8px;color:#526673;width:100%;padding:0 42px">PROPERTY INTELLIGENCE · INDEPENDENT EVIDENCE</div>',
      footerTemplate:'<div style="font-family:Arial,sans-serif;font-size:8px;color:#526673;width:100%;padding:0 42px;display:flex;justify-content:space-between"><span>Workside Software LLC · Screening only · Not an investment recommendation</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
      margin:{top:'.52in',bottom:'.54in',left:'.58in',right:'.58in'}});
    if(bytes.length>15_000_000)throw new Error('REPORT_SIZE_LIMIT');
    if(outputPath){const target=resolve(outputPath);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes,{flag:'wx',mode:0o600});}
    return {bytes,byteLength:bytes.length,outputPath,diagnostics};
  }finally{await browser.close();}
}
