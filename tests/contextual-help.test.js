import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const tooltip=await readFile(new URL('../apps/web/src/components/Tooltip.jsx',import.meta.url),'utf8');
const workspace=await readFile(new URL('../apps/web/src/features/investment-workspace/Workspace.jsx',import.meta.url),'utf8');
const main=await readFile(new URL('../apps/web/src/main.jsx',import.meta.url),'utf8');

test('one application tooltip provider covers explicit help and every button',()=>{
  assert.match(main,/<TooltipProvider><LocalApplication\/><\/TooltipProvider>/);
  assert.match(tooltip,/closest\('\[data-tooltip\], button, a\[href\]'\)/);
  assert.match(tooltip,/role="tooltip"/);
  assert.match(tooltip,/aria-describedby/);
});

test('tooltip interaction supports hover focus click and Escape',()=>{
  for(const event of ['mouseover','focusin','click','keydown'])assert.match(tooltip,new RegExp(`addEventListener\\('${event}'`));
  assert.match(tooltip,/e\.key==='Escape'/);
  assert.match(tooltip,/event\.key==='Enter'\|\|event\.key===' '/);
});

test('investor help distinguishes evidence assumptions calculations revisions and cost',()=>{
  for(const phrase of ['Provider model estimate','Analyst assumption','Calculated maximum offer','new saved revision','incur account charges'])assert.ok(`${tooltip}\n${workspace}`.includes(phrase),phrase);
});

test('required financial concepts receive contextual information icons',()=>{
  for(const concept of ['As-is AVM—not ARV','Project ROI','Cash-on-cash','Return-hurdle MAO','Break-even purchase ceiling','Minimum-profit purchase ceiling','contingency','exitValue'])assert.ok(workspace.includes(concept),concept);
  assert.match(workspace,/function Metric\(\{label,value,help=metricHelp\[label\]\}\)/);
  assert.match(workspace,/fieldHelp\[key\]/);
});

test('tooltip layer does not import or alter financial and persistence engines',()=>{
  assert.doesNotMatch(tooltip,/from ['"].*(economics|monte-carlo|repository|database|provider)/i);
  assert.equal((tooltip.match(/^import /gm)??[]).length,2);
});

test('tooltip closes when step navigation removes its focused control',()=>{
  assert.match(tooltip,/MutationObserver/);
  assert.match(tooltip,/active\.current\?\.isConnected/);
  assert.match(tooltip,/setTip\(null\)/);
});
