import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const root = path.resolve(import.meta.dirname, "..");
const origin = "https://worksidepropertyintelligence.netlify.app";
const output = path.join(root, "data", "validation", "workspace-removal");
if (typeof process.loadEnvFile === "function") process.loadEnvFile(path.join(root, ".env"));
for (const key of ["ADMIN_EMAIL", "ADMIN_PW"])
  assert.ok(String(process.env[key] ?? "").trim(), `${key}_REQUIRED`);

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});
let result;
try {
  const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await context.newPage();
  const mutations = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) mutations.push(`${request.method()} ${request.url()}`);
  });
  await page.goto(origin, { waitUntil: "networkidle", timeout: 90_000 });
  if (await page.locator('input[type="email"]').isVisible().catch(() => false)) {
    await page.locator('input[type="email"]').fill(process.env.ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(process.env.ADMIN_PW);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByText("My Workspace", { exact: true }).first().waitFor({ timeout: 45_000 });
  }
  mutations.length = 0;

  await page.goto(`${origin}/#reports`, { waitUntil: "networkidle", timeout: 90_000 });
  const reportButtons = page.getByRole("button", { name: "Remove Report" });
  await reportButtons.first().waitFor({ timeout: 45_000 });
  assert.ok((await reportButtons.count()) > 0, "REMOVE_REPORT_CONTROL_NOT_FOUND");
  await reportButtons.first().click();
  await page.getByRole("heading", { name: "Permanently remove this generated report?" }).waitFor();
  await page.getByRole("button", { name: "Keep Report" }).click();
  await page.screenshot({ path: path.join(output, "reports.png"), fullPage: true });

  await page.goto(`${origin}/#saved-deals`, { waitUntil: "networkidle", timeout: 90_000 });
  const scenarioButtons = page.getByRole("button", { name: "Remove Scenario" });
  assert.ok((await scenarioButtons.count()) > 0, "REMOVE_SCENARIO_CONTROL_NOT_FOUND");
  await scenarioButtons.first().click();
  const dialog = page.locator('[data-testid="notification-dialog"]');
  await dialog.waitFor();
  const dialogText = await dialog.innerText();
  assert.match(dialogText, /Remove reports first|Permanently remove this saved scenario/);
  const cancel = dialog.getByRole("button", { name: /Keep Scenario|Got it/ });
  await cancel.click();
  await page.screenshot({ path: path.join(output, "scenarios.png"), fullPage: true });

  assert.deepEqual(mutations, [], "PRODUCTION_QA_MUST_NOT_MUTATE");
  result = {
    status: "PASS",
    verifiedAt: new Date().toISOString(),
    origin,
    removeReportControl: true,
    reportConfirmation: true,
    removeScenarioControl: true,
    scenarioDependencyGuard: /Remove reports first/.test(dialogText),
    liveMutations: 0,
  };
  await context.close();
} finally {
  await browser.close();
}
await writeFile(path.join(output, "results.json"), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
