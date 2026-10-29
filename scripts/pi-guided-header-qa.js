import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const ORIGIN = String(process.argv[2] ?? 'http://127.0.0.1:4173').replace(
  /\/$/,
  '',
);
const OUTPUT = path.join(
  ROOT,
  'data',
  'validation',
  'guided-header-interface',
);
if (typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(path.join(ROOT, '.env'));
}
for (const key of ['ADMIN_EMAIL', 'ADMIN_PW']) {
  assert.ok(String(process.env[key] ?? '').trim(), `${key}_REQUIRED`);
}

const jar = new Map();
const absorb = (response) => {
  for (const header of response.headers.getSetCookie?.() ?? []) {
    const pair = header.split(';', 1)[0];
    const index = pair.indexOf('=');
    if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
};
const cookie = () =>
  [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
async function json(response) {
  const body = await response.json().catch(() => ({}));
  assert.ok(response.ok, body.error ?? `HTTP_${response.status}`);
  return body;
}
async function get(route) {
  return json(
    await fetch(`${ORIGIN}${route}`, {
      headers: { Cookie: cookie() },
      cache: 'no-store',
    }),
  );
}
async function signIn() {
  const configResponse = await fetch(`${ORIGIN}/api/auth/config`, {
    cache: 'no-store',
  });
  const config = await json(configResponse);
  absorb(configResponse);
  const firebaseUser = await json(
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PW,
          returnSecureToken: true,
        }),
      },
    ),
  );
  const sessionResponse = await fetch(`${ORIGIN}/api/auth/session`, {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      'Content-Type': 'application/json',
      'X-PI-CSRF': config.csrfToken,
      Cookie: cookie(),
    },
    body: JSON.stringify({ idToken: firebaseUser.idToken }),
  });
  absorb(sessionResponse);
  await json(sessionResponse);
}

await mkdir(OUTPUT, { recursive: true });
await signIn();
const bootstrap = await get('/api/investment/bootstrap');
const revisions = await get('/api/investment/scenario-revisions');
const preferredProperty = bootstrap.properties.find((item) =>
  /603\s+Tyler\s+St/i.test(item.address),
);
const candidateProperties = preferredProperty
  ? [preferredProperty]
  : bootstrap.properties;
const property = candidateProperties.find((item) =>
  revisions.some((scenario) => scenario.propertyRef === item.ref),
);
assert.ok(property, 'SAVED_QA_PROPERTY_NOT_FOUND');
const scenario = revisions
  .filter((item) => item.propertyRef === property.ref)
  .sort((a, b) => b.revision - a.revision)[0];
assert.ok(scenario, 'SAVED_QA_SCENARIO_NOT_FOUND');
const route = `#investment?subject=${encodeURIComponent(scenario.propertyRef)}&snapshot=${encodeURIComponent(scenario.evidenceFingerprint)}&scenario=${encodeURIComponent(scenario.id)}&mode=guided`;

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const captures = [];
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 700, height: 1000 },
  ]) {
    const context = await browser.newContext({ viewport });
    await context.addCookies(
      [...jar].map(([name, value]) => ({ name, value, url: ORIGIN })),
    );
    const page = await context.newPage();
    const errors = [];
    const consoleErrors = [];
    const failedResponses = [];
    const providerRequests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push(`${response.status()} ${response.url()}`);
      }
    });
    page.on('request', (request) => {
      if (/rentcast|\/api\/property-research\/research/i.test(request.url())) {
        providerRequests.push(request.url());
      }
    });
    await page.goto(`${ORIGIN}/${route}`, {
      waitUntil: 'networkidle',
      timeout: 90_000,
    });
    const header = page.locator('.iw-guided-sticky');
    try {
      await header.waitFor({ timeout: 15_000 });
    } catch (error) {
      const diagnostic = path.join(OUTPUT, `${viewport.name}-diagnostic.png`);
      await page.screenshot({ path: diagnostic, fullPage: true });
      const body = (await page.locator('body').innerText()).slice(0, 800);
      throw new Error(
        `GUIDED_HEADER_NOT_RENDERED: ${body}; PAGE_ERRORS: ${errors.join(' | ')}; CONSOLE_ERRORS: ${consoleErrors.join(' | ')}; FAILED_RESPONSES: ${failedResponses.join(' | ')}`,
        { cause: error },
      );
    }
    await page.getByText('Scenario workspace', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Change Property' }).waitFor();
    await page.getByTestId('save-scenario').waitFor();
    const metrics = await header.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      height: element.getBoundingClientRect().height,
    }));
    assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, 'HEADER_OVERFLOW');
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(providerRequests, []);
    const file = path.join(OUTPUT, `${viewport.name}.png`);
    await header.screenshot({ path: file });
    await page.evaluate(() => window.scrollTo(0, 0));
    const viewportFile = path.join(OUTPUT, `${viewport.name}-viewport.png`);
    await page.screenshot({ path: viewportFile });
    const pageFile = path.join(OUTPUT, `${viewport.name}-page.png`);
    await page.screenshot({ path: pageFile, fullPage: true });
    captures.push({
      ...viewport,
      ...metrics,
      file: path.relative(ROOT, file).replaceAll('\\', '/'),
      viewportFile: path.relative(ROOT, viewportFile).replaceAll('\\', '/'),
      pageFile: path.relative(ROOT, pageFile).replaceAll('\\', '/'),
      providerRequests: 0,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const result = {
  status: 'PASS',
  validatedAt: new Date().toISOString(),
  origin: ORIGIN,
  deployment:
    process.env.PI_DEPLOY_ID && process.env.PI_COMMIT
      ? {
          id: process.env.PI_DEPLOY_ID,
          commit: process.env.PI_COMMIT,
        }
      : null,
  property: property.address,
  scenario: { id: scenario.id, revision: scenario.revision },
  captures,
  mutations: 0,
  providerRequests: 0,
};
await writeFile(
  path.join(OUTPUT, 'results.json'),
  `${JSON.stringify(result, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
