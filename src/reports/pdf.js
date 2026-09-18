import {chromium} from 'playwright-core';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {resolve,hash} from '../io/files.js';
import {reportHtml} from './html.js';
import {preservation} from '../workbench/model.js';
export function chromePath(){const candidates=[process.env.PI_CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];const found=candidates.find(p=>p&&existsSync(p));if(!found)throw new Error('LOCAL_CHROME_REQUIRED');return found;}
export async function browser(){return chromium.launch({executablePath:chromePath(),headless:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});}
export async function generateReport(model){
  await preservation();if(model.mode!=='deal'||!/^[a-z0-9-]+$/.test(model.id))throw new Error('DEAL_MODEL_REQUIRED');
  if(model.digest!==hash(JSON.stringify({...model,digest:undefined})))throw new Error('MODEL_INTEGRITY_STOP');
  const html=reportHtml(model),instance=await browser();
  try{
    const page=await instance.newPage();await page.route('**/*',route=>route.abort());
    await page.setContent(html,{waitUntil:'load'});
    const pdf=await page.pdf({format:'Letter',printBackground:true,displayHeaderFooter:true,
      headerTemplate:'<div style="font-family:Arial;font-size:8px;color:#50685c;width:100%;padding:0 40px">PROPERTY INTELLIGENCE — Independent Deal Review</div>',
      footerTemplate:'<div style="font-family:Arial;font-size:8px;color:#50685c;width:100%;padding:0 40px;display:flex;justify-content:space-between"><span>LOCAL / INTERNAL · Material unknown costs excluded</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
      margin:{top:'.65in',bottom:'.65in',left:'.55in',right:'.55in'},preferCSSPageSize:true});
    const pages=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;
    const stamp=`${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}`;
    const target=`data/reports/${model.id}/property-intelligence-deal-review-${stamp}.pdf`;
    await mkdir(path.dirname(resolve(target)),{recursive:true});await writeFile(resolve(target),pdf,{flag:'wx',mode:0o600});
    await writeFile(resolve(target.replace('.pdf','.model.json')),JSON.stringify(model,null,2)+'\n',{flag:'wx',mode:0o600});
    return {path:target,pages,digest:model.digest,sha256:hash(pdf)};
  }finally{await instance.close();}
}
