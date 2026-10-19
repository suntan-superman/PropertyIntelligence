import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {datum,normalizeInvestorReport,CLASSIFICATIONS} from '../src/reports/investor-v1/model.js';
import {investorFixtures} from '../src/reports/investor-v1/fixtures.js';
import {investorReportHtml} from '../src/reports/investor-v1/html.js';

test('synthetic INVESTIGATE, WATCH, PASS and stress cases use only supported dispositions',()=>{
  assert.deepEqual(investorFixtures.map(x=>x.disposition.value),['INVESTIGATE','WATCH','PASS','PASS']);
  assert.match(investorFixtures[3].reportMeta.reportId,/stress/);
  assert.equal(investorFixtures[0].encumbrances.items[0].amount.value,null);
  assert.equal(investorFixtures[0].encumbrances.items[0].amount.status,'NOT_CHECKED');
  for(const model of investorFixtures){assert(Object.isFrozen(model));assert(model.modelFingerprint);assert(['INVESTIGATE','WATCH','PASS'].includes(model.disposition.value));}
});
test('the renderer-independent normalized model enforces evidence classification and preserves explicit zero',async()=>{
  const zero=datum(0,{classification:'RECORDED / VERIFIED',source:'Synthetic'});assert.equal(zero.value,0);assert(CLASSIFICATIONS.includes(zero.classification));
  assert.throws(()=>datum(2,{classification:'VERIFIED'}),/CLASSIFICATION/);
  const safe=normalizeInvestorReport({...investorFixtures[0],unapprovedSecret:'do-not-retain'});assert(!JSON.stringify(safe).includes('unapprovedSecret'));
  assert.throws(()=>normalizeInvestorReport({...investorFixtures[0],disposition:{...investorFixtures[0].disposition,classification:'bad'}}),/CLASSIFICATION/);
  assert.equal(typeof normalizeInvestorReport,'function');const source=await readFile(new URL('../src/reports/investor-v1/model.js',import.meta.url),'utf8');assert.doesNotMatch(source,/puppeteer|html\.js|pdf\.js/i);
});
test('V1.1 HTML has concise executive hierarchy, financial currency, honest unknowns and no title clearance',()=>{
  const m=investorFixtures[0],html=investorReportHtml(m,{kind:'brief'});
  assert.equal((html.match(/class="page/g)||[]).length,3);
  assert.match(html,/Not checked/);assert.match(html,/Recorded mortgage/);assert.match(html,/Modeled current balance/);assert.match(html,/clear title/);
  assert.match(html,/\$340,000/);assert.match(html,/\$162,000/);assert.match(html,/\$178,000/);
  assert.match(html,/Why PI selected this property/);assert.match(html,/Selection does not imply seller motivation/);
  assert.match(html,/Modeled profit outcomes/);assert.match(html,/P10/);assert.match(html,/P50/);assert.match(html,/P90/);
  assert.match(html,/Relative modeled sensitivity impact/);assert.match(html,/What could kill this deal/);
  assert.equal((html.match(/PI disposition <span class="badge investigate">INVESTIGATE<\/span>/g)||[]).length,1);
  assert.match(investorReportHtml(m,{kind:'full'}),/Sources &amp; methodology/);
  assert.match(investorReportHtml(m,{kind:'full'}),/metadata-table/);assert.match(investorReportHtml(m,{kind:'full'}),/width:31%/);
  assert.equal((investorReportHtml(m,{kind:'full'}).match(/class="page(?: |")/g)||[]).length,8);
  const malicious=normalizeInvestorReport({...m,property:{...m.property,address:datum('<script>alert(1)<\/script>',{classification:'RECORDED \/ VERIFIED'})}});
  assert.doesNotMatch(investorReportHtml(malicious),/<script>alert/);
});
