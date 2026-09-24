import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCanonicalAddress,providerReadyAddress} from '../../src/persistence/addressResolutionRepository.js';
test('canonical validator normalizes whitespace/state and preserves explicit ZIP components',()=>{
  assert.deepEqual(validateCanonicalAddress({street:' 1240  S  China Lake BL ',city:' Ridgecrest ',state:'ca',postalCode:'93555-1234'}),{street:'1240 S China Lake BL',city:'Ridgecrest',state:'CA',postalCode:'93555',postalCodeExtension:'1234',formattedAddress:'1240 S China Lake BL, Ridgecrest, CA 93555-1234'});
});
test('canonical validator rejects incomplete/invalid addresses without ZIP inference',()=>{
  for(const value of [{street:'1240 S China Lake BL',city:'Ridgecrest',state:'CA'},{street:'1240 S China Lake BL',city:'Ridgecrest',state:'California',postalCode:'93555'},{street:'1240 S China Lake BL',city:'Ridgecrest',state:'CA',postalCode:'0000'},{street:'https://secret.test',city:'Ridgecrest',state:'CA',postalCode:'93555'}])assert.throws(()=>validateCanonicalAddress(value),/ADDRESS_INVALID/);
  assert.equal(providerReadyAddress({street:'1240 S China Lake BL',city:'Ridgecrest',state:'CA'}),null);
});
test('migration is additive, immutable, versioned and has no raw provider payload column',async()=>{
  const sql=await readFile('netlify/database/migrations/005_candidate_address_resolutions.sql','utf8');
  assert.match(sql,/CREATE TABLE candidate_address_resolutions/);assert.match(sql,/version integer NOT NULL/);assert.match(sql,/ADDRESS_RESOLUTION_HISTORY_IMMUTABLE/);assert.match(sql,/active_candidate_idx/);assert.doesNotMatch(sql,/raw_payload|CREATE SCHEMA|TRUNCATE|SECURITY DEFINER/i);
});
test('analyze path cannot select latest analysis or weaken address validation',async()=>{
  const router=await readFile('src/workbench/api/router.js','utf8');
  assert.match(router,/ADDRESS_INCOMPLETE/);assert.match(router,/readAddressResolution/);assert.doesNotMatch(router,/latest-analysis|ORDER BY .*analysis.*LIMIT 1/i);
});
