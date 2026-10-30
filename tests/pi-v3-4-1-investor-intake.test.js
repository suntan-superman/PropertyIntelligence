import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createMemoryInvestorRepository } from "../src/investor-crm/memory-repository.js";
import {
  createInvestorCrmService,
  suggestedMapping,
} from "../src/investor-crm/investor-service.js";
import {
  normalizeInvestor,
  normalizeGeographies,
  parseBudgetSource,
} from "../src/investor-crm/investor-contract.js";
import { matchInvestor } from "../src/investor-crm/matching.js";
import { ROLES } from "../src/auth/access-control.js";
import {
  US_GEOGRAPHY,
  countiesForState,
} from "../src/investor-crm/us-geography.js";
import {
  contactEmailError,
  contactPhoneError,
  formatContactPhone,
  normalizeContactEmail,
} from "../src/investor-crm/contact-validation.js";

const organizationId = "property-intelligence-local",
  admin = {
    uid: "owner",
    role: ROLES.ORGANIZATION_ADMINISTRATOR,
    organizationId,
  },
  platform = {
    uid: "platform",
    role: ROLES.PLATFORM_ADMINISTRATOR,
    organizationId: "platform-owner",
  },
  other = {
    uid: "other",
    role: ROLES.ORGANIZATION_ADMINISTRATOR,
    organizationId: "gnz-marketing",
  };
const base = {
  firstName: "Synthetic",
  lastName: "Buyer",
  email: "synthetic-buyer@example.test",
  propertyTypes: ["SF"],
  strategies: ["FIX_AND_FLIP"],
  geographies: [{ state: "CA", scope: "COUNTY", county: "Kern County" }],
};
const deal = {
  propertyId: "property-qa",
  propertyAddress: "100 QA Ave",
  propertyType: "SF",
  strategy: "FIX_AND_FLIP",
  state: "CA",
  county: "Kern",
  acquisitionPrice: 180000,
  rehabilitationEstimate: 30000,
  fundingOrientation: "CASH",
};
function harness() {
  let id = 0;
  const repository = createMemoryInvestorRepository(),
    service = createInvestorCrmService({
      repository,
      idFactory: () => `id-${++id}`,
      clock: () => new Date("2026-10-30T12:00:00.000Z"),
    });
  return { repository, service };
}

test("V3.4.1 new investors retain separate names and require one usable contact method", async () => {
  const { service } = harness(),
    record = await service.create({
      user: admin,
      investor: {
        firstName: "Avery",
        lastName: "Investor",
        phone: "(661) 555-0101",
      },
    });
  assert.equal(record.firstName, "Avery");
  assert.equal(record.lastName, "Investor");
  assert.equal(record.fullName, "Avery Investor");
  assert.equal(record.normalizedPhone, "6615550101");
  await assert.rejects(
    () =>
      service.create({ user: admin, investor: { firstName: "No Contact" } }),
    /INVESTOR_CONTACT_METHOD_REQUIRED/,
  );
});
test("V3.4.1 ambiguous legacy full names are preserved without inferred parts", async () => {
  const { repository, service } = harness(),
    legacy = {
      id: "legacy",
      organizationId,
      schemaVersion: 1,
      ...normalizeInvestor({
        fullName: "ACME FAMILY TRUST",
        email: "trust@example.test",
      }),
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
  await repository.createInvestor(organizationId, legacy);
  const updated = await service.update({
    user: admin,
    id: "legacy",
    investor: { notes: "Preserved legacy identity" },
  });
  assert.equal(updated.fullName, "ACME FAMILY TRUST");
  assert.equal(updated.firstName, "");
  assert.equal(updated.lastName, "");
});
test("V3.4.1 edits replace structured criteria rather than retaining stale nested values", async () => {
  const { service } = harness(),
    created = await service.create({ user: admin, investor: base }),
    updated = await service.update({
      user: admin,
      id: created.id,
      investor: {
        propertyTypes: ["MF"],
        strategies: ["BUY_AND_HOLD"],
        geographies: [{ state: "AZ", scope: "STATEWIDE" }],
      },
    });
  assert.deepEqual(updated.criteria.propertyTypes, ["MF"]);
  assert.deepEqual(updated.criteria.strategies, ["BUY_AND_HOLD"]);
  assert.equal(updated.criteria.geographies[0].state, "AZ");
});
test("V3.4.1 email, telephone and optional mailing-address validation are safe", () => {
  assert.throws(
    () => normalizeInvestor({ fullName: "Bad Email", email: "bad", phone: "" }),
    /INVESTOR_EMAIL_INVALID/,
  );
  assert.throws(
    () => normalizeInvestor({ fullName: "Bad Phone", phone: "12" }),
    /INVESTOR_PHONE_INVALID/,
  );
  const record = normalizeInvestor({
    ...base,
    streetAddress: "1 Private Way",
    city: "Bakersfield",
    state: "ca",
    zip: "93301",
  });
  assert.deepEqual(record.mailingAddress, {
    street: "1 Private Way",
    city: "Bakersfield",
    state: "CA",
    zip: "93301",
  });
});
test("V3.4.1 contact fields format telephone numbers and validate email on entry", () => {
  assert.equal(formatContactPhone("6615550101"), "(661) 555-0101");
  assert.equal(formatContactPhone("1-661-555-0101"), "(661) 555-0101");
  assert.equal(formatContactPhone("+44 20 7946 0958"), "+442079460958");
  assert.equal(contactPhoneError("(661) 555-0101"), "");
  assert.match(contactPhoneError("12"), /valid telephone/);
  assert.equal(
    normalizeContactEmail(" Buyer@Example.COM "),
    "buyer@example.com",
  );
  assert.equal(contactEmailError("buyer@example.com"), "");
  assert.match(contactEmailError("buyer.example.com"), /valid email/);
});
test("V3.4.1 ANY is mutually exclusive while multiple specific choices remain supported", () => {
  const any = normalizeInvestor({
      ...base,
      propertyTypes: ["SF", "ANY"],
      strategies: ["ANY", "WHOLESALE"],
    }),
    specific = normalizeInvestor({
      ...base,
      propertyTypes: ["SF", "MF"],
      strategies: ["FIX_AND_FLIP", "BUY_AND_HOLD"],
    });
  assert.deepEqual(any.criteria.propertyTypes, ["ANY"]);
  assert.deepEqual(any.criteria.strategies, ["ANY"]);
  assert.deepEqual(specific.criteria.propertyTypes, ["SF", "MF"]);
  assert.equal(specific.criteria.strategies.length, 2);
});
test("V3.4.1 acquisition presets and imported budget syntax have explicit semantics", () => {
  assert.deepEqual(parseBudgetSource("200K+"), {
    minimum: 200000,
    maximum: null,
    interpretation: "MINIMUM",
    needsReview: false,
    original: "200K+",
  });
  assert.equal(parseBudgetSource("200000-500000").minimum, 200000);
  assert.equal(parseBudgetSource("$200,000").needsReview, true);
  assert.equal(parseBudgetSource("200K").needsReview, true);
  const open = normalizeInvestor({
    ...base,
    minimumAcquisitionAmount: 500000,
    maximumAcquisitionAmount: "",
  });
  assert.equal(open.criteria.minimumAcquisitionAmount, 500000);
  assert.equal(open.criteria.maximumAcquisitionAmount, null);
  assert.throws(
    () =>
      normalizeInvestor({
        ...base,
        minimumAcquisitionAmount: 500000,
        maximumAcquisitionAmount: 200000,
      }),
    /INVESTOR_BUDGET_RANGE_INVALID/,
  );
});
test("V3.4.1 Census geography covers every state/territory and enforces county ownership", () => {
  assert.equal(US_GEOGRAPHY.length, 56);
  assert.ok(countiesForState("CA").includes("Kern County"));
  assert.ok(countiesForState("NV").includes("Clark County"));
  const values = normalizeGeographies([
    { state: "California", scope: "COUNTY", county: "Kern County" },
    { state: "AZ", scope: "STATEWIDE" },
  ]);
  assert.equal(values[0].state, "CA");
  assert.equal(values[1].scope, "STATEWIDE");
  assert.throws(
    () =>
      normalizeGeographies([
        { state: "NV", scope: "COUNTY", county: "Kern County" },
      ]),
    /INVESTOR_GEOGRAPHY_INVALID/,
  );
});
test("V3.4.1 duplicate locations collapse and ambiguous legacy locations remain reviewable", () => {
  const duplicate = normalizeGeographies([
      "Kern County, CA",
      "Kern County, CA",
    ]),
    legacy = normalizeGeographies(["Southern California"]);
  assert.equal(duplicate.length, 1);
  assert.equal(legacy[0].original, "Southern California");
  assert.equal(legacy[0].needsReview, true);
});
test("V3.4.1 statewide, county, multiple and unknown-county matching remain explainable", () => {
  const investor = {
      id: "i",
      status: "ACTIVE",
      email: "i@example.test",
      criteria: {
        propertyTypes: ["SF"],
        strategies: ["FIX_AND_FLIP"],
        geographies: normalizeGeographies([
          { state: "AZ", scope: "STATEWIDE" },
          { state: "CA", scope: "COUNTY", county: "Kern County" },
        ]),
        fundingPreference: "CASH",
        activelyBuying: "YES",
      },
      capability: { cashBuyer: "YES" },
      communication: { emailStatus: "PERMITTED", bounceStatus: "NONE" },
    },
    county = matchInvestor(investor, deal),
    statewide = matchInvestor(investor, {
      ...deal,
      state: "AZ",
      county: "Pima",
    }),
    unknown = matchInvestor(
      {
        ...investor,
        criteria: {
          ...investor.criteria,
          geographies: normalizeGeographies([
            { state: "CA", scope: "COUNTY", county: "Kern County" },
          ]),
        },
      },
      { ...deal, county: "" },
    );
  assert.ok(county.reasons.some((value) => /geography/.test(value)));
  assert.ok(statewide.reasons.some((value) => /geography/.test(value)));
  assert.ok(unknown.missing.some((value) => /county/i.test(value)));
  assert.ok(!unknown.exclusions.some((value) => /location/i.test(value)));
});
test("V3.4.1 safe capability and communication defaults do not imply verification or permission", () => {
  const record = normalizeInvestor(base);
  assert.equal(record.criteria.fundingPreference, "UNKNOWN");
  assert.equal(record.capability.proofOfFundsStatus, "NOT_REQUESTED");
  assert.equal(record.communication.emailStatus, "UNKNOWN");
  assert.notEqual(record.capability.classification, "INDEPENDENTLY_VERIFIED");
});
test("V3.4.1 existing opt-out and suppression state cannot be cleared by profile editing", async () => {
  const { service } = harness(),
    created = await service.create({
      user: admin,
      investor: { ...base, emailStatus: "OPTED_OUT", optOutAt: "2026-10-01" },
    }),
    updated = await service.update({
      user: admin,
      id: created.id,
      investor: { emailStatus: "PERMITTED", consentSource: "Accidental edit" },
    });
  assert.equal(updated.communication.emailStatus, "OPTED_OUT");
  assert.equal(updated.communication.optOutAt, "2026-10-01");
});
test("V3.4.1 duplicate import updates preserve existing opt-out suppression", async () => {
  const { service } = harness(),
    created = await service.create({
      user: admin,
      investor: { ...base, emailStatus: "OPTED_OUT", optOutAt: "2026-10-02" },
    }),
    headers = ["Full Name", "Email", "Relationship Notes"],
    rows = [
      {
        "Full Name": "Synthetic Buyer",
        Email: base.email,
        "Relationship Notes": "Imported update",
      },
    ],
    preview = await service.previewImport({ user: admin, headers, rows }),
    result = await service.commitImport({
      user: admin,
      headers,
      rows,
      mapping: preview.mapping,
      resolutions: { 0: { action: "UPDATE", investorId: created.id } },
      idempotencyKey: "preserve-opt-out",
    }),
    updated = await service.get({ user: admin, id: created.id });
  assert.equal(result.updated, 1);
  assert.equal(updated.communication.emailStatus, "OPTED_OUT");
  assert.equal(updated.communication.optOutAt, "2026-10-02");
});
test("V3.4.1 importer maps revised fields and flags ambiguous thresholds without guessing", async () => {
  const { service } = harness(),
    headers = [
      "First Name",
      "Last Name",
      "Email",
      "Property Type",
      "Investment Strategy",
      "Investment Threshold",
      "Preferred States",
      "Preferred Counties",
      "Purchase Method",
      "Proof of Funds Status",
    ],
    rows = [
      {
        "First Name": "Import",
        "Last Name": "Review",
        Email: "review@example.test",
        "Property Type": "Single Family",
        "Investment Strategy": "Buy & Hold",
        "Investment Threshold": "200K",
        "Preferred States": "CA",
        "Preferred Counties": "Kern",
        "Purchase Method": "Cash",
        "Proof of Funds Status": "Received",
      },
    ],
    mapping = suggestedMapping(headers),
    preview = await service.previewImport({
      user: admin,
      headers,
      rows,
      mapping,
    }),
    candidate = preview.preview[0].candidate;
  assert.equal(preview.preview[0].status, "NEEDS_REVIEW");
  assert.equal(candidate.criteria.minimumAcquisitionAmount, null);
  assert.equal(candidate.criteria.maximumAcquisitionAmount, null);
  assert.equal(candidate.criteria.originalBudgetCategory, "200K");
  assert.equal(candidate.criteria.fundingPreference, "CASH");
  assert.equal(candidate.capability.proofOfFundsStatus, "RECEIVED");
  assert.equal(
    candidate.importedHistory.sourceValues.investmentThreshold,
    "200K",
  );
});
test("V3.4.1 explicit imported ranges and multiple locations normalize deterministically", async () => {
  const { service } = harness(),
    headers = [
      "Full Name",
      "Email",
      "Investment Threshold",
      "Multiple Geographic Locations",
    ],
    preview = await service.previewImport({
      user: admin,
      headers,
      rows: [
        {
          "Full Name": "Range Buyer",
          Email: "range@example.test",
          "Investment Threshold": "200000-500000",
          "Multiple Geographic Locations": "Kern County, CA; AZ",
        },
      ],
    }),
    candidate = preview.preview[0].candidate;
  assert.equal(preview.preview[0].status, "VALID");
  assert.equal(candidate.criteria.minimumAcquisitionAmount, 200000);
  assert.equal(candidate.criteria.maximumAcquisitionAmount, 500000);
  assert.equal(candidate.criteria.geographies.length, 2);
});
test("V3.4.1 250-record synthetic import remains idempotent and organization-owned", async () => {
  const { repository, service } = harness(),
    headers = [
      "First Name",
      "Last Name",
      "Email",
      "Property Type",
      "Investment Strategy",
      "Investment Threshold",
      "Multiple Geographic Locations",
    ],
    rows = Array.from({ length: 250 }, (_, index) => ({
      "First Name": "Synthetic",
      "Last Name": `Investor ${index}`,
      Email: `synthetic-${index}@example.test`,
      "Property Type": index % 2 ? "Single Family" : "Multifamily",
      "Investment Strategy": index % 3 ? "Fix & Flip" : "Buy & Hold",
      "Investment Threshold": "200000-500000",
      "Multiple Geographic Locations": index % 2 ? "Kern County, CA" : "AZ",
    })),
    input = {
      user: admin,
      headers,
      rows,
      idempotencyKey: "v341-synthetic-250",
    },
    first = await service.commitImport(input),
    second = await service.commitImport(input);
  assert.equal(first.created, 250);
  assert.deepEqual(second, first);
  assert.ok(
    (await repository.listInvestors(organizationId)).every(
      (item) => item.organizationId === organizationId,
    ),
  );
});
test("V3.4.1 duplicates, Platform Administrator access and customer isolation remain enforced", async () => {
  const { service } = harness(),
    created = await service.create({ user: admin, investor: base });
  await assert.rejects(
    () =>
      service.create({
        user: admin,
        investor: { ...base, fullName: "Duplicate" },
      }),
    /POTENTIAL_DUPLICATE_INVESTOR/,
  );
  assert.equal(
    (await service.get({ user: platform, organizationId, id: created.id })).id,
    created.id,
  );
  await assert.rejects(
    () => service.list({ user: other, organizationId }),
    /ORGANIZATION_NOT_AUTHORIZED/,
  );
});
test("V3.4.1 intake UI exposes responsive, accessible sections and duplicate-submit protection", async () => {
  const source = await readFile(
      new URL(
        "../apps/web/src/features/investors/Investors.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
    css = await readFile(
      new URL(
        "../apps/web/src/features/investors/investor-intake.css",
        import.meta.url,
      ),
      "utf8",
    );
  for (const heading of [
    "Contact information",
    "Investment criteria",
    "Purchasing capability",
    "Communication &amp; relationship",
  ])
    assert.ok(source.includes(heading));
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-invalid=/);
  assert.match(source, /disabled=\{busy\}/);
  assert.match(source, /Saving…/);
  assert.match(source, /formatContactPhone\(event\.target\.value\)/);
  assert.match(source, /onBlur=\{\(\) => \{/);
  assert.match(source, /id="investor-email-error"/);
  assert.ok(source.includes("Discard the unsaved investor changes?"));
  assert.equal((source.match(/className="crm-label-text"/g) ?? []).length, 4);
  assert.equal((source.match(/aria-hidden="true"/g) ?? []).length >= 4, true);
  assert.match(css, /\.crm-label-text\s*\{[^}]*display:\s*inline-flex/s);
  assert.match(css, /@media\s*\(max-width:\s*560px\)/);
  assert.match(css, /grid-template-columns:\s*1fr/);
});
test("V3.4.1 campaign and report contracts remain present and unchanged in the workspace", async () => {
  const source = await readFile(
    new URL(
      "../apps/web/src/features/investors/Investors.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /\/api\/investor-crm\/campaigns/);
  assert.match(source, /Immutable report/);
  assert.match(source, /No email was sent/);
});
