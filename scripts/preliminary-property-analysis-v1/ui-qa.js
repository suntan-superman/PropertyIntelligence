import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import puppeteer from 'puppeteer';
import {ROOT,newJson} from './guard.js';
import {offlineStatus} from '../../src/analysis/offline.js';

const directory=resolve(process.argv[2]??''),rel=relative(resolve(ROOT),directory);
assert(process.argv.length===3&&/^run-[a-zA-Z0-9]+$/.test(rel)&&!rel.includes(sep),'OWNED_RUN_REQUIRED');
const output=await mkdtemp(`${ROOT}/qa-view-`),browser=await puppeteer.launch({headless:true,pipe:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
const result={status:'PASS',browser:await browser.version(),requests:0,checks:0,views:[],output};
const check=v=>{assert(v,'LOCAL_VIEW_QA');result.checks++;};
try{
  for(const [name,file] of [['real','real-readiness.html'],['synthetic','synthetic/demo.html']]){
    const page=await browser.newPage(),errors=[];await page.setViewport({width:1280,height:1000});await page.setJavaScriptEnabled(false);
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.setRequestInterception(true);page.on('request',r=>{result.requests++;r.abort();});
    await page.setContent(await readFile(`${directory}/${file}`,'utf8'),{waitUntil:'load'});
    check(await page.$$eval('h1',nodes=>nodes.length)===1);
    const text=await page.evaluate(()=>document.body.innerText);
    check(text.includes(name==='real'?'FINANCIAL_INPUTS_INSUFFICIENT':'SYNTHETIC FINANCIAL DEMONSTRATION'));
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    check(errors.length===0);
    if(name==='real'){check(await page.$$eval('iframe',nodes=>nodes.length)===0);check(text.includes('NOT AUTHORIZED'));}
    else{const frame=await(await page.$('iframe')).contentFrame();check(!!frame);const t=await frame.evaluate(()=>document.body.innerText);check(t.includes('Investment Decision Snapshot'));check(t.includes('SYNTHETIC DEMONSTRATION'));}
    await page.screenshot({path:`${output}/${name}.png`,fullPage:true});result.views.push({name,errors});await page.close();
  }
  check(result.requests===0);check(offlineStatus().networkAttempts===0);
}catch(e){result.status='FAIL';throw e;}finally{await browser.close();await newJson(`${output}/result.json`,result);console.log(JSON.stringify(result));}
