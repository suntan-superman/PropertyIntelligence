import React from "react";
import { useAuthentication } from "../../auth/AuthenticationGate.jsx";
import { useNotificationDialog } from "../../components/NotificationDialog.jsx";
import { ProductNav } from "../desktop-shell/Shell.jsx";
import {
  US_STATES,
  countiesForState,
} from "../../../../../src/investor-crm/us-geography.js";
import {
  contactEmailError,
  contactPhoneError,
  formatContactPhone,
  normalizeContactEmail,
} from "../../../../../src/investor-crm/contact-validation.js";
import {
  addCalendarMonths,
  localToday,
  validateInvestorFields,
} from "../../../../../src/investor-crm/investor-field-validation.js";
import "./investors.css";
import "./investor-intake.css";
import "./pipeline.css";

const emptyInvestor = {
  firstName: "",
  lastName: "",
  fullName: "",
  companyName: "",
  email: "",
  phone: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  propertyTypes: [],
  strategies: [],
  geographies: [],
  minimumAcquisitionAmount: "",
  maximumAcquisitionAmount: "",
  budgetNeedsReview: false,
  budgetInterpretation: "UNREVIEWED",
  fundingPreference: "UNKNOWN",
  cashBuyer: "UNKNOWN",
  financingAvailable: "UNKNOWN",
  typicalClosingDays: "",
  proofOfFundsStatus: "NOT_REQUESTED",
  proofOfFundsReviewDate: "",
  proofOfFundsExpirationDate: "",
  emailStatus: "UNKNOWN",
  consentSource: "",
  consentAt: "",
  preferredCommunication: "NONE",
  notes: "",
};
const errorText = (value) =>
  String(value ?? "Request failed.")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
const investorSaveError = (value) => {
  const code = String(value ?? "");
  if (code === "POTENTIAL_DUPLICATE_INVESTOR")
    return "Another investor already uses this email address or telephone number. Review the existing investor before creating a duplicate.";
  if (code === "INVESTOR_EMAIL_INVALID")
    return "Enter a valid email address, or remove it and provide a valid telephone number.";
  if (code === "INVESTOR_PHONE_INVALID")
    return "Enter a valid telephone number, or remove it and provide a valid email address.";
  if (code.includes("PROOF_OF_FUNDS"))
    return "Review the proof-of-funds status and dates. The review date cannot be in the future, and an active expiration date cannot be before today or the review date.";
  if (code === "INVESTOR_GEOGRAPHY_INVALID")
    return "Review the preferred location. Select a valid state and a county that belongs to that state.";
  if (code === "INVESTOR_BUDGET_RANGE_INVALID")
    return "Review the acquisition budget. The minimum amount cannot exceed the maximum amount.";
  return errorText(code || "INVESTOR_REQUEST_FAILED");
};
const INVESTOR_TAB_HELP = {
  Directory:
    "Review and edit this organization's private investor profiles, buying criteria, contact permissions and observed activity.",
  Import:
    "Upload a CSV or XLSX file, review column mapping and potential duplicates, then choose whether to create or update investor records.",
  Matching:
    "Compare a deal with saved investor criteria using deterministic rules. This does not recommend an investor or send a message.",
  Campaigns:
    "Review prepared report distributions, delivery status and each recipient's observed pipeline activity.",
  "Deal velocity":
    "Summarize observed campaign responses, offers, commitments and closings without estimating missing history.",
};
const money = (value) =>
  value == null
    ? "Not established"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
const when = (value) => (value ? new Date(value).toLocaleString() : "Not yet");
const labels = {
  SF: "Single Family",
  MF: "Multifamily",
  ANY: "Any",
  FIX_AND_FLIP: "Fix & Flip",
  BUY_AND_HOLD: "Buy & Hold",
  WHOLESALE: "Wholesale",
  UNKNOWN: "Unknown",
  CASH: "Cash",
  FINANCING: "Financed",
  EITHER: "Both",
  NOT_REQUESTED: "Not provided",
  REQUESTED: "Requested",
  RECEIVED: "Received",
  REVIEWED: "Reviewed",
  EXPIRED: "Expired",
  REJECTED: "Rejected",
  PERMITTED: "Permitted",
  OPTED_OUT: "Opted out",
  SUPPRESSED: "Suppressed",
  EMAIL: "Email",
  PHONE: "Phone",
  SMS: "Text message",
  NONE: "No preference",
};
const display = (value) =>
  labels[value] ??
  String(value ?? "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
const locationLabel = (item) =>
  item.needsReview
    ? item.original || "Location needs review"
    : item.scope === "STATEWIDE"
      ? `${US_STATES.find((state) => state.code === item.state)?.name ?? item.state} — Statewide`
      : `${item.county}, ${item.state}`;
const budgetLabel = (criteria) =>
  criteria?.minimumAcquisitionAmount == null &&
  criteria?.maximumAcquisitionAmount == null
    ? "Not specified"
    : criteria.minimumAcquisitionAmount == null
      ? `Up to ${money(criteria.maximumAcquisitionAmount)}`
      : criteria.maximumAcquisitionAmount == null
        ? `${money(criteria.minimumAcquisitionAmount)}+`
        : `${money(criteria.minimumAcquisitionAmount)}–${money(criteria.maximumAcquisitionAmount)}`;
const formFromInvestor = (item) => ({
  ...emptyInvestor,
  ...item,
  streetAddress: item.mailingAddress?.street ?? "",
  city: item.mailingAddress?.city ?? "",
  state: item.mailingAddress?.state ?? "",
  zip: item.mailingAddress?.zip ?? "",
  phone: formatContactPhone(item.phone),
  propertyTypes: item.criteria?.propertyTypes ?? [],
  strategies: item.criteria?.strategies ?? [],
  geographies: item.criteria?.geographies ?? [],
  minimumAcquisitionAmount: item.criteria?.minimumAcquisitionAmount ?? "",
  maximumAcquisitionAmount: item.criteria?.maximumAcquisitionAmount ?? "",
  budgetNeedsReview: item.criteria?.budgetNeedsReview ?? false,
  budgetInterpretation: item.criteria?.budgetInterpretation ?? "UNREVIEWED",
  fundingPreference: item.criteria?.fundingPreference ?? "UNKNOWN",
  typicalClosingDays: item.criteria?.typicalClosingDays ?? "",
  cashBuyer: item.capability?.cashBuyer ?? "UNKNOWN",
  proofOfFundsStatus: item.capability?.proofOfFundsStatus ?? "NOT_REQUESTED",
  proofOfFundsReviewDate: item.capability?.proofOfFundsReviewDate ?? "",
  proofOfFundsExpirationDate: item.capability?.proofOfFundsExpirationDate ?? "",
  emailStatus: item.communication?.emailStatus ?? "UNKNOWN",
  consentSource: item.communication?.consentSource ?? "",
  consentAt: item.communication?.consentAt ?? "",
  preferredCommunication: item.preferredCommunication ?? "NONE",
});
function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i],
      next = text[i + 1];
    if (c === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (c === '"') quoted = !quoted;
    else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  const headers = rows.shift()?.map((value) => value.trim()) ?? [];
  return {
    headers,
    rows: rows.map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""]),
      ),
    ),
  };
}
async function readImport(file) {
  if (!file) throw new Error("Select a CSV or XLSX file.");
  if (file.size > 5_000_000)
    throw new Error("Import files are limited to 5 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") return parseCsv(await file.text());
  if (extension !== "xlsx") throw new Error("Use a CSV or XLSX file.");
  const { default: ExcelJS } = await import("exceljs"),
    workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  if (workbook.worksheets.length !== 1)
    throw new Error("XLSX imports must contain one worksheet.");
  const sheet = workbook.worksheets[0],
    matrix = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    matrix.push(
      row.values.slice(1).map((value) => {
        if (
          value &&
          typeof value === "object" &&
          ("formula" in value ||
            "hyperlink" in value ||
            "sharedFormula" in value)
        )
          throw new Error(
            "Formulas, links and external references are not allowed.",
          );
        return value?.text ?? value?.result ?? value ?? "";
      }),
    );
  });
  const headers = (matrix.shift() ?? []).map(String);
  if (matrix.length > 500) throw new Error("Imports are limited to 500 rows.");
  return {
    headers,
    rows: matrix.map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, String(values[index] ?? "")]),
      ),
    ),
  };
}

export default function Investors() {
  const auth = useAuthentication(),
    dialog = useNotificationDialog(),
    params = new URLSearchParams(location.hash.split("?")[1] ?? ""),
    organizationId = params.get("organization") || auth.user.organizationId,
    [tab, setTab] = React.useState("Directory"),
    [data, setData] = React.useState(null),
    [busy, setBusy] = React.useState(false),
    [notice, setNotice] = React.useState(""),
    [search, setSearch] = React.useState(""),
    [editing, setEditing] = React.useState(null),
    [form, setForm] = React.useState({ ...emptyInvestor }),
    [importData, setImportData] = React.useState(null),
    [preview, setPreview] = React.useState(null),
    [reports, setReports] = React.useState([]),
    [deal, setDeal] = React.useState({
      propertyId: "",
      propertyAddress: "",
      propertyType: "SF",
      state: "CA",
      county: "",
      strategy: "FIX_AND_FLIP",
      acquisitionPrice: "",
      rehabilitationEstimate: "",
      estimatedResale: "",
      closingTimelineDays: "",
      fundingOrientation: "UNKNOWN",
    }),
    [matches, setMatches] = React.useState(null),
    [selected, setSelected] = React.useState([]),
    [reportId, setReportId] = React.useState("");
  const query = `?organizationId=${encodeURIComponent(organizationId)}`;
  const api = React.useCallback(
    async (path, options = {}) => {
      const response = await fetch(path, {
          credentials: "same-origin",
          ...options,
          headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            "X-PI-CSRF": auth.csrfToken,
            ...options.headers,
          },
        }),
        value = await response.json().catch(() => ({}));
      if (!response.ok)
        throw Object.assign(
          new Error(value.error || "INVESTOR_REQUEST_FAILED"),
          { response: value, status: response.status },
        );
      return value;
    },
    [auth.csrfToken],
  );
  const load = React.useCallback(async () => {
    setBusy(true);
    try {
      const [value, reportValue] = await Promise.all([
        api(`/api/investor-crm/bootstrap${query}`),
        api("/api/commercial/reports"),
      ]);
      setData(value);
      setReports(
        (reportValue.reports ?? []).filter(
          (item) =>
            item.organizationId == null ||
            item.organizationId === organizationId,
        ),
      );
      setNotice("");
    } catch (error) {
      setNotice(errorText(error.message));
    } finally {
      setBusy(false);
    }
  }, [organizationId, api]);
  React.useEffect(() => {
    load();
  }, [load]);
  async function saveInvestor(investor) {
    const creating = editing === "new";
    setBusy(true);
    try {
      const path = creating
          ? "/api/investor-crm/investors"
          : `/api/investor-crm/investors/${editing}`,
        persist = (confirmPotentialDuplicate = false) =>
          api(path, {
            method: creating ? "POST" : "PATCH",
            body: JSON.stringify({
              organizationId,
              investor,
              confirmPotentialDuplicate,
            }),
          });
      try {
        await persist();
      } catch (error) {
        if (error.message !== "POTENTIAL_DUPLICATE_INVESTOR") throw error;
        const matches = error.response?.matches ?? [],
          fieldLabel = (fields = []) => {
            const values = [];
            if (fields.includes("EMAIL")) values.push("email address");
            if (fields.includes("PHONE")) values.push("telephone number");
            if (fields.includes("NAME_AND_ADDRESS"))
              values.push("name and mailing address");
            return values.join(" and ") || "contact information";
          },
          confirmed = await dialog.confirm({
            title: "Email or telephone number already in use",
            message:
              "PI found another investor with matching contact information. Multiple people may share firm contact details, but continuing will create a separate investor record. Confirm that this is intentional.",
            details: matches.length
              ? matches.map((match, index) => [
                  `Existing investor ${index + 1}`,
                  `${match.fullName || "Unnamed investor"} — matching ${fieldLabel(match.matchingFields)}`,
                ])
              : [
                  [
                    "Conflict",
                    "An existing investor has matching contact information",
                  ],
                ],
            confirmLabel: creating
              ? "Create Separate Investor"
              : "Save Separate Investor",
            cancelLabel: "Review Information",
            tone: "warning",
          });
        if (!confirmed) return { ok: false, cancelled: true };
        await persist(true);
      }
      setEditing(null);
      setForm({ ...emptyInvestor });
      setNotice(creating ? "Investor added." : "Investor updated.");
      await load();
      return { ok: true };
    } catch (error) {
      const message = investorSaveError(error.message);
      setNotice(message);
      return { ok: false, message };
    } finally {
      setBusy(false);
    }
  }
  async function chooseFile(file) {
    setBusy(true);
    try {
      const input = await readImport(file);
      setImportData(input);
      const result = await api("/api/investor-crm/import/preview", {
        method: "POST",
        body: JSON.stringify({ organizationId, ...input }),
      });
      setPreview(result);
      setNotice("Preview ready. No investor records have been written.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function revalidateMapping(mapping) {
    setBusy(true);
    try {
      const result = await api("/api/investor-crm/import/preview", {
        method: "POST",
        body: JSON.stringify({ organizationId, ...importData, mapping }),
      });
      setPreview(result);
      setNotice(
        "Column mapping validated. No investor records have been written.",
      );
    } catch (error) {
      setNotice(errorText(error.message));
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    setBusy(true);
    try {
      const result = await api("/api/investor-crm/import/commit", {
        method: "POST",
        body: JSON.stringify({
          organizationId,
          ...importData,
          mapping: preview.mapping,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      setNotice(
        `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.needsReview} needs review.`,
      );
      setImportData(null);
      setPreview(null);
      await load();
    } catch (error) {
      setNotice(errorText(error.message));
    } finally {
      setBusy(false);
    }
  }
  async function runMatch() {
    setBusy(true);
    try {
      const result = await api("/api/investor-crm/match", {
        method: "POST",
        body: JSON.stringify({ organizationId, deal }),
      });
      setMatches(result);
      setSelected(
        result.results
          .filter(
            (item) =>
              item.fit === "STRONG_MATCH" || item.fit === "POSSIBLE_MATCH",
          )
          .map((item) => item.investor.id),
      );
      setNotice(
        "Deterministic matching complete. Review every reason before preparing a campaign.",
      );
    } catch (error) {
      setNotice(errorText(error.message));
    } finally {
      setBusy(false);
    }
  }
  async function campaign() {
    const report = reports.find((item) => item.id === reportId);
    if (!report) {
      setNotice("Select an immutable generated report.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/investor-crm/campaigns", {
        method: "POST",
        body: JSON.stringify({
          organizationId,
          reportId,
          scenarioId: report.scenarioId,
          revision: report.revision,
          deal: { ...deal, propertyId: report.propertyId },
          investorIds: selected,
        }),
      });
      setNotice("Campaign prepared. No email was sent.");
      await load();
      setTab("Campaigns");
    } catch (error) {
      setNotice(errorText(error.message));
    } finally {
      setBusy(false);
    }
  }
  async function dispatchCampaign(item) {
    if (
      !(await dialog.confirm({
        title: "Send this investor campaign?",
        message:
          "PI will send the selected immutable report after the server rechecks consent and suppression for every recipient.",
        details: [
          ["Selected investors", item.investorIds?.length ?? 0],
          ["Report", item.reportFilename ?? "Immutable investor report"],
        ],
        confirmLabel: "Send Campaign",
        cancelLabel: "Cancel",
        tone: "warning",
      }))
    )
      return;
    setBusy(true);
    try {
      const result = await api(
        `/api/investor-crm/campaigns/${item.id}/dispatch`,
        {
          method: "POST",
          body: JSON.stringify({
            organizationId,
            idempotencyKey: crypto.randomUUID(),
            confirmed: true,
          }),
        },
      );
      setNotice(
        `Campaign processed: ${result.recipients.filter((row) => row.deliveryStatus === "PROVIDER_ACCEPTED").length} accepted, ${result.recipients.filter((row) => row.deliveryStatus === "SUPPRESSED").length} suppressed.`,
      );
      await load();
    } catch (error) {
      setNotice(errorText(error.message));
    } finally {
      setBusy(false);
    }
  }
  async function updatePipeline(campaignId, investorId, status) {
    setBusy(true);
    try {
      await api(`/api/investor-crm/campaigns/${campaignId}/pipeline`, {
        method: "POST",
        body: JSON.stringify({ organizationId, investorId, status }),
      });
      setNotice("Investor pipeline updated.");
      await load();
    } catch (error) {
      setNotice(errorText(error.message));
    } finally {
      setBusy(false);
    }
  }
  const investors = (data?.investors ?? []).filter((item) =>
    `${item.fullName} ${item.companyName} ${item.email} ${item.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <main className="investor-crm">
      <ProductNav active="investors" />
      <header className="crm-hero">
        <div>
          <p className="eyebrow">ORGANIZATION-PRIVATE INVESTOR RELATIONSHIPS</p>
          <h1>Investors</h1>
          <p>
            Manage investor preferences, deterministic deal matching, controlled
            distribution and observed responses.
          </p>
        </div>
        <div className="crm-org">
          <span>Organization</span>
          <b>
            {organizationId === "property-intelligence-local"
              ? "Workside Software, LLC"
              : organizationId}
          </b>
          {auth.user.role === "Platform Administrator" &&
            organizationId !== auth.user.organizationId && (
              <em>Platform Administrator access · audited</em>
            )}
        </div>
      </header>
      {notice && (
        <p className="crm-notice" role="status">
          {notice}
        </p>
      )}
      <nav className="crm-tabs" aria-label="Investor workspace">
        {["Directory", "Import", "Matching", "Campaigns", "Deal velocity"].map(
          (name) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              data-tooltip={INVESTOR_TAB_HELP[name]}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ),
        )}
      </nav>
      {tab === "Directory" && (
        <section className="crm-panel">
          <div className="crm-toolbar">
            <label>
              Search investors
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, company, email or phone"
              />
            </label>
            <button
              data-tooltip="Create a private investor profile for this organization, including contact permissions, buying criteria and purchasing capability."
              onClick={() => {
                setEditing("new");
                setForm({
                  ...emptyInvestor,
                  propertyTypes: [],
                  strategies: [],
                  geographies: [],
                });
              }}
            >
              Add investor
            </button>
            <a
              className="crm-button secondary"
              href={`/api/investor-crm/export${query}`}
              data-tooltip="Download this organization's investor directory as a CSV file. Private proof-of-funds documents are not included."
            >
              Export CSV
            </a>
          </div>
          <div className="crm-metrics">
            <Metric
              label="Active investors"
              value={
                (data?.investors ?? []).filter(
                  (item) => item.status === "ACTIVE",
                ).length
              }
            />
            <Metric
              label="Permitted email"
              value={
                (data?.investors ?? []).filter(
                  (item) => item.communication?.emailStatus === "PERMITTED",
                ).length
              }
            />
            <Metric
              label="Observed responses"
              value={(data?.investors ?? []).reduce(
                (sum, item) => sum + (item.metrics?.observedResponses ?? 0),
                0,
              )}
            />
            <Metric
              label="Closings"
              value={(data?.investors ?? []).reduce(
                (sum, item) => sum + (item.metrics?.closings ?? 0),
                0,
              )}
            />
          </div>
          <div className="crm-table">
            <table>
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Investment criteria</th>
                  <th>Purchasing capability</th>
                  <th>Communication</th>
                  <th>Observed performance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {investors.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b>{item.fullName}</b>
                      <small>
                        {item.companyName || "Independent investor"} ·{" "}
                        {item.email || item.phone || "No contact method"}
                      </small>
                    </td>
                    <td>
                      {(item.criteria?.propertyTypes ?? [])
                        .map(display)
                        .join(", ") || "Property type not specified"}
                      <small>
                        {(item.criteria?.strategies ?? [])
                          .map(display)
                          .join(", ") || "Strategy not specified"}{" "}
                        · {budgetLabel(item.criteria)}
                      </small>
                      <small>
                        {item.criteria?.geographies
                          ?.map(locationLabel)
                          .join(" · ") || "Location preference not specified"}
                      </small>
                    </td>
                    <td>
                      {display(item.criteria?.fundingPreference)}
                      <small>
                        Proof of funds:{" "}
                        {display(item.capability?.proofOfFundsStatus)}
                      </small>
                    </td>
                    <td>
                      {display(item.communication?.emailStatus)}
                      <small>
                        Preferred: {display(item.preferredCommunication)}
                      </small>
                    </td>
                    <td>
                      {item.metrics?.dealsReceived || 0} sent ·{" "}
                      {item.metrics?.offers || 0} offers ·{" "}
                      {item.metrics?.closings || 0} closings
                    </td>
                    <td>
                      <button
                        className="secondary"
                        data-tooltip={`Review and update ${item.fullName}'s profile, criteria and permissions without changing prior campaign history.`}
                        onClick={() => {
                          setEditing(item.id);
                          setForm(formFromInvestor(item));
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!investors.length && (
              <p className="crm-empty">No investors match this view.</p>
            )}
          </div>
        </section>
      )}
      {editing && (
        <InvestorDialog
          value={form}
          setValue={setForm}
          save={saveInvestor}
          close={() => setEditing(null)}
          busy={busy}
          creating={editing === "new"}
        />
      )}
      {tab === "Import" && (
        <section className="crm-panel crm-import">
          <h2>Import investor directory</h2>
          {!data?.canManage && (
            <p className="crm-warning">
              Your role can review investor information but cannot import or
              change records.
            </p>
          )}
          <ol>
            <li className={importData ? "done" : "active"}>
              Upload CSV or XLSX
            </li>
            <li className={preview ? "done" : ""}>Map and validate</li>
            <li>Review and import</li>
          </ol>
          <label className="crm-upload">
            Choose a file
            <input
              type="file"
              accept=".csv,.xlsx"
              disabled={busy || !data?.canManage}
              onChange={(event) => chooseFile(event.target.files[0])}
            />
            <small>
              5 MB and 500 rows maximum. Formulas, links, macros and external
              references are rejected.
            </small>
          </label>
          {preview && (
            <>
              <ImportMapping
                headers={importData.headers}
                mapping={preview.mapping}
                disabled={busy}
                onApply={revalidateMapping}
              />
              <div className="crm-metrics">
                <Metric label="Rows" value={preview.summary.total} />
                <Metric label="Valid" value={preview.summary.valid} />
                <Metric
                  label="Needs review"
                  value={preview.summary.needsReview ?? 0}
                />
                <Metric
                  label="Potential duplicates"
                  value={preview.summary.potentialDuplicates}
                />
                <Metric label="Invalid" value={preview.summary.invalid} />
              </div>
              <details>
                <summary>Review mapping and row results</summary>
                <pre>
                  {JSON.stringify(
                    {
                      mapping: preview.mapping,
                      rows: preview.preview.map((row) => ({
                        row: row.index + 2,
                        status: row.status,
                        error: row.error,
                        budget: row.candidate?.criteria?.originalBudgetCategory,
                        locations: row.candidate?.criteria?.geographies?.map(
                          (item) => ({
                            value: item.original,
                            needsReview: item.needsReview,
                          }),
                        ),
                        matches: row.matches?.map((match) => match.fullName),
                      })),
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
              <button
                data-tooltip="Create or update the validated investor rows shown in this preview. Rows marked invalid are not imported."
                disabled={
                  busy ||
                  preview.summary.valid + (preview.summary.needsReview ?? 0) ===
                    0
                }
                onClick={commit}
              >
                Import reviewed records
              </button>
            </>
          )}
        </section>
      )}
      {tab === "Matching" && (
        <section className="crm-panel">
          <h2>Find matching investors</h2>
          <p>
            Rules are deterministic and explain every inclusion, exclusion and
            missing preference. A match is not a recommendation.
          </p>
          <DealForm value={deal} setValue={setDeal} />
          <div className="crm-toolbar">
            <button
              data-tooltip="Compare this deal with organization-owned investor criteria using explainable rules. No messages are sent."
              disabled={busy || !deal.propertyId || !deal.propertyAddress}
              onClick={runMatch}
            >
              Run deterministic match
            </button>
            <label>
              Immutable report
              <select
                value={reportId}
                onChange={(event) => {
                  const id = event.target.value,
                    set = reports.find((row) => row.id === id);
                  setReportId(id);
                  if (set)
                    setDeal((current) => ({
                      ...current,
                      propertyId: set.propertyId,
                      propertyAddress:
                        set.propertyAddress ?? current.propertyAddress,
                    }));
                }}
              >
                <option value="">Select generated report</option>
                {reports.map((report) => (
                  <option value={report.id} key={report.id}>
                    {report.propertyAddress || report.filename} · revision{" "}
                    {report.revision}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {matches && (
            <div className="crm-match-list">
              {matches.results.map((item) => (
                <label
                  key={item.investor.id}
                  className={`crm-match ${item.fit.toLowerCase().replaceAll(" ", "-")}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(item.investor.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, item.investor.id]
                          : current.filter((id) => id !== item.investor.id),
                      )
                    }
                  />
                  <span>
                    <b>
                      {item.investor.fullName} · {item.fit.replaceAll("_", " ")}
                    </b>
                    <small>
                      {item.reasons.join(" · ") ||
                        "No positive criteria established"}
                    </small>
                    {item.missing.length > 0 && (
                      <small>Missing: {item.missing.join(", ")}</small>
                    )}
                    {item.exclusions.length > 0 && (
                      <small>Excluded: {item.exclusions.join(", ")}</small>
                    )}
                  </span>
                </label>
              ))}
              <button
                data-tooltip="Create a draft distribution campaign for the selected investors and immutable report. This does not send email."
                disabled={busy || !selected.length || !reportId}
                onClick={campaign}
              >
                Prepare campaign for {selected.length} investor
                {selected.length === 1 ? "" : "s"}
              </button>
            </div>
          )}
        </section>
      )}
      {tab === "Campaigns" && (
        <section className="crm-panel">
          <h2>Deal campaigns</h2>
          {!data?.outboundEmailEnabled && (
            <p className="crm-warning">
              Outbound email is not configured. Campaigns can be prepared and
              reviewed, but dispatch fails closed and no message is sent.
            </p>
          )}
          <div className="crm-cards">
            {(data?.campaigns ?? []).map((item) => (
              <article key={item.id}>
                <span>{item.status}</span>
                <h3>{item.deal?.propertyAddress}</h3>
                <p>
                  {item.investorIds?.length ?? 0} selected investor(s) · report
                  revision {item.reportRevision}
                </p>
                <small>
                  Created {when(item.createdAt)} · distributed{" "}
                  {when(item.distributedAt)}
                </small>
                {data?.canManage &&
                  data?.outboundEmailEnabled &&
                  !item.distributedAt && (
                    <button
                      data-tooltip="Review the recipients and immutable report, then request server-authorized delivery with consent and suppression rechecked."
                      disabled={busy}
                      onClick={() => dispatchCampaign(item)}
                    >
                      Review and send campaign
                    </button>
                  )}
                <details>
                  <summary>Recipients and pipeline</summary>
                  {(item.recipients ?? []).map((recipient) => (
                    <label className="crm-pipeline" key={recipient.id}>
                      <span>
                        {(data?.investors ?? []).find(
                          (row) => row.id === recipient.investorId,
                        )?.fullName ?? "Investor"}
                        <small>
                          {recipient.deliveryStatus} ·{" "}
                          {recipient.responseStatus ?? "No response"}
                        </small>
                      </span>
                      <select
                        disabled={!data?.canManage || busy}
                        value={recipient.pipelineStatus}
                        onChange={(event) =>
                          updatePipeline(
                            item.id,
                            recipient.investorId,
                            event.target.value,
                          )
                        }
                      >
                        {[
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
                        ].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </details>
              </article>
            ))}
          </div>
          {!data?.campaigns?.length && (
            <p className="crm-empty">
              No campaigns have been prepared for this organization.
            </p>
          )}
        </section>
      )}
      {tab === "Deal velocity" && (
        <section className="crm-panel">
          <h2>Observed deal velocity</h2>
          <p>
            Only observed activity is shown. Missing history is labeled rather
            than estimated.
          </p>
          <div className="crm-metrics">
            <Metric
              label="Active campaigns"
              value={data?.dashboard?.activeCampaigns ?? 0}
            />
            <Metric
              label="Interested"
              value={data?.dashboard?.interestedInvestors ?? 0}
            />
            <Metric
              label="Offers"
              value={data?.dashboard?.offersReceived ?? 0}
            />
            <Metric
              label="Commitments"
              value={data?.dashboard?.commitments ?? 0}
            />
            <Metric label="Closed" value={data?.dashboard?.closedDeals ?? 0} />
            <Metric
              label="Avg. response"
              value={
                data?.dashboard?.averageFirstResponseMs == null
                  ? "Not yet established"
                  : `${Math.round(data.dashboard.averageFirstResponseMs / 3600000)} hr`
              }
            />
          </div>
        </section>
      )}
      {busy && !data && <p>Loading the private investor workspace…</p>}
    </main>
  );
}
function Metric({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
function ImportMapping({ headers, mapping, disabled, onApply }) {
  const [value, setValue] = React.useState(mapping),
    fields = [
      ["firstName", "First name"],
      ["lastName", "Last name"],
      ["fullName", "Full name"],
      ["companyName", "Company"],
      ["email", "Email"],
      ["phone", "Phone"],
      ["streetAddress", "Street"],
      ["city", "City"],
      ["state", "State"],
      ["zip", "ZIP"],
      ["propertyTypes", "Property type"],
      ["strategies", "Investment strategy"],
      ["investmentThreshold", "Investment threshold"],
      ["minimumAcquisitionAmount", "Minimum acquisition"],
      ["maximumAcquisitionAmount", "Maximum acquisition"],
      ["preferredStates", "Preferred states"],
      ["preferredCounties", "Preferred counties"],
      ["multipleGeographicLocations", "Multiple locations"],
      ["cashBuyer", "Cash buyer"],
      ["fundingPreference", "Purchase method"],
      ["proofOfFundsStatus", "Proof of funds"],
      ["averageResponseFrequency", "Response frequency"],
      ["notes", "Relationship notes"],
    ];
  React.useEffect(() => setValue(mapping), [mapping]);
  return (
    <section className="crm-mapping">
      <h3>Map columns</h3>
      <p>
        Review every inferred mapping. Ambiguous budgets and locations are
        retained and flagged rather than broadened.
      </p>
      <div className="crm-form-grid compact">
        {fields.map(([key, label]) => (
          <label key={key}>
            {label}
            <select
              value={value[key] ?? ""}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  [key]: event.target.value || undefined,
                }))
              }
            >
              <option value="">Not mapped</option>
              {headers.map((header) => (
                <option key={header}>{header}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        disabled={disabled}
        data-tooltip="Check the selected column mappings and preview row-level validation results without writing investor records."
        onClick={() => onApply(value)}
      >
        Validate this mapping
      </button>
    </section>
  );
}
function CheckGroup({ label, options, value, onChange }) {
  const toggle = (option, checked) => {
    if (option === "ANY") return onChange(checked ? ["ANY"] : []);
    const withoutAny = value.filter(
      (item) => item !== "ANY" && item !== option,
    );
    onChange(checked ? [...withoutAny, option] : withoutAny);
  };
  return (
    <fieldset className="crm-choice-group">
      <legend>{label}</legend>
      {options.map((option) => (
        <label key={option}>
          <input
            type="checkbox"
            checked={value.includes(option)}
            onChange={(event) => toggle(option, event.target.checked)}
          />
          <span>{display(option)}</span>
        </label>
      ))}
    </fieldset>
  );
}
function BudgetSelector({ value, set, error, validate, clearError }) {
  const minimum =
      value.minimumAcquisitionAmount === ""
        ? null
        : Number(value.minimumAcquisitionAmount),
    maximum =
      value.maximumAcquisitionAmount === ""
        ? null
        : Number(value.maximumAcquisitionAmount),
    preset =
      minimum == null && maximum == null
        ? "NONE"
        : minimum == null && maximum === 200000
          ? "UP_TO_200"
          : minimum === 200000 && maximum === 500000
            ? "200_TO_500"
            : minimum === 500000 && maximum == null
              ? "500_PLUS"
              : "CUSTOM";
  const choose = (next) => {
    clearError();
    set("budgetNeedsReview", false);
    set(
      "budgetInterpretation",
      next === "UP_TO_200"
        ? "MAXIMUM"
        : next === "500_PLUS"
          ? "MINIMUM"
          : next === "NONE"
            ? "UNREVIEWED"
            : "RANGE",
    );
    if (next === "NONE") {
      set("minimumAcquisitionAmount", "");
      set("maximumAcquisitionAmount", "");
    }
    if (next === "UP_TO_200") {
      set("minimumAcquisitionAmount", "");
      set("maximumAcquisitionAmount", "200000");
    }
    if (next === "200_TO_500") {
      set("minimumAcquisitionAmount", "200000");
      set("maximumAcquisitionAmount", "500000");
    }
    if (next === "500_PLUS") {
      set("minimumAcquisitionAmount", "500000");
      set("maximumAcquisitionAmount", "");
    }
    if (next === "CUSTOM" && preset !== "CUSTOM") {
      set("minimumAcquisitionAmount", "");
      set("maximumAcquisitionAmount", "");
    }
  };
  return (
    <div className="crm-budget">
      <label>
        Acquisition budget
        <select value={preset} onChange={(event) => choose(event.target.value)}>
          <option value="NONE">Not specified</option>
          <option value="UP_TO_200">Up to $200,000</option>
          <option value="200_TO_500">$200,000–$500,000</option>
          <option value="500_PLUS">$500,000+</option>
          <option value="CUSTOM">Custom range</option>
        </select>
      </label>
      {preset === "CUSTOM" && (
        <div className="crm-pair">
          <label>
            Minimum ($)
            <input
              type="number"
              min="0"
              max="1000000000"
              step="1000"
              inputMode="numeric"
              value={value.minimumAcquisitionAmount}
              aria-invalid={Boolean(error)}
              onBlur={validate}
              onChange={(event) =>
                set("minimumAcquisitionAmount", event.target.value)
              }
            />
          </label>
          <label>
            Maximum ($)
            <input
              type="number"
              min="0"
              max="1000000000"
              step="1000"
              inputMode="numeric"
              value={value.maximumAcquisitionAmount}
              aria-invalid={Boolean(error)}
              onBlur={validate}
              onChange={(event) =>
                set("maximumAcquisitionAmount", event.target.value)
              }
            />
          </label>
        </div>
      )}
      <small>
        An unspecified budget creates no match restriction and does not
        establish verified purchasing capacity.
      </small>
    </div>
  );
}
function GeographySelector({ value, onChange }) {
  const [draft, setDraft] = React.useState({
      state: "",
      scope: "STATEWIDE",
      county: "",
    }),
    [error, setError] = React.useState(""),
    counties = countiesForState(draft.state);
  const add = () => {
    if (!draft.state) {
      setError("Select a state.");
      return;
    }
    if (draft.scope === "COUNTY" && !draft.county) {
      setError("Select a county.");
      return;
    }
    const next = {
        state: draft.state,
        scope: draft.scope,
        county: draft.scope === "COUNTY" ? draft.county : "",
        original:
          draft.scope === "COUNTY"
            ? `${draft.county}, ${draft.state}`
            : `${draft.state} — Statewide`,
        needsReview: false,
      },
      key = `${next.state}|${next.scope}|${next.county}`;
    if (
      value.some(
        (item) =>
          `${item.state}|${item.scope ?? (item.county ? "COUNTY" : "STATEWIDE")}|${item.county ?? ""}` ===
          key,
      )
    ) {
      setError("That location is already selected.");
      return;
    }
    onChange([...value, next]);
    setDraft({ state: "", scope: "STATEWIDE", county: "" });
    setError("");
  };
  return (
    <div className="crm-geography">
      <div className="crm-location-entry">
        <label>
          State
          <select
            value={draft.state}
            onChange={(event) =>
              setDraft({
                state: event.target.value,
                scope: "STATEWIDE",
                county: "",
              })
            }
          >
            <option value="">Select state</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scope
          <select
            value={draft.scope}
            disabled={!draft.state}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                scope: event.target.value,
                county: "",
              }))
            }
          >
            <option value="STATEWIDE">Statewide</option>
            <option value="COUNTY">County</option>
          </select>
        </label>
        {draft.scope === "COUNTY" && (
          <label>
            County
            <select
              value={draft.county}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  county: event.target.value,
                }))
              }
            >
              <option value="">Select county</option>
              {counties.map((county) => (
                <option key={county}>{county}</option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className="secondary"
          data-tooltip="Add the selected state or county to this investor's preferred buying locations."
          onClick={add}
        >
          + Add location
        </button>
      </div>
      {error && (
        <p className="crm-field-error" role="alert">
          {error}
        </p>
      )}
      <div className="crm-location-list" aria-live="polite">
        {value.map((item, index) => (
          <span key={`${item.state}-${item.county}-${index}`}>
            {item.needsReview ? "Review: " : ""}
            {locationLabel(item)}
            <button
              type="button"
              aria-label={`Remove ${locationLabel(item)}`}
              data-tooltip={`Remove ${locationLabel(item)} from this investor's preferred buying locations.`}
              onClick={() =>
                onChange(value.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              ×
            </button>
          </span>
        ))}
        {!value.length && <small>No geographic restriction stated.</small>}
      </div>
    </div>
  );
}
function InvestorDialog({ value, setValue, save, close, busy, creating }) {
  const today = localToday(),
    [errors, setErrors] = React.useState({}),
    [submitError, setSubmitError] = React.useState(""),
    dialog = useNotificationDialog(),
    initial = React.useRef(JSON.stringify(value)),
    errorSummaryRef = React.useRef(null),
    set = (key, next) => setValue((current) => ({ ...current, [key]: next })),
    setFieldError = (key, message) =>
      setErrors((current) => {
        const next = { ...current };
        if (message) next[key] = message;
        else delete next[key];
        return next;
      }),
    clearContactError = (email, phone) => {
      if (email || phone) setFieldError("contact", "");
    },
    validateFields = (candidate, fields) => {
      const validation = validateInvestorFields(candidate, { today });
      setErrors((current) => {
        const next = { ...current };
        for (const field of fields) {
          if (validation[field]) next[field] = validation[field];
          else delete next[field];
        }
        return next;
      });
    },
    revealErrors = () =>
      requestAnimationFrame(() => {
        errorSummaryRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        errorSummaryRef.current?.focus();
      }),
    requestClose = async () => {
      if (
        JSON.stringify(value) !== initial.current &&
        !(await dialog.confirm({
          title: "Discard unsaved investor changes?",
          message:
            "The information entered in this investor form has not been saved. Closing now will discard those changes.",
          confirmLabel: "Discard Changes",
          cancelLabel: "Keep Editing",
          tone: "warning",
        }))
      )
        return;
      close();
    };
  React.useEffect(() => {
    setSubmitError("");
  }, [value]);
  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy && !dialog.isOpen)
        void requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, value, dialog.isOpen]);
  const submit = async (event) => {
    event.preventDefault();
    const next = {},
      name = (value.firstName || value.lastName || value.fullName).trim(),
      emailError = contactEmailError(value.email),
      phoneError = contactPhoneError(value.phone);
    if (!name)
      next.name =
        "Enter at least a first name, last name or preserved full name.";
    if (!value.email && !value.phone)
      next.contact = "Enter an email address or phone number.";
    if (emailError) next.email = emailError;
    if (phoneError) next.phone = phoneError;
    Object.assign(next, validateInvestorFields(value, { today }));
    setErrors(next);
    setSubmitError("");
    if (Object.keys(next).length) {
      revealErrors();
      return;
    }
    const result = await save({
      ...value,
      email: normalizeContactEmail(value.email),
      fullName:
        value.firstName || value.lastName
          ? `${value.firstName} ${value.lastName}`.trim()
          : value.fullName,
      geographies: value.geographies,
    });
    if (result?.ok === false && !result.cancelled) {
      setSubmitError(result.message || "The investor could not be saved.");
      revealErrors();
    }
  };
  const protectedConsent = ["OPTED_OUT", "SUPPRESSED"].includes(
      value.emailStatus,
    ),
    missingName = !(value.firstName || value.lastName || value.fullName).trim(),
    missingContact = !value.email && !value.phone,
    requiredFieldsMissing = missingName || missingContact;
  return (
    <div className="crm-dialog-backdrop">
      <form
        className="crm-dialog crm-investor-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="investor-dialog-title"
        noValidate
        onSubmit={submit}
      >
        <header>
          <div>
            <p className="eyebrow">INVESTOR DIRECTORY</p>
            <h2 id="investor-dialog-title">
              {creating ? "Add investor" : `Edit ${value.fullName}`}
            </h2>
            <p>
              {creating
                ? "Create a private organization-owned investor profile."
                : "Update preferences without changing observed campaign history."}
            </p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={requestClose}
            aria-label="Close investor form"
            data-tooltip="Close this form. PI will ask before discarding any unsaved investor information."
          >
            ×
          </button>
        </header>
        {(submitError || Object.keys(errors).length > 0) && (
          <div
            className="crm-form-alert"
            ref={errorSummaryRef}
            tabIndex="-1"
            role="alert"
            aria-live="assertive"
          >
            <h3>Investor was not saved</h3>
            {submitError ? (
              <p>{submitError}</p>
            ) : (
              <>
                <p>Correct the following information and select Save investor again:</p>
                <ul>
                  {[...new Set(Object.values(errors))].map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
        <section>
          <h3>Contact information</h3>
          <div className="crm-form-grid two">
            <label>
              <span className="crm-label-text">
                First name{" "}
                <span className="required" aria-hidden="true">
                  *
                </span>
              </span>
              <input
                autoFocus
                maxLength={80}
                value={value.firstName}
                aria-invalid={Boolean(errors.name || errors.firstName)}
                onChange={(event) => set("firstName", event.target.value)}
              />
            </label>
            <label>
              <span className="crm-label-text">
                Last name{" "}
                <span className="required" aria-hidden="true">
                  *
                </span>
              </span>
              <input
                maxLength={80}
                value={value.lastName}
                aria-invalid={Boolean(errors.name || errors.lastName)}
                onChange={(event) => set("lastName", event.target.value)}
              />
            </label>
            {!creating &&
              value.fullName &&
              !value.firstName &&
              !value.lastName && (
                <label className="wide">
                  Preserved full name{" "}
                  <input
                    maxLength={160}
                    value={value.fullName}
                    onChange={(event) => set("fullName", event.target.value)}
                  />
                  <small>
                    Kept intact because PI cannot safely infer name parts.
                  </small>
                </label>
              )}
            <label className="wide">
              Company (optional)
              <input
                maxLength={160}
                value={value.companyName}
                onChange={(event) => set("companyName", event.target.value)}
              />
            </label>
            <label>
              <span className="crm-label-text">
                Email{" "}
                <span className="required" aria-hidden="true">
                  †
                </span>
              </span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                spellCheck="false"
                maxLength={254}
                value={value.email}
                aria-invalid={Boolean(errors.email || errors.contact)}
                aria-describedby={
                  errors.email ? "investor-email-error" : undefined
                }
                onChange={(event) => {
                  const next = event.target.value;
                  set("email", next);
                  clearContactError(next, value.phone);
                  if (errors.email)
                    setFieldError("email", contactEmailError(next));
                }}
                onBlur={() => {
                  const normalized = normalizeContactEmail(value.email);
                  if (normalized !== value.email) set("email", normalized);
                  validateFields({ ...value, email: normalized }, [
                    "email",
                    "preferredCommunication",
                    "consentSource",
                  ]);
                }}
              />
              {errors.email && (
                <small
                  id="investor-email-error"
                  className="crm-field-error"
                  role="alert"
                >
                  {errors.email}
                </small>
              )}
            </label>
            <label>
              <span className="crm-label-text">
                Phone{" "}
                <span className="required" aria-hidden="true">
                  †
                </span>
              </span>
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                maxLength={22}
                value={value.phone}
                aria-invalid={Boolean(errors.phone || errors.contact)}
                aria-describedby={
                  errors.phone ? "investor-phone-error" : undefined
                }
                onChange={(event) => {
                  const next = formatContactPhone(event.target.value);
                  set("phone", next);
                  clearContactError(value.email, next);
                  if (errors.phone)
                    setFieldError("phone", contactPhoneError(next));
                }}
                onBlur={() =>
                  validateFields(value, ["phone", "preferredCommunication"])
                }
              />
              {errors.phone && (
                <small
                  id="investor-phone-error"
                  className="crm-field-error"
                  role="alert"
                >
                  {errors.phone}
                </small>
              )}
            </label>
          </div>
          {errors.name && (
            <p className="crm-field-error" role="alert">
              {errors.name}
            </p>
          )}
          {errors.contact && (
            <p className="crm-field-error" role="alert">
              {errors.contact}
            </p>
          )}
          <p className="crm-required-note">
            <span className="required">*</span> At least one name field is
            required. <span className="required">†</span> Email or phone is
            required.
          </p>
          <details className="crm-additional">
            <summary>Additional contact details</summary>
            <div className="crm-form-grid two">
              <label className="wide">
                Mailing street address
                <input
                  autoComplete="street-address"
                  maxLength={180}
                  value={value.streetAddress}
                  aria-invalid={Boolean(errors.streetAddress)}
                  onBlur={() =>
                    validateFields(value, [
                      "streetAddress",
                      "city",
                      "state",
                      "zip",
                    ])
                  }
                  onChange={(event) => set("streetAddress", event.target.value)}
                />
                {errors.streetAddress && (
                  <small className="crm-field-error" role="alert">
                    {errors.streetAddress}
                  </small>
                )}
              </label>
              <label>
                City
                <input
                  autoComplete="address-level2"
                  maxLength={100}
                  value={value.city}
                  aria-invalid={Boolean(errors.city)}
                  onBlur={() =>
                    validateFields(value, [
                      "streetAddress",
                      "city",
                      "state",
                      "zip",
                    ])
                  }
                  onChange={(event) => set("city", event.target.value)}
                />
                {errors.city && (
                  <small className="crm-field-error" role="alert">
                    {errors.city}
                  </small>
                )}
              </label>
              <label>
                State
                <select
                  value={value.state}
                  aria-invalid={Boolean(errors.state)}
                  onChange={(event) => {
                    const next = event.target.value,
                      candidate = { ...value, state: next };
                    set("state", next);
                    validateFields(candidate, [
                      "streetAddress",
                      "city",
                      "state",
                      "zip",
                    ]);
                  }}
                >
                  <option value="">Select state</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <small className="crm-field-error" role="alert">
                    {errors.state}
                  </small>
                )}
              </label>
              <label>
                ZIP
                <input
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[0-9]{5}(-[0-9]{4})?"
                  value={value.zip}
                  aria-invalid={Boolean(errors.zip)}
                  onBlur={() =>
                    validateFields(value, [
                      "streetAddress",
                      "city",
                      "state",
                      "zip",
                    ])
                  }
                  onChange={(event) => set("zip", event.target.value)}
                />
                {errors.zip && (
                  <small className="crm-field-error" role="alert">
                    {errors.zip}
                  </small>
                )}
              </label>
            </div>
          </details>
        </section>
        <section>
          <h3>Investment criteria</h3>
          <div className="crm-criteria-grid">
            <CheckGroup
              label="Property types"
              options={["SF", "MF", "ANY"]}
              value={value.propertyTypes}
              onChange={(next) => set("propertyTypes", next)}
            />
            <CheckGroup
              label="Investment strategies"
              options={["FIX_AND_FLIP", "BUY_AND_HOLD", "WHOLESALE", "ANY"]}
              value={value.strategies}
              onChange={(next) => set("strategies", next)}
            />
          </div>
          <BudgetSelector
            value={value}
            set={set}
            error={errors.budget}
            validate={() => validateFields(value, ["budget"])}
            clearError={() => setFieldError("budget", "")}
          />
          {errors.budget && (
            <p className="crm-field-error" role="alert">
              {errors.budget}
            </p>
          )}
          <h4>Preferred geographic locations</h4>
          <GeographySelector
            value={value.geographies}
            onChange={(next) => set("geographies", next)}
          />
        </section>
        <section>
          <h3>Purchasing capability</h3>
          <div className="crm-form-grid two">
            <label>
              Purchase method
              <select
                value={value.fundingPreference}
                aria-invalid={Boolean(errors.fundingPreference)}
                onChange={(event) => {
                  const next = event.target.value,
                    candidate = { ...value, fundingPreference: next };
                  set("fundingPreference", next);
                  validateFields(candidate, ["fundingPreference"]);
                }}
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="CASH">Cash</option>
                <option value="FINANCING">Financed</option>
                <option value="EITHER">Both</option>
              </select>
              {errors.fundingPreference && (
                <small className="crm-field-error" role="alert">
                  {errors.fundingPreference}
                </small>
              )}
            </label>
            <label>
              Proof-of-funds status
              <select
                value={value.proofOfFundsStatus}
                aria-invalid={Boolean(errors.proofOfFundsStatus)}
                onChange={(event) => {
                  const next = event.target.value,
                    shouldDefaultReview =
                      next === "REVIEWED" && !value.proofOfFundsReviewDate,
                    reviewDate = shouldDefaultReview
                      ? today
                      : value.proofOfFundsReviewDate,
                    expirationDate =
                      next === "REVIEWED" &&
                      reviewDate &&
                      !value.proofOfFundsExpirationDate
                        ? addCalendarMonths(reviewDate)
                        : value.proofOfFundsExpirationDate,
                    candidate = {
                      ...value,
                      proofOfFundsStatus: next,
                      proofOfFundsReviewDate: reviewDate,
                      proofOfFundsExpirationDate: expirationDate,
                    };
                  setValue(candidate);
                  validateFields(candidate, [
                    "proofOfFundsStatus",
                    "proofOfFundsReviewDate",
                    "proofOfFundsExpirationDate",
                  ]);
                }}
              >
                <option value="NOT_REQUESTED">Not provided</option>
                <option value="REQUESTED">Requested</option>
                <option value="RECEIVED">Received</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="EXPIRED">Expired</option>
                <option value="REJECTED">Rejected</option>
              </select>
              {errors.proofOfFundsStatus && (
                <small className="crm-field-error" role="alert">
                  {errors.proofOfFundsStatus}
                </small>
              )}
            </label>
            <label>
              Typical closing timeframe (days)
              <input
                type="number"
                min="1"
                max="365"
                step="1"
                inputMode="numeric"
                value={value.typicalClosingDays}
                aria-invalid={Boolean(errors.typicalClosingDays)}
                onChange={(event) =>
                  set("typicalClosingDays", event.target.value)
                }
                onBlur={() => validateFields(value, ["typicalClosingDays"])}
              />
              {errors.typicalClosingDays && (
                <small className="crm-field-error" role="alert">
                  {errors.typicalClosingDays}
                </small>
              )}
            </label>
            <label>
              Proof-of-funds review date
              <input
                type="date"
                max={today}
                value={value.proofOfFundsReviewDate}
                aria-invalid={Boolean(errors.proofOfFundsReviewDate)}
                onChange={(event) => {
                  const nextReviewDate = event.target.value,
                    priorDefaultExpiration = addCalendarMonths(
                      value.proofOfFundsReviewDate,
                    ),
                    expirationWasAutomatic =
                      !value.proofOfFundsExpirationDate ||
                      value.proofOfFundsExpirationDate ===
                        priorDefaultExpiration,
                    nextExpirationDate =
                      value.proofOfFundsStatus === "REVIEWED" &&
                      expirationWasAutomatic
                        ? addCalendarMonths(nextReviewDate)
                        : value.proofOfFundsExpirationDate;
                  setValue((current) => ({
                    ...current,
                    proofOfFundsReviewDate: nextReviewDate,
                    proofOfFundsExpirationDate: nextExpirationDate,
                  }));
                }}
                onBlur={() =>
                  validateFields(value, [
                    "proofOfFundsReviewDate",
                    "proofOfFundsExpirationDate",
                  ])
                }
              />
              {errors.proofOfFundsReviewDate && (
                <small className="crm-field-error" role="alert">
                  {errors.proofOfFundsReviewDate}
                </small>
              )}
            </label>
            <label>
              Proof-of-funds expiration date
              <input
                type="date"
                min={
                  ["RECEIVED", "REVIEWED"].includes(value.proofOfFundsStatus)
                    ? today
                    : undefined
                }
                max={value.proofOfFundsStatus === "EXPIRED" ? today : undefined}
                value={value.proofOfFundsExpirationDate}
                aria-invalid={Boolean(errors.proofOfFundsExpirationDate)}
                onChange={(event) =>
                  set("proofOfFundsExpirationDate", event.target.value)
                }
                onBlur={() =>
                  validateFields(value, ["proofOfFundsExpirationDate"])
                }
              />
              {errors.proofOfFundsExpirationDate && (
                <small className="crm-field-error" role="alert">
                  {errors.proofOfFundsExpirationDate}
                </small>
              )}
            </label>
          </div>
          <p className="crm-privacy">
            A Reviewed status records analyst review; it does not independently
            verify purchasing capacity or document authenticity.
          </p>
        </section>
        <section>
          <h3>Communication &amp; relationship</h3>
          <div className="crm-form-grid two">
            <label>
              Email permission
              <select
                value={value.emailStatus}
                disabled={protectedConsent}
                aria-invalid={Boolean(errors.emailStatus)}
                onChange={(event) => {
                  const next = event.target.value,
                    candidate = {
                      ...value,
                      emailStatus: next,
                      consentAt:
                        next === "PERMITTED" && !value.consentAt
                          ? today
                          : value.consentAt,
                    };
                  setValue(candidate);
                  validateFields(candidate, [
                    "emailStatus",
                    "email",
                    "consentSource",
                    "consentAt",
                  ]);
                }}
              >
                <option value="UNKNOWN">Not confirmed</option>
                <option value="PERMITTED">Permitted</option>
                <option value="OPTED_OUT">Opted out</option>
                {value.emailStatus === "SUPPRESSED" && (
                  <option value="SUPPRESSED">Suppressed</option>
                )}
              </select>
              {errors.emailStatus && (
                <small className="crm-field-error" role="alert">
                  {errors.emailStatus}
                </small>
              )}
              {protectedConsent && (
                <small>
                  Opt-out and suppression protections cannot be cleared in
                  profile editing.
                </small>
              )}
            </label>
            <label>
              Consent source
              <input
                maxLength={300}
                value={value.consentSource}
                aria-invalid={Boolean(errors.consentSource)}
                onChange={(event) => set("consentSource", event.target.value)}
                onBlur={() => validateFields(value, ["consentSource"])}
              />
              {errors.consentSource && (
                <small className="crm-field-error" role="alert">
                  {errors.consentSource}
                </small>
              )}
            </label>
            <label>
              Consent date
              <input
                type="date"
                max={today}
                value={value.consentAt}
                aria-invalid={Boolean(errors.consentAt)}
                onChange={(event) => set("consentAt", event.target.value)}
                onBlur={() => validateFields(value, ["consentAt"])}
              />
              {errors.consentAt && (
                <small className="crm-field-error" role="alert">
                  {errors.consentAt}
                </small>
              )}
            </label>
            <label>
              Preferred contact method
              <select
                value={value.preferredCommunication}
                aria-invalid={Boolean(errors.preferredCommunication)}
                onChange={(event) => {
                  const next = event.target.value,
                    candidate = { ...value, preferredCommunication: next };
                  set("preferredCommunication", next);
                  validateFields(candidate, ["preferredCommunication"]);
                }}
              >
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone</option>
                <option value="SMS">Text message</option>
                <option value="NONE">No preference</option>
              </select>
              {errors.preferredCommunication && (
                <small className="crm-field-error" role="alert">
                  {errors.preferredCommunication}
                </small>
              )}
            </label>
            <label className="wide">
              Relationship notes
              <textarea
                maxLength={4000}
                value={value.notes}
                aria-invalid={Boolean(errors.notes)}
                onChange={(event) => set("notes", event.target.value)}
                onBlur={() => validateFields(value, ["notes"])}
                placeholder="Investment preferences, relationship history and follow-up notes"
              />
              <small>{value.notes.length.toLocaleString()} / 4,000</small>
              {errors.notes && (
                <small className="crm-field-error" role="alert">
                  {errors.notes}
                </small>
              )}
            </label>
          </div>
        </section>
        <footer className="crm-dialog-actions">
          {requiredFieldsMissing && (
            <small className="crm-save-guidance">
              Enter a name and either an email address or telephone number to
              save.
            </small>
          )}
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={requestClose}
            data-tooltip="Close this form without saving. PI will ask before discarding entered information."
          >
            Cancel
          </button>
          <button
            disabled={busy || requiredFieldsMissing}
            data-tooltip="Validate the entered profile and save it to this organization's private investor directory."
          >
            {busy ? "Saving…" : "Save investor"}
          </button>
        </footer>
      </form>
    </div>
  );
}
function DealForm({ value, setValue }) {
  const set = (key, next) =>
    setValue((current) => ({ ...current, [key]: next }));
  return (
    <div className="crm-form-grid compact">
      <label>
        Property ID *
        <input
          value={value.propertyId}
          onChange={(e) => set("propertyId", e.target.value)}
        />
      </label>
      <label>
        Property address *
        <input
          value={value.propertyAddress}
          onChange={(e) => set("propertyAddress", e.target.value)}
        />
      </label>
      <label>
        Property type
        <select
          value={value.propertyType}
          onChange={(e) => set("propertyType", e.target.value)}
        >
          <option>SF</option>
          <option>MF</option>
        </select>
      </label>
      <label>
        Strategy
        <select
          value={value.strategy}
          onChange={(e) => set("strategy", e.target.value)}
        >
          <option>FIX_AND_FLIP</option>
          <option>BUY_AND_HOLD</option>
          <option>WHOLESALE</option>
        </select>
      </label>
      <label>
        State
        <input
          value={value.state}
          onChange={(e) => set("state", e.target.value)}
        />
      </label>
      <label>
        County
        <input
          value={value.county}
          onChange={(e) => set("county", e.target.value)}
        />
      </label>
      <label>
        Funding orientation
        <select
          value={value.fundingOrientation}
          onChange={(e) => set("fundingOrientation", e.target.value)}
        >
          <option value="UNKNOWN">Not specified</option>
          <option value="CASH">Cash</option>
          <option value="FINANCING">Financed</option>
        </select>
      </label>
      <label>
        Investor purchase price
        <input
          type="number"
          value={value.acquisitionPrice}
          onChange={(e) => set("acquisitionPrice", e.target.value)}
        />
      </label>
      <label>
        Rehabilitation estimate
        <input
          type="number"
          value={value.rehabilitationEstimate}
          onChange={(e) => set("rehabilitationEstimate", e.target.value)}
        />
      </label>
      <label>
        Estimated resale
        <input
          type="number"
          value={value.estimatedResale}
          onChange={(e) => set("estimatedResale", e.target.value)}
        />
      </label>
      <label>
        Closing timeline (days)
        <input
          type="number"
          value={value.closingTimelineDays}
          onChange={(e) => set("closingTimelineDays", e.target.value)}
        />
      </label>
    </div>
  );
}
