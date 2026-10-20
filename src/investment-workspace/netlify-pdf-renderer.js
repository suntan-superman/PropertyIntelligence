import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import {renderPdfWithBrowser} from './pdf-renderer-core.js';

chromium.setGraphicsMode=false;

export async function renderNetlifyWorkspacePdf(html,options={}){
  const executablePath=await chromium.executablePath(),args=[...new Set([...chromium.args,'--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--font-render-hinting=medium'])];
  return renderPdfWithBrowser({puppeteer,launchOptions:{headless:'shell',executablePath,args,defaultViewport:{width:1280,height:960,deviceScaleFactor:1}},html,...options,timeoutMs:45_000});
}
