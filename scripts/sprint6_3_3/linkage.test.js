import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {deriveOpportunityWorkflow} from '../../src/persistence/assessorOpportunityRepository.js';

test('opportunity lifecycle is derived from durable facts in precedence order',()=>{
  assert.equal(deriveOpportunityWorkflow({}).workflowLifecycle,'NEEDS_ADDRESS');
  assert.equal(deriveOpportunityWorkflow({providerReady:true}).workflowLifecycle,'DISCOVERED');
  assert.equal(deriveOpportunityWorkflow({canonicalAddress:{verification_status:'ANALYST_CONFIRMED'},providerReady:true}).workflowLifecycle,'ADDRESS_RESOLVED');
  assert.equal(deriveOpportunityWorkflow({propertyId:'property-1',canonicalAddress:{verification_status:'ANALYST_CONFIRMED'}}).workflowLifecycle,'PROPERTY_SAVED');
  assert.equal(deriveOpportunityWorkflow({propertyId:'property-1',dealCount:1}).workflowLifecycle,'DEAL_CREATED');
});

test('workflow status does not change the kern screening inputs',()=>{
  const row={priority_band:'HIGH_REVIEW_PRIORITY',screening_score:55,score_version:'kern-screen-v1',candidate_status:'NEEDS_ADDRESS'};
  const lifecycle=deriveOpportunityWorkflow({propertyId:'property-1'});
  assert.deepEqual(row,{priority_band:'HIGH_REVIEW_PRIORITY',screening_score:55,score_version:'kern-screen-v1',candidate_status:'NEEDS_ADDRESS'});
  assert.equal(lifecycle.propertyLinkStatus,'PROPERTY_LINKED');
});

test('migration 006 is additive and encodes explicit immutable lineage',async()=>{
  const sql=await readFile(new URL('../../netlify/database/migrations/006_opportunity_property_links.sql',import.meta.url),'utf8');
  assert.match(sql,/CREATE TABLE opportunity_property_links/);
  assert.match(sql,/candidate_id uuid NOT NULL REFERENCES opportunity_candidates/);
  assert.match(sql,/property_id uuid NOT NULL REFERENCES properties/);
  assert.match(sql,/address_resolution_id uuid REFERENCES candidate_address_resolutions/);
  assert.match(sql,/assessor_enrichment_id uuid REFERENCES opportunity_assessor_enrichments/);
  assert.match(sql,/OPPORTUNITY_ANALYSIS_WORKFLOW/);
  assert.match(sql,/EXPLICIT_WORKFLOW_CONTEXT/);
  assert.match(sql,/OPPORTUNITY_PROPERTY_LINK_IMMUTABLE/);
  assert.match(sql,/opportunity_property_links_active_candidate_idx/);
  assert.match(sql,/opportunity_property_links_active_property_idx/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
});
