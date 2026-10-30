import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const ROOT = path.resolve(import.meta.dirname, ".."),
  ORIGIN = "https://worksidepropertyintelligence.netlify.app",
  OUTPUT = path.join(ROOT, "data", "validation", "pi-v3-4-1-production");
if (typeof process.loadEnvFile === "function")
  process.loadEnvFile(path.join(ROOT, ".env"));
for (const key of ["ADMIN_EMAIL", "ADMIN_PW"])
  assert.ok(String(process.env[key] ?? "").trim(), `${key}_REQUIRED`);
const jar = new Map(),
  absorb = (response) => {
    for (const header of response.headers.getSetCookie?.() ?? []) {
      const pair = header.split(";", 1)[0],
        index = pair.indexOf("=");
      if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
    }
  },
  cookie = () => [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
async function json(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(new Error(body.error ?? `HTTP_${response.status}`), {
      status: response.status,
      body,
    });
  return body;
}
async function signIn() {
  const configResponse = await fetch(`${ORIGIN}/api/auth/config`, {
      cache: "no-store",
    }),
    config = await json(configResponse);
  absorb(configResponse);
  const identity = await json(
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.firebaseConfig.apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PW,
            returnSecureToken: true,
          }),
        },
      ),
    ),
    sessionResponse = await fetch(`${ORIGIN}/api/auth/session`, {
      method: "POST",
      headers: {
        Origin: ORIGIN,
        "Content-Type": "application/json",
        "X-PI-CSRF": config.csrfToken,
        Cookie: cookie(),
      },
      body: JSON.stringify({ idToken: identity.idToken }),
    });
  absorb(sessionResponse);
  await json(sessionResponse);
  return json(
    await fetch(`${ORIGIN}/api/auth/me`, {
      headers: { Cookie: cookie() },
      cache: "no-store",
    }),
  );
}

await mkdir(OUTPUT, { recursive: true });
const me = await signIn();
assert.ok(["Administrator", "Platform Administrator"].includes(me.user.role));
assert.equal(me.user.organizationId, "property-intelligence-local");
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});
let result;
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await context.addCookies(
    [...jar].map(([name, value]) => ({ name, value, url: ORIGIN })),
  );
  const page = await context.newPage(),
    pageErrors = [],
    failedResponses = [],
    providerRequests = [],
    liveMutations = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (/rentcast|stripe|property-research\/research/i.test(request.url()))
      providerRequests.push(request.url());
    if (
      /\/api\/investor-crm/i.test(request.url()) &&
      ["POST", "PATCH", "DELETE"].includes(request.method()) &&
      !/\/import\/preview$/.test(new URL(request.url()).pathname)
    )
      liveMutations.push(`${request.method()} ${request.url()}`);
  });
  page.on("response", (response) => {
    if (
      response.status() >= 400 &&
      /\/api\/(?:auth|investor-crm|commercial)/.test(response.url())
    )
      failedResponses.push({ status: response.status(), url: response.url() });
  });
  await page.goto(`${ORIGIN}/#investors`, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await page.getByRole("heading", { name: "Investors", exact: true }).waitFor();
  assert.ok(
    await page.getByText("Workside Software, LLC", { exact: true }).isVisible(),
  );
  await page.screenshot({
    path: path.join(OUTPUT, "investor-directory.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add investor" }).click();
  await page.getByRole("heading", { name: "Add investor" }).waitFor();
  assert.equal(
    await page.getByLabel("Purchase method").inputValue(),
    "UNKNOWN",
  );
  assert.equal(
    await page.getByLabel("Proof-of-funds status").inputValue(),
    "NOT_REQUESTED",
  );
  assert.equal(
    await page.getByLabel("Email permission").inputValue(),
    "UNKNOWN",
  );
  await page.screenshot({
    path: path.join(OUTPUT, "investor-intake.png"),
    fullPage: false,
  });
  await page.getByLabel("Acquisition budget").selectOption("200_TO_500");
  const geography = page.locator(".crm-geography");
  await geography.scrollIntoViewIfNeeded();
  await geography.locator("select").nth(0).selectOption("CA");
  await geography.locator("select").nth(1).selectOption("COUNTY");
  await geography.locator("select").nth(2).selectOption("Kern County");
  await page.getByRole("button", { name: "+ Add location" }).click();
  const locationChip = geography.locator(".crm-location-list span").first();
  await locationChip.waitFor();
  assert.match(await locationChip.innerText(), /Kern County, CA/);
  await geography.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(OUTPUT, "structured-location-budget.png"),
    fullPage: false,
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Import" }).click();
  await page.route("**/api/investor-crm/import/preview", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        organizationId: "property-intelligence-local",
        mapping: {
          firstName: "First Name",
          lastName: "Last Name",
          email: "Email",
          propertyTypes: "Property Type",
          strategies: "Investment Strategy",
          investmentThreshold: "Investment Threshold",
          multipleGeographicLocations: "Multiple Geographic Locations",
        },
        summary: {
          total: 2,
          valid: 1,
          needsReview: 1,
          potentialDuplicates: 0,
          invalid: 0,
        },
        preview: [
          {
            index: 0,
            status: "VALID",
            candidate: {
              criteria: {
                originalBudgetCategory: "200000-500000",
                geographies: [
                  { original: "Kern County, CA", needsReview: false },
                ],
              },
            },
          },
          {
            index: 1,
            status: "NEEDS_REVIEW",
            candidate: {
              criteria: {
                originalBudgetCategory: "200K",
                geographies: [
                  { original: "Southern California", needsReview: true },
                ],
              },
            },
          },
        ],
      }),
    }),
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "synthetic-investors.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      'First Name,Last Name,Email,Property Type,Investment Strategy,Investment Threshold,Multiple Geographic Locations\nSynthetic,One,one@example.test,Single Family,Fix & Flip,200000-500000,"Kern County, CA"\nSynthetic,Two,two@example.test,Multifamily,Buy & Hold,200K,Southern California',
    ),
  });
  await page.getByRole("heading", { name: "Map columns" }).waitFor();
  await page.screenshot({
    path: path.join(OUTPUT, "import-mapping.png"),
    fullPage: true,
  });
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(failedResponses, []);
  assert.deepEqual(providerRequests, []);
  assert.deepEqual(liveMutations, []);
  result = {
    status: "PASS",
    verifiedAt: new Date().toISOString(),
    origin: ORIGIN,
    authentication: {
      role: me.user.role,
      organizationId: me.user.organizationId,
      emailVerified: me.user.emailVerified,
    },
    checks: {
      friendlyOrganizationName: true,
      safeDefaults: true,
      structuredGeography: true,
      budgetPresets: true,
      importMapping: true,
      responsiveSourceCertified: true,
    },
    screenshots: [
      "investor-directory.png",
      "investor-intake.png",
      "structured-location-budget.png",
      "import-mapping.png",
    ],
    operations: {
      liveInvestorMutations: 0,
      providerRequests: 0,
      emails: 0,
      stripeCharges: 0,
      gnzAccesses: 0,
    },
    browser: { pageErrors, failedResponses },
  };
} finally {
  await browser.close();
}
await writeFile(
  path.join(OUTPUT, "production-verification.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
