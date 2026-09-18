import './offline.js';
import {readFile} from 'node:fs/promises';
import {readJson,resolve,hash} from '../io/files.js';
import {calculatePortfolio} from '../underwriting/deterministic.js';
export async function checkPreservation() {
  const manifest=await readJson('data/analysis/sprint2-input-manifest.json');
  for(const entry of manifest.files) {
    if(hash(await readFile(resolve(entry.file)))!==entry.sha256) throw new Error(`STOP: Sprint 1 input changed: ${entry.file}`);
  }
  return {status:'PASS',filesChecked:manifest.files.length};
}
export async function loadInputs() {
  await checkPreservation();
  const portfolio=await readJson('data/deals/florida-portfolio.json');
  const verification=await readJson('data/normalized/florida-verification.json');
  calculatePortfolio(portfolio);
  for(const [id,status] of [['bass','MANUFACTURED_REPRESENTATION_STOP'],['joyce','ADDRESS_AMBIGUOUS']]) {
    if(verification.properties.find(p=>p.propertyId===id)?.status!==status) throw new Error(`STOP: ${id} identity gate changed`);
  }
  for(const result of verification.properties) for(const reference of result.rawResponseRefs) await readJson(reference);
  return {portfolio,verification};
}
export {context} from './context.js';
