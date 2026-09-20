import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {resolve} from '../io/files.js';
import {fixture,preservation} from './model.js';
import {resolveCached} from './search.js';
import {generateReport} from '../reports/pdf.js';
import {renderInvestmentPdf} from '../reports/investment/pdf.js';
import {readMapConfig,MAP_CSP} from './mapConfig.js';
import {createRuntime} from './api/runtime.js';
import {filesystemStore} from '../sources/rentcast/stores.js';
import {loadLocalEnvironment} from '../sources/rentcast/config.js';

export async function startWorkbench({port=4173,dev=false,mapConfig,env,fetchImpl,cacheStore}={}) {
  await preservation();
  if(!env)loadLocalEnvironment();
  const api=createRuntime({runtime:'local',env:env??process.env,store:cacheStore??filesystemStore(),fixtureLoader:fixture,searchResolver:resolveCached,fetchImpl,
    mapConfig:()=>mapConfig??readMapConfig(),reportService:{generate:generateReport,investment:renderInvestmentPdf,read:report=>readFile(resolve(report.path))}});
  let vite=null;
    if(dev){const {createServer}=await import('vite');vite=await createServer({configFile:resolve('apps/web/vite.config.js'),server:{middlewareMode:true,hmr:false},appType:'spa'});}
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  const server=http.createServer(async(req,res)=>{
    const expected=`127.0.0.1:${server.address().port}`,origin=`http://${expected}`;
    if(req.headers.host!==expected||req.headers.origin&&req.headers.origin!==origin)return json(res,403,{error:'LOCAL_ORIGIN_REQUIRED'});
    const pathname=new URL(req.url,origin).pathname;
    try {
      if(pathname.startsWith('/api/')) {
        const body=['GET','HEAD'].includes(req.method)?undefined:req;
        const response=await api(new Request(origin+req.url,{method:req.method,headers:req.headers,body,...(body?{duplex:'half'}:{})}));
        res.writeHead(response.status,Object.fromEntries(response.headers));
        return res.end(Buffer.from(await response.arrayBuffer()));
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
