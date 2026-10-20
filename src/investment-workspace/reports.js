import puppeteer from 'puppeteer';
import {renderPdfWithBrowser} from './pdf-renderer-core.js';
export {reportModel,NOTICE} from './report-model.js';
export {workspaceReportHtml} from './report-html.js';
export {reportFilename,resolveReportFilenameCollision} from '../../apps/web/src/features/investment-workspace/report-filename.js';

// Existing network-blocked Puppeteer renderer. Model and HTML adapters are
// independent of the browser and leave the certified synthetic renderer intact.
export async function renderWorkspacePdf(html,{appendices=[],qaNotForDistribution=false}={}){
  return renderPdfWithBrowser({puppeteer,launchOptions:{headless:true,pipe:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--font-render-hinting=medium']},html,appendices,qaNotForDistribution});
}
