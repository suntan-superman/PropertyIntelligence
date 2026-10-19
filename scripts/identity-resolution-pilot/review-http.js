import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {timingSafeEqual} from 'node:crypto';
import {createReviewStore} from './review-store.js';
import {fail} from './review-model.js';

export async function startReviewServer({directory,reviewer,token,port=4318}){
  if(!/^[a-f0-9]{64}$/.test(token))fail('INVALID_ACCESS_CODE');
  const store=await createReviewStore({directory,reviewer});
  const assets=new Map(await Promise.all([['/','index.html','text/html'],['/review.js','review.js','text/javascript'],['/review.css','review.css','text/css'],['/suggestion.css','suggestion.css','text/css'],['/streamlined.css','streamlined.css','text/css']].map(async([url,file,type])=>[url,{body:await readFile(new URL(`./review-ui/${file}`,import.meta.url)),type}])));
  let origin,failures=0,blockedUntil=0;
  const expiresAt=Date.now()+8*60*60*1000;
  const server=createServer(async(req,res)=>{
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Cross-Origin-Resource-Policy':'same-origin','Cross-Origin-Opener-Policy':'same-origin',
      'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; font-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",'Permissions-Policy':'geolocation=(), camera=(), microphone=()'};
    const send=(status,body,type='application/json')=>{res.writeHead(status,{...headers,'Content-Type':`${type}; charset=utf-8`});res.end(type==='application/json'?JSON.stringify(body):body);};
    try{
      if(req.socket.remoteAddress!=='127.0.0.1'||req.headers.host!==new URL(origin).host)fail('LOCAL_ACCESS_ONLY',403);
      if(req.headers['sec-fetch-site']&& !['same-origin','none'].includes(req.headers['sec-fetch-site']))fail('CROSS_SITE_FORBIDDEN',403);
      if(req.headers.origin&&req.headers.origin!==origin)fail('CROSS_ORIGIN_FORBIDDEN',403);
      const url=new URL(req.url,origin);
      if(url.search)fail('QUERY_PARAMETERS_FORBIDDEN',400);
      if(req.method==='GET'&&url.pathname==='/favicon.ico'){res.writeHead(204,headers);return res.end();}
      if(req.method==='GET'&&assets.has(url.pathname)){const a=assets.get(url.pathname);return send(200,a.body,a.type);}
      if(Date.now()>expiresAt)fail('SESSION_EXPIRED_RESTART_SERVER',401);
      if(Date.now()<blockedUntil)fail('ACCESS_CODE_RATE_LIMITED',429);
      const supplied=req.headers.authorization?.replace(/^Bearer /,'')??'';
      if(Buffer.byteLength(supplied)!==Buffer.byteLength(token)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(token))){if(++failures>=8){blockedUntil=Date.now()+60000;failures=0;}fail('ACCESS_CODE_REQUIRED',401);}
      failures=0;
      if(req.method==='GET'&&url.pathname==='/api/pilots')return send(200,{reviewer:store.reviewer,pilots:await store.list()});
      const match=url.pathname.match(/^\/api\/pilots\/(IP-P[123])(?:\/(decision|validate|suggestion))?$/);
      if(!match)fail('NOT_FOUND',404);
      if(req.method==='GET'&&!match[2])return send(200,await store.get(match[1]));
      if(req.method==='GET'&&match[2]==='suggestion')return send(200,await store.getSuggestion(match[1]));
      if(match[2]==='suggestion')fail('LIVE_LOOKUP_NOT_AUTHORIZED',403);
      if(req.method!=='POST'||!match[2])fail('METHOD_NOT_ALLOWED',405);
      if(req.headers.origin!==origin)fail('EXACT_ORIGIN_REQUIRED',403);
      if(req.headers['content-type']!=='application/json')fail('JSON_REQUIRED',415);
      let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>32768)fail('REQUEST_TOO_LARGE',413);chunks.push(chunk);}
      let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('INVALID_JSON');}
      return send(200,match[2]==='validate'?await store.validate(match[1],input):await store.save(match[1],input));
    }catch(e){send(e.status??500,{error:e.code??'LOCAL_REVIEW_ERROR',...(e.errors?{errors:e.errors}:{})});}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  await new Promise((ok,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',ok);});
  origin=`http://127.0.0.1:${server.address().port}`;
  return {server,origin,store,close:()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();})};
}
