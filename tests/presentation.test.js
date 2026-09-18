import test from 'node:test';
import assert from 'node:assert/strict';
import {displayValue,evidenceGroups,groupEvidence,humanizeKey,humanizeStatus,missingLabel,propertyFacts} from '../apps/web/src/presentation.js';

test('UX presentation adapter humanizes keys/statuses without changing machine values',()=>{
  assert.equal(humanizeKey('squareFeet'),'Living area');assert.equal(humanizeKey('unknownMachineKey'),'Unknown Machine Key');
  assert.equal(humanizeStatus('INDEPENDENT_ONLY'),'Independent evidence');assert.equal(humanizeStatus('SOURCE_STOP'),'Additional verification required');
  assert.equal(missingLabel('landTenure'),'Not independently verified');assert.equal(missingLabel('repairCondition'),'Not assessed');assert.equal(missingLabel('zoning'),'Not available from current evidence');
  assert.equal(displayValue(null,'landTenure'),'Not independently verified');assert.equal(displayValue(0,'bathrooms'),'0');assert.equal(displayValue(false,'feature'),'No');
});
test('Evidence grouping aggregates comparable fields while retaining all other machine fields',()=>{
  const fields=[{field:'address',status:'SUPPORTED'},{field:'propertyType',status:'SUPPORTED'},{field:'avm',status:'PARTIAL'},{field:'taxes',status:'MISSING'},{field:'saleHistory',status:'PARTIAL'},{field:'landTenure',status:'MISSING'},{field:'comps[0]',status:'PARTIAL'}];
  const groups=groupEvidence(fields.filter(item=>!/^comps\[\d+\]/.test(item.field)));
  assert.deepEqual(groups.map(group=>group.title),['Identity & Location','Property Characteristics','Valuation & Market','Tax & Assessment','Transaction History','Legal / Ownership / Condition']);
  assert.equal(groups.find(group=>group.id==='valuation').items[0].field,'avm');assert.ok(!groups.flatMap(group=>group.items).some(item=>/^comps\[/.test(item.field)));
  assert.equal(evidenceGroups.length,6);
});
test('Property facts are view-model-only and unknown values remain explicit',()=>{
  const facts=propertyFacts({property:{propertyType:'Single Family',bedrooms:3,bathrooms:2,squareFeet:1306,yearBuilt:1995,lotSize:null,identifiers:{apn:'APN-1'},county:'Example'}});
  assert.equal(facts.find(f=>f[0]==='Living area')[1],'1,306 SF');assert.equal(facts.find(f=>f[0]==='Lot size')[1],null);assert.equal(facts.find(f=>f[0]==='APN / parcel')[1],'APN-1');
});
