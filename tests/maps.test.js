import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../src/workbench/model.js';
import {mapEntries,overlapGroups,located} from '../apps/web/src/features/comps-map/mapData.js';
import {publicMapConfig,MAP_CSP} from '../src/workbench/mapConfig.js';

test('Map configuration exposes only an explicitly designated browser key',()=>{
  const key='test-browser-key-123';
  assert.deepEqual(publicMapConfig({GOOGLE_MAPS_BROWSER_KEY:key,RENTCAST_API_KEY:'private-secret'}),{provider:'google',configured:true,browserKey:key});
  assert.equal(publicMapConfig({NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:key}).browserKey,key);
  assert.equal(publicMapConfig({GOOGLE_MAPS_SERVER_API_KEY:key}).configured,false);
  assert.equal(publicMapConfig({GOOGLE_MAPS_BROWSER_KEY:key,RENTCAST_API_KEY:key}).configured,false);
  assert.equal(publicMapConfig({GOOGLE_MAPS_BROWSER_KEY:'invalid key'}).configured,false);
  assert.doesNotMatch(JSON.stringify(publicMapConfig({RENTCAST_API_KEY:'private-secret'})),/private-secret/);
  assert.match(MAP_CSP,/https:\/\/\*\.googleapis\.com/);assert.doesNotMatch(MAP_CSP,/script-src[^;]*unsafe-inline/);
});
test('Subject and all 15 comps have rich evidence without financial recalculation or mutation',async()=>{
  const model=await fixture('fantasia'),before=JSON.stringify(model),entries=mapEntries(model);
  assert.equal(entries.length,16);assert.equal(entries.filter(e=>e.position).length,16);
  const subject=Object.fromEntries(entries[0].facts);assert.equal(subject['Independent AVM'],'$122,000');assert.match(subject['Land tenure'],/Unknown/);
  for(const entry of entries.slice(1)){const facts=Object.fromEntries(entry.facts);assert.ok('Days on market'in facts);assert.ok('Distance'in facts);assert.equal(facts['Land tenure'],'Land tenure unknown');assert.doesNotMatch(facts['Provider status'],/Closed sale/);}
  assert.equal(JSON.stringify(model),before);
});
test('Overlap groups include exact duplicates and transitive neighbors without displacing positions',()=>{
  const entries=[{id:'a',position:{lat:0,lng:0}},{id:'b',position:{lat:0,lng:0}},{id:'c',position:{lat:25,lng:0}},{id:'d',position:{lat:50,lng:0}},{id:'missing',position:null},{id:'far',position:{lat:300,lng:0}}];
  const before=JSON.stringify(entries),groups=overlapGroups(entries,p=>({x:p.lat,y:p.lng}));
  assert.deepEqual(groups[0].members.map(e=>e.id),['a','b','c','d']);assert.equal(groups.length,1);assert.equal(JSON.stringify(entries),before);
});
test('Missing coordinates and zero distance/DOM remain distinct; out-of-range locations rejected',async()=>{
  const model=await fixture('fantasia');model.comps[0]={...model.comps[0],latitude:null,distance:0,daysOnMarket:0,price:null,priceText:'Unknown'};
  const e=mapEntries(model)[1];assert.equal(e.position,null);assert.equal(Object.fromEntries(e.facts).Distance,'0 miles');assert.equal(Object.fromEntries(e.facts)['Days on market'],'0');
  assert.equal(located({latitude:91,longitude:0}),false);assert.equal(located({latitude:0,longitude:0}),true);
});
