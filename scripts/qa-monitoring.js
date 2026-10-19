import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { writeJson } from '../src/io/files.js';

const checks = [], errors = [], externalRequests = [], apiRequests = [];
const resultDir = resolve('data/validation/monitoring-v1-1');
const shotsDir = resolve(resultDir, 'screenshots');
const vite = await createServer({ configFile: resolve('apps/web/vite.config.js'), server: { host: '127.0.0.1', port: 0, strictPort: false } });
let browser;
try {
  await mkdir(shotsDir, { recursive: true });
  await vite.listen();
  const origin = vite.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 940 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', (route) => {
    const requestUrl = route.request().url();
    if (!requestUrl.startsWith(origin)) { externalRequests.push(requestUrl); return route.abort(); }
    if (new URL(requestUrl).pathname.startsWith('/api/')) apiRequests.push(requestUrl);
    return route.continue();
  });
  await page.goto(`${origin}#monitoring`);
  await page.getByTestId('monitoring-dashboard').waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Property monitoring' }).count(), 1);
  assert.equal(await page.locator('[data-testid="priority-row"]').count(), 3);
  assert.deepEqual(await page.locator('.monitoring-priority-table tbody tr td:first-child button').allTextContents(), ['Demo Property A', 'Demo Property C', 'Demo Property B']);
  assert.deepEqual(await page.locator('.monitoring-kpis article strong').allTextContents(), ['3', '3', '3', 'None verified']);
  assert.equal(await page.locator('[data-testid="monitoring-event"]').count(), 3, 'Default feed should omit informational and quarantined events.');
  assert.equal(await page.locator('.monitoring-quarantine').count(), 2);
  assert.equal(await page.locator('.monitoring-alert').count(), 3);
  assert.match(await page.locator('.monitoring-synthetic-banner').innerText(), /Every property and event below is synthetic/);
  checks.push('Synthetic dashboard summary and property priority rows reconcile; priority order is high then medium/recent; quarantines excluded.');

  await page.screenshot({ path: resolve(shotsDir, 'monitoring-v1-1-desktop-1366.png'), fullPage: true });
  await page.setViewportSize({ width: 768, height: 1024 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Tablet horizontal overflow');
  await page.screenshot({ path: resolve(shotsDir, 'monitoring-v1-1-tablet-768.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile horizontal overflow');
  await page.screenshot({ path: resolve(shotsDir, 'monitoring-v1-1-mobile-390.png'), fullPage: true });
  await page.setViewportSize({ width: 1366, height: 940 });
  checks.push('1366px desktop, 768px tablet, and 390px mobile screenshots captured; no horizontal overflow.');

  await page.getByLabel('Filter priority').selectOption('HIGH');
  assert.equal(await page.locator('[data-testid="monitoring-event"]').count(), 1);
  await page.getByLabel('Filter priority').selectOption('');
  await page.getByLabel('Filter event type').selectOption('LOAN_MODEL_CHANGE');
  assert.equal(await page.locator('[data-testid="monitoring-event"]').count(), 1);
  await page.locator('[data-testid="monitoring-event"]').click();
  assert.match(await page.locator('.monitoring-detail').innerText(), /not a recorded payoff/i);
  await page.locator('.monitoring-provenance summary').click();
  assert.match(await page.locator('.monitoring-provenance').innerText(), /Source transaction/);
  await page.getByLabel('Filter event type').selectOption('');
  await page.getByLabel('Filter source').selectOption('ATTOM');
  assert.equal(await page.locator('[data-testid="monitoring-event"]').count(), 3);
  await page.getByLabel('Filter source').selectOption('');
  await page.getByLabel('Filter from date').fill('2026-10-05');
  await page.getByLabel('Filter to date').fill('2026-10-08');
  assert.equal(await page.locator('[data-testid="monitoring-event"]').count(), 2);
  await page.getByLabel('Filter from date').fill('');
  await page.getByLabel('Filter to date').fill('');
  await page.getByRole('checkbox', { name: 'Include informational changes' }).check();
  assert.equal(await page.locator('[data-testid="monitoring-event"]').count(), 4);
  await page.getByLabel('Filter priority').selectOption('LOW');
  assert.equal(await page.locator('[data-testid="monitoring-event"]').count(), 1);
  await page.getByLabel('Filter priority').selectOption('');
  await page.getByRole('checkbox', { name: 'Include informational changes' }).uncheck();
  checks.push('Priority, event type, source, date, and alert-status filters work; detail is plain language with expandable source provenance.');

  await page.getByRole('button', { name: 'Demo Property B', exact: true }).click();
  assert.equal(await page.locator('.property-monitoring-heading h2').innerText(), 'Demo Property B');
  assert.equal(await page.locator('.monitoring-timeline li').count(), 1);
  const historyDates = await page.locator('.monitoring-timeline time').allTextContents();
  const historyEpochs = historyDates.map((date) => new Date(date).getTime());
  assert.deepEqual(historyEpochs, [...historyEpochs].sort((a, b) => a - b));
  await page.getByRole('button', { name: 'Mark read / acknowledge locally' }).first().click();
  assert.equal(await page.getByText('Read', { exact: true }).count(), 1);
  await page.getByLabel('Filter alert status').selectOption('ACKNOWLEDGED');
  assert.equal(await page.locator('[data-testid="monitoring-event"]').count(), 1);
  await page.getByLabel('Filter alert status').selectOption('');
  await page.getByRole('button', { name: 'Replay synthetic update' }).click();
  assert.match(await page.getByRole('status').innerText(), /0 new events · 6 duplicates suppressed/);
  assert.equal(await page.locator('[data-testid="priority-row"]').count(), 3);
  assert.equal(await page.locator('.monitoring-alert').count(), 3);
  assert.equal(await page.locator('.monitoring-quarantine').count(), 2);
  await page.locator('.monitoring-diagnostics summary').click();
  assert.match(await page.locator('.monitoring-diagnostics').innerText(), /FIPS 55017/);
  checks.push('Property selection updates detail/history; local acknowledgment is read-state only; replay creates no duplicate events/alerts; diagnostics expand.');

  await page.getByRole('tab', { name: 'Certified ATTOM Evidence' }).click();
  await page.getByTestId('certified-attom-mode').waitFor();
  assert.match(await page.locator('[data-testid="certified-attom-mode"]').innerText(), /Seven sanitized vendor source-event cases passed local normalization, classification, quarantine, and replay checks/);
  assert.deepEqual(await page.locator('.certification-status-grid article strong').allTextContents(), ['7', '7', '0', '7']);
  assert.equal(await page.locator('[data-testid="priority-row"]').count(), 0);
  assert.doesNotMatch(await page.locator('[data-testid="certified-attom-mode"]').innerText(), /Demo Property/);
  await page.getByRole('tab', { name: 'Synthetic Demo' }).click();
  assert.equal(await page.locator('[data-testid="priority-row"]').count(), 3);
  checks.push('Certified ATTOM evidence mode reports seven source/monitoring events and zero alerts without loading source rows as properties or mixing synthetic properties.');

  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(apiRequests, []);
  checks.push('No console errors, external/provider calls, or PI API/database reads.');
  await writeJson('data/validation/monitoring-v1-1/qa-results.json', { status: 'PASS', checks, screenshots: ['screenshots/monitoring-v1-1-desktop-1366.png', 'screenshots/monitoring-v1-1-tablet-768.png', 'screenshots/monitoring-v1-1-mobile-390.png'], browserErrors: errors, externalRequests: 0, apiRequests: 0, providerCalls: 0, databaseWrites: 0, notificationsSent: 0, deployments: 0, viewportWidths: [1366, 768, 390] });
  console.log(JSON.stringify({ status: 'PASS', checks }, null, 2));
} finally {
  if (browser) await browser.close();
  await vite.close();
}
