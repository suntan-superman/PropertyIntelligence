import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [checklist, workspace, styles] = await Promise.all([
  readFile(
    'apps/web/src/features/investment-workspace/InteractiveChecklist.jsx',
    'utf8',
  ),
  readFile(
    'apps/web/src/features/investment-workspace/Workspace.jsx',
    'utf8',
  ),
  readFile('apps/web/src/features/investment-workspace/workflow.css', 'utf8'),
]);

test('finalization exposes each long-running stage beside the action', () => {
  for (const phase of ['SAVING', 'FINALIZING', 'GENERATING', 'SUCCESS', 'ERROR']) {
    assert.match(checklist, new RegExp(`"${phase}"`));
  }
  for (const message of [
    'Saving checklist changes…',
    'Recording finalization…',
    'Generating Full Investor Package…',
    'Full Investor Package Generated',
  ]) {
    assert.match(checklist, new RegExp(message));
  }
  assert.match(checklist, /aria-busy=\{finalizationBusy\}/);
  assert.match(checklist, /aria-live="polite"/);
  assert.match(checklist, /iw-finalization-feedback/);
});

test('PDF generation returns an explicit outcome to the finalization workflow', () => {
  assert.match(workspace, /return \{\s*ok: true,\s*filename,/);
  assert.match(workspace, /return \{\s*ok: false,\s*error:/);
  assert.match(checklist, /if \(!generated\?\.ok\)/);
  assert.match(checklist, /generated\.filename/);
  assert.match(checklist, /No download was started/);
});

test('success and failure feedback remain visually distinct', () => {
  assert.match(styles, /\.iw-finalization-feedback\s*\{/);
  assert.match(styles, /\.iw-finalization-feedback\.success/);
  assert.match(styles, /\.iw-finalization-feedback\.error/);
});
