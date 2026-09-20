import crypto from 'node:crypto';
const bases=['https://6ab06aaecf22df927764b7d9--worksidepropertyintelligence.netlify.app','https://worksidepropertyintelligence.netlify.app'];
const output=[];
for(const base of bases){
  const html=await (await fetch(base)).text();
  const assets=[...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(match=>new URL(match[1],base).href);
  const hashes=[];
  for(const asset of assets){const body=Buffer.from(await (await fetch(asset)).arrayBuffer());hashes.push({asset:new URL(asset).pathname,bytes:body.length,sha256:crypto.createHash('sha256').update(body).digest('hex')});}
  output.push({base,assets:hashes});
}
console.log(JSON.stringify({preview:output[0].assets,production:output[1].assets,match:JSON.stringify(output[0].assets)===JSON.stringify(output[1].assets)}));
