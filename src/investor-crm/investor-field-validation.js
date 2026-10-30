import {
  contactEmailError,
  contactPhoneError,
  normalizeContactEmail,
} from "./contact-validation.js";
import { US_GEOGRAPHY } from "./us-geography.js";

const STATE_VALUES = new Set(
  US_GEOGRAPHY.flatMap((item) => [item.code, item.name.toUpperCase()]),
);
const PROPERTY_TYPES = new Set(["SF", "MF", "ANY"]);
const STRATEGIES = new Set([
  "FIX_AND_FLIP",
  "BUY_AND_HOLD",
  "WHOLESALE",
  "ANY",
]);
const FUNDING = new Set(["CASH", "FINANCING", "EITHER", "UNKNOWN"]);
const PROOF_STATUSES = new Set([
  "NOT_REQUESTED",
  "REQUESTED",
  "RECEIVED",
  "REVIEWED",
  "EXPIRED",
  "REJECTED",
]);
const EMAIL_STATUSES = new Set([
  "UNKNOWN",
  "PERMITTED",
  "OPTED_OUT",
  "SUPPRESSED",
]);
const CONTACT_METHODS = new Set(["EMAIL", "PHONE", "SMS", "NONE"]);

const value = (input, direct, nested, nestedKey = direct) =>
  input[direct] ?? input[nested]?.[nestedKey] ?? "";
const text = (input, direct, nested, nestedKey = direct) =>
  String(value(input, direct, nested, nestedKey) ?? "");
const validDate = (input) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const parsed = new Date(`${input}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === input
  );
};
const tooLong = (errors, key, input, maximum, label) => {
  if (String(input ?? "").length > maximum)
    errors[key] =
      `${label} cannot exceed ${maximum.toLocaleString()} characters.`;
};
const invalidChoice = (input, allowed) =>
  input !== "" && input !== undefined && input !== null && !allowed.has(input);
const selected = (input, direct, nested) => {
  const candidate = input[direct] ?? input[nested]?.[direct];
  return Array.isArray(candidate) ? candidate : candidate ? [candidate] : [];
};

export const localToday = (now = new Date(), timeZone = "") => {
  if (timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export const addCalendarMonths = (input, months = 6) => {
  if (!validDate(input) || !Number.isInteger(months)) return "";
  const [year, month, day] = input.split("-").map(Number),
    target = new Date(Date.UTC(year, month - 1 + months, 1)),
    targetYear = target.getUTCFullYear(),
    targetMonth = target.getUTCMonth(),
    lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate(),
    targetDay = Math.min(day, lastDay);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
};

export function validateInvestorFields(
  input = {},
  { today = localToday() } = {},
) {
  const errors = {},
    firstName = text(input, "firstName"),
    lastName = text(input, "lastName"),
    fullName = text(input, "fullName"),
    companyName = text(input, "companyName"),
    email = text(input, "email"),
    phone = text(input, "phone"),
    street = text(input, "streetAddress", "mailingAddress", "street"),
    city = text(input, "city", "mailingAddress"),
    state = text(input, "state", "mailingAddress").toUpperCase(),
    zip = text(input, "zip", "mailingAddress"),
    minimum = value(input, "minimumAcquisitionAmount", "criteria"),
    maximum = value(input, "maximumAcquisitionAmount", "criteria"),
    closingDays = value(input, "typicalClosingDays", "criteria"),
    proofStatus =
      text(input, "proofOfFundsStatus", "capability") || "NOT_REQUESTED",
    reviewDate = text(input, "proofOfFundsReviewDate", "capability"),
    expirationDate = text(input, "proofOfFundsExpirationDate", "capability"),
    emailStatus = text(input, "emailStatus", "communication") || "UNKNOWN",
    consentSource = text(input, "consentSource", "communication"),
    consentAt = text(input, "consentAt", "communication"),
    preferredCommunication = text(input, "preferredCommunication") || "NONE",
    notes = text(input, "notes"),
    mailingStarted = Boolean(street || city || state || zip);

  tooLong(errors, "firstName", firstName, 80, "First name");
  tooLong(errors, "lastName", lastName, 80, "Last name");
  tooLong(errors, "fullName", fullName, 160, "Full name");
  tooLong(errors, "companyName", companyName, 160, "Company name");
  tooLong(errors, "streetAddress", street, 180, "Street address");
  tooLong(errors, "city", city, 100, "City");
  tooLong(errors, "zip", zip, 10, "ZIP code");
  tooLong(errors, "consentSource", consentSource, 300, "Consent source");
  tooLong(errors, "notes", notes, 4_000, "Relationship notes");

  const emailMessage = contactEmailError(email),
    phoneMessage = contactPhoneError(phone);
  if (emailMessage) errors.email = emailMessage;
  if (phoneMessage) errors.phone = phoneMessage;

  if (mailingStarted) {
    if (!street) errors.streetAddress = "Enter the mailing street address.";
    if (!city) errors.city = "Enter the mailing city.";
    if (!state) errors.state = "Select the mailing state.";
    else if (!STATE_VALUES.has(state))
      errors.state = "Select a valid U.S. state or territory.";
    if (!zip) errors.zip = "Enter the mailing ZIP code.";
    else if (!/^\d{5}(?:-\d{4})?$/.test(zip))
      errors.zip = "Use a 5-digit ZIP code or ZIP+4.";
  }

  for (const [key, amount, label] of [
    ["minimumAcquisitionAmount", minimum, "Minimum budget"],
    ["maximumAcquisitionAmount", maximum, "Maximum budget"],
  ]) {
    if (amount !== "" && amount !== null && amount !== undefined) {
      const parsed = Number(amount);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000_000)
        errors.budget = `${label} must be between $0 and $1 billion.`;
    }
  }
  if (
    !errors.budget &&
    minimum !== "" &&
    minimum !== null &&
    minimum !== undefined &&
    maximum !== "" &&
    maximum !== null &&
    maximum !== undefined &&
    Number(minimum) > Number(maximum)
  )
    errors.budget = "Minimum budget cannot exceed maximum budget.";

  const propertyTypes = selected(input, "propertyTypes", "criteria"),
    strategies = selected(input, "strategies", "criteria");
  if (
    propertyTypes.some(
      (item) => !PROPERTY_TYPES.has(String(item).toUpperCase()),
    )
  )
    errors.propertyTypes = "Select a valid property type.";
  if (strategies.some((item) => !STRATEGIES.has(String(item).toUpperCase())))
    errors.strategies = "Select a valid investment strategy.";
  if (
    invalidChoice(
      value(input, "fundingPreference", "criteria") || "UNKNOWN",
      FUNDING,
    )
  )
    errors.fundingPreference = "Select a valid purchase method.";
  if (invalidChoice(proofStatus, PROOF_STATUSES))
    errors.proofOfFundsStatus = "Select a valid proof-of-funds status.";

  if (closingDays !== "" && closingDays !== null && closingDays !== undefined) {
    const parsed = Number(closingDays);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365)
      errors.typicalClosingDays =
        "Closing timeframe must be a whole number from 1 to 365 days.";
  }

  if (reviewDate && !validDate(reviewDate))
    errors.proofOfFundsReviewDate = "Enter a valid review date.";
  else if (reviewDate > today)
    errors.proofOfFundsReviewDate = "Review date cannot be in the future.";
  if (proofStatus === "REVIEWED" && !reviewDate)
    errors.proofOfFundsReviewDate =
      "Enter the date the proof of funds was reviewed.";
  if (reviewDate && !["REVIEWED", "REJECTED", "EXPIRED"].includes(proofStatus))
    errors.proofOfFundsReviewDate =
      "A review date requires Reviewed, Rejected or Expired status.";

  if (expirationDate && !validDate(expirationDate))
    errors.proofOfFundsExpirationDate = "Enter a valid expiration date.";
  else if (
    expirationDate &&
    ["RECEIVED", "REVIEWED"].includes(proofStatus) &&
    expirationDate < today
  )
    errors.proofOfFundsExpirationDate =
      "Active proof of funds cannot have an expiration date before today.";
  if (proofStatus === "EXPIRED") {
    if (!expirationDate)
      errors.proofOfFundsExpirationDate =
        "Enter the date the proof of funds expired.";
    else if (expirationDate > today)
      errors.proofOfFundsExpirationDate =
        "Expired proof of funds cannot have a future expiration date.";
  } else if (expirationDate && !["RECEIVED", "REVIEWED"].includes(proofStatus))
    errors.proofOfFundsExpirationDate =
      "An expiration date requires Received, Reviewed or Expired status.";
  if (reviewDate && expirationDate && expirationDate < reviewDate)
    errors.proofOfFundsExpirationDate =
      "Expiration date cannot be earlier than the review date.";

  if (invalidChoice(emailStatus, EMAIL_STATUSES))
    errors.emailStatus = "Select a valid email permission status.";
  if (consentAt && !validDate(consentAt))
    errors.consentAt = "Enter a valid consent date.";
  else if (consentAt > today)
    errors.consentAt = "Consent date cannot be in the future.";
  if (emailStatus === "PERMITTED") {
    if (!normalizeContactEmail(email))
      errors.email = "A valid email address is required for email permission.";
    if (!consentSource.trim())
      errors.consentSource = "Record how email permission was obtained.";
  }
  if (invalidChoice(preferredCommunication, CONTACT_METHODS))
    errors.preferredCommunication = "Select a valid contact method.";
  else if (preferredCommunication === "EMAIL" && !normalizeContactEmail(email))
    errors.preferredCommunication =
      "Add an email address or choose another contact method.";
  else if (["PHONE", "SMS"].includes(preferredCommunication) && !phone)
    errors.preferredCommunication =
      "Add a telephone number or choose another contact method.";

  return errors;
}

export const investorValidationCode = (field) =>
  `INVESTOR_${String(field)
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toUpperCase()}_INVALID`;
