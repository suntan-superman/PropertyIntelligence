import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('PI uses one custom dialog provider and no native alert/confirm/reload prompt',async()=>{
  const [main,workspace,dialog]=await Promise.all([
    readFile('apps/web/src/main.jsx','utf8'),
    readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8'),
    readFile('apps/web/src/components/NotificationDialog.jsx','utf8')
  ]);
  assert.match(main,/NotificationDialogProvider/);
  assert.match(workspace,/useNotificationDialog/);
  assert.doesNotMatch(workspace,/window\.(?:alert|confirm)|beforeunload/);
  assert.match(dialog,/role=\{request\.cancelLabel\?'alertdialog':'dialog'\}/);
  assert.match(dialog,/aria-modal="true"/);
  assert.match(dialog,/event\.key==='Escape'/);
  assert.match(dialog,/event\.key==='Tab'/);
});

test('destructive workflow actions describe exact draft impact',async()=>{
  const source=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8');
  for(const phrase of ['Reset this draft?','Saved revisions remain unchanged.','Apply illustrative expenses?','Replace current risk ranges?','It does not run a simulation.'])assert.match(source,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('property removal uses the custom typed-confirmation dialog and server-side destructive endpoint',async()=>{
  const [dialog,discovery,server]=await Promise.all([readFile('apps/web/src/components/NotificationDialog.jsx','utf8'),readFile('apps/web/src/features/discovery/Discovery.jsx','utf8'),readFile('src/investment-workspace/server.js','utf8')]);
  assert.match(dialog,/request\.confirmation/);assert.match(dialog,/disabled=\{!confirmationMatches\}/);assert.match(discovery,/Type the street address/);assert.match(discovery,/Remove property data/);assert.match(discovery,/X-PI-CSRF/);assert.match(server,/PROPERTY_REMOVAL_ADDRESS_MISMATCH/);assert.match(server,/property-removal\/execute/);
});
