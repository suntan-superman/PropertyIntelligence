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
  'pi-v3-3-wholesale-cash-certified',
);

if (typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(path.join(ROOT, '.env'));
}
for (const key of ['ADMIN_EMAIL', 'ADMIN_PW']) {
  assert.ok(String(process.env[key] ?? '').trim(), `${key}_REQUIRED`);
}

const jar = new Map();
function absorb(response) {
  for (const header of response.headers.getSetCookie?.() ?? []) {
    const pair = header.split(';', 1)[0];
    const index = pair.indexOf('=');
    if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}
const cookie = () =>
  [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
async function responseJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(body.error ?? `HTTP_${response.status}`), {
      status: response.status,
      body,
    });
  }
  return body;
}
async function request(route) {
  const response = await fetch(`${ORIGIN}${route}`, {
    headers: { Cookie: cookie() },
    cache: 'no-store',
  });
  return responseJson(response);
}
async function signIn() {
  const configResponse = await fetch(`${ORIGIN}/api/auth/config`, {
    cache: 'no-store',
  });
  const config = await responseJson(configResponse);
  absorb(configResponse);
  const firebaseResponse = await fetch(
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
  );
  const firebaseUser = await responseJson(firebaseResponse);
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
  await responseJson(sessionResponse);
  const me = await request('/api/auth/me');
  assert.ok(
    ['Administrator', 'Platform Administrator'].includes(me.user.role),
    `UNEXPECTED_ADMINISTRATOR_ROLE_${me.user.role}`,
  );
  assert.equal(me.user.organizationId, 'property-intelligence-local');
  assert.equal(me.user.emailVerified, true);
  return me.user;
}

await mkdir(OUTPUT, { recursive: true });
const user = await signIn();
const propertiesResponse = await request(
  '/api/durable-properties?includeArchived=true',
);
const property = propertiesResponse.properties.find((item) =>
  /603\s+Tyler\s+St/i.test(item.address),
);
assert.ok(property, 'SAVED_TYLER_PROPERTY_NOT_FOUND');
const workspace = await request(`/api/durable-properties/${property.id}/workspace`);
const link = [...workspace.revisions]
  .filter((item) => item.scenario)
  .sort((a, b) =>
    String(b.scenario.savedAt ?? '').localeCompare(String(a.scenario.savedAt ?? '')),
  )[0];
assert.ok(link?.scenario, 'SAVED_TYLER_SCENARIO_NOT_FOUND');
const scenario = link.scenario;
assert.equal(scenario.propertyRef, property.sourceSubjectRef);

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
let browserResult;
try {
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1000 },
    deviceScaleFactor: 1,
  });
  await context.addCookies(
    [...jar].map(([name, value]) => ({ name, value, url: ORIGIN })),
  );
  const page = await context.newPage();
  const pageErrors = [];
  const providerRequests = [];
  const failedResponses = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (/rentcast|\/api\/property-research\/research/i.test(request.url())) {
      providerRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResponses.push({ status: response.status(), url: response.url() });
    }
  });
  const route = `#investment?subject=${encodeURIComponent(scenario.propertyRef)}&snapshot=${encodeURIComponent(scenario.evidenceFingerprint)}&scenario=${encodeURIComponent(scenario.id)}&mode=guided`;
  await page.goto(`${ORIGIN}/${route}`, {
    waitUntil: 'networkidle',
    timeout: 90_000,
  });
  const selector = page.locator('select[aria-label="Evaluation mode"]');
  await selector.waitFor({ state: 'attached', timeout: 45_000 });
  await page
    .getByRole('combobox', { name: 'Evaluation mode' })
    .waitFor({ timeout: 45_000 });
  const options = await selector.locator('option').allTextContents();
  const selectedValue = await selector.inputValue();
  assert.deepEqual(options, [
    'Wholesale / Cash evaluation',
    'Detailed underwriting',
  ]);
  assert.equal(
    selectedValue,
    scenario.evaluationMode === 'WHOLESALE_CASH'
      ? 'WHOLESALE_CASH'
      : 'DETAILED_UNDERWRITING',
  );
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(providerRequests, []);
  assert.deepEqual(
    failedResponses.filter(({ url }) =>
      /\/api\/(?:auth|durable-properties|investment)/i.test(url),
    ),
    [],
  );
  const screenshot = path.join(OUTPUT, 'production-evaluation-mode.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  browserResult = {
    route,
    selectedValue,
    options,
    pageErrors,
    failedApplicationResponses: failedResponses.filter(({ url }) =>
      /\/api\/(?:auth|durable-properties|investment)/i.test(url),
    ),
    providerRequests: providerRequests.length,
    screenshot: path.relative(ROOT, screenshot).replaceAll('\\', '/'),
  };
} finally {
  await browser.close();
}

const report = {
  status: 'PASS',
  verifiedAt: new Date().toISOString(),
  origin: ORIGIN,
  deployment: {
    commit: '8e031bc1984cea942479607bcf268804c59cd258',
    netlifyDeployId: '6ae392faf16dd3d98ed4cf55',
  },
  authentication: {
    role: user.role,
    organizationId: user.organizationId,
    emailVerified: user.emailVerified,
  },
  property: {
    id: property.id,
    address: property.address,
  },
  scenario: {
    id: scenario.id,
    revision: scenario.revision,
    legacyCompatibility: scenario.evaluationMode == null,
  },
  verification: browserResult,
  mutations: {
    scenarioWrites: 0,
    reportWrites: 0,
    providerRequests: 0,
  },
};
await writeFile(
  path.join(OUTPUT, 'production-verification.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
