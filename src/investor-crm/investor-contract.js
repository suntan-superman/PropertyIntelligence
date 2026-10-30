import { createHash } from "node:crypto";

export const INVESTOR_STATUSES = Object.freeze([
  "ACTIVE",
  "INACTIVE",
  "DO_NOT_CONTACT",
  "ARCHIVED",
]);
export const CONSENT_STATUSES = Object.freeze([
  "UNKNOWN",
  "PERMITTED",
  "OPTED_OUT",
  "SUPPRESSED",
]);
export const PROPERTY_TYPES = Object.freeze(["SF", "MF", "ANY"]);
export const INVESTMENT_STRATEGIES = Object.freeze([
  "FIX_AND_FLIP",
  "BUY_AND_HOLD",
  "WHOLESALE",
  "ANY",
]);
export const PROOF_OF_FUNDS_STATUSES = Object.freeze([
  "NOT_REQUESTED",
  "REQUESTED",
  "RECEIVED",
  "REVIEWED",
  "EXPIRED",
  "REJECTED",
]);
export const CAMPAIGN_STATUSES = Object.freeze([
  "DRAFT",
  "READY",
  "SENDING",
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "CANCELLED",
]);
export const PIPELINE_STATUSES = Object.freeze([
  "MATCHED",
  "CONTACTED",
  "INTERESTED",
  "SHOWING_REQUESTED",
  "OFFER_SUBMITTED",
  "COMMITTED",
  "CLOSED",
  "DECLINED",
  "WITHDRAWN",
  "NO_RESPONSE",
  "EXPIRED",
]);
export const RESPONSE_TYPES = Object.freeze([
  "INTERESTED",
  "SHOWING_REQUESTED",
  "MORE_INFORMATION",
  "NOT_INTERESTED",
  "OFFER_SUBMITTED",
]);

export const hash = (value) =>
  createHash("sha256").update(String(value)).digest("hex");
export const clean = (value, maximum = 500) =>
  String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maximum);
export const safeId = (value, label = "ID") => {
  const result = clean(value, 128);
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(result))
    throw Object.assign(new Error(`${label}_INVALID`), { status: 422 });
  return result;
};
export const normalizeEmail = (value) => clean(value, 254).toLowerCase();
export const normalizePhone = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
};
export const validEmail = (value) =>
  !value || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
export const formulaSafe = (value) => {
  const result = clean(value, 2_000);
  return /^[=+\-@]/.test(result) ? `'${result}` : result;
};
export const canonicalName = (value = {}) =>
  clean(value.fullName || `${value.firstName ?? ""} ${value.lastName ?? ""}`, 160);

const oneOf = (value, values, fallback) =>
  values.includes(String(value ?? "").toUpperCase())
    ? String(value).toUpperCase()
    : fallback;
const number = (value, label) => {
  if (value === "" || value === null || value === undefined) return null;
  const result = Number(String(value).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(result) || result < 0 || result > 1_000_000_000)
    throw Object.assign(new Error(`${label}_INVALID`), { status: 422 });
  return Math.round(result * 100) / 100;
};
const date = (value) => {
  const result = clean(value, 40);
  return result && Number.isFinite(Date.parse(result)) ? result.slice(0, 10) : null;
};

export function normalizeGeographies(value) {
  const items = Array.isArray(value)
    ? value
    : String(value ?? "").split(/[;|]/);
  return items
    .map((item) => {
      if (typeof item === "object" && item) {
        return {
          state: clean(item.state, 40).toUpperCase(),
          county: clean(item.county, 100),
          original: clean(item.original || `${item.county ?? ""}, ${item.state ?? ""}`, 160),
          needsReview: item.needsReview === true,
        };
      }
      const original = clean(item, 160);
      const parts = original.split(",").map((part) => part.trim());
      if (!original) return null;
      const county = /county/i.test(parts[0] ?? "") ? parts[0] : "";
      const state = clean(parts.at(-1), 40).toUpperCase();
      return {
        state: /^[A-Z]{2}$/.test(state) ? state : "",
        county,
        original,
        needsReview: !county && !/^[A-Z]{2}$/.test(state),
      };
    })
    .filter(Boolean)
    .slice(0, 50);
}

export function normalizeInvestor(input = {}, { partial = false } = {}) {
  const email = normalizeEmail(input.email),
    phone = normalizePhone(input.phone ?? input.telephone),
    fullName = canonicalName(input);
  if (!partial && !fullName)
    throw Object.assign(new Error("INVESTOR_NAME_REQUIRED"), { status: 422 });
  if (!validEmail(email))
    throw Object.assign(new Error("INVESTOR_EMAIL_INVALID"), { status: 422 });
  if (phone && (phone.length < 7 || phone.length > 15))
    throw Object.assign(new Error("INVESTOR_PHONE_INVALID"), { status: 422 });
  const array = (value) => Array.isArray(value) ? value : value ? String(value).split(/[;,|]/) : [],
    minimum = number(input.minimumAcquisitionAmount ?? input.criteria?.minimumAcquisitionAmount, "INVESTOR_MINIMUM_BUDGET"),
    maximum = number(input.maximumAcquisitionAmount ?? input.criteria?.maximumAcquisitionAmount, "INVESTOR_MAXIMUM_BUDGET");
  if (minimum !== null && maximum !== null && minimum > maximum)
    throw Object.assign(new Error("INVESTOR_BUDGET_RANGE_INVALID"), { status: 422 });
  return {
    firstName: clean(input.firstName, 80),
    lastName: clean(input.lastName, 80),
    fullName,
    companyName: clean(input.companyName ?? input.company, 160),
    mailingAddress: {
      street: clean(input.mailingAddress?.street ?? input.streetAddress, 180),
      city: clean(input.mailingAddress?.city ?? input.city, 100),
      state: clean(input.mailingAddress?.state ?? input.state, 40).toUpperCase(),
      zip: clean(input.mailingAddress?.zip ?? input.zip, 20),
    },
    phone,
    normalizedPhone: phone,
    email,
    normalizedEmail: email,
    preferredCommunication: oneOf(
      input.preferredCommunication,
      ["EMAIL", "PHONE", "SMS", "NONE"],
      "EMAIL",
    ),
    relationshipOwner: clean(input.relationshipOwner, 128),
    notes: clean(input.notes, 4_000),
    status: oneOf(input.status, INVESTOR_STATUSES, "ACTIVE"),
    criteria: {
      propertyTypes: [...new Set(array(input.criteria?.propertyTypes ?? input.propertyTypes)
        .map((item) => oneOf(item, PROPERTY_TYPES, null))
        .filter(Boolean))],
      strategies: [...new Set(array(input.criteria?.strategies ?? input.strategies)
        .map((item) => oneOf(item, INVESTMENT_STRATEGIES, null))
        .filter(Boolean))],
      minimumAcquisitionAmount: minimum,
      maximumAcquisitionAmount: maximum,
      originalBudgetCategory: clean(input.originalBudgetCategory ?? input.investmentThreshold ?? input.criteria?.originalBudgetCategory, 100),
      budgetInterpretation: oneOf(
        input.budgetInterpretation ?? input.criteria?.budgetInterpretation,
        ["MINIMUM", "MAXIMUM", "APPROXIMATE", "UNREVIEWED"],
        "UNREVIEWED",
      ),
      geographies: normalizeGeographies(input.criteria?.geographies ?? input.geographies ?? input.locations),
      maximumRehabilitationBudget: number(input.maximumRehabilitationBudget ?? input.criteria?.maximumRehabilitationBudget, "INVESTOR_REHAB_BUDGET"),
      preferredProjectType: clean(input.preferredProjectType ?? input.criteria?.preferredProjectType, 100),
      typicalClosingDays: number(input.typicalClosingDays ?? input.criteria?.typicalClosingDays, "INVESTOR_CLOSING_DAYS"),
      fundingPreference: oneOf(input.fundingPreference ?? input.criteria?.fundingPreference, ["CASH", "FINANCING", "EITHER", "UNKNOWN"], "UNKNOWN"),
      activelyBuying: oneOf(input.activelyBuying ?? input.criteria?.activelyBuying, ["YES", "NO", "UNKNOWN"], "UNKNOWN"),
    },
    capability: {
      classification: oneOf(
        input.capability?.classification ?? input.capabilityClassification,
        ["SELF_REPORTED", "DOCUMENTATION_RECEIVED", "DOCUMENTATION_REVIEWED", "INDEPENDENTLY_VERIFIED", "UNKNOWN"],
        "UNKNOWN",
      ),
      selfReportedCapacity: number(input.selfReportedCapacity ?? input.capability?.selfReportedCapacity, "INVESTOR_CAPACITY"),
      cashBuyer: oneOf(input.cashBuyer ?? input.capability?.cashBuyer, ["YES", "NO", "UNKNOWN"], "UNKNOWN"),
      financingAvailable: oneOf(input.financingAvailable ?? input.capability?.financingAvailable, ["YES", "NO", "UNKNOWN"], "UNKNOWN"),
      proofOfFundsStatus: oneOf(input.proofOfFundsStatus ?? input.capability?.proofOfFundsStatus, PROOF_OF_FUNDS_STATUSES, "NOT_REQUESTED"),
      proofOfFundsReviewDate: date(input.proofOfFundsReviewDate ?? input.capability?.proofOfFundsReviewDate),
      proofOfFundsExpirationDate: date(input.proofOfFundsExpirationDate ?? input.capability?.proofOfFundsExpirationDate),
      reviewedBy: clean(input.reviewedBy ?? input.capability?.reviewedBy, 128),
      notes: clean(input.capabilityNotes ?? input.capability?.notes, 2_000),
      proofOfFundsDocumentReferences: array(input.proofOfFundsDocumentReferences ?? input.capability?.proofOfFundsDocumentReferences)
        .map((item) => clean(item, 128)).filter(Boolean).slice(0, 20),
    },
    communication: {
      emailStatus: oneOf(input.emailStatus ?? input.communication?.emailStatus, CONSENT_STATUSES, "UNKNOWN"),
      smsStatus: oneOf(input.smsStatus ?? input.communication?.smsStatus, CONSENT_STATUSES, "UNKNOWN"),
      consentSource: clean(input.consentSource ?? input.sourceOfContact ?? input.communication?.consentSource, 300),
      consentAt: date(input.consentAt ?? input.communication?.consentAt),
      optOutAt: date(input.optOutAt ?? input.communication?.optOutAt),
      suppressionReason: clean(input.suppressionReason ?? input.communication?.suppressionReason, 500),
      bounceStatus: oneOf(input.bounceStatus ?? input.communication?.bounceStatus, ["NONE", "SOFT", "HARD"], "NONE"),
      lastContactAt: clean(input.lastContactAt ?? input.communication?.lastContactAt, 40) || null,
    },
    importedHistory: {
      typicalResponseFrequency: clean(input.typicalResponseFrequency ?? input.averageResponseFrequency ?? input.importedHistory?.typicalResponseFrequency, 120),
      closingCount: number(input.importedClosingCount ?? input.importedHistory?.closingCount, "INVESTOR_IMPORTED_CLOSINGS"),
      withdrawalCount: number(input.importedWithdrawalCount ?? input.importedHistory?.withdrawalCount, "INVESTOR_IMPORTED_WITHDRAWALS"),
      sourceLabel: clean(input.importSourceLabel ?? input.importedHistory?.sourceLabel, 120),
    },
  };
}

export function publicInvestor(record, activities = []) {
  const observed = activities.filter((item) => item.investorId === record.id),
    responses = observed.filter((item) => item.kind === "RESPONSE_RECORDED"),
    offers = observed.filter((item) => item.pipelineStatus === "OFFER_SUBMITTED"),
    closings = observed.filter((item) => item.pipelineStatus === "CLOSED"),
    withdrawals = observed.filter((item) => item.pipelineStatus === "WITHDRAWN"),
    contacted = observed.filter((item) => item.kind === "CAMPAIGN_SENT"),
    responseTimes = responses
      .map((response) => {
        const prior = contacted
          .filter((event) => event.campaignId === response.campaignId)
          .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
        return prior ? Date.parse(response.at) - Date.parse(prior.at) : null;
      })
      .filter((value) => Number.isFinite(value) && value >= 0);
  return {
    ...structuredClone(record),
    metrics: {
      dealsReceived: contacted.length,
      observedResponses: responses.length,
      responseRate: contacted.length ? responses.length / contacted.length : null,
      averageResponseMs: responseTimes.length
        ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
        : null,
      lastResponseAt: responses.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]?.at ?? null,
      offers: offers.length,
      closings: closings.length,
      withdrawals: withdrawals.length,
    },
  };
}

export function spreadsheetCell(value) {
  const text = clean(value, 2_000);
  if (/^[=+\-@]/.test(text))
    throw Object.assign(new Error("SPREADSHEET_FORMULA_NOT_ALLOWED"), { status: 422 });
  return text;
}
