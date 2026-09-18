import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {resolve} from '../io/files.js';
import {fixture,manualDeal,preservation} from './model.js';
import {resolveCached} from './search.js';
import {generateReport} from '../reports/pdf.js';
import {readMapConfig,MAP_CSP} from './mapConfig.js';

export async function startWorkbench({port=4173,dev=false,mapConfig}={}) {
  await preservation();
  const sessions=new Map(),reports=new Map(),confirmations=new Map();
  let vite=null,busyReport=false;
    if(dev){const {createServer}=await import('vite');vite=await createServer({configFile:resolve('apps/web/vite.config.js'),server:{middlewareMode:true,hmr:false},appType:'spa'});}
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  const save=model=>{if(sessions.size>100)sessions.delete(sessions.keys().next().value);const sessionId=randomUUID();sessions.set(sessionId,model);return {sessionId,model};};
  const server=http.createServer(async(req,res)=>{
    const expected=`127.0.0.1:${server.address().port}`,origin=`http://${expected}`;
    if(req.headers.host!==expected||req.headers.origin&&req.headers.origin!==origin)return json(res,403,{error:'LOCAL_ORIGIN_REQUIRED'});
    const pathname=new URL(req.url,origin).pathname;
    try {
      if(pathname.startsWith('/api/')) {
        if(req.method==='GET'&&pathname==='/api/maps/config')return json(res,200,mapConfig??await readMapConfig());
        if(req.method==='GET'&&pathname==='/api/fixtures')return json(res,200,{fixtures:[{id:'fantasia',name:'Florida Portfolio / Fantasia'},{id:'bass',name:'Bass — source STOP'},{id:'joyce',name:'Joyce — address ambiguity'}]});
        if(req.method==='GET'&&/^\/api\/reports\/[\w-]+$/.test(pathname)){
          const report=reports.get(pathname.split('/').pop());if(!report)return json(res,404,{error:'NOT_FOUND'});
          res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${path.basename(report.path)}"`,'Cache-Control':'no-store'});return res.end(await readFile(resolve(report.path)));
        }
        if(req.method!=='POST'||req.headers.origin!==origin||req.headers['content-type']!=='application/json')return json(res,403,{error:'LOCAL_JSON_ACTION_REQUIRED'});
        let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)return json(res,413,{error:'REQUEST_TOO_LARGE'});}
        let data;try{data=JSON.parse(body);}catch{return json(res,400,{error:'INVALID_JSON'});}
        if(pathname==='/api/fixture')return json(res,200,save(await fixture(data.id,data.mode)));
        if(pathname==='/api/resolve'){
          const found=await resolveCached(data.address,data.mode);
          if(found.model)return json(res,200,save(found.model));
          if(found.candidates.length){const confirmationId=randomUUID();confirmations.set(confirmationId,{candidates:found.candidates,mode:data.mode});return json(res,200,{...found,confirmationId});}
          return json(res,200,found);
        }
        if(pathname==='/api/confirm'){
          const pending=confirmations.get(data.confirmationId);
          if(!pending?.candidates.some(c=>c.id===data.id))return json(res,400,{error:'CONFIRMATION_INVALID'});
          confirmations.delete(data.confirmationId);return json(res,200,save(await fixture(data.id,pending.mode)));
        }
        if(pathname==='/api/deal'){
          const model=sessions.get(data.sessionId);if(!model)return json(res,404,{error:'SESSION_EXPIRED'});
          return json(res,200,save(manualDeal(model,data.claims)));
        }
        if(pathname==='/api/report'){
          const model=sessions.get(data.sessionId);if(!model||model.mode!=='deal')return json(res,400,{error:'DEAL_MODE_REQUIRED'});
          if(busyReport)return json(res,409,{error:'REPORT_IN_PROGRESS'});
          busyReport=true;try{const report=await generateReport(model);const reportId=randomUUID();reports.set(reportId,report);return json(res,200,{...report,download:`/api/reports/${reportId}`});}finally{busyReport=false;}
        }
        return json(res,404,{error:'NOT_FOUND'});
      }
      if(req.method!=='GET')return json(res,405,{error:'METHOD_NOT_ALLOWED'});
      // Reject direct source/environment access even before Vite middleware.
      const vendorPath=pathname.slice(5),publicVendor=dev&&pathname.startsWith('/@fs/')&&
        (vendorPath===resolve('node_modules/vite/dist/client/env.mjs').replaceAll('\\','/')||
         vendorPath.startsWith(resolve('node_modules/leaflet/dist').replaceAll('\\','/')+'/'));
      if(/\.env|%|\\|^\/__open-in-editor/.test(pathname)||pathname.startsWith('/@fs/')&&!publicVendor)return json(res,403,{error:'PATH_BLOCKED'});
      res.setHeader('Content-Security-Policy',MAP_CSP);
      res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
      if(vite)return vite.middlewares(req,res,()=>json(res,404,{error:'NOT_FOUND'}));
      const target=pathname==='/'?'index.html':pathname.slice(1);
      if(!/^(index\.html|assets\/[a-zA-Z0-9_.-]+)$/.test(target))return json(res,404,{error:'NOT_FOUND'});
      const content=await readFile(resolve(`apps/web/dist/${target}`));
      const mime=target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.png')?'image/png':'text/html';
      res.writeHead(200,{'Content-Type':mime,'X-Content-Type-Options':'nosniff'});res.end(content);
    }catch(error){json(res,400,{error:/^[A-Z_]+$/.test(error.message)?error.message:'LOCAL_ACTION_FAILED'});}
  });
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  return {url:`http://127.0.0.1:${server.address().port}`,close:async()=>{await vite?.close();await new Promise(resolve=>server.close(resolve));}};
}
