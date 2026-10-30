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
import {
  addCalendarMonths,
  localToday,
  validateInvestorFields,
} from "../src/investor-crm/investor-field-validation.js";
import {
  filterMatchProperties,
  latestReportForProperty,
  latestScenarioForProperty,
  populateDealFromProperty,
} from "../apps/web/src/features/investors/deal-property-selection.js";

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
test("V3.4.1 structured investor fields reject invalid ranges, dates and contact choices", () => {
  const today = "2026-10-30";
  assert.equal(localToday(new Date("2026-10-30T12:00:00.000Z")), today);
  assert.equal(
    localToday(new Date("2026-10-31T05:30:00.000Z"), "America/Los_Angeles"),
    today,
  );
  for (const [input, field] of [
    [
      {
        ...base,
        proofOfFundsStatus: "RECEIVED",
        proofOfFundsExpirationDate: "2026-06-30",
      },
      "proofOfFundsExpirationDate",
    ],
    [
      {
        ...base,
        proofOfFundsStatus: "REVIEWED",
        proofOfFundsExpirationDate: "2026-12-31",
      },
      "proofOfFundsReviewDate",
    ],
    [{ ...base, typicalClosingDays: "10.5" }, "typicalClosingDays"],
    [{ ...base, typicalClosingDays: "366" }, "typicalClosingDays"],
    [{ ...base, streetAddress: "1 Main St" }, "city"],
    [
      {
        ...base,
        streetAddress: "1 Main St",
        city: "Bakersfield",
        state: "CA",
        zip: "9330",
      },
      "zip",
    ],
    [
      {
        ...base,
        emailStatus: "PERMITTED",
        consentSource: "",
      },
      "consentSource",
    ],
    [{ ...base, consentAt: "2026-10-31" }, "consentAt"],
    [{ ...base, status: "MAYBE_ACTIVE" }, "status"],
    [
      {
        firstName: "Phone Only",
        phone: "6615550101",
        preferredCommunication: "EMAIL",
      },
      "preferredCommunication",
    ],
  ])
    assert.ok(validateInvestorFields(input, { today })[field], field);
  assert.throws(
    () =>
      normalizeInvestor(
        {
          ...base,
          proofOfFundsStatus: "RECEIVED",
          proofOfFundsExpirationDate: "2026-06-30",
        },
        { today },
      ),
    /INVESTOR_PROOF_OF_FUNDS_EXPIRATION_DATE_INVALID/,
  );
});
test("V3.4.1 date defaults use calendar months without overflowing month ends", () => {
  assert.equal(addCalendarMonths("2026-10-30"), "2027-04-30");
  assert.equal(addCalendarMonths("2026-08-31"), "2027-02-28");
  assert.equal(addCalendarMonths("2027-08-31"), "2028-02-29");
  assert.equal(addCalendarMonths("not-a-date"), "");
});
test("V3.4.1 matching selects saved properties by address and hydrates exact saved values", () => {
  const properties = [
      {
        id: "property-active",
        organizationId,
        address: "603 Tyler St, Taft, CA 93268",
        addressComponents: { state: "CA" },
        sourceSubjectRef: "RESEARCH-TYLER",
        propertyType: "Single Family",
        lifecycleStatus: "SAVED_PROPERTY",
      },
      {
        id: "property-archived",
        organizationId,
        address: "100 Old St, Taft, CA 93268",
        sourceSubjectRef: "RESEARCH-OLD",
        lifecycleStatus: "ARCHIVED_PROPERTY",
      },
    ],
    scenarios = [
      {
        id: "scenario-tyler",
        propertyRef: "RESEARCH-TYLER",
        name: "Scenario 1",
        revision: 3,
        savedAt: "2026-10-29T10:00:00.000Z",
        financingMode: "CASH",
        evaluationMode: "WHOLESALE_CASH",
        inputs: {
          purchasePrice: "111000",
          rehabCost: "20000",
          exitValue: "176000",
        },
      },
      {
        id: "scenario-tyler",
        propertyRef: "RESEARCH-TYLER",
        name: "Scenario 1",
        revision: 4,
        savedAt: "2026-10-30T10:00:00.000Z",
        financingMode: "CASH",
        evaluationMode: "WHOLESALE_CASH",
        closingTimelineDays: 14,
        inputs: {
          purchasePrice: "112000",
          rehabCost: "21000",
          exitValue: "178000",
        },
      },
    ],
    evidenceProperties = [
      {
        durablePropertyId: "property-active",
        ref: "RESEARCH-TYLER",
        attributes: { county: "Kern County", propertyType: "Single Family" },
      },
    ],
    reports = [
      {
        id: "older-report",
        propertyId: "property-active",
        revision: 3,
        generatedAt: "2026-10-29T12:00:00.000Z",
      },
      {
        id: "latest-report",
        propertyId: "property-active",
        revision: 4,
        generatedAt: "2026-10-30T12:00:00.000Z",
      },
    ];
  assert.deepEqual(
    filterMatchProperties(properties, { search: "tyler", status: "SAVED_PROPERTY" }).map(
      (item) => item.id,
    ),
    ["property-active"],
  );
  assert.equal(
    latestScenarioForProperty(properties[0], scenarios).revision,
    4,
  );
  assert.deepEqual(
    populateDealFromProperty({
      property: properties[0],
      evidenceProperties,
      scenarios,
      current: { strategy: "FIX_AND_FLIP" },
    }),
    {
      strategy: "FIX_AND_FLIP",
      propertyId: "property-active",
      propertyAddress: "603 Tyler St, Taft, CA 93268",
      propertyType: "SF",
      state: "CA",
      county: "Kern County",
      fundingOrientation: "CASH",
      acquisitionPrice: "112000",
      rehabilitationEstimate: "21000",
      estimatedResale: "178000",
      closingTimelineDays: "14",
    },
  );
  assert.equal(latestReportForProperty(reports, "property-active").id, "latest-report");
});
test("V3.4.1 valid current and historical proof-of-funds chronology remains representable", () => {
  const today = "2026-10-30",
    active = normalizeInvestor(
      {
        ...base,
        typicalClosingDays: "10",
        proofOfFundsStatus: "REVIEWED",
        proofOfFundsReviewDate: "2026-10-29",
        proofOfFundsExpirationDate: "2026-12-31",
      },
      { today },
    ),
    expired = normalizeInvestor(
      {
        ...base,
        proofOfFundsStatus: "EXPIRED",
        proofOfFundsExpirationDate: "2026-06-30",
      },
      { today },
    );
  assert.equal(active.criteria.typicalClosingDays, 10);
  assert.equal(active.capability.proofOfFundsExpirationDate, "2026-12-31");
  assert.equal(expired.capability.proofOfFundsExpirationDate, "2026-06-30");
});
test("V3.4.1 service rejects invalid proof-of-funds chronology without changing the record", async () => {
  const { service } = harness(),
    created = await service.create({ user: admin, investor: base });
  await assert.rejects(
    () =>
      service.update({
        user: admin,
        id: created.id,
        investor: {
          proofOfFundsStatus: "RECEIVED",
          proofOfFundsExpirationDate: "2026-06-30",
        },
      }),
    /INVESTOR_PROOF_OF_FUNDS_EXPIRATION_DATE_INVALID/,
  );
  const restored = await service.get({ user: admin, id: created.id });
  assert.equal(restored.capability.proofOfFundsStatus, "NOT_REQUESTED");
  assert.equal(restored.capability.proofOfFundsExpirationDate, null);
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
  const upToFiveHundred = normalizeInvestor({
    ...base,
    budgetPreset: "UP_TO_500",
    minimumAcquisitionAmount: "",
    maximumAcquisitionAmount: 500000,
  });
  assert.equal(upToFiveHundred.criteria.minimumAcquisitionAmount, null);
  assert.equal(upToFiveHundred.criteria.maximumAcquisitionAmount, 500000);
  assert.match(
    matchInvestor(upToFiveHundred, {
      ...deal,
      acquisitionPrice: 150000,
    }).fit,
    /STRONG|POSSIBLE|NEEDS_REVIEW/,
  );
  assert.equal(
    validateInvestorFields({ ...base, budgetPreset: "CUSTOM" }).budget,
    "Enter a minimum budget, a maximum budget, or both.",
  );
  assert.throws(
    () => normalizeInvestor({ ...base, budgetPreset: "CUSTOM" }),
    /INVESTOR_BUDGET_INVALID/,
  );
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
  assert.ok(
    county.reasons.some((value) => /profile status is active/i.test(value)),
  );
  assert.ok(!county.missing.some((value) => /active-buying/i.test(value)));
  assert.ok(statewide.reasons.some((value) => /geography/.test(value)));
  assert.ok(unknown.missing.some((value) => /county/i.test(value)));
  assert.ok(!unknown.exclusions.some((value) => /location/i.test(value)));
});
test("V3.4.1 active cash buyer matches a lower-priced opportunity by buyer strategy", () => {
  const caleb = normalizeInvestor({
      firstName: "Caleb",
      lastName: "Williams",
      email: "caleb@example.test",
      status: "ACTIVE",
      propertyTypes: ["ANY"],
      strategies: ["FIX_AND_FLIP"],
      geographies: [
        { state: "CA", scope: "COUNTY", county: "Kern County" },
      ],
      maximumAcquisitionAmount: 500000,
      fundingPreference: "CASH",
      cashBuyer: "YES",
      emailStatus: "PERMITTED",
      consentSource: "Synthetic QA consent",
      consentAt: "2026-10-30",
    }),
    result = matchInvestor(caleb, {
      ...deal,
      propertyAddress: "603 Tyler St, Taft, CA 93268",
      strategy: "FIX_AND_FLIP",
      acquisitionPrice: 105000,
      rehabilitationEstimate: 20000,
      fundingOrientation: "CASH",
    });
  assert.notEqual(result.fit, "NOT_MATCHED");
  assert.equal(result.exclusions.length, 0);
  assert.ok(
    result.reasons.some((value) => /within the recorded range/i.test(value)),
  );
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
    ),
    directoryCss = await readFile(
      new URL(
        "../apps/web/src/features/investors/investors.css",
        import.meta.url,
      ),
      "utf8",
    ),
    matchingCss = await readFile(
      new URL(
        "../apps/web/src/features/investors/investor-matching.css",
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
  assert.match(source, /disabled=\{busy \|\| requiredFieldsMissing\}/);
  assert.match(source, /Saving…/);
  assert.doesNotMatch(source, /!confirm\(/);
  assert.match(source, /dialog\.confirm\(\{/);
  assert.match(source, /Discard unsaved investor changes\?/);
  assert.match(source, /className="crm-form-alert"/);
  assert.match(source, /Investor was not saved/);
  assert.match(source, /Another investor already uses this email address/);
  assert.match(source, /Email or telephone number already in use/);
  assert.match(source, /Create Separate Investor/);
  assert.match(source, /confirmPotentialDuplicate/);
  for (const tooltip of [
    "Review and edit this organization's private investor profiles",
    "Upload a CSV or XLSX file, review column mapping",
    "Compare a deal with saved investor criteria using deterministic rules",
    "Review prepared report distributions, delivery status",
    "Summarize observed campaign responses, offers, commitments and closings",
    "Create a private investor profile for this organization",
    "Private proof-of-funds documents are not included",
    "This does not send email",
  ])
    assert.ok(source.includes(tooltip), tooltip);
  assert.match(source, /errorSummaryRef\.current\?\.scrollIntoView/);
  assert.match(source, /formatContactPhone\(event\.target\.value\)/);
  assert.match(source, /onBlur=\{\(\) => \{/);
  assert.match(source, /id="investor-email-error"/);
  assert.match(source, /min=\{[\s\S]*proofOfFundsStatus/);
  assert.match(source, /max=\{today\}/);
  assert.match(source, /next === "REVIEWED" && !value\.proofOfFundsReviewDate/);
  assert.match(source, /addCalendarMonths\(reviewDate\)/);
  assert.match(source, /next === "PERMITTED" && !value\.consentAt/);
  assert.match(source, /max="365"/);
  assert.match(source, /maxLength=\{4000\}/);
  assert.ok(source.includes("Discard unsaved investor changes?"));
  assert.equal((source.match(/className="crm-label-text"/g) ?? []).length, 4);
  assert.equal((source.match(/aria-hidden="true"/g) ?? []).length >= 4, true);
  assert.match(css, /\.crm-label-text\s*\{[^}]*display:\s*inline-flex/s);
  assert.match(css, /\.crm-form-alert\s*\{/);
  assert.match(
    directoryCss,
    /\.crm-toolbar \.crm-search-field\{[^}]*flex:0 1 330px[^}]*gap:8px/,
  );
  assert.match(
    directoryCss,
    /\.crm-toolbar \.crm-search-field input,\.crm-toolbar \.crm-status-filter select\{width:100%/,
  );
  assert.match(source, /Investor status/);
  assert.match(source, /NON_RESPONSIVE/);
  assert.match(source, /INVESTOR_STATUS_HELP/);
  assert.match(directoryCss, /\.crm-investor-status\.non-responsive/);
  assert.match(source, /Search property address/);
  assert.match(source, /Active saved properties/);
  assert.match(source, /populateDealFromProperty/);
  assert.doesNotMatch(source, />\s*Property ID \*/);
  assert.match(matchingCss, /\.crm-report-field[\s\S]*gap:\s*8px/);
  assert.match(matchingCss, /\.crm-match-actions[\s\S]*gap:\s*28px/);
  assert.match(source, /Up to \$500,000/);
  assert.doesNotMatch(source, /\$200,000–\$500,000/);
  assert.match(source, /budgetPreset/);
  assert.match(source, /Do not leave both fields blank/);
  assert.match(source, /Buyer strategy sought/);
  assert.match(source, /dialogInvestorName/);
  assert.match(
    css,
    /\.crm-investor-dialog > header\s*\{[^}]*position:\s*sticky[^}]*top:\s*0/s,
  );
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
