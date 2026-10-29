import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const ORIGIN = 'https://worksidepropertyintelligence.netlify.app';
const OUTPUT = path.join(
  ROOT,
  'data',
  'validation',
  'report-generation-feedback',
);
if (typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(path.join(ROOT, '.env'));
}
for (const key of ['ADMIN_EMAIL', 'ADMIN_PW']) {
  assert.ok(String(process.env[key] ?? '').trim(), `${key}_REQUIRED`);
}

await mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
let result;
try {
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const providerRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (/rentcast|\/api\/property-research\/research/i.test(request.url())) {
      providerRequests.push(request.url());
    }
  });
  await page.goto(ORIGIN, { waitUntil: 'networkidle', timeout: 90_000 });
  const email = page.locator('input[type="email"]');
  if (await email.isVisible().catch(() => false)) {
    await email.fill(process.env.ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(process.env.ADMIN_PW);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText('My Workspace', { exact: true }).first().waitFor({
      timeout: 45_000,
    });
  }
  const state = await page.evaluate(async () => {
    const [bootstrapResponse, revisionsResponse] = await Promise.all([
      fetch('/api/investment/bootstrap', { cache: 'no-store' }),
      fetch('/api/investment/scenario-revisions', { cache: 'no-store' }),
    ]);
    return {
      bootstrap: await bootstrapResponse.json(),
      revisions: await revisionsResponse.json(),
    };
  });
  const property = state.bootstrap.properties.find((item) =>
    /603\s+Tyler\s+St/i.test(item.address),
  );
  assert.ok(property, 'TYLER_PROPERTY_NOT_FOUND');
  const scenario = state.revisions
    .filter((item) => item.propertyRef === property.ref)
    .sort((a, b) => b.revision - a.revision)[0];
  assert.ok(scenario, 'TYLER_SCENARIO_NOT_FOUND');

  let mockedFinalizations = 0;
  let mockedReports = 0;
  await page.route('**/api/commercial/reports/finalize', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    mockedFinalizations += 1;
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        finalization: { id: 'qa-finalization-no-live-write' },
      }),
    });
  });
  await page.route('**/api/investment/report/pdf', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    mockedReports += 1;
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          'attachment; filename="603_Tyler_St_Full_Investor_Package_QA.pdf"',
      },
      body: Buffer.from('%PDF-1.4\n% mocked UI acceptance only\n%%EOF'),
    });
  });

  const route = `#investment?subject=${encodeURIComponent(scenario.propertyRef)}&snapshot=${encodeURIComponent(scenario.evidenceFingerprint)}&scenario=${encodeURIComponent(scenario.id)}&tab=Reports&mode=guided`;
  await page.goto(`${ORIGIN}/${route}`, {
    waitUntil: 'networkidle',
    timeout: 90_000,
  });
  const panel = page.locator('.iw-finalize-disclosures');
  await panel.waitFor({ timeout: 45_000 });
  const checkbox = panel.locator('input[type="checkbox"]');
  if (!(await checkbox.isChecked())) await checkbox.check();
  const button = panel.getByRole('button', {
    name: 'Finalize & Generate Full Investor Package',
  });
  const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
  await button.click();
  await panel.getByText('Recording finalization…', { exact: true }).waitFor();
  const finalizingScreenshot = path.join(OUTPUT, 'finalizing.png');
  await panel.screenshot({ path: finalizingScreenshot });
  await panel
    .getByText('Generating Full Investor Package…', { exact: true })
    .waitFor({ timeout: 10_000 });
  const generatingScreenshot = path.join(OUTPUT, 'generating.png');
  await panel.screenshot({ path: generatingScreenshot });
  const download = await downloadPromise;
  await panel
    .getByText('Full Investor Package generated', { exact: true })
    .waitFor({ timeout: 10_000 });
  assert.match(
    await panel.innerText(),
    /603_Tyler_St_Full_Investor_Package_QA\.pdf/,
  );
  const successScreenshot = path.join(OUTPUT, 'success.png');
  await panel.screenshot({ path: successScreenshot });
  assert.equal(mockedFinalizations, 1);
  assert.equal(mockedReports, 1);
  assert.equal(download.suggestedFilename(), '603_Tyler_St_Full_Investor_Package_QA.pdf');
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(providerRequests, []);
  result = {
    status: 'PASS',
    verifiedAt: new Date().toISOString(),
    origin: ORIGIN,
    property: property.address,
    scenario: { id: scenario.id, revision: scenario.revision },
    stages: ['FINALIZING', 'GENERATING', 'SUCCESS'],
    mockedFinalizationRequests: mockedFinalizations,
    mockedReportRequests: mockedReports,
    liveFinalizationWrites: 0,
    liveReportWrites: 0,
    providerRequests: 0,
    downloadFilename: download.suggestedFilename(),
    screenshots: ['finalizing.png', 'generating.png', 'success.png'],
  };
  await context.close();
} finally {
  await browser.close();
}
await writeFile(
  path.join(OUTPUT, 'results.json'),
  `${JSON.stringify(result, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
