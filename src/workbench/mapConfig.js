import {readFile} from 'node:fs/promises';
import {resolve} from '../io/files.js';

// Only an explicitly browser-designated Google key crosses this boundary.
// Never read another application's environment or use a server/provider key.
export function publicMapConfig(env={}) {
  const key=(env.GOOGLE_MAPS_BROWSER_KEY||env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY||'').trim();
  const privateKeys=[env.RENTCAST_API_KEY,env.MARKET_DATA_API_KEY,env.GOOGLE_MAPS_SERVER_API_KEY].filter(Boolean).map(v=>v.trim());
  if(!key)return {provider:'google',configured:false,reason:'Google Maps browser key is not configured.'};
  if(!/^[\w-]{10,200}$/.test(key)||privateKeys.includes(key))return {provider:'google',configured:false,reason:'Google Maps browser configuration is invalid.'};
  return {provider:'google',configured:true,browserKey:key};
}
export async function readMapConfig() {
  let local={};
  try {
    const contents=await readFile(resolve('.env'),'utf8');
    for(const line of contents.split(/\r?\n/)){
      const match=line.match(/^\s*(GOOGLE_MAPS_BROWSER_KEY|NEXT_PUBLIC_GOOGLE_MAPS_API_KEY|GOOGLE_MAPS_SERVER_API_KEY|RENTCAST_API_KEY|MARKET_DATA_API_KEY)\s*=\s*(.*?)\s*$/);
      if(match)local[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2').replace(/\s+#.*$/,'');
    }
  }catch(error){if(error.code!=='ENOENT')return {provider:'google',configured:false,reason:'Local map configuration unavailable.'};}
  return publicMapConfig({...local,...process.env});
}
export const MAP_CSP="default-src 'self'; script-src 'self' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com; connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://*.google.com; font-src 'self' https://fonts.gstatic.com; worker-src blob:; frame-src https://*.google.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
