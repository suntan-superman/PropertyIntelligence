import {readFile,readdir} from 'node:fs/promises';
import {hash,writeJson,resolve} from '../src/io/files.js';
async function walk(dir){const out=[];for(const item of await readdir(resolve(dir),{withFileTypes:true})){const p=`${dir}/${item.name}`;if(item.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
const files=[...await walk('src/reports'),...await walk('src/underwriting'),...await walk('src/analysis'),...await walk('netlify/database/migrations'),...await walk('data/reports')];
await writeJson('data/validation/sprint6_1-protected.json',{at:new Date().toISOString(),files:await Promise.all(files.map(async file=>({file,sha256:hash(await readFile(resolve(file)))})))});
console.log(JSON.stringify({status:'PROTECTED',files:files.length}));
