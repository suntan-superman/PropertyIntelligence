import {createHmac,timingSafeEqual} from 'node:crypto';

export function signLeadRequest(secret,timestamp,body){return `v1=${createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex')}`;}
export function verifyLeadRequest({secret,timestamp,signature,body,now=Date.now(),maximumAgeMs=5*60*1000}){
  if(!secret||secret.length<32)return {ok:false,reason:'INTAKE_DISABLED'};
  const instant=Date.parse(timestamp);if(!Number.isFinite(instant)||Math.abs(now-instant)>maximumAgeMs)return {ok:false,reason:'STALE_TIMESTAMP'};
  const expected=signLeadRequest(secret,timestamp,body),left=Buffer.from(String(signature??'')),right=Buffer.from(expected);
  return left.length===right.length&&timingSafeEqual(left,right)?{ok:true}:{ok:false,reason:'INVALID_SIGNATURE'};
}

export function createLeadRateLimiter({limit=20,windowMs=60_000}={}){
  const buckets=new Map();
  return source=>{const now=Date.now(),current=buckets.get(source);if(!current||now-current.startedAt>=windowMs){buckets.set(source,{startedAt:now,count:1});return {allowed:true,remaining:limit-1};}current.count++;return {allowed:current.count<=limit,remaining:Math.max(0,limit-current.count),retryAfterSeconds:Math.ceil((current.startedAt+windowMs-now)/1000)};};
}
