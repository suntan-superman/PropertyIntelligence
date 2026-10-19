// The sole network-capable primitive. Not imported by any browser/application route.
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {check,Stop,sha,validateRequest,TIMEOUT_MS,MAX_BYTES} from '../rentcast-financial-controlled-client-v1/contract.js';

export function validateCredential(key){check(typeof key==='string'&&/^[A-Za-z0-9._-]{12,256}$/.test(key),'CREDENTIAL_FORMAT_STOP');return key;}
function secretEcho(bytes,key){const s=bytes.toString('utf8');return [key,encodeURIComponent(key),Buffer.from(key).toString('base64')].some(v=>s.includes(v));}
function send(openRequest,request,key){
  validateRequest('A',request);validateCredential(key);
  const url=new URL(request.host+request.endpoint);url.searchParams.set('address',request.params.address);
  return new Promise((resolve,reject)=>{
    let settled=false,req,res,length=0;const chunks=[];const metadata={httpStatus:null,responseSha256:null,responseBytes:null};
    const timer=setTimeout(()=>finish(new Stop('TIMEOUT_UNCERTAIN')),TIMEOUT_MS);
    function finish(error,result){if(settled)return;settled=true;clearTimeout(timer);if(error){error.responseMetadata={...metadata};res?.destroy();req?.destroy();reject(error);}else resolve(result);}
    try{
      req=openRequest(url,{method:'GET',headers:{Accept:'application/json','Accept-Encoding':'identity','X-Api-Key':key},agent:false,rejectUnauthorized:true},response=>{
        res=response;metadata.httpStatus=response.statusCode;
        const h=Object.fromEntries(Object.entries(response.headers).map(([k,v])=>[k.toLowerCase(),v]));
        try{
          check(!(response.statusCode>=300&&response.statusCode<400)&&!Object.hasOwn(h,'location'),'REDIRECT_STOP');
          check(response.statusCode===200,({401:'AUTHENTICATION_STOP',403:'AUTHENTICATION_STOP',402:'PAYMENT_STOP',429:'RATE_LIMIT_STOP'})[response.statusCode]??'HTTP_STATUS_STOP');
          check(!h['content-encoding']||h['content-encoding']==='identity','ENCODING_STOP');
          check(!h['content-type']||/^application\/json(?:;|$)/i.test(h['content-type']),'CONTENT_TYPE_STOP');
          check(!h['content-length']||/^\d+$/.test(h['content-length'])&&Number(h['content-length'])<=MAX_BYTES,'RESPONSE_SIZE_STOP');
        }catch(e){finish(e);return;}
        response.on('data',chunk=>{if(settled)return;length+=chunk.length;if(length>MAX_BYTES){finish(new Stop('RESPONSE_SIZE_STOP'));return;}chunks.push(Buffer.from(chunk));});
        response.on('error',()=>finish(new Stop('NETWORK_OUTCOME_UNCERTAIN')));
        response.on('aborted',()=>finish(new Stop('NETWORK_OUTCOME_UNCERTAIN')));
        response.on('end',()=>{
          if(settled)return;
          try{
            const raw=Buffer.concat(chunks);metadata.responseSha256=sha(raw);metadata.responseBytes=length;
            check(!secretEcho(raw,key),'CREDENTIAL_ECHO_STOP');
            let body;try{body=JSON.parse(raw.toString('utf8'));}catch{throw new Stop('JSON_SCHEMA_STOP');}
            check(body!==null&&typeof body==='object'&&!body.error,'API_SCHEMA_STOP');
            // Return only response headers needed for scope/coverage checks.
            const headers=Object.fromEntries(Object.entries(h).filter(([k])=>k==='x-total-count'||/^(?:link|x-next-page|x-next-offset|content-range|x-has-more|x-pagination.*)$/.test(k)));
            finish(null,{body,headers,...metadata});
          }catch(e){finish(e instanceof Stop?e:new Stop('API_SCHEMA_STOP'));}
        });
      });
      req.on('error',()=>finish(new Stop('NETWORK_OUTCOME_UNCERTAIN')));req.end();
    }catch{finish(new Stop('NETWORK_OUTCOME_UNCERTAIN'));}
  });
}
// The CLI calls this only after source/account/rights/authorization/QA gates and
// its fsynced fixed-registry reservation. No environment switch or retry exists.
export const liveSend=(request,key)=>send(https.request,request,key);

// Data-only mocked socket API exercises exactly the same TLS/HTTP/body wiring.
// No arbitrary callback is accepted; this adapter can never access a provider.
export function mockSender(script){
  const f=structuredClone(script),metrics={opened:0,ended:0,headersCorrect:false,targets:[]};
  const open=(url,options,respond)=>{
    metrics.opened++;metrics.targets.push({host:url.origin,path:url.pathname,keys:[...url.searchParams.keys()],method:options.method});
    metrics.headersCorrect=Object.keys(options.headers).sort().join(',')==='Accept,Accept-Encoding,X-Api-Key'&&options.rejectUnauthorized===true&&options.agent===false;
    const req=new EventEmitter();let closed=false;req.destroy=()=>{closed=true;};
    req.end=()=>{metrics.ended++;queueMicrotask(()=>{
      if(closed||f.fault==='TIMEOUT')return;
      if(f.fault==='NETWORK'){req.emit('error',new Error('untrusted error text omitted'));return;}
      const res=new EventEmitter();res.statusCode=f.status??200;res.headers=f.headers??{'content-type':'application/json'};res.destroy=()=>{closed=true;};respond(res);
      if(closed)return;
      const bytes=Buffer.from(f.raw??JSON.stringify(f.body??{}));
      for(let i=0;i<bytes.length&&!closed;i+=4096)res.emit('data',bytes.subarray(i,i+4096));
      if(f.fault==='BODY_TIMEOUT')return;
      if(!closed)res.emit('end');
    });};return req;
  };
  return {metrics,send:(request,key)=>send(open,request,key)};
}
