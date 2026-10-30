import { randomBytes, randomUUID } from "node:crypto";
import { AccessDenied, ROLES } from "../auth/access-control.js";
import {
  CAMPAIGN_STATUSES,
  CONSENT_STATUSES,
  PIPELINE_STATUSES,
  RESPONSE_TYPES,
  formulaSafe,
  hash,
  normalizeInvestor,
  parseBudgetSource,
  publicInvestor,
  safeId,
  spreadsheetCell,
} from "./investor-contract.js";
import { matchInvestors } from "./matching.js";

const clone = (value) => (value == null ? value : structuredClone(value));
const now = (clock) => clock().toISOString();
const fail = (code, status = 422) => {
  throw Object.assign(new Error(code), { status });
};
const canView = (user) =>
  [
    ROLES.PLATFORM_ADMINISTRATOR,
    ROLES.ORGANIZATION_ADMINISTRATOR,
    ROLES.ANALYST,
  ].includes(user?.role);
const canManage = (user) =>
  [ROLES.PLATFORM_ADMINISTRATOR, ROLES.ORGANIZATION_ADMINISTRATOR].includes(
    user?.role,
  );
const organization = (user, requested) => {
  if (!user?.uid || !user.organizationId)
    throw new AccessDenied("AUTHENTICATION_REQUIRED", 401);
  if (!canView(user)) throw new AccessDenied("ROLE_NOT_AUTHORIZED");
  const target = safeId(requested ?? user.organizationId, "ORGANIZATION_ID");
  if (
    user.role !== ROLES.PLATFORM_ADMINISTRATOR &&
    target !== user.organizationId
  )
    throw new AccessDenied("ORGANIZATION_NOT_AUTHORIZED");
  return target;
};
const manager = (user, requested) => {
  const org = organization(user, requested);
  if (!canManage(user))
    throw new AccessDenied("INVESTOR_MANAGEMENT_NOT_AUTHORIZED");
  return org;
};
const deal = (input = {}) => {
  const amount = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const result = Number(value);
    return Number.isFinite(result) && result >= 0
      ? result
      : fail("CAMPAIGN_DEAL_AMOUNT_INVALID");
  };
  return {
    propertyId: safeId(input.propertyId, "PROPERTY_ID"),
    propertyRef: String(input.propertyRef ?? "").slice(0, 180),
    propertyAddress: String(input.propertyAddress ?? "")
      .trim()
      .slice(0, 300),
    propertyType: String(input.propertyType ?? "")
      .trim()
      .toUpperCase(),
    state: String(input.state ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 40),
    county: String(input.county ?? "")
      .trim()
      .slice(0, 100),
    strategy: String(input.strategy ?? "FIX_AND_FLIP")
      .trim()
      .toUpperCase(),
    acquisitionPrice: amount(input.acquisitionPrice),
    rehabilitationEstimate: amount(input.rehabilitationEstimate),
    estimatedResale: amount(input.estimatedResale),
    closingTimelineDays: amount(input.closingTimelineDays),
    fundingOrientation: String(input.fundingOrientation ?? "UNKNOWN")
      .trim()
      .toUpperCase(),
    coverPhotoUrl: null,
  };
};

const aliases = Object.freeze({
  firstName: ["first name", "firstname"],
  lastName: ["last name", "lastname"],
  fullName: ["full name", "name"],
  companyName: ["company", "company name"],
  streetAddress: ["street address", "address", "mailing address"],
  city: ["city"],
  state: ["state"],
  zip: ["zip", "postal code", "zipcode"],
  phone: ["phone", "telephone", "mobile", "phone number"],
  email: ["email", "email address"],
  investmentThreshold: ["investment threshold", "budget", "buying power"],
  minimumAcquisitionAmount: [
    "minimum acquisition",
    "minimum acquisition amount",
    "minimum budget",
    "min budget",
  ],
  maximumAcquisitionAmount: [
    "maximum acquisition",
    "maximum acquisition amount",
    "maximum budget",
    "max budget",
  ],
  propertyTypes: ["investment type", "property type", "sf / mf"],
  strategies: ["investment strategy", "strategies", "strategy"],
  locations: ["locations", "location", "preferred locations"],
  preferredStates: ["preferred states", "states", "target states"],
  preferredCounties: ["preferred counties", "counties", "target counties"],
  multipleGeographicLocations: [
    "multiple geographic locations",
    "geographic preferences",
    "target geographies",
  ],
  cashBuyer: ["cash buyer", "cash"],
  fundingPreference: ["purchase method", "funding preference", "financing"],
  proofOfFundsStatus: ["proof of funds status", "pof status", "proof of funds"],
  averageResponseFrequency: [
    "average response frequency",
    "response frequency",
  ],
  notes: ["notes", "relationship notes"],
});
export const suggestedMapping = (headers = []) => {
  const normalized = new Map(
    headers.map((header) => [String(header).trim().toLowerCase(), header]),
  );
  return Object.fromEntries(
    Object.entries(aliases)
      .map(([target, names]) => [
        target,
        names.map((name) => normalized.get(name)).find(Boolean),
      ])
      .filter(([, source]) => source),
  );
};
const mappedInvestor = (row, mapping) => {
  const value = (target) => {
    const source = mapping[target];
    return source ? spreadsheetCell(row[source]) : "";
  };
  const propertyType = value("propertyTypes").toUpperCase(),
    strategy = value("strategies").toUpperCase(),
    cash = value("cashBuyer").toUpperCase(),
    funding = value("fundingPreference").toUpperCase(),
    proof = value("proofOfFundsStatus").toUpperCase(),
    threshold = parseBudgetSource(value("investmentThreshold")),
    minimum = value("minimumAcquisitionAmount"),
    maximum = value("maximumAcquisitionAmount"),
    states = value("preferredStates"),
    counties = value("preferredCounties"),
    explicitLocations =
      value("multipleGeographicLocations") || value("locations"),
    combinedLocations =
      explicitLocations ||
      (states && counties && !/[;,|]/.test(states)
        ? counties
            .split(/[;|]/)
            .map(
              (county) =>
                `${county.trim().replace(/\s+County$/i, "")} County, ${states.trim()}`,
            )
            .join("; ")
        : [counties, states].filter(Boolean).join("; ")),
    sourceValues = Object.fromEntries(
      Object.entries(mapping)
        .map(([target, source]) => [
          target,
          source ? spreadsheetCell(row[source]) : "",
        ])
        .filter(([, source]) => source !== ""),
    );
  return normalizeInvestor({
    firstName: value("firstName"),
    lastName: value("lastName"),
    fullName: value("fullName"),
    companyName: value("companyName"),
    streetAddress: value("streetAddress"),
    city: value("city"),
    state: value("state"),
    zip: value("zip"),
    phone: value("phone"),
    email: value("email"),
    investmentThreshold: threshold.original,
    originalBudgetCategory: threshold.original,
    minimumAcquisitionAmount: minimum || threshold.minimum,
    maximumAcquisitionAmount: maximum || threshold.maximum,
    budgetInterpretation:
      minimum || maximum ? "RANGE" : threshold.interpretation,
    budgetNeedsReview: !minimum && !maximum && threshold.needsReview,
    propertyTypes: propertyType
      ? propertyType
          .split(/[;,/]/)
          .map((item) =>
            /^(SF|SFR|SINGLE FAMILY)$/.test(item.trim())
              ? "SF"
              : /^(MF|MULTI FAMILY|MULTIFAMILY)$/.test(item.trim())
                ? "MF"
                : /^(ANY|ALL)$/.test(item.trim())
                  ? "ANY"
                  : null,
          )
          .filter(Boolean)
      : [],
    strategies: strategy
      ? strategy
          .split(/[;,/]/)
          .map((item) =>
            /FIX\s*(?:&|AND)?\s*FLIP/.test(item.trim())
              ? "FIX_AND_FLIP"
              : /BUY\s*(?:&|AND)?\s*HOLD/.test(item.trim())
                ? "BUY_AND_HOLD"
                : /WHOLESALE/.test(item.trim())
                  ? "WHOLESALE"
                  : /^(ANY|ALL)$/.test(item.trim())
                    ? "ANY"
                    : null,
          )
          .filter(Boolean)
      : [],
    locations: combinedLocations,
    cashBuyer: /^(YES|Y|TRUE|CASH)$/.test(cash)
      ? "YES"
      : /^(NO|N|FALSE)$/.test(cash)
        ? "NO"
        : "UNKNOWN",
    fundingPreference: /BOTH|EITHER/.test(funding)
      ? "EITHER"
      : /CASH/.test(funding)
        ? "CASH"
        : /FINANC/.test(funding)
          ? "FINANCING"
          : "UNKNOWN",
    proofOfFundsStatus: /REVIEWED/.test(proof)
      ? "REVIEWED"
      : /RECEIVED/.test(proof)
        ? "RECEIVED"
        : /REQUESTED/.test(proof)
          ? "REQUESTED"
          : "NOT_REQUESTED",
    averageResponseFrequency: value("averageResponseFrequency"),
    notes: value("notes"),
    emailStatus: "UNKNOWN",
    importSourceLabel: "Investor spreadsheet import",
    importSourceValues: sourceValues,
  });
};
const duplicate = (candidate, existing) =>
  existing.filter(
    (item) =>
      (candidate.normalizedEmail &&
        item.normalizedEmail === candidate.normalizedEmail) ||
      (candidate.normalizedPhone &&
        item.normalizedPhone === candidate.normalizedPhone) ||
      (candidate.fullName &&
        item.fullName.toLowerCase() === candidate.fullName.toLowerCase() &&
        candidate.mailingAddress.street &&
        item.mailingAddress?.street?.toLowerCase() ===
          candidate.mailingAddress.street.toLowerCase()),
  );
const safeInvestor = (record) => {
  const copy = clone(record);
  if (copy.capability) delete copy.capability.proofOfFundsDocumentReferences;
  return copy;
};

export function createInvestorCrmService({
  repository,
  clock = () => new Date(),
  idFactory = randomUUID,
  tokenFactory = () => randomBytes(32).toString("base64url"),
  emailSender = null,
  publicOrigin = "https://worksidepropertyintelligence.netlify.app",
} = {}) {
  if (!repository) throw new Error("INVESTOR_REPOSITORY_REQUIRED");
  const audit = (org, row) =>
    repository.audit(org, {
      id: idFactory(),
      schemaVersion: 1,
      ...row,
      at: row.at ?? now(clock),
    });
  const activity = (org, row) => {
    const {
      id: _ignored,
      organizationId: _priorOrganization,
      ...safeRow
    } = row;
    return repository.createActivity(org, {
      ...safeRow,
      id: idFactory(),
      organizationId: org,
      schemaVersion: 1,
      at: row.at ?? now(clock),
    });
  };
  async function listWithMetrics(org) {
    const [records, activities] = await Promise.all([
      repository.listInvestors(org),
      repository.listActivities(org),
    ]);
    return records.map((record) =>
      publicInvestor(safeInvestor(record), activities),
    );
  }
  async function previewImport({
    user,
    organizationId,
    headers,
    rows,
    mapping,
  }) {
    const org = manager(user, organizationId);
    if (!Array.isArray(headers) || !Array.isArray(rows))
      fail("IMPORT_STRUCTURE_INVALID");
    if (rows.length < 1 || rows.length > 500) fail("IMPORT_ROW_LIMIT", 413);
    const cleanHeaders = headers.map((item) => spreadsheetCell(item));
    if (new Set(cleanHeaders).size !== cleanHeaders.length)
      fail("IMPORT_HEADERS_DUPLICATE");
    const selectedMapping =
      mapping && Object.keys(mapping).length
        ? mapping
        : suggestedMapping(cleanHeaders);
    if (
      !selectedMapping.email &&
      !selectedMapping.phone &&
      !selectedMapping.fullName &&
      !selectedMapping.firstName
    )
      fail("IMPORT_IDENTITY_MAPPING_REQUIRED");
    const existing = await repository.listInvestors(org),
      preview = rows.map((row, index) => {
        try {
          if (!row || typeof row !== "object" || Array.isArray(row))
            fail("IMPORT_ROW_INVALID");
          const candidate = mappedInvestor(row, selectedMapping),
            matches = duplicate(candidate, existing);
          const imported = candidate.importedHistory?.sourceValues ?? {};
          const needsReview =
            candidate.criteria?.budgetNeedsReview === true ||
            candidate.criteria?.geographies?.some((item) => item.needsReview) ||
            (Boolean(imported.propertyTypes) &&
              !candidate.criteria?.propertyTypes?.length) ||
            (Boolean(imported.strategies) &&
              !candidate.criteria?.strategies?.length);
          return {
            index,
            status: matches.length
              ? "POTENTIAL_DUPLICATE"
              : needsReview
                ? "NEEDS_REVIEW"
                : "VALID",
            candidate,
            matches: matches.map((item) => ({
              id: item.id,
              fullName: item.fullName,
              email: item.email,
              phone: item.phone,
            })),
          };
        } catch (error) {
          return { index, status: "INVALID", error: error.message };
        }
      }),
      summary = {
        total: rows.length,
        valid: preview.filter((item) => item.status === "VALID").length,
        invalid: preview.filter((item) => item.status === "INVALID").length,
        potentialDuplicates: preview.filter(
          (item) => item.status === "POTENTIAL_DUPLICATE",
        ).length,
        needsReview: preview.filter((item) => item.status === "NEEDS_REVIEW")
          .length,
      };
    await audit(org, {
      kind: "INVESTOR_IMPORT_PREVIEWED",
      actorUid: user.uid,
      summary,
    });
    return { organizationId: org, mapping: selectedMapping, preview, summary };
  }
  return {
    configuration: { outboundEmailEnabled: emailSender?.enabled === true },
    async bootstrap({ user, organizationId }) {
      const org = organization(user, organizationId),
        [investors, campaignRows, activities, templates] = await Promise.all([
          listWithMetrics(org),
          repository.listCampaigns(org),
          repository.listActivities(org),
          repository.listTemplates(org),
        ]);
      const campaigns = await Promise.all(
        campaignRows.map(async (campaign) => ({
          ...campaign,
          recipients: await repository.listRecipients(org, campaign.id),
        })),
      );
      if (
        user.role === ROLES.PLATFORM_ADMINISTRATOR &&
        org !== user.organizationId
      )
        await audit(org, {
          kind: "PLATFORM_ADMIN_INVESTOR_WORKSPACE_ACCESSED",
          actorUid: user.uid,
          investorCount: investors.length,
          campaignCount: campaigns.length,
        });
      return {
        organizationId: org,
        canManage: canManage(user),
        outboundEmailEnabled: emailSender?.enabled === true,
        investors,
        campaigns,
        activities,
        templates,
        dashboard: velocity(campaigns, activities),
      };
    },
    async list({ user, organizationId }) {
      return listWithMetrics(organization(user, organizationId));
    },
    async get({ user, organizationId, id }) {
      const org = organization(user, organizationId),
        record = await repository.getInvestor(org, safeId(id, "INVESTOR_ID"));
      if (!record) fail("INVESTOR_NOT_FOUND", 404);
      const activities = await repository.listActivities(org, {
        investorId: record.id,
      });
      if (
        user.role === ROLES.PLATFORM_ADMINISTRATOR &&
        org !== user.organizationId
      )
        await audit(org, {
          kind: "PLATFORM_ADMIN_INVESTOR_ACCESSED",
          actorUid: user.uid,
          investorId: record.id,
        });
      return publicInvestor(safeInvestor(record), activities);
    },
    async create({ user, organizationId, investor }) {
      const org = manager(user, organizationId),
        clean = normalizeInvestor(investor),
        existing = await repository.listInvestors(org),
        matches = duplicate(clean, existing);
      if (matches.length)
        throw Object.assign(new Error("POTENTIAL_DUPLICATE_INVESTOR"), {
          status: 409,
          matches: matches.map((item) => ({
            id: item.id,
            fullName: item.fullName,
            email: item.email,
            phone: item.phone,
          })),
        });
      const at = now(clock);
      if (
        clean.communication.emailStatus === "PERMITTED" &&
        !clean.communication.consentAt
      )
        clean.communication.consentAt = at.slice(0, 10);
      if (
        clean.communication.emailStatus === "OPTED_OUT" &&
        !clean.communication.optOutAt
      )
        clean.communication.optOutAt = at.slice(0, 10);
      const record = {
        id: idFactory(),
        organizationId: org,
        schemaVersion: 1,
        ...clean,
        createdAt: at,
        updatedAt: at,
        createdBy: user.uid,
        updatedBy: user.uid,
      };
      await repository.createInvestor(org, record);
      await audit(org, {
        kind: "INVESTOR_CREATED",
        actorUid: user.uid,
        investorId: record.id,
      });
      return safeInvestor(record);
    },
    async update({ user, organizationId, id, investor }) {
      const org = manager(user, organizationId),
        investorId = safeId(id, "INVESTOR_ID"),
        prior = await repository.getInvestor(org, investorId);
      if (!prior) fail("INVESTOR_NOT_FOUND", 404);
      const clean = normalizeInvestor(
          { ...prior, ...investor },
          { allowMissingContact: !prior.email && !prior.phone },
        ),
        conflicts = duplicate(
          clean,
          (await repository.listInvestors(org)).filter(
            (item) => item.id !== investorId,
          ),
        );
      if (conflicts.length)
        throw Object.assign(new Error("POTENTIAL_DUPLICATE_INVESTOR"), {
          status: 409,
          matches: conflicts.map((item) => ({
            id: item.id,
            fullName: item.fullName,
            email: item.email,
            phone: item.phone,
          })),
        });
      if (
        ["OPTED_OUT", "SUPPRESSED"].includes(prior.communication?.emailStatus)
      )
        clean.communication = {
          ...clean.communication,
          emailStatus: prior.communication.emailStatus,
          optOutAt: prior.communication.optOutAt,
          suppressionReason: prior.communication.suppressionReason,
        };
      else {
        if (
          clean.communication.emailStatus === "PERMITTED" &&
          !clean.communication.consentAt
        )
          clean.communication.consentAt = now(clock).slice(0, 10);
        if (
          clean.communication.emailStatus === "OPTED_OUT" &&
          !clean.communication.optOutAt
        )
          clean.communication.optOutAt = now(clock).slice(0, 10);
      }
      const next = await repository.updateInvestor(org, investorId, {
        ...clean,
        updatedAt: now(clock),
        updatedBy: user.uid,
      });
      await audit(org, {
        kind: "INVESTOR_UPDATED",
        actorUid: user.uid,
        investorId,
      });
      return safeInvestor(next);
    },
    async archive({ user, organizationId, id, archived = true }) {
      return this.update({
        user,
        organizationId,
        id,
        investor: { status: archived ? "ARCHIVED" : "ACTIVE" },
      });
    },
    async merge({ user, organizationId, targetId, sourceId }) {
      const org = manager(user, organizationId),
        target = await repository.getInvestor(
          org,
          safeId(targetId, "TARGET_INVESTOR_ID"),
        ),
        source = await repository.getInvestor(
          org,
          safeId(sourceId, "SOURCE_INVESTOR_ID"),
        );
      if (!target || !source || target.id === source.id)
        fail("INVESTOR_MERGE_INVALID", 409);
      const sourceActivities = await repository.listActivities(org, {
        investorId: source.id,
      });
      for (const item of sourceActivities)
        await activity(org, {
          ...item,
          id: undefined,
          investorId: target.id,
          mergedFromInvestorId: source.id,
        });
      await repository.updateInvestor(org, source.id, {
        status: "ARCHIVED",
        mergedIntoInvestorId: target.id,
        updatedAt: now(clock),
        updatedBy: user.uid,
      });
      await audit(org, {
        kind: "INVESTORS_MERGED",
        actorUid: user.uid,
        targetInvestorId: target.id,
        sourceInvestorId: source.id,
      });
      return this.get({ user, organizationId: org, id: target.id });
    },
    previewImport,
    async commitImport({
      user,
      organizationId,
      headers,
      rows,
      mapping,
      resolutions = {},
      idempotencyKey,
    }) {
      const org = manager(user, organizationId),
        requestId = safeId(idempotencyKey, "IMPORT_IDEMPOTENCY_KEY"),
        runId = hash(`${org}|${requestId}`),
        prior = await repository.getImport(org, runId);
      if (prior?.status === "COMPLETED") return prior.result;
      const preview = await previewImport({
          user,
          organizationId: org,
          headers,
          rows,
          mapping,
        }),
        summary = {
          rowsProcessed: preview.summary.total,
          created: 0,
          updated: 0,
          skipped: 0,
          needsReview: 0,
        };
      for (const item of preview.preview) {
        if (item.status === "INVALID") {
          summary.needsReview++;
          continue;
        }
        if (item.status === "NEEDS_REVIEW") summary.needsReview++;
        const resolution =
          resolutions[item.index] ??
          (item.matches?.length ? { action: "SKIP" } : { action: "CREATE" });
        if (resolution.action === "SKIP") {
          summary.skipped++;
          continue;
        }
        if (resolution.action === "UPDATE") {
          const target = item.matches.find(
            (match) => match.id === resolution.investorId,
          );
          if (!target) fail("IMPORT_DUPLICATE_RESOLUTION_INVALID");
          const priorInvestor = await repository.getInvestor(org, target.id),
            candidate = clone(item.candidate);
          if (
            ["OPTED_OUT", "SUPPRESSED"].includes(
              priorInvestor?.communication?.emailStatus,
            )
          )
            candidate.communication = {
              ...candidate.communication,
              emailStatus: priorInvestor.communication.emailStatus,
              optOutAt: priorInvestor.communication.optOutAt,
              suppressionReason: priorInvestor.communication.suppressionReason,
            };
          await repository.updateInvestor(org, target.id, {
            ...candidate,
            updatedAt: now(clock),
            updatedBy: user.uid,
          });
          summary.updated++;
          continue;
        }
        const at = now(clock),
          record = {
            id: hash(`${runId}|${item.index}`).slice(0, 40),
            organizationId: org,
            schemaVersion: 1,
            ...item.candidate,
            createdAt: at,
            updatedAt: at,
            createdBy: user.uid,
            updatedBy: user.uid,
            importRunId: runId,
          };
        try {
          await repository.createInvestor(org, record);
          summary.created++;
        } catch (error) {
          if (error?.message !== "INVESTOR_EXISTS" && error?.code !== 6)
            throw error;
          summary.skipped++;
        }
      }
      const result = { importId: runId, ...summary },
        record = {
          id: runId,
          organizationId: org,
          schemaVersion: 1,
          status: "COMPLETED",
          idempotencyKey: requestId,
          mapping: preview.mapping,
          result,
          createdBy: user.uid,
          createdAt: now(clock),
        };
      await repository.saveImport(org, record);
      await audit(org, {
        kind: "INVESTOR_IMPORT_COMMITTED",
        actorUid: user.uid,
        importId: runId,
        summary,
      });
      return result;
    },
    async saveTemplate({ user, organizationId, name, mapping }) {
      const org = manager(user, organizationId),
        record = {
          id: hash(`${String(name).toLowerCase()}|${user.uid}`).slice(0, 32),
          organizationId: org,
          name: String(name).trim().slice(0, 100),
          mapping: clone(mapping),
          updatedAt: now(clock),
          updatedBy: user.uid,
        };
      if (!record.name) fail("IMPORT_TEMPLATE_NAME_REQUIRED");
      await repository.saveTemplate(org, record);
      await audit(org, {
        kind: "INVESTOR_IMPORT_TEMPLATE_SAVED",
        actorUid: user.uid,
        templateId: record.id,
      });
      return record;
    },
    async exportCsv({ user, organizationId }) {
      const org = manager(user, organizationId),
        records = await repository.listInvestors(org),
        quote = (value) => `"${formulaSafe(value).replaceAll('"', '""')}"`,
        headers = [
          "Investor ID",
          "First Name",
          "Last Name",
          "Full Name",
          "Company",
          "Email",
          "Phone",
          "Status",
          "Property Types",
          "Strategies",
          "Minimum Acquisition",
          "Maximum Acquisition",
          "Locations",
          "Purchase Method",
          "Proof of Funds",
          "Email Permission",
        ];
      const lines = [
        headers.map(quote).join(","),
        ...records.map((record) =>
          [
            record.id,
            record.firstName,
            record.lastName,
            record.fullName,
            record.companyName,
            record.email,
            record.phone,
            record.status,
            record.criteria?.propertyTypes?.join("; "),
            record.criteria?.strategies?.join("; "),
            record.criteria?.minimumAcquisitionAmount,
            record.criteria?.maximumAcquisitionAmount,
            record.criteria?.geographies
              ?.map((item) => item.original)
              .join("; "),
            record.criteria?.fundingPreference,
            record.capability?.proofOfFundsStatus,
            record.communication?.emailStatus,
          ]
            .map(quote)
            .join(","),
        ),
      ];
      await audit(org, {
        kind: "INVESTOR_DIRECTORY_EXPORTED",
        actorUid: user.uid,
        recordCount: records.length,
      });
      return lines.join("\r\n");
    },
    async match({ user, organizationId, deal: input }) {
      const org = organization(user, organizationId),
        trustedDeal = deal(input),
        investors = await repository.listInvestors(org),
        results = matchInvestors(investors.map(safeInvestor), trustedDeal);
      await audit(org, {
        kind: "INVESTOR_MATCHING_REVIEWED",
        actorUid: user.uid,
        propertyId: trustedDeal.propertyId,
        investorCount: results.length,
      });
      return { deal: trustedDeal, results };
    },
    async createCampaign({
      user,
      organizationId,
      report,
      deal: input,
      investorIds = [],
      expiresAt,
    }) {
      const org = manager(user, organizationId),
        trustedDeal = deal(input),
        reportId = safeId(report?.id, "REPORT_ID"),
        scenarioId = safeId(report?.scenarioId, "SCENARIO_ID"),
        revision = Number(report?.revision);
      if (!Number.isInteger(revision) || revision < 1)
        fail("REPORT_REVISION_INVALID");
      const all = await repository.listInvestors(org),
        matches = matchInvestors(all, trustedDeal),
        selected = [
          ...new Set(investorIds.map((id) => safeId(id, "INVESTOR_ID"))),
        ],
        unavailable = selected.filter(
          (id) => !all.some((item) => item.id === id),
        );
      if (unavailable.length) fail("CAMPAIGN_INVESTOR_NOT_FOUND", 404);
      const at = now(clock),
        record = {
          id: idFactory(),
          organizationId: org,
          schemaVersion: 1,
          propertyId: trustedDeal.propertyId,
          scenarioId,
          scenarioRevision: revision,
          reportId,
          reportRevision: revision,
          reportFilename: String(
            report.filename ?? "Investor Package.pdf",
          ).slice(0, 180),
          reportStorageSha256: report.storage?.sha256 ?? null,
          deal: trustedDeal,
          investorIds: selected,
          matchSnapshot: matches.map(({ investor, ...result }) => ({
            investorId: investor.id,
            ...result,
          })),
          status: selected.length ? "READY" : "DRAFT",
          createdBy: user.uid,
          createdAt: at,
          updatedAt: at,
          distributedAt: null,
          expiresAt:
            expiresAt && Number.isFinite(Date.parse(expiresAt))
              ? new Date(expiresAt).toISOString()
              : new Date(clock().getTime() + 14 * 86_400_000).toISOString(),
        };
      await repository.createCampaign(org, record);
      for (const investorId of selected) {
        const match = matches.find((item) => item.investor.id === investorId);
        await repository.putRecipient(org, {
          id: hash(`${record.id}|${investorId}`),
          organizationId: org,
          campaignId: record.id,
          investorId,
          reportId,
          match: match
            ? {
                fit: match.fit,
                reasons: match.reasons,
                missing: match.missing,
                exclusions: match.exclusions,
              }
            : null,
          deliveryStatus: "NOT_SENT",
          suppressionStatus: "NOT_EVALUATED",
          responseStatus: null,
          pipelineStatus: "MATCHED",
          createdAt: at,
        });
      }
      await audit(org, {
        kind: "DEAL_CAMPAIGN_CREATED",
        actorUid: user.uid,
        campaignId: record.id,
        reportId,
        recipients: selected.length,
      });
      return record;
    },
    async campaigns({ user, organizationId }) {
      const org = organization(user, organizationId),
        campaigns = await repository.listCampaigns(org);
      return Promise.all(
        campaigns.map(async (campaign) => ({
          ...campaign,
          recipients: await repository.listRecipients(org, campaign.id),
        })),
      );
    },
    async dispatch({
      user,
      organizationId,
      campaignId,
      idempotencyKey,
      confirmed,
    }) {
      const org = manager(user, organizationId),
        id = safeId(campaignId, "CAMPAIGN_ID"),
        key = safeId(idempotencyKey, "CAMPAIGN_IDEMPOTENCY_KEY"),
        campaign = await repository.getCampaign(org, id);
      if (!campaign) fail("CAMPAIGN_NOT_FOUND", 404);
      if (confirmed !== true) fail("CAMPAIGN_CONFIRMATION_REQUIRED", 409);
      if (
        campaign.dispatchKey === key &&
        ["ACTIVE", "COMPLETED"].includes(campaign.status)
      )
        return {
          campaign,
          recipients: await repository.listRecipients(org, id),
          duplicate: true,
        };
      if (campaign.dispatchKey && campaign.dispatchKey !== key)
        fail("CAMPAIGN_ALREADY_DISPATCHED", 409);
      if (!emailSender?.enabled)
        fail("INVESTOR_EMAIL_DELIVERY_NOT_CONFIGURED", 503);
      const recipients = await repository.listRecipients(org, id),
        investors = new Map(
          (await repository.listInvestors(org)).map((item) => [item.id, item]),
        );
      await repository.updateCampaign(org, id, {
        status: "SENDING",
        dispatchKey: key,
        updatedAt: now(clock),
      });
      const results = [];
      for (const recipient of recipients.slice(0, 100)) {
        if (recipient.deliveryStatus === "PROVIDER_ACCEPTED") {
          results.push(recipient);
          continue;
        }
        const investor = investors.get(recipient.investorId),
          suppressed =
            !investor ||
            investor.status !== "ACTIVE" ||
            investor.communication?.emailStatus !== "PERMITTED" ||
            investor.communication?.bounceStatus === "HARD" ||
            !investor.email;
        if (suppressed) {
          const updated = await repository.putRecipient(org, {
            ...recipient,
            deliveryStatus: "SUPPRESSED",
            suppressionStatus: "SUPPRESSED",
            updatedAt: now(clock),
          });
          results.push(updated);
          continue;
        }
        const token = tokenFactory(),
          tokenHash = hash(token),
          access = {
            tokenHash,
            organizationId: org,
            campaignId: id,
            recipientId: recipient.id,
            investorId: investor.id,
            reportId: campaign.reportId,
            reportFilename: campaign.reportFilename,
            reportStorageSha256: campaign.reportStorageSha256,
            createdAt: now(clock),
            expiresAt: campaign.expiresAt,
            status: "ACTIVE",
            accessCount: 0,
          };
        await repository.saveAccess(access);
        try {
          const link = `${publicOrigin}/#deal-access?token=${encodeURIComponent(token)}`,
            accepted = await emailSender.send({
              to: investor.email,
              subject: `${campaign.deal.propertyAddress} — preliminary investor package`,
              html: campaignEmail({ investor, campaign, link }),
              idempotencyKey: `${id}:${investor.id}`,
            }),
            updated = await repository.putRecipient(org, {
              ...recipient,
              deliveryStatus: "PROVIDER_ACCEPTED",
              suppressionStatus: "CLEAR",
              providerMessageId: accepted.id ?? null,
              deliveryAuthorizedAt: now(clock),
              deliveredAt: null,
              pipelineStatus: "CONTACTED",
              updatedAt: now(clock),
            });
          await activity(org, {
            kind: "CAMPAIGN_SENT",
            campaignId: id,
            investorId: investor.id,
            pipelineStatus: "CONTACTED",
            actorUid: user.uid,
          });
          results.push(updated);
        } catch (error) {
          await repository.updateAccess(tokenHash, {
            status: "REVOKED",
            revokedAt: now(clock),
            reason: "DELIVERY_FAILED",
          });
          results.push(
            await repository.putRecipient(org, {
              ...recipient,
              deliveryStatus: "PROVIDER_FAILED",
              providerError: String(error.message).slice(0, 200),
              updatedAt: now(clock),
            }),
          );
        }
      }
      const accepted = results.filter(
          (item) => item.deliveryStatus === "PROVIDER_ACCEPTED",
        ).length,
        at = now(clock),
        next = await repository.updateCampaign(org, id, {
          status: accepted ? "ACTIVE" : "READY",
          distributedAt: accepted ? at : null,
          updatedAt: at,
        });
      await audit(org, {
        kind: "DEAL_CAMPAIGN_DISPATCHED",
        actorUid: user.uid,
        campaignId: id,
        providerAccepted: accepted,
        failed: results.filter(
          (item) => item.deliveryStatus === "PROVIDER_FAILED",
        ).length,
        suppressed: results.filter(
          (item) => item.deliveryStatus === "SUPPRESSED",
        ).length,
      });
      return { campaign: next, recipients: results, duplicate: false };
    },
    async transition({
      user,
      organizationId,
      campaignId,
      investorId,
      status,
      withdrawalReason,
      note,
      offerAmount,
      closingTimelineDays,
    }) {
      const org = manager(user, organizationId),
        campaign = await repository.getCampaign(
          org,
          safeId(campaignId, "CAMPAIGN_ID"),
        ),
        investor = await repository.getInvestor(
          org,
          safeId(investorId, "INVESTOR_ID"),
        ),
        nextStatus = String(status ?? "").toUpperCase();
      if (!campaign || !investor) fail("PIPELINE_RECORD_NOT_FOUND", 404);
      if (!PIPELINE_STATUSES.includes(nextStatus))
        fail("PIPELINE_STATUS_INVALID");
      const recipient = (
        await repository.listRecipients(org, campaign.id)
      ).find((item) => item.investorId === investor.id);
      if (!recipient) fail("CAMPAIGN_RECIPIENT_NOT_FOUND", 404);
      const at = now(clock),
        updated = await repository.putRecipient(org, {
          ...recipient,
          pipelineStatus: nextStatus,
          updatedAt: at,
        });
      await activity(org, {
        kind: "PIPELINE_STATUS_CHANGED",
        campaignId: campaign.id,
        investorId: investor.id,
        pipelineStatus: nextStatus,
        withdrawalReason:
          nextStatus === "WITHDRAWN"
            ? String(withdrawalReason ?? "REASON_NOT_PROVIDED").slice(0, 120)
            : null,
        note: String(note ?? "").slice(0, 1_000),
        offerAmount: Number.isFinite(Number(offerAmount))
          ? Number(offerAmount)
          : null,
        closingTimelineDays: Number.isFinite(Number(closingTimelineDays))
          ? Number(closingTimelineDays)
          : null,
        actorUid: user.uid,
        at,
      });
      await audit(org, {
        kind: "INVESTOR_PIPELINE_UPDATED",
        actorUid: user.uid,
        campaignId: campaign.id,
        investorId: investor.id,
        status: nextStatus,
      });
      return updated;
    },
    async revokeAccess({ user, organizationId, tokenHash }) {
      const org = manager(user, organizationId),
        access = await repository.getAccess(safeId(tokenHash, "TOKEN_HASH"));
      if (!access || access.organizationId !== org)
        fail("REPORT_ACCESS_NOT_FOUND", 404);
      const updated = await repository.updateAccess(access.tokenHash, {
        status: "REVOKED",
        revokedAt: now(clock),
        revokedBy: user.uid,
      });
      await audit(org, {
        kind: "INVESTOR_REPORT_ACCESS_REVOKED",
        actorUid: user.uid,
        campaignId: access.campaignId,
        investorId: access.investorId,
      });
      return updated;
    },
    async authorizeToken(token, { auditAccess = true } = {}) {
      const tokenHash = hash(String(token ?? "")),
        access = await repository.getAccess(tokenHash);
      if (!access) fail("INVESTOR_REPORT_ACCESS_INVALID", 404);
      if (access.status === "REVOKED")
        fail("INVESTOR_REPORT_ACCESS_REVOKED", 410);
      if (Date.parse(access.expiresAt) <= clock().getTime())
        fail("INVESTOR_REPORT_ACCESS_EXPIRED", 410);
      const [campaign, investor, recipient] = await Promise.all([
        repository.getCampaign(access.organizationId, access.campaignId),
        repository.getInvestor(access.organizationId, access.investorId),
        repository.getRecipient(access.organizationId, access.recipientId),
      ]);
      if (
        !campaign ||
        !investor ||
        !recipient ||
        campaign.reportId !== access.reportId
      )
        fail("INVESTOR_REPORT_ACCESS_INVALID", 404);
      if (
        investor.communication?.emailStatus === "OPTED_OUT" ||
        investor.status === "DO_NOT_CONTACT"
      )
        fail("INVESTOR_REPORT_ACCESS_REVOKED", 410);
      if (auditAccess) {
        await repository.updateAccess(tokenHash, {
          accessCount: Number(access.accessCount ?? 0) + 1,
          lastAccessedAt: now(clock),
        });
        await audit(access.organizationId, {
          kind: "INVESTOR_REPORT_ACCESSED",
          actorUid: "investor-recipient",
          campaignId: campaign.id,
          investorId: investor.id,
        });
      }
      return {
        access,
        campaign,
        investorRecord: investor,
        investor: {
          fullName: investor.fullName,
          companyName: investor.companyName,
        },
        recipient,
      };
    },
    async respond({
      token,
      responseType,
      message,
      offerAmount,
      closingTimelineDays,
    }) {
      const authorized = await this.authorizeToken(token),
        type = String(responseType ?? "").toUpperCase();
      if (!RESPONSE_TYPES.includes(type)) fail("INVESTOR_RESPONSE_INVALID");
      const status = {
          INTERESTED: "INTERESTED",
          SHOWING_REQUESTED: "SHOWING_REQUESTED",
          MORE_INFORMATION: "INTERESTED",
          NOT_INTERESTED: "DECLINED",
          OFFER_SUBMITTED: "OFFER_SUBMITTED",
        }[type],
        at = now(clock);
      await repository.putRecipient(authorized.access.organizationId, {
        ...authorized.recipient,
        responseStatus: type,
        pipelineStatus: status,
        respondedAt: at,
        updatedAt: at,
      });
      await activity(authorized.access.organizationId, {
        kind: "RESPONSE_RECORDED",
        campaignId: authorized.campaign.id,
        investorId: authorized.access.investorId,
        responseType: type,
        pipelineStatus: status,
        message: String(message ?? "").slice(0, 1_000),
        offerAmount: Number.isFinite(Number(offerAmount))
          ? Number(offerAmount)
          : null,
        closingTimelineDays: Number.isFinite(Number(closingTimelineDays))
          ? Number(closingTimelineDays)
          : null,
        actorUid: "investor-recipient",
        at,
      });
      await audit(authorized.access.organizationId, {
        kind: "INVESTOR_RESPONSE_RECORDED",
        actorUid: "investor-recipient",
        campaignId: authorized.campaign.id,
        investorId: authorized.access.investorId,
        responseType: type,
      });
      return { recorded: true, responseType: type, at };
    },
    async unsubscribe({ token }) {
      const authorized = await this.authorizeToken(token, {
          auditAccess: false,
        }),
        at = now(clock);
      await repository.updateInvestor(
        authorized.access.organizationId,
        authorized.access.investorId,
        {
          communication: {
            ...authorized.investorRecord.communication,
            emailStatus: "OPTED_OUT",
            optOutAt: at.slice(0, 10),
            suppressionReason: "Investor unsubscribe request",
          },
          updatedAt: at,
          updatedBy: "investor-recipient",
        },
      );
      await repository.updateAccess(authorized.access.tokenHash, {
        status: "REVOKED",
        revokedAt: at,
        reason: "UNSUBSCRIBED",
      });
      await activity(authorized.access.organizationId, {
        kind: "INVESTOR_UNSUBSCRIBED",
        campaignId: authorized.campaign.id,
        investorId: authorized.access.investorId,
        actorUid: "investor-recipient",
        at,
      });
      return { unsubscribed: true, at };
    },
  };
}

function velocity(campaigns, activities) {
  const responseEvents = activities.filter(
      (item) => item.kind === "RESPONSE_RECORDED",
    ),
    offerEvents = activities.filter(
      (item) => item.pipelineStatus === "OFFER_SUBMITTED",
    ),
    commitments = activities.filter(
      (item) => item.pipelineStatus === "COMMITTED",
    ),
    elapsed = (event) => {
      const campaign = campaigns.find((item) => item.id === event.campaignId);
      return campaign?.distributedAt
        ? Date.parse(event.at) - Date.parse(campaign.distributedAt)
        : null;
    },
    average = (events) => {
      const values = events
        .map(elapsed)
        .filter((value) => Number.isFinite(value) && value >= 0);
      return values.length
        ? Math.round(
            values.reduce((sum, value) => sum + value, 0) / values.length,
          )
        : null;
    };
  return {
    activeCampaigns: campaigns.filter((item) => item.status === "ACTIVE")
      .length,
    matchedInvestors: campaigns.reduce(
      (sum, item) => sum + (item.investorIds?.length ?? 0),
      0,
    ),
    interestedInvestors: responseEvents.filter(
      (item) => item.pipelineStatus === "INTERESTED",
    ).length,
    offersReceived: offerEvents.length,
    commitments: commitments.length,
    closedDeals: activities.filter((item) => item.pipelineStatus === "CLOSED")
      .length,
    withdrawals: activities.filter(
      (item) => item.pipelineStatus === "WITHDRAWN",
    ).length,
    averageFirstResponseMs: average(responseEvents),
    averageFirstOfferMs: average(offerEvents),
    averageCommitmentMs: average(commitments),
  };
}

function campaignEmail({ investor, campaign, link }) {
  const html = (value) =>
      formulaSafe(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;"),
    money = (value) =>
      value == null
        ? "Not established"
        : new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(value);
  const spread =
    campaign.deal.estimatedResale != null &&
    campaign.deal.acquisitionPrice != null &&
    campaign.deal.rehabilitationEstimate != null
      ? campaign.deal.estimatedResale -
        campaign.deal.acquisitionPrice -
        campaign.deal.rehabilitationEstimate
      : null;
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0b3441"><h1>Property Intelligence</h1><p>Hello ${html(investor.firstName || investor.fullName || "Investor")},</p><h2>${html(campaign.deal.propertyAddress)}</h2><ul><li>Investor purchase price: ${money(campaign.deal.acquisitionPrice)}</li><li>Rehabilitation estimate: ${money(campaign.deal.rehabilitationEstimate)}</li><li>Estimated resale: ${money(campaign.deal.estimatedResale)}</li><li>Potential gross spread: ${money(spread)}</li></ul><p>This is preliminary information and may contain incomplete or unverified data. Conduct independent due diligence before making an investment decision.</p><p><a href="${link}">Securely view the Investor Package and respond</a></p><p>Workside Software, LLC · Property Intelligence</p><p><a href="${link}&action=unsubscribe">Unsubscribe</a></p></body></html>`;
}
