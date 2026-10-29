import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [workspace, styles] = await Promise.all([
  readFile("apps/web/src/features/investment-workspace/Workspace.jsx", "utf8"),
  readFile("apps/web/src/features/investment-workspace/guided.css", "utf8"),
]);

test("guided header groups property identity separately from scenario controls", () => {
  const propertySummary = workspace.indexOf("iw-guided-property-summary");
  const scenarioWorkspace = workspace.indexOf("iw-guided-scenario-workspace");
  const progress = workspace.indexOf("<GuidedProgress", scenarioWorkspace);
  assert.ok(propertySummary > 0);
  assert.ok(scenarioWorkspace > propertySummary);
  assert.ok(progress > scenarioWorkspace);
  assert.match(workspace, /Current property/);
  assert.match(workspace, /iw-change-property/);
  assert.match(workspace, /Scenario workspace/);
});

test("scenario toolbar keeps related controls together and Save last", () => {
  const start = workspace.indexOf('className="iw-guided-scenario-tools"');
  const end = workspace.indexOf("</div>\n        </div>", start);
  const toolbar = workspace.slice(start, end);
  for (const control of [
    "Current scenario",
    "Scenario name",
    "EvaluationModeSelect",
    "ScenarioActionsMenu",
    "iw-scenario-save",
  ]) {
    assert.match(toolbar, new RegExp(control));
  }
  assert.ok(
    toolbar.indexOf("iw-scenario-save") >
      toolbar.indexOf("ScenarioActionsMenu"),
  );
  assert.doesNotMatch(toolbar, /<span>Actions<\/span>/);
  assert.match(workspace, /compact/);
  assert.match(workspace, /<span aria-hidden="true">•••<\/span>/);
});

test("scenario picker is only a dropdown when separate scenario branches exist", () => {
  assert.match(
    workspace,
    /scenarios\.length > 1 \? "Active scenario" : "Current scenario"/,
  );
  assert.match(workspace, /scenarios\.length > 1 \? \(/);
  assert.match(
    workspace,
    /className="iw-current-scenario"[\s\S]*?aria-label="Current scenario"/,
  );
  assert.match(workspace, /View Revision History \(\{revisionCount\}\)/);
  assert.match(styles, /\.iw-current-scenario/);
});

test("guided header layout is responsive and visually bounded", () => {
  assert.match(styles, /\.iw-guided-property-summary/);
  assert.match(styles, /\.iw-guided-scenario-heading/);
  assert.match(styles, /\.iw-guided-scenario-tools\s*\{/);
  assert.match(styles, /grid-template-columns:/);
  assert.match(styles, /@media\s*\(max-width:\s*850px\)/);
  assert.match(styles, /@media\s*\(max-width:\s*720px\)/);
  assert.match(styles, /\.iw-scenario-save/);
});
