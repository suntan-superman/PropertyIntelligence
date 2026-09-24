import './offline.js';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {CACHE,ZIP,gateZip,zipEntries,extractMember,fileHash,json} from './io.js';
await gateZip();const start=performance.now(),inventory=[];
for(const entry of await zipEntries(ZIP)){
  const top={...entry,children:[]};inventory.push(top);
  if(entry.name.endsWith('.zip')){
    const nested=await extractMember(ZIP,entry,`${CACHE}/package`);top.sha256=await fileHash(nested);top.children=await zipEntries(nested);
    // FileGDB and raw Access are inventoried, not used/extracted for joining.
    if(!/FileGeodatabase|RawData|AssrMapBooks|TaxRateAreas|Parcels_Mineral/.test(entry.name)){
      for(const child of top.children)if(/\.(dbf|txt|xml|pdf|prj|cpg|shx|shp)$/i.test(child.name))await extractMember(nested,child,`${CACHE}/extracted/${path.basename(entry.name,'.zip')}`);
    }
  }else if(/\.txt$/i.test(entry.name))await extractMember(ZIP,entry,`${CACHE}/package`);
}
await json(`${CACHE}/inventory.json`,{inventory,auditExtractMs:performance.now()-start,providerCalls:0});
console.log(JSON.stringify(inventory.map(x=>({name:x.name,bytes:x.bytes,children:x.children.map(c=>({name:c.name,bytes:c.bytes}))})),null,2));
