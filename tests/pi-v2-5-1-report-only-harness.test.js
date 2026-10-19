import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';

test('report-only workspace startup does not require county-discovery fixtures',async t=>{
  const root=path.resolve(import.meta.dirname,'..');
  const harness=await readFile(path.join(root,'scripts/pi-v2-5-1-final-report-continuation.js'),'utf8');
  assert.match(harness,/startInvestmentWorkspace\(\{[^\n]*propertyDetail:false/);
  assert.doesNotMatch(harness,/startInvestmentWorkspace\(\{[^\n]*propertyDetail:true/);

  const temporary=await mkdtemp(path.join(os.tmpdir(),'pi-report-only-'));
  t.after(()=>rm(temporary,{recursive:true,force:true}));
  const server=await startInvestmentWorkspace({
    port:0,
    root,
    viteEnabled:false,
    propertyDetail:false,
    storeDirectory:path.join(temporary,'scenarios'),
    discoveryStoreDirectory:path.join(temporary,'discovery'),
    leadStoreDirectory:path.join(temporary,'leads')
  });
  t.after(()=>server.close());

  const response=await fetch(`${server.origin}/api/investment/bootstrap`);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.ok(Array.isArray(body.properties));
  assert.ok(body.properties.length>0);
});
