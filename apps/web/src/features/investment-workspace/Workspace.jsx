import React, { useEffect, useRef, useState } from "react";
import {
  detailRoute,
  identifyRoute,
  investmentRoute,
  requestedScenario,
  requestedSubject,
  routeContext,
} from "../property-detail/navigation.js";
import { ProductNav } from "../desktop-shell/Shell.jsx";
import ComparableMap from "../comps-map/ComparableMap.jsx";
import { Tooltip } from "../../components/Tooltip.jsx";
import { useNotificationDialog } from "../../components/NotificationDialog.jsx";
import SourceDetails from "../../components/SourceDetails.jsx";
import ThemedSelect from "../../components/ThemedSelect.jsx";
import SaveAsPropertyButton, {
  DURABLE_PROPERTY_SAVED_EVENT,
  promotePreliminaryProperty,
} from "../../components/SaveAsPropertyButton.jsx";
import SupportingDocuments from "./SupportingDocuments.jsx";
import PropertyPhotos from "./PropertyPhotos.jsx";
import InlineEvidenceAttachments from "./InlineEvidenceAttachments.jsx";
import InteractiveChecklist from "./InteractiveChecklist.jsx";
import { SESSION_EXPIRED_EVENT } from "../../auth/session-lifecycle.js";
import { useAuthentication } from "../../auth/AuthenticationGate.jsx";
import { recordReportReference } from "../desktop-shell/report-registry.js";
import { approveAndRunProviderResearch } from "../property-research/paid-research.js";
import { deriveSellerFinancialPosition } from "./seller-position.js";
import {
  SAVE_REMINDER_INTERVAL_MS,
  clearSessionRecovery,
  readSessionRecovery,
  readWorkspaceDraft,
  saveReminderDue,
  workspaceSnapshot,
  writeSessionRecovery,
  writeWorkspaceDraft,
} from "./draft-recovery.js";
import { groupComparableObservations } from "./comparable-identity.js";
import {
  WORKFLOW_STAGES,
  GUIDED_STEPS,
  DEFAULT_RISK_SEED,
  RISK_VALUE_ORIGINS,
  normalizeWorkspaceTab,
  stageForTab,
  guidedStepForTab,
  guidedStepNavigation,
  illustrativeRiskAssumptions,
  markIllustrativeRiskValues,
  editRiskValue,
  setRiskMostLikelyOverride,
  riskValueOrigin,
  synchronizeRiskMostLikely,
  hasCustomRiskValues,
  riskReadiness,
  missingInputSummary,
  scenarioAnalysis,
  scenarioCalculationKey,
} from "./workflow.js";
import "./workspace.css";
import "./comparable-presentation.css";
import "./context.css";
import "./unified.css";
import "./seller-position.css";
import "./workflow.css";
import "./guided.css";
import "./supporting-documents.css";
import "./property-photos.css";

/* Stable source-level regression contracts retained across formatting:
Report type<ThemedSelect aria-label="Report type"
Financing choice</span><ThemedSelect
Target return definition</span><ThemedSelect
groups.map(group=>
source observations represent one logical transaction; underlying observations are preserved
Photo permission is required before generating an investor report
Review photos and confirm permission
photoRightsMissing&&kind!=='checklist'
reportRequest=useRef(false)
*/

const API = "/api/investment";
const money = (n) =>
  n == null
    ? "Not available"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(n);
const pct = (n) => (n == null ? "Not available" : `${(n * 100).toFixed(1)}%`);
const date = (x) =>
  x
    ? new Date(x).toLocaleDateString("en-US", { timeZone: "UTC" })
    : "Source date not returned";
const known = (value) =>
  value === null || value === undefined || value === "" ? "Unknown" : value;
const compMoney = (value) =>
  Number.isFinite(value) ? money(value) : "Unknown";
const compDate = (value) => (value ? String(value).slice(0, 10) : "Unknown");
const compDistance = (value) =>
  Number.isFinite(value) ? `${value.toFixed(2)} mi` : "Unknown";
const compArea = (value) =>
  Number.isFinite(value) ? `${value.toLocaleString()} SF` : "Unknown";
const groups = {
  "Acquisition & exit": {
    purchasePrice: "Acquisition price ($)",
    exitValue: "Resale / exit price ($)",
    rehabCost: "Rehab ($)",
    contingency: "Rehab contingency (%)",
    acquisitionFixed: "Purchase closing costs ($)",
    acquisitionRate: "Purchase closing costs (%)",
  },
  "Acquisition financing": {
    loanAmount: "Loan amount ($)",
    annualRate: "Interest rate (%)",
    points: "Loan points (%)",
    financingFees: "Loan fees ($)",
  },
  "Duration & daily carrying costs": {
    renovationDays: "Renovation days",
    marketingDays: "Marketing days",
    propertyTaxes: "Property taxes ($/day)",
    insurance: "Insurance ($/day)",
    utilities: "Utilities ($/day)",
    maintenance: "Maintenance ($/day)",
    otherHolding: "Other holding ($/day)",
  },
  "Selling & other costs": {
    sellingCommissionRate: "Selling commission (%)",
    sellerClosingFixed: "Seller closing costs ($)",
    sellerClosingRate: "Seller closing costs (%)",
    transferCost: "Transfer costs ($)",
    otherUpfront: "Other upfront costs ($)",
    otherAtExit: "Other exit costs ($)",
  },
  "Return hurdles": {
    targetRate: "Target return (%)",
    targetProfit: "Optional minimum profit ($)",
  },
};
const blank = () => ({
  ...Object.fromEntries(
    Object.values(groups)
      .flatMap((g) => Object.keys(g))
      .map((k) => [k, "0"]),
  ),
  purchasePrice: "",
  exitValue: "",
  rehabCost: "",
  renovationDays: "90",
  marketingDays: "30",
  targetRate: "15",
  targetProfit: "",
});
const variables = {
  exitValue: "Exit value ($)",
  rehabCost: "Rehab cost ($)",
  renovationDays: "Renovation days",
  marketingDays: "Marketing days",
};
const riskOriginLabels = {
  INHERITED: "Inherited from underwriting",
  ILLUSTRATIVE: "Illustrative preset",
  MANUAL: "Manual override",
  UNSET: "Not set",
};
const RequiredMark = () => (
  <span className="iw-required-mark" aria-label="required">
    *
  </span>
);
const blankRisk = () => ({
  variables: {},
  valueOrigins: {},
  seed: DEFAULT_RISK_SEED,
  iterations: 1000,
  rationale: "",
});
const primaryFields = {
  purchasePrice: "Proposed purchase price ($)",
  rehabCost: "Estimated rehabilitation cost ($)",
  exitValue: "Estimated resale / ARV assumption ($)",
  renovationDays: "Renovation duration (days)",
  marketingDays: "Marketing duration (days)",
};
const primaryKeys = new Set(Object.keys(primaryFields));
const fieldHelp = {
  purchasePrice:
    "Analyst assumption for the acquisition price paid to the seller.",
  rehabCost:
    "Analyst assumption for rehabilitation before contingency. It is not provider evidence.",
  exitValue:
    "Analyst estimated resale—not the provider AVM and not a certified ARV.",
  contingency: "Analyst allowance added to rehabilitation cost for overruns.",
  targetRate:
    "Analyst-selected return hurdle used to calculate the maximum allowable offer.",
};
const preset = {
  contingency: "10",
  acquisitionRate: "1.5",
  sellingCommissionRate: "5",
  sellerClosingRate: "1",
  propertyTaxes: "8",
  insurance: "3",
  utilities: "5",
};
const presetLabels = [
  ["Rehabilitation contingency", "10%"],
  ["Purchase closing expenses", "1.5%"],
  ["Selling commission", "5%"],
  ["Seller closing expenses", "1%"],
  ["Property taxes", "$8/day"],
  ["Insurance", "$3/day"],
  ["Utilities", "$5/day"],
];
const evidenceCategories = [
  ["RECORDED_MORTGAGE", "Recorded mortgage / deed of trust"],
  ["ORIGINAL_PRINCIPAL", "Original principal"],
  ["ALGORITHMIC_BALANCE", "Algorithmic estimated balance"],
  ["VERIFIED_PAYOFF", "Separately verified payoff"],
  ["LIEN", "Lien / encumbrance"],
  ["RELEASE", "Release / reconveyance"],
  ["PROPERTY_TAX", "Property tax"],
  ["DELINQUENT_TAX", "Delinquent property taxes"],
  ["PROPOSED_SALE_PRICE", "Analyst proposed sale price"],
  ["FORECLOSURE_EVENT", "NOD / trustee-sale / foreclosure event"],
  ["TITLE", "Title research"],
  ["PERMITS_ZONING", "Permits and zoning"],
  ["OCCUPANCY", "Current occupancy"],
  ["DELIVERY_CONDITION", "Advertised delivery condition"],
  ["POSSESSION", "Possession / vacancy confirmation"],
  ["CONDITION", "Property condition"],
  ["SELLER_AGENT_NOTE", "Seller / agent note"],
];
const evidenceClasses = [
  "UNKNOWN",
  "UNVERIFIED_NOTE",
  "SOURCE_REPORTED",
  "RECORDED_DOCUMENT",
  "ANALYST_OBSERVED",
  "ANALYST_ASSUMPTION",
  "INDEPENDENTLY_VERIFIED",
];
const sellerEvidenceCategories = new Set([
  "ORIGINAL_PRINCIPAL",
  "ALGORITHMIC_BALANCE",
  "VERIFIED_PAYOFF",
  "LIEN",
  "DELINQUENT_TAX",
  "PROPOSED_SALE_PRICE",
]);
const occupancyEvidenceCategories = new Set([
  "OCCUPANCY",
  "DELIVERY_CONDITION",
  "POSSESSION",
]);
const generalEvidenceExclusions = new Set([
  ...sellerEvidenceCategories,
  ...occupancyEvidenceCategories,
]);
const metricHelp = {
  "As-is AVM—not ARV":
    "Provider model estimate of current as-is value. It is retained evidence—not an analyst ARV or appraisal.",
  "Provider range":
    "Provider-reported valuation interval retained as evidence, not a PI calculation.",
  "Modeled profit":
    "Calculated sale proceeds minus the complete modeled project cost.",
  "Project ROI":
    "Calculated modeled profit divided by total project cost; it is not annualized.",
  "Cash-on-cash":
    "Calculated modeled profit divided by peak cash equity required; it is not annualized.",
  "Return-hurdle MAO":
    "Calculated maximum offer that meets the selected return hurdle under current assumptions.",
  "Break-even purchase ceiling":
    "Calculated highest purchase price where modeled profit reaches zero.",
  "Minimum-profit purchase ceiling":
    "Calculated highest purchase price that still meets the optional minimum-profit target.",
  "Peak equity required":
    "Calculated maximum cash equity needed during the modeled project.",
};
const newEvidence = (category = "RECORDED_MORTGAGE") => ({
  id: crypto.randomUUID(),
  category,
  status: "UNKNOWN",
  value: "",
  sourceName: "",
  sourceDate: "",
  retrievedAt: "",
  verificationClass: "UNKNOWN",
  notes: "",
  attachmentReference: "",
  includeInReport: true,
  sensitive: false,
});
const groupSales = groupComparableObservations;
async function api(route, body, csrfToken = null) {
  const r = await fetch(
      API + route,
      body === undefined
        ? {}
        : {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-PI-Workspace": "local-v1",
              ...(csrfToken ? { "X-PI-CSRF": csrfToken } : {}),
            },
            body: JSON.stringify(body),
          },
    ),
    data = await r.json();
  if (!r.ok) {
    const messages = {
      COMPARABLE_EVIDENCE_NOT_RESTORED:
        "One or more selected comparables do not belong to this exact property evidence snapshot. Reopen Comparable Sales and review the selections.",
      RETAINED_EVIDENCE_SNAPSHOT_NOT_FOUND:
        "This scenario’s evidence snapshot is unavailable. Reopen the property from My Workspace.",
      DURABLE_PROPERTY_NOT_FOUND:
        "This preliminary property can be analyzed now, but it must be saved as a Property before scenario revisions or reports can be stored. Select Save as Property in the property header.",
      PHOTO_REDISTRIBUTION_ACKNOWLEDGMENT_REQUIRED:
        "Confirm that you have permission to distribute the selected property photos, then save the scenario before generating its report.",
      PHOTO_REPORT_SELECTION_INVALID:
        "One or more selected photos no longer match this saved scenario. Review Property Photos and save a new scenario revision.",
      PHOTO_NOT_AVAILABLE:
        "A selected photo is not currently available for reporting. Review the Property Photos selection.",
      PHOTO_INTEGRITY_FAILURE:
        "A selected photo failed its integrity check and was safely excluded. Contact the Property Intelligence administrator.",
    };
    throw Object.assign(new Error(messages[data.error] ?? data.error), {
      code: data.error,
      fields: data.errors,
    });
  }
  return data;
}
const Source = ({ children }) => (
  <small className="iw-source">{children}</small>
);
function Metric({ label, value, help = metricHelp[label] }) {
  return (
    <div className="iw-metric">
      <span className="iw-label-with-help">
        {label}
        {help && <Tooltip content={help} label={`About ${label}`} />}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
const scenarioEvaluationMode = (scenario) =>
  scenario?.evaluationMode === "WHOLESALE_CASH"
    ? "WHOLESALE_CASH"
    : "DETAILED_UNDERWRITING";
function EvaluationModeSelect({ scenario, onChange, compact = false }) {
  return (
    <label className="iw-evaluation-mode">
      <span>Evaluation mode</span>
      <ThemedSelect
        aria-label="Evaluation mode"
        value={scenarioEvaluationMode(scenario)}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="WHOLESALE_CASH">Wholesale / Cash evaluation</option>
        <option value="DETAILED_UNDERWRITING">Detailed underwriting</option>
      </ThemedSelect>
      {!compact && (
        <small>
          Changes the workspace and report emphasis; it does not erase
          assumptions.
        </small>
      )}
    </label>
  );
}
const wholesaleExpenses = [
  ["acquisitionFixed", "Purchase closing expenses"],
  ["contingency", "Rehabilitation contingency"],
  ["propertyTaxes", "Property taxes per day"],
  ["insurance", "Insurance per day"],
  ["utilities", "Utilities per day"],
  ["maintenance", "Maintenance per day"],
  ["sellingCommissionRate", "Selling commission"],
  ["sellerClosingFixed", "Seller closing expenses"],
  ["transferCost", "Transfer costs"],
  ["otherUpfront", "Other upfront expenses"],
  ["otherAtExit", "Other resale expenses"],
];
function WholesaleUnderwriting({
  scenario,
  property,
  result,
  validation,
  field,
  onUpdate,
  onUpdateInputs,
  onUseAvm,
  waterfall,
}) {
  const treatmentFor = (key) =>
    scenario.expenseTreatments?.[key] ??
    (Number(scenario.inputs[key]) > 0 ? "ENTERED" : "NOT_INCLUDED");
  const setTreatment = (key, value) =>
    onUpdate(
      {
        expenseTreatments: {
          ...(scenario.expenseTreatments ?? {}),
          [key]: value,
        },
      },
      { financial: true },
    );
  const grossSpread = [
    scenario.inputs.exitValue,
    scenario.inputs.purchasePrice,
    scenario.inputs.rehabCost,
  ].every((value) => value !== "" && Number.isFinite(Number(value)))
    ? Number(scenario.inputs.exitValue) -
      Number(scenario.inputs.purchasePrice) -
      Number(scenario.inputs.rehabCost)
    : null;
  return (
    <>
      <div className="iw-banner">
        <b>Wholesale / Cash evaluation</b> focuses on acquisition,
        rehabilitation, resale and the potential gross investment spread.
        Detailed underwriting remains available without losing entered values.
      </div>
      <section
        className="iw-observed-context"
        aria-label="Observed evidence context"
      >
        <h3>Observed / provider-reported evidence</h3>
        <div>
          <span>As-is AVM—not ARV</span>
          <b>{money(property.avm.price)}</b>
          <small>
            {property.avm.low == null && property.avm.high == null
              ? "Not checked / not available"
              : `${money(property.avm.low)}–${money(property.avm.high)} provider range`}
          </small>
        </div>
        <div>
          <span>Recorded-sale examples</span>
          <b>{property.sales.length}</b>
          <small>
            {
              Object.values(scenario.compReviews ?? {}).filter(
                (item) => item.include,
              ).length
            }{" "}
            selected by analyst
          </small>
        </div>
      </section>
      <div className="iw-row">
        <button
          className="secondary"
          disabled={property.avm.price == null}
          onClick={onUseAvm}
        >
          Use AVM as starting assumption
        </button>
      </div>
      <div className="iw-editor iw-wholesale-editor">
        <div>
          <h3>Core opportunity assumptions</h3>
          <fieldset className="iw-basic">
            <legend>Wholesale / cash inputs</legend>
            <div className="iw-inputs">
              {field("purchasePrice", "Proposed purchase price ($)")}
              {field("rehabCost", "Estimated rehabilitation cost ($)")}
              {field("exitValue", "Estimated resale / ARV assumption ($)")}
              {field("renovationDays", "Optional renovation duration (days)")}
              {field("marketingDays", "Optional marketing duration (days)")}
              <label>
                <span>Financing</span>
                <ThemedSelect
                  aria-label="Wholesale financing"
                  value={scenario.financingMode ?? "CASH"}
                  onChange={(event) =>
                    onUpdate(
                      { financingMode: event.target.value },
                      { financial: true },
                    )
                  }
                >
                  <option value="CASH">
                    Cash — financing fields not applicable
                  </option>
                  <option value="FINANCED">Acquisition financing</option>
                </ThemedSelect>
                <small>
                  {(scenario.financingMode ?? "CASH") === "CASH"
                    ? "Loan amount, rate, points and fees are N/A."
                    : "Financing inputs are available in Detailed Underwriting."}
                </small>
              </label>
              <label>
                <span>Wholesale / assignment fee</span>
                <ThemedSelect
                  aria-label="Wholesale fee treatment"
                  value={scenario.wholesaleFeeTreatment ?? "UNKNOWN"}
                  onChange={(event) =>
                    onUpdate(
                      { wholesaleFeeTreatment: event.target.value },
                      { financial: true },
                    )
                  }
                >
                  <option value="INCLUDED">Included in purchase price</option>
                  <option value="ADDITIONAL">
                    Additional to purchase price
                  </option>
                  <option value="UNKNOWN">Unknown / confirm</option>
                </ThemedSelect>
                <small>PI never counts an included fee twice.</small>
              </label>
              {scenario.wholesaleFeeTreatment === "ADDITIONAL" && (
                <label>
                  <span>Additional fee amount ($)</span>
                  <input
                    aria-label="Additional wholesale fee amount"
                    type="number"
                    min="0"
                    step="any"
                    value={scenario.wholesaleFeeAmount ?? ""}
                    onChange={(event) =>
                      onUpdate(
                        { wholesaleFeeAmount: event.target.value },
                        { financial: true },
                      )
                    }
                  />
                  {validation.wholesaleFeeAmount && (
                    <small>{validation.wholesaleFeeAmount}</small>
                  )}
                </label>
              )}
            </div>
          </fieldset>
          <details className="iw-advanced">
            <summary>Optional expenses and timing</summary>
            <p className="iw-muted">
              Entered amounts are included in the modeled result. Not included
              and N/A are clearly labeled rather than repeated as blocking
              warnings.
            </p>
            {wholesaleExpenses.map(([key, label]) => (
              <div className="iw-wholesale-expense" key={key}>
                <label>
                  <span>{label} status</span>
                  <ThemedSelect
                    aria-label={`${label} status`}
                    value={treatmentFor(key)}
                    onChange={(event) => setTreatment(key, event.target.value)}
                  >
                    <option value="ENTERED">Entered</option>
                    <option value="NOT_INCLUDED">Not included</option>
                    <option value="NOT_APPLICABLE">Not applicable</option>
                  </ThemedSelect>
                </label>
                {treatmentFor(key) === "ENTERED" ? (
                  field(key, label)
                ) : (
                  <p>
                    {treatmentFor(key) === "NOT_APPLICABLE"
                      ? "N/A"
                      : "Not included in this preliminary evaluation"}
                    .
                  </p>
                )}
              </div>
            ))}
          </details>
          <label>
            Analyst notes
            <textarea
              aria-label="Analyst notes"
              value={scenario.notes}
              maxLength="1500"
              onChange={(event) => onUpdate({ notes: event.target.value })}
            />
          </label>
        </div>
        <aside>
          <h3>Preliminary evaluation</h3>
          <div className="iw-metrics">
            <Metric
              label="Potential Gross Investment Spread"
              value={money(grossSpread)}
            />
            {result && (
              <>
                <Metric
                  label="Modeled result after entered expenses"
                  value={money(result.deterministic.modeledProfit)}
                />
                <Metric
                  label="Illustrative project ROI"
                  value={pct(result.deterministic.roi)}
                />
                <Metric
                  label="Peak cash required"
                  value={money(result.deterministic.cashRequired)}
                />
              </>
            )}
          </div>
          {result ? (
            <>
              <Source>
                Existing certified engine {result.economicsVersion}
              </Source>
              <details className="iw-additional-metrics">
                <summary>Additional Investment Metrics</summary>
                <div className="iw-metrics">
                  <Metric
                    label="Return-hurdle MAO"
                    value={money(result.mao.deterministic.purchasePrice)}
                  />
                  <Metric
                    label="Break-even purchase ceiling"
                    value={money(result.mao.breakEven.purchasePrice)}
                  />
                  <Metric
                    label="Cash-on-cash"
                    value={pct(result.deterministic.cashOnCash)}
                  />
                </div>
              </details>
              <h3>Entered-cost summary</h3>
              {waterfall}
            </>
          ) : (
            <p className="iw-empty">
              Enter purchase price, rehabilitation cost and resale assumption to
              calculate this preliminary evaluation.{" "}
              {Object.values(validation).join(" ")}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
export default function Workspace({ hash = window.location.hash }) {
  const dialog = useNotificationDialog(),
    authentication = useAuthentication();
  const deployed = !["127.0.0.1", "localhost"].includes(
      window.location.hostname,
    ),
    environment = deployed ? "PRIVATE CLOUD" : "LOCAL";
  const context = routeContext(hash),
    directHandoff = Boolean(context.subject);
  const initial = useRef(readWorkspaceDraft()).current,
    recovery = useRef(readSessionRecovery()).current;
  const [data, setData] = useState(null),
    [hydrated, setHydrated] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [drafts, setDrafts] = useState(initial.drafts ?? []),
    [revisions, setRevisions] = useState([]),
    [draftAnalysis, setDraftAnalysis] = useState({}),
    [selected, setSelected] = useState(initial.selected ?? []),
    [activeId, setActiveId] = useState(initial.activeId ?? ""),
    [subject, setSubject] = useState(initial.subject ?? ""),
    [tab, setTab] = useState("Overview"),
    [mode, setMode] = useState(
      context.mode === "advanced" ? "advanced" : "guided",
    ),
    [guidedProgress, setGuidedProgress] = useState(
      initial.guidedProgress ?? {},
    ),
    [search, setSearch] = useState(""),
    [city, setCity] = useState(""),
    [result, setResult] = useState(null),
    [validation, setValidation] = useState({}),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(null),
    [pdfDownload, setPdfDownload] = useState(null),
    [kind, setKind] = useState("brief"),
    [selectedSale, setSelectedSale] = useState(null),
    [researchMessage, setResearchMessage] = useState(""),
    [researchRetry, setResearchRetry] = useState(false),
    [documentReadiness, setDocumentReadiness] = useState([]);
  const s = drafts.find((x) => x.id === activeId && x.propertyRef === subject),
    p = data?.properties.find((x) => x.ref === subject),
    selectedPhotoCount = s?.photoSelections?.length ?? 0,
    photoRightsMissing =
      selectedPhotoCount > 0 &&
      !(
        s?.photoRightsAcknowledgment?.confirmed === true &&
        s.photoRightsAcknowledgment.scenarioId === s.id &&
        s.photoRightsAcknowledgment.selectionFingerprint
      );
  const appliedRoute = useRef(""),
    liveWorkspace = useRef(null),
    reminder = useRef({
      scenarioId: null,
      dirtySince: null,
      lastPromptAt: null,
      prompting: false,
    });
  liveWorkspace.current = workspaceSnapshot({
    drafts,
    selected,
    activeId,
    subject,
    mode,
    guidedProgress,
  });
  useEffect(() => {
    if (!data || !hydrated || appliedRoute.current === hash) return;
    appliedRoute.current = hash;
    try {
      const requested = requestedSubject(
          hash,
          data.properties,
          data.evidenceFingerprint,
        ),
        requestedMode = context.mode === "advanced" ? "advanced" : "guided";
      setMode(requestedMode);
      if (requested) {
        const fingerprint =
            requested.evidenceFingerprint ?? data.evidenceFingerprint,
          scenario = requestedScenario(
            hash,
            requested.ref,
            drafts,
            fingerprint,
          ),
          requestedTab = context.tab
            ? normalizeWorkspaceTab(context.tab)
            : requestedMode === "guided"
              ? "Overview"
              : "Underwriting";
        open(requested.ref, scenario?.id, false, requestedMode);
        setTab(requestedTab);
      }
    } catch (e) {
      setSubject("");
      setActiveId("");
      setPreview(null);
      setError(e.message);
    }
  }, [data, hydrated, hash, drafts]);
  useEffect(() => {
    Promise.all([
      api("/bootstrap"),
      api("/scenarios"),
      api("/scenario-revisions"),
    ])
      .then(([d, saved, history]) => {
        setData(d);
        setRevisions(history);
        setDrafts((local) => {
          const map = new Map(saved.map((x) => [x.id, { ...x, dirty: false }]));
          for (const x of local)
            if (x.dirty || !map.has(x.id)) map.set(x.id, x);
          return [...map.values()];
        });
        setHydrated(true);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    const saved = (event) => {
      const record = event.detail?.property;
      if (!record) return;
      setData((current) =>
        current
          ? {
              ...current,
              properties: current.properties.map((property) =>
                property.ref === record.sourceSubjectRef
                  ? {
                      ...property,
                      subjectKind: "DURABLE_SAVED",
                      durablePropertyId: record.id,
                      lifecycleStatus: record.lifecycleStatus,
                      verificationStatus: record.verificationStatus,
                    }
                  : property,
              ),
            }
          : current,
      );
    };
    window.addEventListener(DURABLE_PROPERTY_SAVED_EVENT, saved);
    return () =>
      window.removeEventListener(DURABLE_PROPERTY_SAVED_EVENT, saved);
  }, []);
  useEffect(() => {
    setDocumentReadiness([]);
    if (!p?.durablePropertyId) return;
    fetch(`/api/durable-properties/${p.durablePropertyId}/documents`, {
      credentials: "same-origin",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => {
        if (value?.completeness) setDocumentReadiness(value.completeness);
      })
      .catch(() => {});
  }, [p?.durablePropertyId]);
  useEffect(() => {
    try {
      writeWorkspaceDraft(liveWorkspace.current);
    } catch {
      setError(
        "Browser draft storage is full or disabled. Use Save locally before closing this tab.",
      );
    }
  }, [drafts, selected, activeId, subject, mode, guidedProgress]);
  useEffect(() => {
    const checkpoint = (event) => {
      try {
        writeSessionRecovery(liveWorkspace.current, {
          reason: event.detail?.reason ?? "SESSION_EXPIRED",
        });
      } catch {}
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, checkpoint);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, checkpoint);
  }, []);
  useEffect(() => {
    if (hydrated && recovery)
      setStatus(
        `Recovered a temporary browser draft saved when the prior secure session expired (${new Date(recovery.savedAt).toLocaleString()}). Save a revision when you are ready.`,
      );
  }, [hydrated]);
  useEffect(() => {
    if (!p || !s || !directHandoff) return;
    requestAnimationFrame(() => {
      const target =
        context.tab === "Compare"
          ? document.querySelector('[data-testid="scenario-comparison"]')
          : document.querySelector(".iw-detail");
      target?.scrollIntoView({ behavior: "instant", block: "start" });
    });
  }, [p?.ref, s?.id, directHandoff, context.tab]);
  const calcKey = s ? scenarioCalculationKey(s) : "";
  const riskSyncKey = s
    ? JSON.stringify([
        s.id,
        s.inputs.exitValue,
        s.inputs.rehabCost,
        s.inputs.renovationDays,
        s.inputs.marketingDays,
        s.risk,
      ])
    : "";
  const activeBinding = useRef(calcKey),
    analysisRequest = useRef(0),
    reportRequest = useRef(false);
  activeBinding.current = calcKey;
  useEffect(() => {
    setResult(!s?.dirty ? (s?.analysis ?? null) : null);
    setValidation({});
    setPreview(null);
    setPdfDownload(null);
    if (!s) return;
    let cancelled = false;
    const request = ++analysisRequest.current,
      timer = setTimeout(
        () =>
          api("/analyze", { scenario: s, risk: false })
            .then((r) => {
              if (cancelled || request !== analysisRequest.current) return;
              const analysis = {
                ...r,
                monteCarlo: !s.dirty ? (s.analysis?.monteCarlo ?? null) : null,
              };
              setResult(analysis);
              setValidation({});
              setDraftAnalysis((current) => ({
                ...current,
                [s.id]: { key: calcKey, analysis },
              }));
            })
            .catch((e) => {
              if (cancelled || request !== analysisRequest.current) return;
              const fields = e.fields ?? { general: e.message };
              setValidation(fields);
              setDraftAnalysis((current) => ({
                ...current,
                [s.id]: {
                  key: calcKey,
                  analysis: null,
                  reason: missingInputSummary(fields).join(" ") || e.message,
                },
              }));
            }),
        250,
      );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [calcKey]);
  useEffect(() => {
    if (tab !== "Risk" || !s) return;
    const synchronized = synchronizeRiskMostLikely(s.risk, s.inputs);
    if (!synchronized.changed) return;
    setDrafts((xs) =>
      xs.map((x) =>
        x.id === s.id
          ? { ...x, risk: synchronized.risk, riskRequested: false, dirty: true }
          : x,
      ),
    );
    setStatus(
      "Most Likely risk values inherited from this scenario. No simulation was run.",
    );
  }, [tab, riskSyncKey]);
  useEffect(() => {
    const state = reminder.current,
      now = Date.now();
    if (!s?.dirty) {
      state.scenarioId = s?.id ?? null;
      state.dirtySince = null;
      state.lastPromptAt = null;
      state.prompting = false;
      return;
    }
    if (state.scenarioId !== s.id || !Number.isFinite(state.dirtySince)) {
      state.scenarioId = s.id;
      state.dirtySince = now;
      state.lastPromptAt = null;
      state.prompting = false;
    }
    const check = async () => {
      if (
        document.visibilityState !== "visible" ||
        dialog.isOpen ||
        state.prompting ||
        !saveReminderDue({
          dirty: s.dirty,
          dirtySince: state.dirtySince,
          lastPromptAt: state.lastPromptAt,
        })
      )
        return;
      state.prompting = true;
      state.lastPromptAt = Date.now();
      try {
        if (
          await dialog.confirm({
            title: "Save your analysis?",
            message:
              "This scenario has unsaved browser-local changes. Save now to create a recoverable revision, or keep editing and PI will remind you again later.",
            confirmLabel: "Save now",
            cancelLabel: "Keep editing",
            tone: "info",
          })
        )
          await save();
      } finally {
        state.prompting = false;
      }
    };
    const timer = setInterval(check, 30_000),
      visible = () => {
        if (document.visibilityState === "visible") check();
      };
    document.addEventListener("visibilitychange", visible);
    check();
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [s?.id, s?.dirty, s?.revision, dialog.isOpen]);
  function update(patch, { financial = false } = {}) {
    setDrafts((xs) =>
      xs.map((x) =>
        x.id === activeId
          ? {
              ...x,
              ...patch,
              dirty: true,
              ...(financial ? { riskRequested: false } : {}),
            }
          : x,
      ),
    );
    setPreview(null);
    setStatus(
      "Draft retained in this browser. Save locally to create a report version.",
    );
  }
  function newScenario(ref = subject, copy = null) {
    if (!data) return;
    const selectedProperty = data.properties.find((p) => p.ref === ref);
    if (!selectedProperty) return;
    const id = crypto.randomUUID();
    const draft = {
      id,
      propertyRef: ref,
      name: copy ? `${copy.name.slice(0, 65)} copy` : "Scenario 1",
      revision: 0,
      evidenceFingerprint:
        selectedProperty.evidenceFingerprint ?? data.evidenceFingerprint,
      inputs: copy ? { ...copy.inputs } : blank(),
      targetType: copy?.targetType ?? "PROFIT_MARGIN_ON_SALE",
      risk: copy ? structuredClone(copy.risk) : blankRisk(),
      compReviews: copy ? structuredClone(copy.compReviews) : {},
      analystEvidence: copy ? structuredClone(copy.analystEvidence ?? []) : [],
      evidenceAttachments: copy
        ? structuredClone(copy.evidenceAttachments ?? [])
        : [],
      sellerValuationBasis: copy?.sellerValuationBasis ?? "PROVIDER_AVM",
      notes: copy?.notes ?? "",
      demonstration: copy?.demonstration ?? false,
      riskRequested: false,
      ...(copy
        ? Object.fromEntries(
            [
              "evaluationMode",
              "financingMode",
              "wholesaleFeeTreatment",
              "wholesaleFeeAmount",
              "expenseTreatments",
            ]
              .filter((key) => copy[key] !== undefined)
              .map((key) => [key, structuredClone(copy[key])]),
          )
        : {
            evaluationMode: "WHOLESALE_CASH",
            financingMode: "CASH",
            wholesaleFeeTreatment: "UNKNOWN",
            wholesaleFeeAmount: "",
            expenseTreatments: {},
          }),
      dirty: true,
    };
    setDrafts((xs) => [...xs, draft]);
    setActiveId(id);
    setSubject(ref);
    setPreview(null);
    return draft;
  }
  function updateInputs(inputs, patch = {}) {
    const synchronized = synchronizeRiskMostLikely(s.risk, inputs);
    update({ ...patch, inputs, risk: synchronized.risk }, { financial: true });
  }
  function bindRoute(ref, id, nextTab = tab, nextMode = mode) {
    const property = data?.properties.find((x) => x.ref === ref);
    if (property)
      history.replaceState(
        null,
        "",
        investmentRoute(
          ref,
          property.evidenceFingerprint ?? data.evidenceFingerprint,
          id,
          nextTab,
          nextMode,
        ),
      );
  }
  function navigateTab(nextTab) {
    const normalized = normalizeWorkspaceTab(nextTab);
    setTab(normalized);
    bindRoute(subject, activeId, normalized);
    requestAnimationFrame(() => {
      document
        .querySelector(".iw-stage-content")
        ?.focus({ preventScroll: true });
      if (mode === "guided")
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }
  function returnToIdentify() {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    location.hash = p
      ? identifyRoute(
          p.ref,
          p.evidenceFingerprint ?? data.evidenceFingerprint,
          activeId,
        )
      : "#analyze-property";
  }
  function open(ref, scenarioId = null, navigate = true, nextMode = mode) {
    const property = data?.properties.find((x) => x.ref === ref),
      fingerprint = property?.evidenceFingerprint ?? data?.evidenceFingerprint;
    setSubject(ref);
    setSelected((xs) => [...new Set([...xs, ref])]);
    setSelectedSale(null);
    setResearchMessage("");
    const existing = scenarioId
      ? drafts.find(
          (x) =>
            x.id === scenarioId &&
            x.propertyRef === ref &&
            x.evidenceFingerprint === fingerprint,
        )
      : drafts.find(
          (x) => x.propertyRef === ref && x.evidenceFingerprint === fingerprint,
        );
    const opened = existing ?? newScenario(ref);
    if (existing) setActiveId(existing.id);
    const firstTab = nextMode === "guided" ? "Overview" : "Underwriting";
    setTab(firstTab);
    setError("");
    setStatus("");
    if (navigate) bindRoute(ref, (existing ?? opened)?.id, firstTab, nextMode);
    requestAnimationFrame(() =>
      document
        .querySelector(".iw-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }
  function chooseScenario(id) {
    const next = drafts.find((x) => x.id === id && x.propertyRef === subject);
    if (!next) {
      setError("Scenario does not belong to this Property.");
      return;
    }
    setActiveId(id);
    setPreview(null);
    bindRoute(subject, id);
  }
  function latestSaved(id) {
    return (
      revisions
        .filter((item) => item.id === id)
        .sort((a, b) => b.revision - a.revision)[0] ?? null
    );
  }
  async function persistScenario(target, { replaceDraftId = null } = {}) {
    setBusy(true);
    setError("");
    try {
      const saved = await api("/save", target, authentication.csrfToken),
        prior = replaceDraftId ? latestSaved(replaceDraftId) : null;
      setDrafts((xs) => {
        let next = replaceDraftId
          ? [
              ...xs.filter(
                (item) => item.id !== replaceDraftId && item.id !== saved.id,
              ),
              ...(prior ? [{ ...prior, dirty: false }] : []),
            ]
          : xs;
        const clean = { ...saved, dirty: false };
        return next.some((item) => item.id === saved.id)
          ? next.map((item) => (item.id === saved.id ? clean : item))
          : [...next, clean];
      });
      setRevisions((xs) => [
        ...xs.filter(
          (item) => !(item.id === saved.id && item.revision === saved.revision),
        ),
        saved,
      ]);
      setActiveId(saved.id);
      bindRoute(saved.propertyRef, saved.id);
      reminder.current = {
        scenarioId: saved.id,
        dirtySince: null,
        lastPromptAt: null,
        prompting: false,
      };
      if (
        !drafts.some(
          (item) =>
            item.dirty && item.id !== target.id && item.id !== replaceDraftId,
        )
      )
        clearSessionRecovery();
      setStatus(
        `Saved as revision ${saved.revision}${saved.validation ? " — incomplete draft; complete highlighted assumptions before export." : "."}`,
      );
      return saved;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save({ propertyReady = false } = {}) {
    if (!s?.dirty) return s;
    if (!propertyReady && p?.subjectKind !== "DURABLE_SAVED") {
      setBusy(true);
      setError("");
      try {
        const promoted = await promotePreliminaryProperty({
          property: p,
          scenario: s,
          prepareScenario: true,
          authentication,
          dialog,
        });
        if (!promoted) return null;
        propertyReady = true;
      } catch (e) {
        setError(e.message);
        await dialog.notify({
          title: "Property and scenario were not saved",
          message: e.message,
          confirmLabel: "Close",
          tone: "warning",
        });
        return null;
      } finally {
        setBusy(false);
      }
    }
    if (s.revision > 0) {
      const choice = await dialog.choose({
        title: "Save these changes",
        message: `${s.name} already has saved revision ${s.revision}. Save revision ${s.revision + 1} in this scenario, or create a separate scenario. Earlier saved revisions are never overwritten.`,
        tone: "info",
        actions: [
          { label: "Cancel", value: "cancel" },
          { label: "Create new scenario", value: "new" },
          {
            label: `Save revision ${s.revision + 1}`,
            value: "revision",
            primary: true,
          },
        ],
      });
      if (choice !== "revision" && choice !== "new") return null;
      if (choice === "new") {
        const target = {
          ...structuredClone(s),
          id: crypto.randomUUID(),
          name: `${s.name.slice(0, 65)} copy`,
          revision: 0,
          dirty: true,
        };
        delete target.savedAt;
        delete target.analysis;
        delete target.validation;
        return persistScenario(target, { replaceDraftId: s.id });
      }
    }
    return persistScenario(s);
  }
  function duplicateScenario() {
    const draft = newScenario(subject, s);
    bindRoute(subject, draft?.id, tab);
  }
  function createBlankScenario() {
    const draft = newScenario();
    bindRoute(subject, draft?.id, tab);
  }
  async function resetDraft() {
    if (
      await dialog.confirm({
        title: "Reset this draft?",
        message:
          "Purchase, rehabilitation, resale and risk assumptions in this browser draft will be cleared. Saved revisions remain unchanged.",
        confirmLabel: "Reset draft",
        tone: "danger",
      })
    )
      update({ inputs: blank(), risk: blankRisk() }, { financial: true });
  }
  async function changeProperty() {
    if (
      s?.dirty &&
      !(await dialog.confirm({
        title: "Change property?",
        message:
          "This scenario has unsaved changes. They remain only in this browser until you save a revision. Stay here to save, or continue to choose another property.",
        confirmLabel: "Change property",
        cancelLabel: "Stay here",
        tone: "warning",
      }))
    )
      return;
    returnToIdentify();
  }
  async function researchProperty({ operations = null, refresh = false } = {}) {
    if (!p || busy) return;
    setBusy(true);
    setError("");
    setResearchMessage("Preparing RentCast cost confirmation…");
    try {
      const approved = await approveAndRunProviderResearch({
        dialog,
        payload: {
          retainedSubjectRef: p.ref,
          ...(operations ? { operations } : {}),
          refresh,
        },
      });
      if (approved.cancelled) {
        setResearchMessage(
          "Research was not started. No RentCast request was made.",
        );
        return;
      }
      setResearchMessage("Researching approved RentCast evidence…");
      const research = approved.result,
        refreshed = await api("/bootstrap"),
        updated = refreshed.properties.find((item) => item.ref === p.ref);
      setData(refreshed);
      const unavailable = research.operations
        .filter((item) => item.status === "Unavailable")
        .map((item) => item.label);
      setResearchRetry(unavailable.length > 0);
      setResearchMessage(
        unavailable.length
          ? `${research.requestsUsed} approved provider request${research.requestsUsed === 1 ? "" : "s"} completed. ${unavailable.join(" and ")} remain unavailable. Retry Research is available immediately; no automatic retry will occur.`
          : research.requestsUsed
            ? `${research.requestsUsed} approved provider request${research.requestsUsed === 1 ? "" : "s"} completed. Available research has been added to this property.`
            : "Existing retained or cached research is already available; no provider request was needed.",
      );
      if (
        updated?.evidenceFingerprint &&
        updated.evidenceFingerprint !== p.evidenceFingerprint
      )
        location.hash = investmentRoute(
          updated.ref,
          updated.evidenceFingerprint,
          null,
          "Sold Sales",
          mode,
        );
    } catch (error) {
      setResearchRetry(true);
      const messages = {
        PROVIDER_RESEARCH_NOT_AUTHORIZED:
          "Your PI account is not permitted to use provider research.",
        ORGANIZATION_NOT_AUTHORIZED:
          "Your PI account is not assigned to this organization.",
        RESEARCH_ALREADY_IN_PROGRESS:
          "The same research is already running. Wait for it to finish.",
        RESEARCH_APPROVAL_EXPIRED:
          "The cost confirmation expired. Select Retry Research to review a new confirmation.",
        RESEARCH_APPROVAL_USED:
          "That confirmation was already used. Select Retry Research to review a new confirmation.",
        RATE_LIMIT_STOP:
          "Research is temporarily rate limited. Try again shortly.",
        PROVIDER_ERROR:
          "RentCast did not complete the approved request. Retry Research is available immediately; the prior billing status may be unknown.",
      };
      setResearchMessage(
        messages[error.code] ??
          `Research unavailable: ${String(error.code ?? error.message)
            .replaceAll("_", " ")
            .toLowerCase()}. Retry Research is available immediately.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function runRisk() {
    if (!riskReadiness(s.risk).ready || !result?.deterministic) return;
    const request = ++analysisRequest.current;
    setBusy(true);
    setError("");
    try {
      const r = await api("/analyze", { scenario: s, risk: true });
      if (
        activeBinding.current !== calcKey ||
        request !== analysisRequest.current
      )
        return;
      setResult(r);
      setDraftAnalysis((current) => ({
        ...current,
        [s.id]: { key: calcKey, analysis: r },
      }));
      setValidation({});
      update({ riskRequested: true });
      markGuided("risk", "COMPLETE");
      setStatus(
        "Conditional simulation completed. Save locally to include these analyst-selected distribution results in the report.",
      );
    } catch (e) {
      if (
        activeBinding.current === calcKey &&
        request === analysisRequest.current
      ) {
        setError(e.message);
        setValidation(e.fields ?? {});
      }
    } finally {
      setBusy(false);
    }
  }
  async function previewReport(reportKind = kind) {
    if (reportRequest.current) {
      setStatus(
        "A report request is already in progress. Wait for it to finish before starting another.",
      );
      return;
    }
    reportRequest.current = true;
    setError("");
    setBusy(true);
    setKind(reportKind);
    try {
      if (s.dirty)
        throw new Error(
          "Save locally before previewing; the report must use a saved scenario revision.",
        );
      const r = await api("/report", {
        id: s.id,
        revision: s.revision,
        kind: reportKind,
      });
      if (activeBinding.current === calcKey) {
        setPreview({
          html: r.html,
          filename: r.filename,
          id: s.id,
          revision: s.revision,
          kind: reportKind,
          checklist: r.checklist,
        });
        markGuided("reports", "COMPLETE");
        recordReportReference({
          scenario: s,
          property: p,
          kind: reportKind,
          status: "PREVIEWED",
          filename: r.filename,
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      reportRequest.current = false;
      setBusy(false);
    }
  }
  async function saveAndPreview() {
    if (reportRequest.current) {
      setStatus(
        "A report request is already in progress. Wait for it to finish before starting another.",
      );
      return;
    }
    reportRequest.current = true;
    setError("");
    try {
      if (!s.dirty || !result)
        throw new Error(
          "Complete the highlighted underwriting inputs before using Save & Preview.",
        );
      const saved = await save();
      if (!saved) return;
      if (saved.validation || !saved.analysis)
        throw new Error(
          saved.validation?.message ??
            "The saved revision is incomplete and cannot be previewed.",
        );
      setBusy(true);
      bindRoute(saved.propertyRef, saved.id, "Reports");
      const report = await api("/report", {
        id: saved.id,
        revision: saved.revision,
        kind,
      });
      setPreview({
        html: report.html,
        filename: report.filename,
        id: saved.id,
        revision: saved.revision,
        kind,
      });
      setGuidedProgress((current) => ({
        ...current,
        [saved.id]: { ...(current[saved.id] ?? {}), reports: "COMPLETE" },
      }));
      recordReportReference({
        scenario: saved,
        property: p,
        kind,
        status: "PREVIEWED",
        filename: report.filename,
      });
      setStatus(
        `Saved immutable revision ${saved.revision} and opened its ${kind === "brief" ? "Opportunity Brief" : "Full Investor Package"} preview.`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      reportRequest.current = false;
      setBusy(false);
    }
  }
  async function generatePdf(
    reportKind = kind,
    { download = false, finalizationId = null } = {},
  ) {
    if (reportRequest.current) {
      setStatus(
        "A report request is already in progress. Wait for it to finish before starting another.",
      );
      return;
    }
    reportRequest.current = true;
    setBusy(true);
    setError("");
    setPdfDownload(null);
    setKind(reportKind);
    try {
      if (photoRightsMissing && reportKind !== "checklist")
        throw new Error(
          "Property photo permission must be confirmed before generating this report. Open Property Photos, confirm permission, and save the scenario.",
        );
      if (s.dirty || !s.analysis)
        throw new Error(
          "Save this scenario with complete calculations before generating a PDF. Unsaved browser changes are never substituted.",
        );
      const r = await fetch(API + (deployed ? "/report/pdf" : "/report"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PI-Workspace": "local-v1",
          ...(authentication.csrfToken
            ? { "X-PI-CSRF": authentication.csrfToken }
            : {}),
        },
        body: JSON.stringify({
          id: s.id,
          revision: s.revision,
          kind: reportKind,
          pdf: true,
          requestId: crypto.randomUUID(),
          ...(finalizationId ? { finalizationId } : {}),
        }),
      });
      if (!r.ok) {
        const response = await r.json().catch(() => ({})),
          messages = {
            PDF_RENDER_IN_PROGRESS:
              "A report is already being generated. Wait for it to finish before selecting Generate PDF again.",
            DUPLICATE_REPORT_REQUEST:
              "This report request is already running. No additional report was created.",
            PDF_RENDER_TIMEOUT:
              "PDF generation timed out safely. No download was created.",
            PDF_RENDER_FAILED:
              "PDF generation could not be completed. Your saved scenario was not changed.",
            SESSION_EXPIRED:
              "Your session expired. Sign in again before generating a report.",
            PHOTO_REDISTRIBUTION_ACKNOWLEDGMENT_REQUIRED:
              "Confirm that you have permission to distribute the selected property photos, then save the scenario before generating its report.",
            PHOTO_REPORT_SELECTION_INVALID:
              "One or more selected photos no longer match this saved scenario. Review Property Photos and save a new scenario revision.",
            PHOTO_NOT_AVAILABLE:
              "A selected photo is not currently available for reporting. Review the Property Photos selection.",
            PHOTO_INTEGRITY_FAILURE:
              "A selected photo failed its integrity check and was safely excluded. Contact the Property Intelligence administrator.",
          };
        throw new Error(
          messages[response.error] ??
            "The PDF could not be generated safely. Your saved scenario was not changed.",
        );
      }
      const disposition = r.headers.get("Content-Disposition") ?? "",
        headerName = disposition.match(/filename="([^"]+)"/)?.[1],
        labels = {
          brief: "Opportunity_Brief",
          full: "Full_Investor_Package",
          checklist: "Investment_Due_Diligence_Checklist",
        },
        filename = headerName ?? `${labels[reportKind]}.pdf`,
        blob = await r.blob();
      setPdfDownload({
        blob,
        filename,
        id: s.id,
        revision: s.revision,
        kind: reportKind,
      });
      recordReportReference({
        scenario: s,
        property: p,
        kind: reportKind,
        status: finalizationId
          ? "FINALIZED"
          : download
            ? "DOWNLOADED"
            : "GENERATED",
        filename,
      });
      if (download) {
        const url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      setStatus(
        finalizationId
          ? `Finalized report generated from revision ${s.revision} with authenticated attribution and disclosures.`
          : download
            ? `Checklist generated from saved revision ${s.revision} and downloaded.`
            : `PDF generated from saved revision ${s.revision}. Select Download PDF to save it to this device.`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      reportRequest.current = false;
      setBusy(false);
    }
  }
  function downloadPdf() {
    setError("");
    try {
      if (
        !pdfDownload ||
        pdfDownload.id !== s.id ||
        pdfDownload.revision !== s.revision ||
        pdfDownload.kind !== kind
      )
        throw new Error("Generate this saved report before downloading it.");
      const url = URL.createObjectURL(pdfDownload.blob),
        a = document.createElement("a");
      a.href = url;
      a.download = pdfDownload.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      recordReportReference({
        scenario: s,
        property: p,
        kind,
        status: "DOWNLOADED",
        filename: pdfDownload.filename,
      });
      setStatus(
        "PDF downloaded. Retain the full county disclaimer when sharing county-derived data.",
      );
    } catch (e) {
      setError(e.message);
    }
  }
  async function applyPreset() {
    if (
      !(await dialog.confirm({
        title: "Apply illustrative expenses?",
        message:
          "This replaces seven expense fields in the current draft. Saved revisions remain unchanged.",
        confirmLabel: "Apply preset",
      }))
    )
      return;
    update({ inputs: { ...s.inputs, ...preset } }, { financial: true });
    setStatus(
      "Illustrative expense preset applied to this draft. Review and edit every amount before relying on the analysis.",
    );
  }
  async function populateRisk() {
    const seeded = illustrativeRiskAssumptions(s.inputs);
    if (!seeded.ok) {
      setError(seeded.reason);
      return;
    }
    if (
      hasCustomRiskValues(s.risk) &&
      !(await dialog.confirm({
        title: "Replace current risk ranges?",
        message:
          "This replaces the editable minimum, most likely and maximum values in this draft. It does not run a simulation.",
        confirmLabel: "Replace ranges",
      }))
    )
      return;
    setError("");
    const next = markIllustrativeRiskValues(
      {
        ...s.risk,
        seed: s.risk.seed || DEFAULT_RISK_SEED,
        rationale:
          s.risk.rationale ||
          "Illustrative analyst-selected triangular ranges derived from the current scenario; not calibrated to observed market frequencies.",
      },
      seeded.variables,
    );
    update({ risk: next }, { financial: true });
    setStatus(
      "Illustrative risk assumptions populated for review. No simulation has run; edit the bounds, then explicitly select Run Monte Carlo.",
    );
  }
  function switchMode(nextMode) {
    setMode(nextMode);
    bindRoute(subject, activeId, tab, nextMode);
    setStatus(
      nextMode === "guided"
        ? "Guided Analysis is using this same property, evidence snapshot and scenario."
        : "Advanced Workspace is using this same property, evidence snapshot and scenario.",
    );
  }
  function markGuided(stepId, state) {
    if (!s) return;
    setGuidedProgress((current) => ({
      ...current,
      [s.id]: { ...(current[s.id] ?? {}), [stepId]: state },
    }));
  }
  function moveGuided(action) {
    const navigation = guidedStepNavigation(tab),
      target = action === "back" ? navigation.previous : navigation.next;
    if (action === "continue") markGuided(navigation.current.id, "COMPLETE");
    if (action === "skip") markGuided(navigation.current.id, "SKIPPED");
    if (!target) return;
    if (target.id === "identify") {
      returnToIdentify();
      return;
    }
    navigateTab(target.tabs[0]);
  }
  async function saveAndExit() {
    const saved = s.dirty ? await save() : s;
    if (!saved) return;
    location.hash = `#saved-deals?scenario=${encodeURIComponent(saved.id)}`;
  }
  function setFinancing(choice) {
    update({ financingMode: choice }, { financial: true });
  }
  const attachableInputTypes = {
    purchasePrice: "CONTRACT_CLOSING_EXPENSE",
    rehabCost: "REHABILITATION_ESTIMATE",
    exitValue: "COMPARABLE_VALUATION",
    acquisitionFixed: "CONTRACT_CLOSING_EXPENSE",
    acquisitionRate: "CONTRACT_CLOSING_EXPENSE",
    sellerClosingFixed: "CONTRACT_CLOSING_EXPENSE",
    sellerClosingRate: "CONTRACT_CLOSING_EXPENSE",
    transferCost: "CONTRACT_CLOSING_EXPENSE",
    otherUpfront: "CONTRACT_CLOSING_EXPENSE",
    otherAtExit: "CONTRACT_CLOSING_EXPENSE",
  };
  const field = (key, label) => (
    <div
      key={key}
      className={`iw-input-with-evidence ${validation[key] ? "iw-invalid" : ""}`}
    >
      <label>
        <span className="iw-label-with-help">
          {label}
          {fieldHelp[key] && (
            <Tooltip content={fieldHelp[key]} label={`About ${label}`} />
          )}
        </span>
        <input
          data-testid={`input-${key}`}
          type="number"
          step="any"
          min="0"
          value={s.inputs[key]}
          onChange={(e) => updateInputs({ ...s.inputs, [key]: e.target.value })}
        />
        <small>
          Analyst assumption{validation[key] ? ` · ${validation[key]}` : ""}
        </small>
      </label>
      {attachableInputTypes[key] && (
        <InlineEvidenceAttachments
          property={p}
          scenarioId={s.id}
          fieldKey={`UNDERWRITING.${key.toUpperCase()}`}
          fieldLabel={label}
          defaultDocumentType={attachableInputTypes[key]}
          links={s.evidenceAttachments ?? []}
          onChange={(evidenceAttachments) => update({ evidenceAttachments })}
        />
      )}
    </div>
  );
  const riskInput = (key, label, bound) => {
    const origin = riskValueOrigin(s.risk, key, bound),
      inherited = origin === RISK_VALUE_ORIGINS.INHERITED,
      canRelink =
        bound === "mode" && (inherited || origin === RISK_VALUE_ORIGINS.MANUAL),
      override = bound === "mode" && origin === RISK_VALUE_ORIGINS.MANUAL;
    const setOverride = (enabled) => {
      update(
        { risk: setRiskMostLikelyOverride(s.risk, key, s.inputs, enabled) },
        { financial: true },
      );
      setStatus(
        enabled
          ? `${label} Most Likely is now a Monte Carlo override. It will no longer follow underwriting changes, and the underwriting assumption itself is unchanged.`
          : `${label} Most Likely was restored to the current underwriting value and will follow future underwriting changes.`,
      );
    };
    return (
      <td key={bound}>
        <div className="iw-risk-input">
          <input
            aria-label={`${key} ${bound}`}
            aria-required="true"
            aria-readonly={inherited}
            readOnly={inherited}
            required
            data-origin={origin}
            type="number"
            min="0"
            step="any"
            value={s.risk.variables[key]?.[bound] ?? ""}
            onChange={(e) =>
              update(
                { risk: editRiskValue(s.risk, key, bound, e.target.value) },
                { financial: true },
              )
            }
          />
          <div className="iw-risk-input-meta">
            <small className={`origin-${origin.toLowerCase()}`}>
              {riskOriginLabels[origin]}
            </small>
            {canRelink && (
              <div className="iw-risk-override-actions">
                <label className="iw-risk-override">
                  <input
                    type="checkbox"
                    aria-label={`Edit ${label} Most Likely override`}
                    checked={override}
                    onChange={(e) => setOverride(e.target.checked)}
                  />{" "}
                  Edit
                </label>
                {override && (
                  <button
                    type="button"
                    className="iw-risk-restore"
                    aria-label={`Restore default ${label} Most Likely`}
                    data-tooltip="Restore the current underwriting value and resume automatic synchronization."
                    onClick={() => setOverride(false)}
                  >
                    Restore Default
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
    );
  };
  const waterfall = result && (
    <div className="iw-waterfall">
      {Object.entries(result.deterministic.costs).map(([k, v]) => (
        <div key={k}>
          <span>
            {k.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2")}
          </span>
          <b>{money(v)}</b>
        </div>
      ))}
      <div>
        <strong>Total project cost</strong>
        <b>{money(result.deterministic.totalProjectCost)}</b>
      </div>
      <div>
        <strong>Gross sale assumption</strong>
        <b>{money(result.deterministic.grossSale)}</b>
      </div>
      <div>
        <strong>Modeled profit</strong>
        <b>{money(result.deterministic.modeledProfit)}</b>
      </div>
    </div>
  );
  if (!data)
    return (
      <main className="investment-workspace">
        <h1>PI Investment Workspace</h1>
        <p role="status">{error || "Loading retained evidence…"}</p>
      </main>
    );
  const pool = data.properties.filter(
    (x) =>
      (!city || x.city === city) &&
      `${x.address} ${x.ref}`.toLowerCase().includes(search.toLowerCase()),
  );
  const saleMapModel = data.propertyDetails?.find(
      (x) => x.subjectRef === subject,
    ),
    saleGroups = groupSales(p?.sales ?? []),
    evaluationMode = scenarioEvaluationMode(s),
    financing =
      s?.financingMode ??
      (Number(s?.inputs.loanAmount) > 0 ? "FINANCED" : "CASH"),
    riskState = riskReadiness(s?.risk),
    riskRangeIncomplete = riskState.missing.some((item) => item.includes(".")),
    riskMissingLabels = [
      ...(!result?.deterministic
        ? ["complete valid underwriting assumptions"]
        : []),
      ...(riskRangeIncomplete
        ? [
            "complete ordered Minimum, Most Likely and Maximum values for all four ranges",
          ]
        : []),
      ...(riskState.missing.includes("seed")
        ? ["enter a reproducible seed"]
        : []),
      ...(riskState.missing.includes("iterations")
        ? ["enter 100–20,000 whole-number iterations"]
        : []),
      ...(riskState.missing.includes("rationale")
        ? ["explain the distribution rationale"]
        : []),
    ],
    riskCanRun = Boolean(result?.deterministic) && riskState.ready;
  const currentStage = stageForTab(tab);
  const currentGuided = guidedStepForTab(tab),
    guidedNavigation = guidedStepNavigation(tab),
    currentProgress = s ? (guidedProgress[s.id] ?? {}) : {},
    guidedSellerEntries = (s?.analystEvidence ?? []).filter((item) =>
      [
        "ORIGINAL_PRINCIPAL",
        "ALGORITHMIC_BALANCE",
        "VERIFIED_PAYOFF",
        "LIEN",
        "DELINQUENT_TAX",
      ].includes(item.category),
    ),
    guidedNeedsReview = {
      research: (p?.findings.length ?? 0) > 0,
      comparables: s
        ? Object.values(s.compReviews ?? {}).every((item) => !item.include)
        : false,
      evidence:
        !guidedSellerEntries.length ||
        guidedSellerEntries.some((item) => item.status === "UNKNOWN"),
    };
  const comparisonRecords = [
    ...revisions.filter((x) => selected.includes(x.propertyRef)),
    ...drafts.filter((x) => x.dirty && selected.includes(x.propertyRef)),
  ];
  const identifyHref = p
    ? identifyRoute(
        p.ref,
        p.evidenceFingerprint ?? data.evidenceFingerprint,
        activeId,
      )
    : "#analyze-property";
  return (
    <main className={`investment-workspace mode-${mode}`}>
      <ProductNav active="workspace" guidedHref={identifyHref} />
      <nav
        className="workflow-steps iw-workflow"
        aria-label="Investment research workflow"
      >
        <a href={identifyHref}>Identify property</a>
        <a
          data-testid="back-to-property"
          href={
            p
              ? detailRoute(
                  p.ref,
                  p.evidenceFingerprint ?? data.evidenceFingerprint,
                )
              : "#property-detail"
          }
        >
          Property evidence
        </a>
        <strong>
          {mode === "guided" ? "Guided analysis" : "Advanced workspace"}
        </strong>
      </nav>
      <header className="iw-header">
        <div>
          <div className="iw-eyebrow">
            {mode === "guided"
              ? "GUIDED INVESTMENT ANALYSIS"
              : "ADVANCED INVESTMENT WORKSPACE"}{" "}
            · {environment}
          </div>
          <h1>
            {mode === "guided"
              ? "Evaluate this opportunity step by step"
              : "Investment workspace"}
          </h1>
          <p>
            {mode === "guided"
              ? "Follow the evidence, enter your assumptions, review risk and prepare a professional investor package."
              : "Research → comparable sales → seller evidence → financial analysis → investor reports"}
          </p>
        </div>
        <div className="iw-header-actions">
          <span className="iw-pill">
            {deployed
              ? "Durable Firestore workspace"
              : "Local retained evidence"}
          </span>
          <button
            className="secondary"
            data-testid="workspace-mode"
            onClick={() =>
              switchMode(mode === "guided" ? "advanced" : "guided")
            }
          >
            {mode === "guided"
              ? "Open Advanced Workspace"
              : "Return to Guided Analysis"}
          </button>
        </div>
      </header>
      {mode === "advanced" && (
        <details className="iw-workspace-notice">
          <summary>Research scope and limitations</summary>
          <p>
            Preliminary underwriting—not appraisal or title verification. Local
            scenarios do not create durable Properties, approve legal identities
            or select MLS Round 1.
          </p>
        </details>
      )}
      {error && (
        <div className="iw-error" role="alert">
          {error}
        </div>
      )}
      {status && (
        <div className="iw-status" role="status">
          {status}
        </div>
      )}
      {mode === "advanced" && directHandoff && p && (
        <section className="iw-context" data-testid="subject-handoff">
          <div>
            <span>Analyzing selected property</span>
            <strong>{p.address}</strong>
            <small>
              Its retained evidence snapshot is locked to this underwriting
              session.
            </small>
          </div>
          <a
            href="#investment"
            data-tooltip="Return to the property selector without changing this draft or its saved revisions."
          >
            Choose another property
          </a>
        </section>
      )}
      {mode === "guided" && !p && (
        <section className="iw-panel iw-guided-identify">
          <p className="iw-eyebrow">STEP 1 OF 7</p>
          <h2>Identify the property first</h2>
          <p>
            Enter an address so PI can search saved properties and retained
            research before any optional provider lookup.
          </p>
          <a className="primary-action" href="#analyze-property">
            Enter a property address →
          </a>
        </section>
      )}
      {mode === "advanced" && !directHandoff && (
        <section className="iw-panel">
          <div className="iw-row">
            <h2>Choose property</h2>
            <button
              onClick={() =>
                setSelected(
                  data.properties
                    .filter((p) => p.ref.startsWith("GABE-"))
                    .map((p) => p.ref),
                )
              }
              data-testid="demo-batch"
            >
              Select six properties
            </button>
            <button className="secondary" onClick={() => setSelected([])}>
              Clear comparison
            </button>
          </div>
          <div className="iw-row">
            <label>
              Search properties
              <input
                aria-label="Search properties"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Property address"
              />
            </label>
            <label>
              City
              <ThemedSelect
                aria-label="Filter city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">All cities</option>
                {[...new Set(data.properties.map((x) => x.city))].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </ThemedSelect>
            </label>
            <b>{selected.length} selected for comparison</b>
          </div>
          <div className="iw-pool">
            {pool.map((x) => (
              <article
                key={x.ref}
                className={`iw-property ${subject === x.ref ? "active" : ""}`}
              >
                <label className="iw-check">
                  <input
                    type="checkbox"
                    aria-label={`Add ${x.address} to comparison`}
                    checked={selected.includes(x.ref)}
                    onChange={(e) =>
                      setSelected((xs) =>
                        e.target.checked
                          ? [...new Set([...xs, x.ref])].slice(0, 6)
                          : xs.filter((k) => k !== x.ref),
                      )
                    }
                  />
                  {x.subjectKind === "DURABLE_SAVED"
                    ? "Saved Property"
                    : x.subjectKind === "DISCOVERY_CANDIDATE"
                      ? "County discovery candidate"
                      : "Reviewed preliminary property"}
                </label>
                <h3>{x.address}</h3>
                <p>
                  {x.attributes.bedrooms ?? "Not available"} BD /{" "}
                  {x.attributes.bathrooms ?? "Not available"} BA ·{" "}
                  {x.attributes.squareFootage?.toLocaleString() ??
                    "Not available"}{" "}
                  SF · {x.attributes.propertyType ?? "Not available"}
                </p>
                <p>
                  As-is AVM <b>{money(x.avm.price)}</b>
                </p>
                <Source>
                  {x.subjectKind === "DISCOVERY_CANDIDATE"
                    ? "County evidence · valuation not checked"
                    : `RentCast retained ${date(x.valuationRetrievedAt)} · ${x.sales.length} reported Sale examples`}
                </Source>
                <p className="iw-muted">
                  {x.subjectKind === "DURABLE_SAVED"
                    ? "No county distress snapshot attached."
                    : `Historical county screening evidence · ${date(x.historicalTrigger.sourceDate)}.`}{" "}
                  Current distress unverified.
                </p>
                <button
                  data-testid={`open-${x.ref}`}
                  onClick={() => open(x.ref)}
                >
                  {drafts.some((scenario) => scenario.propertyRef === x.ref)
                    ? "Continue Analysis"
                    : "Analyze this property"}
                </button>
              </article>
            ))}
          </div>
          {!pool.length && <p>No cached subjects match this filter.</p>}
        </section>
      )}
      {p && s && (
        <section className="iw-panel iw-detail">
          {mode === "guided" && (
            <GuidedWorkspaceHeader
              property={p}
              scenario={s}
              scenarios={drafts.filter(
                (x) =>
                  x.propertyRef === p.ref &&
                  x.evidenceFingerprint ===
                    (p.evidenceFingerprint ?? data.evidenceFingerprint),
              )}
              current={currentGuided}
              progress={currentProgress}
              needsReview={guidedNeedsReview}
              result={result}
              preview={preview}
              busy={busy}
              onStep={(step) =>
                step.id === "identify"
                  ? changeProperty()
                  : navigateTab(step.tabs[0])
              }
              onChangeProperty={changeProperty}
              onChooseScenario={chooseScenario}
              onRename={(name) => update({ name })}
              onEvaluationMode={(evaluationMode) =>
                update({ evaluationMode }, { financial: true })
              }
              onSave={save}
              onDuplicate={duplicateScenario}
              onNewBlank={createBlankScenario}
              onReset={resetDraft}
            />
          )}{" "}
          {mode === "advanced" && (
            <div className="iw-row">
              <div>
                <div className="iw-eyebrow">
                  {p.subjectKind === "DURABLE_SAVED"
                    ? "SAVED PROPERTY"
                    : "PROPERTY RESEARCH"}
                </div>
                <h2>{p.address}</h2>
                <Source>
                  Retained evidence snapshot remains bound to this property and
                  scenario.
                </Source>
              </div>
            </div>
          )}
          {mode === "advanced" && (
            <div className="iw-scenario" data-testid="scenario-toolbar">
              <label>
                Active scenario
                <ThemedSelect
                  aria-label="Scenario"
                  value={activeId}
                  onChange={(e) => chooseScenario(e.target.value)}
                >
                  {drafts
                    .filter(
                      (x) =>
                        x.propertyRef === p.ref &&
                        x.evidenceFingerprint ===
                          (p.evidenceFingerprint ?? data.evidenceFingerprint),
                    )
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} · r{x.revision}
                        {x.dirty ? " · draft" : ""}
                      </option>
                    ))}
                </ThemedSelect>
              </label>
              <label>
                Scenario name
                <input
                  aria-label="Scenario name"
                  maxLength="80"
                  value={s.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </label>
              <EvaluationModeSelect
                scenario={s}
                onChange={(next) =>
                  update({ evaluationMode: next }, { financial: true })
                }
              />
              <button
                onClick={save}
                disabled={busy}
                data-testid="save-scenario"
                data-tooltip="Save now as a new immutable revision. PI also reminds you every 10 minutes while changes remain unsaved."
              >
                Save locally
              </button>
              <button
                className="secondary"
                data-tooltip="Copy the current assumptions into a separate unsaved scenario."
                onClick={duplicateScenario}
              >
                Duplicate
              </button>
              <button
                className="secondary"
                data-tooltip="Create a separate blank scenario for this same property and evidence snapshot."
                onClick={createBlankScenario}
              >
                New blank
              </button>
              <button
                className="secondary"
                data-tooltip="Reset only this browser draft; saved revisions remain unchanged."
                onClick={resetDraft}
              >
                Reset draft
              </button>
              <small>
                {s.dirty
                  ? "Unsaved draft retained in this browser"
                  : `Saved revision ${s.revision} · ${date(s.savedAt)}`}
              </small>
            </div>
          )}
          {mode === "advanced" && (
            <nav
              className="iw-stage-nav"
              role="tablist"
              aria-label="Five-stage investment workflow"
            >
              {WORKFLOW_STAGES.map((stage, index) => (
                <button
                  role="tab"
                  aria-selected={currentStage.id === stage.id}
                  data-testid={`stage-${stage.id}`}
                  key={stage.id}
                  onClick={() => navigateTab(stage.tabs[0])}
                >
                  <span>{index + 1}</span>
                  {stage.label}
                </button>
              ))}
            </nav>
          )}
          {mode === "guided" && (
            <section className="iw-guided-intro">
              <div>
                <span>
                  Step{" "}
                  {GUIDED_STEPS.findIndex(
                    (step) => step.id === currentGuided.id,
                  ) + 1}{" "}
                  of 7
                </span>
                <h3>{currentGuided.label}</h3>
              </div>
              <p>{currentGuided.purpose}</p>
            </section>
          )}
          <div
            className="iw-tabs"
            role="tablist"
            aria-label={`${mode === "guided" ? currentGuided.label : currentStage.label} sections`}
          >
            {(mode === "guided" ? currentGuided.tabs : currentStage.tabs).map(
              (t) => (
                <button
                  role="tab"
                  aria-selected={tab === t}
                  key={t}
                  data-tooltip={`Show ${t.toLowerCase()} without changing saved data.`}
                  onClick={() => navigateTab(t)}
                >
                  {t}
                </button>
              ),
            )}
          </div>
          <div className="iw-stage-content" tabIndex="-1">
            {tab === "Overview" && (
              <>
                <h3>Observed / provider-reported evidence</h3>
                <div className="iw-metrics">
                  <Metric
                    label="As-is AVM—not ARV"
                    value={money(p.avm.price)}
                  />
                  <Metric
                    label="Provider range"
                    value={
                      p.avm.low == null && p.avm.high == null
                        ? "Not checked"
                        : `${money(p.avm.low)}–${money(p.avm.high)}`
                    }
                  />
                  <Metric
                    label="Recorded-sale research"
                    value={p.sales.length}
                  />
                </div>
                <Source>
                  {p.subjectKind === "DISCOVERY_CANDIDATE"
                    ? "Retained county property evidence · valuation and sale research not checked"
                    : p.valuationRef
                      ? `RentCast retained valuation evidence · retrieved ${p.valuationRetrievedAt ?? "Unknown"} · provider as-of ${p.valuationAsOf ?? "Unknown"}`
                      : `RentCast retained property evidence · retrieved ${p.propertyRetrievedAt ?? "Unknown"} · valuation not acquired`}
                </Source>
                <SourceDetails
                  items={
                    p.subjectKind === "DISCOVERY_CANDIDATE"
                      ? [
                          [
                            "County source reference",
                            p.historicalTrigger.sourceRef,
                          ],
                          ["Evidence snapshot", p.evidenceFingerprint],
                        ]
                      : [
                          ["Property source reference", p.propertyRef],
                          ["Valuation source reference", p.valuationRef],
                          ["Property retrieved", p.propertyRetrievedAt],
                          ["Valuation retrieved", p.valuationRetrievedAt],
                          ["Provider as-of", p.providerAsOf],
                          ["Valuation as-of", p.valuationAsOf],
                        ]
                  }
                />
                <p className="iw-caveat">
                  Evidence is incomplete and does not verify title, condition,
                  current distress, seller availability, appraisal value or
                  returns.
                </p>
                <details className="iw-limitations">
                  <summary>Evidence limitations and remaining findings</summary>
                  <ul>
                    <li>
                      {p.identityStatus}. Reviewed {date(p.reviewDate)}.
                    </li>
                    <li>
                      Sale events are provider-reported when present, not
                      independently verified arm’s-length sales or certified
                      ARV.
                    </li>
                    <li>
                      Current title, liens, payoff, condition and sale
                      availability have not been verified.
                    </li>
                    {p.findings.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </details>
                {(p.avm.price == null || !p.sales.length) && (
                  <details>
                    <summary>Complete missing property research</summary>
                    <p>
                      PI reuses retained or cached evidence first. Before any
                      new RentCast request, an Administrator sees the research
                      type and maximum estimated charge and must select Approve
                      &amp; Research.
                    </p>
                    <button
                      disabled={busy}
                      onClick={() =>
                        researchProperty({
                          operations: [
                            ...(p.avm.price == null ? ["valuation"] : []),
                            ...(!p.sales.length ? ["comparableSales"] : []),
                          ],
                        })
                      }
                    >
                      {busy
                        ? "Working…"
                        : researchRetry
                          ? "Retry Research"
                          : "Complete Property Research"}
                    </button>
                    {researchMessage && (
                      <p className="iw-status" role="status">
                        {researchMessage}
                      </p>
                    )}
                  </details>
                )}
              </>
            )}
            {tab === "County / Distress" && (
              <>
                <h3>Historical county screening evidence</h3>
                <Metric
                  label="Historical source amount—not current payoff"
                  value={money(p.historicalTrigger.amount)}
                />
                <Source>
                  Retained Kern County Power-to-Sell evidence ·{" "}
                  {p.historicalTrigger.sourceDate ?? "date Unknown"}
                </Source>
                <SourceDetails
                  items={[
                    [
                      "Historical source reference",
                      p.historicalTrigger.sourceRef,
                    ],
                    ["Assessor source reference", p.countyUse.sourceRef],
                    ["Assessor use code", p.countyUse.code],
                    ["Source date", p.historicalTrigger.sourceDate],
                  ]}
                />
                <p>
                  {p.historicalTrigger.meaning}. Not evidence of current
                  foreclosure, seller motivation, liens or available equity.
                </p>
                <p>Assessor use code: {p.countyUse.code ?? "Unknown"}.</p>
                <details>
                  <summary>Full Kern County source disclaimer</summary>
                  <div className="iw-legal">{data.disclaimer}</div>
                </details>
              </>
            )}
            {tab === "Property Facts" && (
              <>
                <h3>Reported subject characteristics</h3>
                <Source>
                  {p.subjectKind === "DISCOVERY_CANDIDATE"
                    ? "Retained county classification and situs evidence"
                    : `RentCast retained property record · retrieved ${p.propertyRetrievedAt ?? "Unknown"} · as-of ${p.providerAsOf ?? "Unknown"}`}
                </Source>
                <SourceDetails
                  items={[
                    ["Property source reference", p.propertyRef],
                    ["Provider property identifier", p.providerId],
                    ["Retrieved", p.propertyRetrievedAt],
                    ["Provider as-of", p.providerAsOf],
                    ["Evidence snapshot", p.evidenceFingerprint],
                  ]}
                />
                <div className="iw-facts">
                  {Object.entries(p.attributes).map(([k, v]) => (
                    <Metric
                      key={k}
                      label={k.replace(/([a-z])([A-Z])/g, "$1 $2")}
                      value={v ?? "Unknown"}
                    />
                  ))}
                </div>
                <p>
                  No condition inspection, owner/contact information or parcel
                  certification is inferred.
                </p>
              </>
            )}
            {tab === "Sold Sales" && (
              <>
                <InlineEvidenceAttachments
                  property={p}
                  scenarioId={s.id}
                  fieldKey="COMPARABLE_SALES"
                  fieldLabel="Comparable sales support"
                  defaultDocumentType="COMPARABLE_VALUATION"
                  links={s.evidenceAttachments ?? []}
                  onChange={(evidenceAttachments) =>
                    update({ evidenceAttachments })
                  }
                />
                <SoldSales
                  property={p}
                  scenario={s}
                  groups={saleGroups}
                  mapModel={saleMapModel}
                  selected={selectedSale}
                  onSelect={setSelectedSale}
                  busy={busy}
                  researchMessage={researchMessage}
                  researchRetry={researchRetry}
                  onResearch={researchProperty}
                  onReview={(reference, review, patch) =>
                    update({
                      compReviews: {
                        ...s.compReviews,
                        [reference]: { ...review, ...patch },
                      },
                    })
                  }
                  onAttachmentsChange={(evidenceAttachments) =>
                    update({ evidenceAttachments })
                  }
                />
              </>
            )}
            {tab === "Listings" && <ListingsTable property={p} />}
            {tab === "Seller Financial Position" && (
              <SellerFinancialPosition
                entries={s.analystEvidence ?? []}
                property={p}
                scenarioId={s.id}
                attachments={s.evidenceAttachments ?? []}
                onAttachmentsChange={(evidenceAttachments) =>
                  update({ evidenceAttachments })
                }
                valuationBasis={s.sellerValuationBasis ?? "PROVIDER_AVM"}
                onValuationBasisChange={(sellerValuationBasis) =>
                  update({ sellerValuationBasis })
                }
                onChange={(analystEvidence) => update({ analystEvidence })}
              />
            )}
            {tab === "Analyst Evidence" && (
              <>
                <OccupancyDeliveryEditor
                  entries={s.analystEvidence ?? []}
                  property={p}
                  scenarioId={s.id}
                  attachments={s.evidenceAttachments ?? []}
                  onAttachmentsChange={(evidenceAttachments) =>
                    update({ evidenceAttachments })
                  }
                  onChange={(analystEvidence) => update({ analystEvidence })}
                />
                <AnalystEvidenceEditor
                  entries={s.analystEvidence ?? []}
                  property={p}
                  scenarioId={s.id}
                  attachments={s.evidenceAttachments ?? []}
                  onAttachmentsChange={(evidenceAttachments) =>
                    update({ evidenceAttachments })
                  }
                  excludeCategories={generalEvidenceExclusions}
                  onChange={(analystEvidence) => update({ analystEvidence })}
                />
              </>
            )}
            {tab === "Supporting Documents" && (
              <SupportingDocuments
                property={p}
                onCompletenessChange={setDocumentReadiness}
              />
            )}
            {tab === "Property Photos" && (
              <PropertyPhotos
                property={p}
                scenario={s}
                onChange={(patch) => update(patch)}
              />
            )}
            {tab === "Underwriting" && (
              <section className="iw-seller-boundary">
                <div>
                  <h3>Seller Financial Position</h3>
                  <p>
                    Existing seller debt is evidence for equity research only.
                    It is never added to investor acquisition expenses or MAO.
                  </p>
                </div>
                <button
                  className="secondary"
                  data-tooltip="Review mortgage, payoff, lien, tax and estimated seller-equity evidence. This does not change underwriting calculations."
                  onClick={() => navigateTab("Seller Financial Position")}
                >
                  Review seller obligations
                </button>
              </section>
            )}
            {tab === "Underwriting" && evaluationMode === "WHOLESALE_CASH" && (
              <WholesaleUnderwriting
                scenario={s}
                property={p}
                result={result}
                validation={validation}
                field={field}
                onUpdate={update}
                onUpdateInputs={updateInputs}
                onUseAvm={() =>
                  updateInputs(
                    { ...s.inputs, exitValue: String(p.avm.price) },
                    {
                      notes:
                        `${s.notes}\nExplicitly used retained as-is AVM as starting resale assumption; NOT verified ARV.`.trim(),
                    },
                  )
                }
                waterfall={waterfall}
              />
            )}
            {tab === "Underwriting" &&
              evaluationMode === "DETAILED_UNDERWRITING" && (
                <>
                  <div className="iw-banner">
                    Analyst assumptions are separate from observed evidence and
                    calculated outputs. Purchase, rehab and resale begin blank;
                    disclosed time defaults are 90 renovation days and 30
                    marketing days.
                  </div>
                  <section
                    className="iw-observed-context"
                    aria-label="Observed evidence context"
                  >
                    <h3>Observed / provider-reported evidence</h3>
                    <div>
                      <span>As-is AVM—not ARV</span>
                      <b>{money(p.avm.price)}</b>
                      <small>
                        {p.avm.low == null && p.avm.high == null
                          ? "Not checked / not available"
                          : `${money(p.avm.low)}–${money(p.avm.high)} provider range`}
                      </small>
                    </div>
                    <div>
                      <span>Recorded-sale examples</span>
                      <b>{p.sales.length}</b>
                      <small>
                        {
                          Object.values(s.compReviews ?? {}).filter(
                            (x) => x.include,
                          ).length
                        }{" "}
                        selected by analyst
                      </small>
                    </div>
                  </section>
                  <div className="iw-row">
                    <button
                      className="secondary"
                      disabled={p.avm.price == null}
                      onClick={() => {
                        updateInputs(
                          { ...s.inputs, exitValue: String(p.avm.price) },
                          {
                            notes:
                              `${s.notes}\nExplicitly used retained as-is AVM as starting resale assumption; NOT verified ARV.`.trim(),
                          },
                        );
                      }}
                    >
                      Use AVM as starting assumption
                    </button>
                    <label className="iw-check">
                      <input
                        type="checkbox"
                        checked={s.demonstration}
                        onChange={(e) =>
                          update({ demonstration: e.target.checked })
                        }
                      />
                      Artificial demonstration assumptions—label reports
                      explicitly
                    </label>
                  </div>
                  <div className="iw-editor">
                    <div>
                      <h3>Basic underwriting assumptions</h3>
                      <fieldset className="iw-basic">
                        <legend>Practical deal inputs</legend>
                        <div className="iw-inputs">
                          {Object.entries(primaryFields).map(([key, label]) =>
                            field(key, label),
                          )}
                          <label>
                            <span>Financing choice</span>
                            <ThemedSelect
                              aria-label="Financing choice"
                              value={financing}
                              onChange={(e) => setFinancing(e.target.value)}
                            >
                              <option value="CASH">Cash</option>
                              <option value="FINANCED">
                                Acquisition financing
                              </option>
                            </ThemedSelect>
                            <small>
                              Acquisition-only; no rehab draws or amortization
                            </small>
                          </label>
                          {financing === "FINANCED" && (
                            <>
                              {field("loanAmount", "Financing amount ($)")}
                              {field("annualRate", "Annual interest rate (%)")}
                            </>
                          )}
                          <label>
                            <span>Target return definition</span>
                            <ThemedSelect
                              aria-label="Target definition"
                              value={s.targetType}
                              onChange={(e) =>
                                update(
                                  { targetType: e.target.value },
                                  { financial: true },
                                )
                              }
                            >
                              <option value="PROFIT_MARGIN_ON_SALE">
                                Profit / gross sale
                              </option>
                              <option value="RETURN_ON_TOTAL_PROJECT_COST">
                                Profit / total project cost
                              </option>
                              <option value="CASH_ON_CASH">
                                Profit / peak equity required
                              </option>
                            </ThemedSelect>
                            <small>Not annualized</small>
                          </label>
                          {field("targetRate", "Target return (%)")}
                        </div>
                      </fieldset>
                      <section className="iw-preset">
                        <div>
                          <h3>Optional illustrative expense preset</h3>
                          <p>
                            Hypothetical starting assumptions—not verified local
                            market rates. Applying this preset changes only this
                            draft and never overwrites saved revisions
                            automatically.
                          </p>
                        </div>
                        <button className="secondary" onClick={applyPreset}>
                          Apply illustrative preset
                        </button>
                        <dl>
                          {presetLabels.map(([label, value]) => (
                            <React.Fragment key={label}>
                              <dt>{label}</dt>
                              <dd>{value}</dd>
                            </React.Fragment>
                          ))}
                        </dl>
                      </section>
                      <details className="iw-advanced">
                        <summary>
                          Advanced settings · all certified inputs
                        </summary>
                        {Object.entries(groups).map(([title, fields]) => {
                          const advanced = Object.fromEntries(
                            Object.entries(fields).filter(
                              ([key]) =>
                                !primaryKeys.has(key) &&
                                ![
                                  "targetRate",
                                  "loanAmount",
                                  "annualRate",
                                ].includes(key),
                            ),
                          );
                          if (!Object.keys(advanced).length) return null;
                          return (
                            <fieldset key={title}>
                              <legend>{title}</legend>
                              <div className="iw-inputs">
                                {Object.entries(advanced).map(([key, label]) =>
                                  field(key, label),
                                )}
                              </div>
                            </fieldset>
                          );
                        })}
                      </details>
                      <label>
                        Analyst notes
                        <textarea
                          aria-label="Analyst notes"
                          value={s.notes}
                          maxLength="1500"
                          onChange={(e) => update({ notes: e.target.value })}
                        />
                      </label>
                      <p className="iw-muted">
                        A blank seller asking price remains unknown—not $0. MAO
                        price trials keep loan-to-value constant. Minimum-profit
                        price ceiling is shown separately from the return-hurdle
                        MAO.
                      </p>
                    </div>
                    <aside>
                      <h3>Calculated outputs</h3>
                      {result ? (
                        <>
                          <div className="iw-metrics">
                            <Metric
                              label="Modeled profit"
                              value={money(result.deterministic.modeledProfit)}
                            />
                            <Metric
                              label="Project ROI"
                              value={pct(result.deterministic.roi)}
                            />
                            <Metric
                              label="Cash-on-cash"
                              value={pct(result.deterministic.cashOnCash)}
                            />
                            <Metric
                              label="Return-hurdle MAO"
                              value={money(
                                result.mao.deterministic.purchasePrice,
                              )}
                            />
                            <Metric
                              label="Break-even purchase ceiling"
                              value={money(result.mao.breakEven.purchasePrice)}
                            />
                            <Metric
                              label="Peak equity required"
                              value={money(result.deterministic.cashRequired)}
                            />
                            {result.profitMao && (
                              <Metric
                                label="Minimum-profit purchase ceiling"
                                value={money(result.profitMao.purchasePrice)}
                              />
                            )}
                          </div>
                          <Source>
                            Existing engine {result.economicsVersion} · MAO{" "}
                            {result.mao.deterministic.status}
                          </Source>
                          <h3>Complete cost waterfall</h3>
                          {waterfall}
                          <h3>Immediate deterministic scenarios</h3>
                          <div className="iw-stress-grid">
                            {result.deterministicScenarios.map((x) => (
                              <article key={x.id}>
                                <span>{x.label}</span>
                                <b>{money(x.modeledProfit)}</b>
                                <small>
                                  {money(x.profitChange)} vs base ·{" "}
                                  {money(x.totalProjectCost)} total cost
                                </small>
                              </article>
                            ))}
                          </div>
                          <p className="iw-muted">
                            One input changes per case. These are deterministic
                            stresses, not probabilities.
                          </p>
                        </>
                      ) : (
                        <p className="iw-empty">
                          Complete purchase, rehab, resale and valid carrying
                          assumptions. {Object.values(validation).join(" ")}
                        </p>
                      )}
                    </aside>
                  </div>
                </>
              )}
            {tab === "Scenarios" && (
              <ScenarioComparison
                records={comparisonRecords}
                properties={data.properties}
                previewById={draftAnalysis}
                onOpen={(record) => {
                  if (record.dirty) {
                    setSubject(record.propertyRef);
                    setActiveId(record.id);
                    setTab("Underwriting");
                    bindRoute(record.propertyRef, record.id, "Underwriting");
                  }
                }}
              />
            )}
            {tab === "Risk" && (
              <>
                <div className="iw-row">
                  <div>
                    <h3 className="iw-label-with-help">
                      Conditional simulation under analyst-selected
                      distributions{" "}
                      <Tooltip
                        content="A triangular distribution uses your minimum, most likely and maximum outcomes; it is an assumption, not a calibrated forecast."
                        label="About triangular distributions"
                      />
                    </h3>
                    <p>
                      Editable triangular ranges are scenario assumptions—not
                      calibrated real-world probabilities.
                    </p>
                  </div>
                  <button
                    className="secondary"
                    data-testid="populate-risk"
                    onClick={populateRisk}
                  >
                    Populate illustrative risk assumptions
                  </button>
                </div>
                <p>
                  Most Likely values inherit valid underwriting assumptions and
                  remain read-only until Edit is selected. Minimum and maximum
                  may remain blank while reviewing this step, but every field
                  marked <RequiredMark /> is required before the simulation can
                  run. Nothing here runs automatically.
                </p>
                <p className="iw-risk-override-notice">
                  <b>Override effect:</b> Editing an inherited Most Likely value
                  changes only this scenario’s Monte Carlo assumption. It does
                  not change underwriting, and the override will no longer
                  follow future underwriting changes. Clear Edit to restore the
                  link.
                </p>
                <div className="iw-table-wrap">
                  <table className="iw-risk-table">
                    <thead>
                      <tr>
                        <th>Analyst assumption</th>
                        <th>
                          <span className="iw-label-with-help">
                            Minimum <RequiredMark />{" "}
                            <Tooltip
                              content="Lowest value included in this analyst-selected simulation range."
                              label="About Minimum"
                            />
                          </span>
                        </th>
                        <th>
                          <span className="iw-label-with-help">
                            Most Likely <RequiredMark />{" "}
                            <Tooltip
                              content="Central triangular value. It is read-only while inherited; select Edit to create an independent Monte Carlo override."
                              label="About Most Likely"
                            />
                          </span>
                        </th>
                        <th>
                          <span className="iw-label-with-help">
                            Maximum <RequiredMark />{" "}
                            <Tooltip
                              content="Highest value included in this analyst-selected simulation range."
                              label="About Maximum"
                            />
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(variables).map(([key, label]) => (
                        <tr key={key}>
                          <th>{label}</th>
                          {["min", "mode", "max"].map((bound) =>
                            riskInput(key, label, bound),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="iw-row">
                  <label>
                    <span className="iw-label-with-help">
                      Reproducible seed <RequiredMark />{" "}
                      <Tooltip
                        content="The same saved seed and assumptions produce the same simulation result."
                        label="About the reproducible seed"
                      />
                    </span>
                    <input
                      aria-label="Simulation seed"
                      aria-required="true"
                      required
                      maxLength="100"
                      value={s.risk.seed}
                      onChange={(e) =>
                        update(
                          { risk: { ...s.risk, seed: e.target.value } },
                          { financial: true },
                        )
                      }
                    />
                  </label>
                  <label>
                    <span className="iw-label-with-help">
                      Iterations (100–20,000) <RequiredMark />{" "}
                      <Tooltip
                        content="Number of simulated trials. More trials improve numerical stability but do not improve the assumptions."
                        label="About simulation iterations"
                      />
                    </span>
                    <input
                      aria-label="Iterations"
                      aria-required="true"
                      required
                      min="100"
                      max="20000"
                      step="1"
                      type="number"
                      value={s.risk.iterations}
                      onChange={(e) =>
                        update(
                          { risk: { ...s.risk, iterations: e.target.value } },
                          { financial: true },
                        )
                      }
                    />
                  </label>
                </div>
                <label>
                  <span className="iw-label-with-help">
                    Distribution rationale <RequiredMark />{" "}
                    <Tooltip
                      content="Record why these ranges are reasonable and what evidence or judgment supports them."
                      label="About distribution rationale"
                    />
                  </span>
                  <textarea
                    aria-label="Uncertainty rationale"
                    aria-required="true"
                    required
                    maxLength="300"
                    value={s.risk.rationale}
                    onChange={(e) =>
                      update(
                        { risk: { ...s.risk, rationale: e.target.value } },
                        { financial: true },
                      )
                    }
                  />
                </label>
                <div className="iw-risk-actions">
                  <button
                    disabled={busy || !riskCanRun}
                    onClick={runRisk}
                    data-testid="run-risk"
                    aria-describedby="risk-required-status"
                    data-tooltip="Complete every required field, then run the certified simulation. This does not save the draft automatically."
                  >
                    Run Monte Carlo
                  </button>
                  <p
                    id="risk-required-status"
                    className={`iw-required-note ${riskCanRun ? "ready" : ""}`}
                  >
                    {riskCanRun
                      ? "All required simulation inputs are complete."
                      : `Required before running: ${riskMissingLabels.join("; ")}.`}
                  </p>
                </div>
                <p className="iw-error">
                  {Object.values(validation).join(" ")}
                </p>
                {result?.monteCarlo && <RiskResult mc={result.monteCarlo} />}
              </>
            )}
            {tab === "Reports" && (
              <>
                <ReportReadiness
                  scenario={s}
                  property={p}
                  result={result}
                  preview={preview}
                />
                <InteractiveChecklist
                  property={p}
                  scenario={s}
                  busy={busy}
                  onBusy={setBusy}
                  onNavigate={navigateTab}
                  onAttachmentsChange={(links) =>
                    update({ evidenceAttachments: links })
                  }
                  reportBlockedReason={
                    photoRightsMissing
                      ? "Confirm permission to distribute the selected property photos and save the scenario before finalizing this report."
                      : ""
                  }
                  onResolveReportBlock={() => navigateTab("Property Photos")}
                  onGenerateFinalized={(record) =>
                    generatePdf("full", {
                      download: true,
                      finalizationId: record.id,
                    })
                  }
                />
                <section
                  className="iw-checklist-panel"
                  aria-labelledby="investment-checklist-heading"
                >
                  <div>
                    <span className="iw-eyebrow">Saved revision diligence</span>
                    <h3 id="investment-checklist-heading">
                      Investment Due Diligence Checklist
                    </h3>
                    <p>
                      <b>{p.address}</b> · {s.name} · revision {s.revision} ·
                      analysis {date(s.savedAt)}
                    </p>
                    {preview?.kind === "checklist" && preview.checklist ? (
                      <p className="iw-checklist-status">
                        <b>{preview.checklist.overallStatus}</b> ·{" "}
                        {preview.checklist.counts.critical} critical ·{" "}
                        {preview.checklist.counts.important} important ·{" "}
                        {preview.checklist.counts.total} outstanding
                      </p>
                    ) : (
                      <p>
                        Generate a prioritized, evidence-aware list of
                        information still needed before an investment decision.
                        Assumptions alone are not treated as verified evidence.
                      </p>
                    )}
                  </div>
                  <div className="iw-checklist-actions">
                    <button
                      disabled={busy || s.dirty || !s.analysis}
                      onClick={() => previewReport("checklist")}
                    >
                      View Checklist
                    </button>
                    <button
                      className="secondary"
                      disabled={busy || s.dirty || !s.analysis}
                      onClick={() =>
                        generatePdf("checklist", { download: true })
                      }
                    >
                      Download Checklist PDF
                    </button>
                  </div>
                  {s.dirty && (
                    <small>
                      Save this scenario revision before generating its
                      checklist.
                    </small>
                  )}
                </section>
                {photoRightsMissing && (
                  <div className="iw-error iw-report-blocker" role="alert">
                    <div>
                      <b>
                        Photo permission is required before generating an
                        investor report.
                      </b>
                      <p>
                        {selectedPhotoCount} selected photo
                        {selectedPhotoCount === 1 ? "" : "s"} will remain
                        private until you confirm redistribution permission and
                        save a new scenario revision.
                      </p>
                    </div>
                    <button
                      className="secondary"
                      onClick={() => navigateTab("Property Photos")}
                    >
                      Review photos and confirm permission
                    </button>
                  </div>
                )}
                <h3>Investor report preview</h3>
                <p>
                  Reports use one immutable saved revision with the exact
                  subject, evidence snapshot and assumptions shown here. Later
                  draft changes require another save.
                </p>
                <div className="iw-report-actions">
                  <label>
                    Report type
                    <ThemedSelect
                      aria-label="Report type"
                      value={kind}
                      onChange={(e) => {
                        setKind(e.target.value);
                        setPreview(null);
                        setPdfDownload(null);
                      }}
                    >
                      <option value="brief">Opportunity Brief</option>
                      <option value="full">Full Investor Package</option>
                      <option value="checklist">Due Diligence Checklist</option>
                    </ThemedSelect>
                  </label>
                  {s.dirty ? (
                    <button
                      className="primary-action"
                      data-testid="save-preview"
                      disabled={
                        busy ||
                        !result ||
                        (photoRightsMissing && kind !== "checklist")
                      }
                      onClick={saveAndPreview}
                    >
                      Save &amp; Preview
                    </button>
                  ) : (
                    <button
                      data-testid="preview-report"
                      disabled={
                        busy || (photoRightsMissing && kind !== "checklist")
                      }
                      onClick={() => previewReport()}
                    >
                      Preview Report
                    </button>
                  )}
                  <button
                    data-testid="generate-pdf"
                    disabled={
                      busy ||
                      s.dirty ||
                      !s.analysis ||
                      (photoRightsMissing && kind !== "checklist")
                    }
                    onClick={() => generatePdf()}
                  >
                    {busy ? "Working…" : "Generate PDF"}
                  </button>
                  <button
                    data-testid="download-pdf"
                    disabled={
                      busy ||
                      !pdfDownload ||
                      pdfDownload.id !== s.id ||
                      pdfDownload.revision !== s.revision ||
                      pdfDownload.kind !== kind
                    }
                    onClick={downloadPdf}
                  >
                    Download PDF
                  </button>
                </div>
                {deployed && (
                  <p className="iw-muted">
                    PDFs are generated by the private authenticated cloud
                    renderer from the exact saved revision. Unsaved browser
                    changes are never included.
                  </p>
                )}
                {s.dirty && !result && (
                  <div className="iw-error">
                    <b>Complete these inputs before Save &amp; Preview:</b>
                    <ul>
                      {missingInputSummary(validation).map((message, index) => (
                        <li key={index}>{message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {s.dirty && result && (
                  <p className="iw-status">
                    Save &amp; Preview will create a new immutable scenario
                    revision, then preview that exact revision.
                  </p>
                )}
                {preview && (
                  <iframe
                    title={
                      preview.kind === "checklist"
                        ? "Investment Due Diligence Checklist preview"
                        : "Report preview"
                    }
                    sandbox=""
                    srcDoc={preview.html}
                  />
                )}
              </>
            )}
          </div>
          {mode === "guided" ? (
            <GuidedControls
              navigation={guidedNavigation}
              busy={busy}
              onBack={() => moveGuided("back")}
              onContinue={() => moveGuided("continue")}
              onSkip={() => moveGuided("skip")}
              onSaveExit={saveAndExit}
            />
          ) : (
            <StageNextAction
              stage={currentStage.id}
              tab={tab}
              navigate={navigateTab}
            />
          )}
        </section>
      )}
      <footer>
        {deployed
          ? "Private authenticated workspace"
          : "Local private research · loopback access only"}{" "}
        · provider requests are quota-limited, duplicate-protected and
        usage-logged · explicit Saved Property changes use organization-scoped
        server storage.
      </footer>
    </main>
  );
}
function SoldSales({
  property,
  scenario,
  groups,
  mapModel,
  selected,
  onSelect,
  busy,
  researchMessage,
  researchRetry,
  onResearch,
  onReview,
  onAttachmentsChange,
}) {
  const finitePrices = property.sales
      .map((item) => item.salePrice)
      .filter(Number.isFinite),
    lowestPrice = finitePrices.length ? Math.min(...finitePrices) : null;
  return (
    <>
      <div className="iw-row">
        <div>
          <h3>Reported Sale events · research only</h3>
          <Source>
            RentCast retained Property Records history · retrieved{" "}
            {property.saleSearch.retrievedAt ?? "Unknown"} ·{" "}
            {property.saleSearch.returned ?? "Unknown"} records searched ·{" "}
            {property.saleSearch.eligible ?? "Unknown"} eligible history records
          </Source>
        </div>
        <button
          data-testid="find-sold"
          disabled={busy}
          onClick={() =>
            onResearch({
              operations: ["comparableSales"],
              refresh: property.sales.length > 0,
            })
          }
        >
          {busy
            ? "Working…"
            : property.sales.length
              ? "Refresh Sold Properties"
              : researchRetry
                ? "Retry Research"
                : "Find Recent Sold Properties"}
        </button>
      </div>
      <div className="iw-acquisition-preview">
        <b>Authenticated RentCast research</b>
        <span>
          PI reuses retained or cached results first. New or refreshed provider
          research requires an explicit cost confirmation.
        </span>
        <small>
          {property.sales.length
            ? "Reported Sale-event research is available below."
            : "No retained completed-sale evidence is attached to this subject."}
        </small>
      </div>
      {researchMessage && (
        <p className="iw-status" role="status">
          {researchMessage}
        </p>
      )}
      <p>
        Inclusion records your research choice, not verified arm’s-length
        status. No comparable is automatically included in a scenario or used to
        set resale value.
      </p>
      {mapModel && property.sales.length > 0 && (
        <ComparableMap
          model={{
            ...mapModel,
            comps: mapModel.comps.filter(
              (item) => item.evidenceKind === "RECORDED_SALE",
            ),
            digest: `${mapModel.digest}:sales`,
          }}
          selected={selected}
          onSelect={onSelect}
        />
      )}
      <div className="iw-table-wrap iw-comparable-wrap">
        <table className="iw-comparable-table">
          <thead>
            <tr>
              <th>Property address</th>
              <th>Sold price and date</th>
              <th>Property characteristics</th>
              <th>Distance and relevance</th>
              <th>Include / review</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const comp =
                  group.records.find((record) =>
                    Object.prototype.hasOwnProperty.call(
                      scenario.compReviews ?? {},
                      record.evidenceRef,
                    ),
                  ) ?? group.records[0],
                index = 0;
              const savedReview = Object.prototype.hasOwnProperty.call(
                  scenario.compReviews ?? {},
                  comp.evidenceRef,
                ),
                review = scenario.compReviews?.[comp.evidenceRef] ?? {
                  include: false,
                  notes: "",
                },
                unusual =
                  comp.ageDays > 180 ||
                  (lowestPrice !== null && comp.salePrice === lowestPrice),
                address = known(comp.address);
              return (
                <tr
                  key={comp.evidenceRef}
                  className={
                    selected === comp.evidenceRef ? "iw-selected-sale" : ""
                  }
                  data-sale-row=""
                >
                  <td className="iw-comp-address">
                    <button
                      className="link"
                      onClick={() => onSelect(comp.evidenceRef)}
                      data-tooltip="Select this comparable observation on the map without changing the saved scenario."
                    >
                      {address}
                    </button>
                    {group.records.length > 1 && index === 0 ? (
                      <small>
                        {group.records.length} source observations represent one
                        logical transaction; underlying observations are
                        preserved.
                      </small>
                    ) : null}
                    {index === 0 &&
                    group.identityStatus === "POSSIBLE_DUPLICATE" ? (
                      <span className="iw-flag">
                        Possible duplicate — review identity
                      </span>
                    ) : null}
                    <small>Provider-reported sale event</small>
                  </td>
                  <td>
                    <b>{compMoney(comp.salePrice)}</b>
                    <span>{compDate(comp.saleDate)}</span>
                    <small>
                      Sale date is provider-reported and not independently
                      verified as escrow close.
                    </small>
                    {(unusual || group.reviewFlags.length > 0) && (
                      <span className="iw-flag">
                        {group.reviewFlags[0] ??
                          "Review unusual / older transaction"}
                      </span>
                    )}
                  </td>
                  <td>
                    <b>{compArea(comp.squareFootage)}</b>
                    <span>
                      {known(comp.bedrooms)} BD / {known(comp.bathrooms)} BA
                    </span>
                    <small>{known(comp.propertyType)}</small>
                  </td>
                  <td>
                    <b>{compDistance(comp.distance)}</b>
                    <span>
                      {Number.isFinite(comp.ageDays)
                        ? `${comp.ageDays} days old`
                        : "Age Unknown"}
                    </span>
                    <small>{comp.reason ?? "Relevance not supplied."}</small>
                    <p className="iw-comp-warning">
                      Arm’s-length status: {known(comp.armsLength)} · Condition:{" "}
                      {known(comp.condition)}
                    </p>
                  </td>
                  <td className="iw-comp-actions">
                    <label className="iw-check">
                      <input
                        type="checkbox"
                        aria-label={`Include ${address} in research`}
                        checked={review.include}
                        onChange={(event) =>
                          onReview(comp.evidenceRef, review, {
                            include: event.target.checked,
                          })
                        }
                      />
                      Include in Research
                    </label>
                    <small>
                      {savedReview
                        ? review.include
                          ? "Included in this draft"
                          : "Excluded in this draft"
                        : "Not yet reviewed"}
                    </small>
                    <details className="iw-comp-review">
                      <summary>Review Comparable</summary>
                      <label>
                        Analyst notes
                        <textarea
                          aria-label={`Analyst notes for ${address}`}
                          maxLength="500"
                          value={review.notes}
                          onChange={(event) =>
                            onReview(comp.evidenceRef, review, {
                              notes: event.target.value,
                            })
                          }
                          placeholder="Relevance, exclusion reason or follow-up"
                        />
                      </label>
                      <p>
                        Notes and inclusion status are saved with the scenario
                        revision.
                      </p>
                    </details>
                    <SourceDetails
                      items={[
                        ["Provider", "RentCast"],
                        ["Internal evidence reference", comp.evidenceRef],
                        ["Provider property identifier", comp.providerId],
                        [
                          "Request retrieval timestamp",
                          property.saleSearch.retrievedAt,
                        ],
                        ["Transaction classification", comp.transactionType],
                        [
                          "Search radius",
                          property.saleSearch.radius == null
                            ? null
                            : `${property.saleSearch.radius} miles`,
                        ],
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!property.sales.length && (
        <p>
          No retained Sale examples. Missing evidence is not proof of no sales.
        </p>
      )}
      <p>
        No adjustments or resale conclusion are automatically inferred from
        included sales.
      </p>
    </>
  );
}
function ListingsTable({ property }) {
  return (
    <>
      <h3>Listings—not closed-sale evidence</h3>
      <Source>
        RentCast retained valuation comparables · retrieved{" "}
        {property.valuationRetrievedAt ?? "Unknown"}
      </Source>
      <p>
        Prices below are listings or market observations, never substituted for
        supported Sale-event prices. Active or inactive status does not prove a
        closing.
      </p>
      <div className="iw-table-wrap iw-comparable-wrap">
        <table className="iw-listing-table">
          <thead>
            <tr>
              <th>Property address</th>
              <th>Asking price / observed</th>
              <th>Property characteristics</th>
              <th>Status and context</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {property.listings.map((listing, index) => (
              <tr key={listing.ref ?? index}>
                <td className="iw-comp-address">
                  <b>{known(listing.address)}</b>
                </td>
                <td>
                  <b>{compMoney(listing.price)}</b>
                  <span>{compDate(listing.lastSeenDate)}</span>
                </td>
                <td>
                  <b>{compArea(listing.squareFootage)}</b>
                  <span>
                    {known(listing.bedrooms)} BD / {known(listing.bathrooms)} BA
                  </span>
                  <small>{compDistance(listing.distance)}</small>
                </td>
                <td>
                  <b>{known(listing.status)}</b>
                  <small>
                    {listing.priceMeaning ??
                      listing.note ??
                      "Listing evidence only; sale status is Unknown."}
                  </small>
                </td>
                <td>
                  <span>RentCast retained evidence</span>
                  <SourceDetails
                    items={[
                      ["Listing source reference", listing.ref],
                      ["Valuation source reference", property.valuationRef],
                      ["Valuation retrieved", property.valuationRetrievedAt],
                      ["Last observed", listing.lastSeenDate],
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!property.listings.length && (
        <p className="iw-empty">
          No retained listing observations. Missing evidence is not proof of
          absence.
        </p>
      )}
    </>
  );
}
function GuidedWorkspaceHeader({
  property,
  scenario,
  scenarios,
  current,
  progress,
  needsReview,
  result,
  preview,
  busy,
  onStep,
  onChangeProperty,
  onChooseScenario,
  onRename,
  onEvaluationMode,
  onSave,
  onDuplicate,
  onNewBlank,
  onReset,
}) {
  return (
    <div className="iw-guided-sticky">
      <section
        className="iw-guided-property"
        aria-label="Current property and scenario"
      >
        <div className="iw-guided-property-summary">
          <div className="iw-guided-property-identity">
            <span>Current property</span>
            <h2>{property.address}</h2>
            <small>
              {property.attributes.propertyType ?? "Property type unavailable"}
              {" · "}
              {property.attributes.bedrooms ?? "—"} BD /{" "}
              {property.attributes.bathrooms ?? "—"} BA
              {" · "}
              {property.attributes.squareFootage?.toLocaleString() ?? "—"} SF
            </small>
          </div>
          <button
            className="secondary iw-change-property"
            onClick={onChangeProperty}
            data-tooltip="Choose another property. PI will warn before leaving an unsaved browser draft."
          >
            <span aria-hidden="true">↔</span> Change Property
          </button>
        </div>
        <div className="iw-guided-research-state">
          <span
            className={property.findings.length ? "needs-review" : "complete"}
          >
            {property.findings.length} research warning
            {property.findings.length === 1 ? "" : "s"}
          </span>
          <small>
            {property.subjectKind === "DURABLE_SAVED"
              ? "Saved Property"
              : "Retained research"}{" "}
            · evidence snapshot locked
          </small>
          {property.subjectKind !== "DURABLE_SAVED" && (
            <small>
              Saving will create the Property and its first scenario revision.
            </small>
          )}
        </div>
        <div className="iw-guided-scenario-workspace">
          <div className="iw-guided-scenario-heading">
            <strong>Scenario workspace</strong>
            <small className={scenario.dirty ? "draft" : "saved"}>
              <span aria-hidden="true">●</span>{" "}
              {scenario.dirty
                ? "Draft · browser local"
                : `Saved r${scenario.revision} · ${date(scenario.savedAt)}`}
            </small>
          </div>
          <div
            className="iw-guided-scenario-tools"
            data-testid="scenario-toolbar"
          >
            <label>
              <span>Active scenario</span>
              <ThemedSelect
                aria-label="Scenario"
                value={scenario.id}
                onChange={(event) => onChooseScenario(event.target.value)}
              >
                {scenarios.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · r{item.revision}
                    {item.dirty ? " · draft" : ""}
                  </option>
                ))}
              </ThemedSelect>
            </label>
            <label>
              <span>Scenario name</span>
              <input
                aria-label="Scenario name"
                maxLength="80"
                value={scenario.name}
                onChange={(event) => onRename(event.target.value)}
              />
            </label>
            <EvaluationModeSelect
              scenario={scenario}
              onChange={onEvaluationMode}
              compact
            />
            <ScenarioActionsMenu
              dismissKey={`${current.id}:${scenario.id}`}
              onDuplicate={onDuplicate}
              onNewBlank={onNewBlank}
              onReset={onReset}
            />
            {property.subjectKind === "DURABLE_SAVED" ? (
              <button
                className="iw-scenario-save"
                onClick={() => onSave()}
                disabled={busy}
                data-testid="save-scenario"
                data-tooltip="Save now as a new immutable revision. PI also reminds you every 10 minutes while changes remain unsaved."
              >
                Save
              </button>
            ) : (
              <SaveAsPropertyButton
                property={property}
                scenario={scenario}
                prepareScenario={() => onSave({ propertyReady: true })}
                className="iw-scenario-save"
                label="Save"
              />
            )}
          </div>
        </div>
      </section>
      <GuidedProgress
        current={current}
        progress={progress}
        needsReview={needsReview}
        result={result}
        preview={preview}
        onStep={onStep}
      />
    </div>
  );
}
function ScenarioActionsMenu({ dismissKey, onDuplicate, onNewBlank, onReset }) {
  const menu = useRef(null),
    summary = useRef(null),
    [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [dismissKey]);
  useEffect(() => {
    const outside = (event) => {
      if (open && !event.composedPath().includes(menu.current)) setOpen(false);
    };
    const escape = (event) => {
      if (open && event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        requestAnimationFrame(() => summary.current?.focus());
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const run = (action) => {
    setOpen(false);
    action();
  };
  return (
    <details className="iw-scenario-menu" ref={menu} open={open}>
      <summary
        ref={summary}
        aria-expanded={open}
        aria-label={`${open ? "Close" : "Open"} Scenario actions`}
        title="Scenario actions"
        onClick={(event) => {
          event.preventDefault();
          setOpen((value) => !value);
        }}
      >
        <span aria-hidden="true">•••</span>
      </summary>
      <div>
        <button
          className="secondary"
          data-tooltip="Copy the current assumptions into a separate unsaved scenario."
          onClick={() => run(onDuplicate)}
        >
          Duplicate
        </button>
        <button
          className="secondary"
          data-tooltip="Create a separate blank scenario for this same property and evidence snapshot."
          onClick={() => run(onNewBlank)}
        >
          New Blank
        </button>
        <button
          className="secondary"
          data-tooltip="Reset only this browser draft; saved revisions remain unchanged."
          onClick={() => run(onReset)}
        >
          Reset Draft
        </button>
      </div>
    </details>
  );
}
function GuidedProgress({
  current,
  progress,
  needsReview = {},
  result,
  preview,
  onStep,
}) {
  const statusFor = (step) => {
    if (step.id === current.id) return "CURRENT";
    const recorded = progress[step.id];
    if (recorded === "SKIPPED") return "SKIPPED";
    if (recorded === "COMPLETE" && needsReview[step.id]) return "NEEDS_REVIEW";
    if (step.id === "identify") return "COMPLETE";
    if (step.id === "financial" && result) return "COMPLETE";
    if (step.id === "risk" && result?.monteCarlo) return "COMPLETE";
    if (step.id === "reports" && preview) return "COMPLETE";
    return recorded ?? "NOT_STARTED";
  };
  return (
    <nav className="guided-progress" aria-label="Guided analysis progress">
      <ol>
        {GUIDED_STEPS.map((step, index) => {
          const status = statusFor(step),
            label =
              status === "NOT_STARTED"
                ? "Not started"
                : status === "CURRENT"
                  ? "Current"
                  : status === "SKIPPED"
                    ? "Skipped for now"
                    : status === "NEEDS_REVIEW"
                      ? "Needs review"
                      : "Complete";
          return (
            <li
              key={step.id}
              className={status.toLowerCase()}
              aria-current={step.id === current.id ? "step" : undefined}
            >
              <button onClick={() => onStep(step)}>
                <span>{index + 1}</span>
                <b>{step.label}</b>
                <small>{label}</small>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
function GuidedControls({
  navigation,
  busy,
  onBack,
  onContinue,
  onSkip,
  onSaveExit,
}) {
  return (
    <div className="iw-guided-controls" aria-label="Guided workflow controls">
      <div>
        {navigation.previous && (
          <button className="secondary" onClick={onBack}>
            ← Back
          </button>
        )}
        {navigation.next && (
          <button className="primary-action" onClick={onContinue}>
            Continue →
          </button>
        )}
        {navigation.next && (
          <button className="secondary" onClick={onSkip}>
            Skip for Now
          </button>
        )}
      </div>
      <button className="secondary" disabled={busy} onClick={onSaveExit}>
        Save &amp; Exit
      </button>
    </div>
  );
}
function ReportReadiness({ scenario, property, result, preview }) {
  const wholesale = scenarioEvaluationMode(scenario) === "WHOLESALE_CASH";
  const [documentReadiness, setReportDocumentReadiness] = useState([]);
  useEffect(() => {
    if (!property?.durablePropertyId) {
      setReportDocumentReadiness([]);
      return;
    }
    fetch(`/api/durable-properties/${property.durablePropertyId}/documents`, {
      credentials: "same-origin",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => setReportDocumentReadiness(value?.completeness ?? []))
      .catch(() => setReportDocumentReadiness([]));
  }, [property?.durablePropertyId, preview]);
  const selected = Object.values(scenario.compReviews ?? {}).filter(
      (item) => item.include,
    ).length,
    sellerEntries = (scenario.analystEvidence ?? []).filter((item) =>
      [
        "ORIGINAL_PRINCIPAL",
        "ALGORITHMIC_BALANCE",
        "VERIFIED_PAYOFF",
        "LIEN",
        "DELINQUENT_TAX",
      ].includes(item.category),
    ),
    unknownSeller = sellerEntries.filter(
      (item) => item.status === "UNKNOWN",
    ).length,
    sellerIncomplete = !sellerEntries.length || unknownSeller > 0;
  const reviewedDocuments = documentReadiness.filter((item) =>
      ["EVIDENCE_REVIEWED", "EVIDENCE_INDEPENDENTLY_VERIFIED"].includes(
        item.status,
      ),
    ).length,
    pendingDocuments = documentReadiness.filter(
      (item) => item.status === "DOCUMENT_UPLOADED_NOT_REVIEWED",
    ).length,
    missingDocuments = documentReadiness.filter(
      (item) => item.status === "EVIDENCE_MISSING",
    ).length;
  const items = [
    {
      label: "Financial analysis",
      status: result
        ? wholesale
          ? "Preliminary evaluation calculated"
          : "Ready"
        : "Complete the core assumptions",
      warning: !result,
    },
    {
      label: "Comparable support",
      status: selected ? `${selected} selected` : "No sales selected",
      warning: !selected,
    },
    {
      label: "Seller obligations",
      status: !sellerEntries.length
        ? "Unresolved—no complete review"
        : unknownSeller
          ? `${unknownSeller} unresolved entries`
          : "Reviewed evidence entered",
      warning: sellerIncomplete,
    },
    {
      label: "Supporting documents",
      status: documentReadiness.length
        ? `${reviewedDocuments} reviewed · ${pendingDocuments} awaiting review · ${missingDocuments} missing`
        : "No saved-property document register",
      warning:
        !documentReadiness.length ||
        pendingDocuments > 0 ||
        missingDocuments > 0,
    },
    {
      label: "Risk analysis",
      status: result?.monteCarlo ? "Simulation included" : "Not run—optional",
      warning: false,
    },
    {
      label: "Property photos",
      status:
        (scenario.photoSelections?.length ?? 0)
          ? scenario.photoRightsAcknowledgment?.confirmed === true
            ? `${scenario.photoSelections.length} selected · permission confirmed`
            : `${scenario.photoSelections.length} selected · permission required`
          : "None selected—optional",
      warning:
        (scenario.photoSelections?.length ?? 0) > 0 &&
        scenario.photoRightsAcknowledgment?.confirmed !== true,
    },
    {
      label: "Saved report revision",
      status: scenario.dirty
        ? "Save required"
        : `Revision ${scenario.revision}`,
      warning: scenario.dirty,
    },
    {
      label: "Preview",
      status: preview ? "Ready to export" : "Not generated",
      warning: !preview,
    },
  ];
  return (
    <section className="iw-report-readiness">
      <div>
        <h3>
          {wholesale ? "Preliminary Evaluation" : "Analysis completeness"}
        </h3>
        <p>
          {wholesale
            ? "Additional Due Diligence Recommended. Outstanding follow-up does not prevent generation of a clearly qualified preliminary report."
            : "Review these items before relying on or sharing a report."}
        </p>
      </div>
      <div>
        {items.map((item) => (
          <article
            className={item.warning ? "warning" : "ready"}
            key={item.label}
          >
            <span>{item.label}</span>
            <b>{item.status}</b>
          </article>
        ))}
      </div>
      <h3>
        {wholesale
          ? "Recommended Follow-Up"
          : "Most important unresolved questions"}
      </h3>
      <ol>
        <li>
          Is the resale assumption supported by selected, relevant closed-sale
          evidence?
        </li>
        <li>
          Have condition, rehabilitation scope and timing been independently
          reviewed?
        </li>
        <li>
          Are title, lien priority, taxes and lender payoff current and
          complete?
        </li>
      </ol>
      <p className="iw-muted">
        The report remains bound to the property and evidence snapshot shown in
        the persistent header. The Full Investor Package includes the approved
        plain-English Monte Carlo explanation whenever simulation results are
        present.
      </p>
    </section>
  );
}
function StageNextAction({ stage, tab, navigate }) {
  const next =
    stage === "research"
      ? ["Sold Sales", "Review Comparable Sales"]
      : stage === "comparables"
        ? ["Seller Financial Position", "Enter Seller Evidence"]
        : stage === "evidence"
          ? ["Underwriting", "Underwrite This Property"]
          : stage === "financial" && tab === "Underwriting"
            ? ["Scenarios", "Compare Scenarios"]
            : stage === "financial" && tab === "Scenarios"
              ? ["Risk", "Review Risk"]
              : stage === "financial"
                ? ["Reports", "Generate Report"]
                : null;
  if (!next) return null;
  return (
    <div className="iw-next-action">
      <span>Next step</span>
      <button className="primary-action" onClick={() => navigate(next[0])}>
        {next[1]} →
      </button>
    </div>
  );
}
function ScenarioComparison({ records, properties, previewById, onOpen }) {
  const snapshots = new Set(
      records.map((record) => record.evidenceFingerprint),
    ),
    assumptions = new Set(
      records.map((record) =>
        JSON.stringify([record.inputs, record.targetType]),
      ),
    );
  return (
    <section data-testid="scenario-comparison">
      <h3>Scenario comparison</h3>
      <p>
        Unsaved previews are calculated in memory and never written into
        historical revisions. Saved rows retain their original revision values.
      </p>
      {snapshots.size > 1 && (
        <p className="iw-error">
          These rows use different evidence snapshots. Compare source dates
          before drawing conclusions.
        </p>
      )}
      {assumptions.size > 1 && records.length > 1 && (
        <p className="iw-status">
          Scenario assumptions differ. Compare purchase, rehabilitation, resale
          and financing inputs before comparing returns.
        </p>
      )}
      <div className="iw-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Property / scenario</th>
              <th>Version</th>
              <th>Purchase</th>
              <th>Resale assumption</th>
              <th>Modeled profit</th>
              <th>Return-hurdle MAO</th>
              <th>Simulated loss</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => {
              const view = scenarioAnalysis(record, previewById),
                analysis = view.analysis,
                property = properties.find(
                  (item) => item.ref === record.propertyRef,
                );
              return (
                <tr
                  key={`${record.id}:${record.revision}:${record.dirty ? "draft" : index}`}
                >
                  <td>
                    {record.dirty ? (
                      <button className="link" onClick={() => onOpen(record)}>
                        {property?.address ?? "Selected property"} ·{" "}
                        {record.name}
                      </button>
                    ) : (
                      <>
                        {property?.address ?? "Selected property"} ·{" "}
                        {record.name}
                      </>
                    )}
                  </td>
                  <td>
                    <b>{view.label}</b>
                    {view.reason && <small>{view.reason}</small>}
                  </td>
                  <td>
                    {record.inputs.purchasePrice === ""
                      ? "Missing"
                      : money(Number(record.inputs.purchasePrice))}
                  </td>
                  <td>
                    {record.inputs.exitValue === ""
                      ? "Missing"
                      : money(Number(record.inputs.exitValue))}
                  </td>
                  <td>{money(analysis?.deterministic?.modeledProfit)}</td>
                  <td>{money(analysis?.mao?.deterministic?.purchasePrice)}</td>
                  <td>
                    {analysis?.monteCarlo
                      ? pct(analysis.monteCarlo.results.probabilityOfLoss)
                      : "Not run"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!records.length && (
        <p className="iw-empty">
          No scenario drafts or saved revisions are available for the selected
          property.
        </p>
      )}
    </section>
  );
}
function FinancialEvidenceRow({
  label,
  help,
  entry,
  onPatch,
  verification,
  attachment,
}) {
  const status = entry?.status ?? "UNKNOWN";
  return (
    <article className="iw-financial-row">
      <div className="iw-row">
        <h4 className="iw-label-with-help">
          {label}
          <Tooltip content={help} label={`About ${label}`} />
        </h4>
        <span className={`iw-financial-status status-${status.toLowerCase()}`}>
          {status.replaceAll("_", " ")}
        </span>
      </div>
      <div className="iw-evidence-grid">
        <label>
          Evidence status
          <ThemedSelect
            aria-label={`${label} status`}
            value={status}
            onChange={(e) =>
              onPatch({
                status: e.target.value,
                ...(e.target.value === "PRESENT" ? {} : { value: "" }),
              })
            }
          >
            <option value="UNKNOWN">Unknown</option>
            <option value="PRESENT">Present / amount available</option>
            <option value="ABSENT">Explicitly none reported</option>
            <option value="RELEASED">Released / satisfied</option>
            <option value="NOT_APPLICABLE">Not applicable</option>
          </ThemedSelect>
        </label>
        <label>
          Amount ($)
          <input
            aria-label={`${label} amount`}
            type="number"
            min="0"
            step="0.01"
            value={entry?.value ?? ""}
            disabled={status !== "PRESENT"}
            onChange={(e) => onPatch({ value: e.target.value })}
          />
        </label>
        <label>
          Evidence source
          <input
            aria-label={`${label} source`}
            maxLength="160"
            value={entry?.sourceName ?? ""}
            onChange={(e) => onPatch({ sourceName: e.target.value })}
          />
        </label>
        <label>
          Evidence date
          <input
            aria-label={`${label} date`}
            type="date"
            value={entry?.sourceDate ?? ""}
            onChange={(e) => onPatch({ sourceDate: e.target.value })}
          />
        </label>
      </div>
      <small>
        {verification.replaceAll("_", " ")} · source and date are required when
        an amount/status is asserted.
      </small>
      {attachment}
    </article>
  );
}
function SellerFinancialPosition({
  entries,
  property,
  scenarioId,
  attachments,
  onAttachmentsChange,
  valuationBasis,
  onValuationBasisChange,
  onChange,
}) {
  const defaults = {
    ORIGINAL_PRINCIPAL: "RECORDED_DOCUMENT",
    ALGORITHMIC_BALANCE: "SOURCE_REPORTED",
    VERIFIED_PAYOFF: "INDEPENDENTLY_VERIFIED",
    DELINQUENT_TAX: "SOURCE_REPORTED",
    PROPOSED_SALE_PRICE: "ANALYST_ASSUMPTION",
  };
  const one = (category) =>
    entries.find((entry) => entry.category === category);
  const patchOne = (category, patch) => {
    const found = one(category),
      verificationClass = defaults[category];
    if (found)
      onChange(
        entries.map((entry) =>
          entry.id === found.id
            ? { ...entry, ...patch, verificationClass }
            : entry,
        ),
      );
    else
      onChange([
        ...entries,
        { ...newEvidence(category), ...patch, verificationClass },
      ]);
  };
  const liens = entries.filter((entry) => entry.category === "LIEN");
  const patchLien = (id, patch) =>
    onChange(
      entries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
  const position = deriveSellerFinancialPosition({
    providerValuation: property.avm.price,
    providerValuationSource: `RentCast ${property.valuationRef ?? "retained AVM"}`,
    valuationBasis,
    entries,
  });
  const attachment = (category, label, type = "MORTGAGE_PAYOFF") => (
    <InlineEvidenceAttachments
      property={property}
      scenarioId={scenarioId}
      fieldKey={`SELLER.${category}`}
      fieldLabel={label}
      defaultDocumentType={type}
      links={attachments}
      onChange={onAttachmentsChange}
    />
  );
  const valuationKnown = position.selectedValuation.amount !== null;
  return (
    <section
      className="iw-seller-position"
      data-testid="seller-financial-position"
    >
      <div className="iw-row">
        <div>
          <h3>Seller Financial Position</h3>
          <p>
            Revisioned analyst evidence for seller obligations and illustrative
            equity—not investor acquisition financing.
          </p>
        </div>
        <span className="iw-pill">Saved with scenario revision</span>
      </div>
      <div className="iw-evidence-boundary">
        <b>Estimated balance is not payoff.</b> Only a separately verified
        payoff is labeled lender-confirmed. Missing mortgage, lien or tax
        evidence remains unknown and blocks equity/proceeds totals.
      </div>
      <div className="iw-financial-grid">
        <FinancialEvidenceRow
          label="Original recorded mortgage amount"
          help="Original principal recorded at origination. It is historical and is not a current balance."
          entry={one("ORIGINAL_PRINCIPAL")}
          verification={defaults.ORIGINAL_PRINCIPAL}
          onPatch={(patch) => patchOne("ORIGINAL_PRINCIPAL", patch)}
          attachment={attachment(
            "ORIGINAL_PRINCIPAL",
            "Original recorded mortgage amount",
          )}
        />
        <FinancialEvidenceRow
          label="Estimated outstanding mortgage balance"
          help="Modeled or source-reported current balance estimate. It is not a lender payoff."
          entry={one("ALGORITHMIC_BALANCE")}
          verification={defaults.ALGORITHMIC_BALANCE}
          onPatch={(patch) => patchOne("ALGORITHMIC_BALANCE", patch)}
          attachment={attachment(
            "ALGORITHMIC_BALANCE",
            "Estimated outstanding mortgage balance",
          )}
        />
        <FinancialEvidenceRow
          label="Verified payoff"
          help="Current payoff confirmed by a lender or independently verified payoff statement. It supersedes an estimated balance in this illustration."
          entry={one("VERIFIED_PAYOFF")}
          verification={defaults.VERIFIED_PAYOFF}
          onPatch={(patch) => patchOne("VERIFIED_PAYOFF", patch)}
          attachment={attachment("VERIFIED_PAYOFF", "Verified payoff")}
        />
        <FinancialEvidenceRow
          label="Delinquent property taxes"
          help="Known delinquent property taxes only. Ordinary future property tax and unknown county charges are not inferred."
          entry={one("DELINQUENT_TAX")}
          verification={defaults.DELINQUENT_TAX}
          onPatch={(patch) => patchOne("DELINQUENT_TAX", patch)}
          attachment={attachment(
            "DELINQUENT_TAX",
            "Delinquent property taxes",
            "PROPERTY_TAX_FORECLOSURE",
          )}
        />
        <FinancialEvidenceRow
          label="Analyst proposed sale price"
          help="Analyst-entered gross sale assumption for seller-proceeds research. It is not an offer, appraisal or verified closing price."
          entry={one("PROPOSED_SALE_PRICE")}
          verification={defaults.PROPOSED_SALE_PRICE}
          onPatch={(patch) => patchOne("PROPOSED_SALE_PRICE", patch)}
          attachment={attachment(
            "PROPOSED_SALE_PRICE",
            "Analyst proposed sale price",
            "COMPARABLE_VALUATION",
          )}
        />
      </div>
      <section className="iw-liens">
        <div className="iw-row">
          <div>
            <h3 className="iw-label-with-help">
              Other liens
              <Tooltip
                content="Recorded or otherwise supported obligations outside the selected mortgage balance. A recorded lien is not presumed open without current-status research."
                label="About other liens"
              />
            </h3>
            <p>
              Add each known lien separately. If lien status has not been
              checked, leave the category unknown.
            </p>
          </div>
          <button
            className="secondary"
            data-tooltip="Add another lien evidence entry to this scenario draft; saved revisions remain unchanged until Save locally."
            onClick={() =>
              onChange([
                ...entries,
                {
                  ...newEvidence("LIEN"),
                  verificationClass: "RECORDED_DOCUMENT",
                },
              ])
            }
          >
            Add another lien
          </button>
        </div>
        {liens.map((entry, index) => (
          <div key={entry.id} className="iw-lien-row">
            <FinancialEvidenceRow
              label={`Other lien ${index + 1}`}
              help="A separate recorded or supported lien. Release and current status must be researched independently."
              entry={entry}
              verification={
                entry.verificationClass === "UNKNOWN"
                  ? "RECORDED_DOCUMENT"
                  : entry.verificationClass
              }
              onPatch={(patch) =>
                patchLien(entry.id, {
                  ...patch,
                  verificationClass:
                    entry.verificationClass === "UNKNOWN"
                      ? "RECORDED_DOCUMENT"
                      : entry.verificationClass,
                })
              }
              attachment={
                <InlineEvidenceAttachments
                  property={property}
                  scenarioId={scenarioId}
                  fieldKey={`SELLER.LIEN:${entry.id}`}
                  fieldLabel={`Other lien ${index + 1}`}
                  defaultDocumentType="LIEN_RELEASE"
                  links={attachments}
                  onChange={onAttachmentsChange}
                />
              }
            />
            <button
              className="secondary"
              data-tooltip="Remove this lien from the current draft only; prior saved revisions remain unchanged."
              onClick={() => {
                onChange(entries.filter((item) => item.id !== entry.id));
                onAttachmentsChange(
                  attachments.filter(
                    (item) => item.fieldKey !== `SELLER.LIEN:${entry.id}`,
                  ),
                );
              }}
            >
              Remove lien
            </button>
          </div>
        ))}
        {!liens.length && (
          <p className="iw-empty">
            Other liens are UNKNOWN. Add evidence or explicitly record an
            absent/released status before equity can be calculated.
          </p>
        )}
      </section>
      <section className="iw-equity-illustration">
        <div className="iw-row">
          <h3>Illustrative seller equity and proceeds</h3>
          <label>
            Valuation basis
            <ThemedSelect
              aria-label="Seller equity valuation basis"
              value={valuationBasis}
              onChange={(e) => onValuationBasisChange(e.target.value)}
            >
              <option value="PROVIDER_AVM">Provider as-is AVM</option>
              <option value="PROPOSED_SALE_PRICE">
                Analyst proposed sale price
              </option>
            </ThemedSelect>
          </label>
        </div>
        <div className="iw-metrics">
          <Metric
            label="Selected property valuation"
            value={money(position.selectedValuation.amount)}
            help="Selected evidence or assumption used only for this seller-equity illustration."
          />
          <Metric
            label="Mortgage obligation used"
            value={money(position.mortgage.amount)}
            help={
              position.mortgage.status === "VERIFIED_PAYOFF"
                ? "Verified payoff is used instead of the estimated balance."
                : "Estimated balance is used only when no verified payoff is available."
            }
          />
          <Metric
            label="Known obligations subtotal"
            value={money(position.knownObligations)}
            help="Sum of the selected mortgage obligation, known liens and known delinquent taxes. Unknown obligations are not counted as zero."
          />
          <Metric
            label="Illustrative gross equity"
            value={money(position.grossEquity)}
            help="Selected valuation minus known/estimated obligations. Unknown obligations block this total."
          />
          <Metric
            label="Estimated seller proceeds"
            value={money(position.estimatedSellerProceeds)}
            help="Proposed gross sale price minus known/estimated obligations. Transaction costs and unresolved obligations are omitted."
          />
        </div>
        {!valuationKnown && (
          <p className="iw-error">
            The selected valuation is unknown. Choose an available provider AVM
            or enter a proposed sale price.
          </p>
        )}
        {position.unresolvedObligations.length > 0 && (
          <div className="iw-error">
            <b>Not calculable—unknown is not zero.</b>
            <ul>
              {position.unresolvedObligations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {position.grossEquity !== null && position.grossEquity < 0 && (
          <p className="iw-error">
            <b>Illustrative negative equity.</b> Known/estimated obligations
            exceed the selected valuation before transaction costs.
          </p>
        )}
        <p className="iw-muted">
          {position.caveat} These seller obligations are never added to
          acquisition expenses or MAO.
        </p>
      </section>
    </section>
  );
}
function OccupancyDeliveryEditor({
  entries,
  property,
  scenarioId,
  attachments,
  onAttachmentsChange,
  onChange,
}) {
  const definitions = [
    [
      "OCCUPANCY",
      "Current occupancy",
      "Who occupies the property now. This does not establish possession at closing.",
    ],
    [
      "DELIVERY_CONDITION",
      "Advertised or promised delivery",
      "What the seller, wholesaler or contract says will be delivered. Marketing is source-reported, not verified possession.",
    ],
    [
      "POSSESSION",
      "Verified possession or vacancy",
      "Evidence that lawful possession or vacancy has actually been confirmed for closing.",
    ],
  ];
  const current = (category) =>
    [...entries].reverse().find((entry) => entry.category === category) ?? null;
  const patch = (category, values) => {
    const existing = current(category);
    if (existing)
      onChange(
        entries.map((entry) =>
          entry.id === existing.id ? { ...entry, ...values } : entry,
        ),
      );
    else onChange([...entries, { ...newEvidence(category), ...values }]);
  };
  const recordAdvertisedVacant = () =>
    patch("DELIVERY_CONDITION", {
      status: "PRESENT",
      value: "Vacant",
      sourceName: "Wholesaler marketing information",
      verificationClass: "SOURCE_REPORTED",
      includeInReport: true,
      sensitive: false,
      notes:
        "Advertised delivery condition only. Current occupancy and lawful possession remain separate diligence questions.",
    });
  return (
    <section
      className="iw-evidence-editor iw-occupancy-delivery"
      data-testid="occupancy-delivery-editor"
    >
      <div className="iw-row">
        <div>
          <h3>Occupancy, delivery and possession</h3>
          <p>
            Record these as three independent facts. An advertised vacant
            delivery condition never proves current occupancy or lawful
            possession at closing.
          </p>
        </div>
        <button
          className="secondary"
          type="button"
          onClick={recordAdvertisedVacant}
        >
          Record advertised vacant delivery
        </button>
      </div>
      <div className="iw-evidence-boundary">
        <b>Source boundary:</b> “Wholesaler marketing information” is
        source-reported / not independently verified. Keep occupancy and
        possession diligence open until appropriate documentation confirms them.
      </div>
      <div className="iw-evidence-list">
        {definitions.map(([category, labelText, help]) => {
          const entry = current(category) ?? {
            ...newEvidence(category),
            id: null,
          };
          return (
            <article key={category} className="iw-evidence-item">
              <h4>{labelText}</h4>
              <p>{help}</p>
              <div className="iw-evidence-grid">
                <label>
                  Status
                  <ThemedSelect
                    value={entry.status}
                    onChange={(event) =>
                      patch(category, { status: event.target.value })
                    }
                  >
                    {["UNKNOWN", "PRESENT", "ABSENT", "NOT_APPLICABLE"].map(
                      (value) => (
                        <option key={value}>{value}</option>
                      ),
                    )}
                  </ThemedSelect>
                </label>
                <label>
                  Value or finding
                  <input
                    maxLength="500"
                    value={entry.value}
                    placeholder="Unknown until sourced"
                    onChange={(event) =>
                      patch(category, { value: event.target.value })
                    }
                  />
                </label>
                <label>
                  Verification class
                  <ThemedSelect
                    value={entry.verificationClass}
                    onChange={(event) =>
                      patch(category, { verificationClass: event.target.value })
                    }
                  >
                    {evidenceClasses.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </ThemedSelect>
                </label>
                <label>
                  Source name
                  <input
                    maxLength="160"
                    value={entry.sourceName}
                    onChange={(event) =>
                      patch(category, { sourceName: event.target.value })
                    }
                  />
                </label>
                <label>
                  Source date
                  <input
                    type="date"
                    value={entry.sourceDate}
                    onChange={(event) =>
                      patch(category, { sourceDate: event.target.value })
                    }
                  />
                </label>
              </div>
              {entry.id ? (
                <InlineEvidenceAttachments
                  property={property}
                  scenarioId={scenarioId}
                  fieldKey={`ANALYST.${entry.id}`}
                  fieldLabel={labelText}
                  defaultDocumentType="OTHER"
                  links={attachments}
                  onChange={onAttachmentsChange}
                />
              ) : (
                <small>
                  Enter a value or source to create this draft evidence record;
                  attachments can then be linked.
                </small>
              )}
              <label>
                Research notes
                <textarea
                  maxLength="1000"
                  value={entry.notes}
                  onChange={(event) =>
                    patch(category, { notes: event.target.value })
                  }
                />
              </label>
            </article>
          );
        })}
      </div>
    </section>
  );
}
function AnalystEvidenceEditor({
  entries,
  property,
  scenarioId,
  attachments,
  onAttachmentsChange,
  onChange,
  excludeCategories = new Set(),
}) {
  const visibleEntries = entries.filter(
    (entry) => !excludeCategories.has(entry.category),
  );
  const add = () => onChange([...entries, newEvidence("CONDITION")]);
  const change = (id, patch) =>
    onChange(
      entries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
  const remove = (id) => {
    onChange(entries.filter((entry) => entry.id !== id));
    onAttachmentsChange(
      attachments.filter((item) => item.fieldKey !== `ANALYST.${id}`),
    );
  };
  const recorded = new Set(visibleEntries.map((entry) => entry.category)),
    unknown = evidenceCategories.filter(
      ([key]) => !excludeCategories.has(key) && !recorded.has(key),
    );
  return (
    <section
      className="iw-evidence-editor"
      data-testid="analyst-evidence-editor"
    >
      <div className="iw-row">
        <div>
          <h3>Analyst evidence workspace</h3>
          <p>
            Research entries are saved with this scenario revision and remain
            separate from retained provider evidence and PI calculations.
          </p>
        </div>
        <button onClick={add}>Add research item</button>
      </div>
      <div className="iw-evidence-boundary">
        <b>Unknown by default.</b> A recorded lien is not automatically
        outstanding. An algorithmic balance is not a verified lender payoff.
        Sensitive entries and private attachment references are excluded from
        investor reports by default.
      </div>
      {unknown.length > 0 && (
        <details open>
          <summary>{unknown.length} research categories remain unknown</summary>
          <ul className="iw-gap-list">
            {unknown.map(([, label]) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </details>
      )}
      <div className="iw-evidence-list">
        {visibleEntries.map((entry, index) => (
          <article key={entry.id} className="iw-evidence-item">
            <div className="iw-row">
              <h4>Research item {index + 1}</h4>
              <button className="secondary" onClick={() => remove(entry.id)}>
                Remove
              </button>
            </div>
            <div className="iw-evidence-grid">
              <label>
                Evidence category
                <ThemedSelect
                  aria-label={`Evidence category ${index + 1}`}
                  value={entry.category}
                  onChange={(e) =>
                    change(entry.id, { category: e.target.value })
                  }
                >
                  {evidenceCategories.map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </ThemedSelect>
              </label>
              <label>
                Status
                <ThemedSelect
                  aria-label={`Evidence status ${index + 1}`}
                  value={entry.status}
                  onChange={(e) => change(entry.id, { status: e.target.value })}
                >
                  {[
                    "UNKNOWN",
                    "PRESENT",
                    "ABSENT",
                    "RELEASED",
                    "NOT_APPLICABLE",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </ThemedSelect>
              </label>
              <label>
                Value or finding
                <input
                  aria-label={`Evidence value ${index + 1}`}
                  maxLength="500"
                  value={entry.value}
                  onChange={(e) => change(entry.id, { value: e.target.value })}
                  placeholder="Unknown until sourced"
                />
              </label>
              <label>
                Verification class
                <ThemedSelect
                  aria-label={`Evidence verification ${index + 1}`}
                  value={entry.verificationClass}
                  onChange={(e) =>
                    change(entry.id, { verificationClass: e.target.value })
                  }
                >
                  {evidenceClasses.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </ThemedSelect>
              </label>
              <label>
                Source name
                <input
                  aria-label={`Evidence source ${index + 1}`}
                  maxLength="160"
                  value={entry.sourceName}
                  onChange={(e) =>
                    change(entry.id, { sourceName: e.target.value })
                  }
                />
              </label>
              <label>
                Source date
                <input
                  aria-label={`Evidence source date ${index + 1}`}
                  type="date"
                  value={entry.sourceDate}
                  onChange={(e) =>
                    change(entry.id, { sourceDate: e.target.value })
                  }
                />
              </label>
              <label>
                Retrieval date <small>optional</small>
                <input
                  aria-label={`Evidence retrieval date ${index + 1}`}
                  type="date"
                  value={entry.retrievedAt}
                  onChange={(e) =>
                    change(entry.id, { retrievedAt: e.target.value })
                  }
                />
              </label>
            </div>
            <InlineEvidenceAttachments
              property={property}
              scenarioId={scenarioId}
              fieldKey={`ANALYST.${entry.id}`}
              fieldLabel={
                evidenceCategories.find(
                  ([key]) => key === entry.category,
                )?.[1] ?? entry.category
              }
              defaultDocumentType={
                entry.category === "CONDITION"
                  ? "PROPERTY_CONDITION"
                  : [
                        "PROPERTY_TAX",
                        "DELINQUENT_TAX",
                        "FORECLOSURE_EVENT",
                      ].includes(entry.category)
                    ? "PROPERTY_TAX_FORECLOSURE"
                    : [
                          "RECORDED_MORTGAGE",
                          "ORIGINAL_PRINCIPAL",
                          "ALGORITHMIC_BALANCE",
                          "VERIFIED_PAYOFF",
                        ].includes(entry.category)
                      ? "MORTGAGE_PAYOFF"
                      : ["LIEN", "RELEASE"].includes(entry.category)
                        ? "LIEN_RELEASE"
                        : "OTHER"
              }
              links={attachments}
              onChange={onAttachmentsChange}
            />
            <label>
              Research notes
              <textarea
                aria-label={`Evidence notes ${index + 1}`}
                maxLength="1000"
                value={entry.notes}
                onChange={(e) => change(entry.id, { notes: e.target.value })}
              />
            </label>
            <div className="iw-row iw-evidence-options">
              <label className="iw-check">
                <input
                  type="checkbox"
                  checked={entry.includeInReport}
                  onChange={(e) =>
                    change(entry.id, { includeInReport: e.target.checked })
                  }
                />
                Include non-sensitive summary in reports
              </label>
              <label className="iw-check">
                <input
                  type="checkbox"
                  checked={entry.sensitive}
                  onChange={(e) =>
                    change(entry.id, {
                      sensitive: e.target.checked,
                      includeInReport: e.target.checked
                        ? false
                        : entry.includeInReport,
                    })
                  }
                />
                Sensitive / owner-contact / restricted document
              </label>
            </div>
          </article>
        ))}
      </div>
      {!visibleEntries.length && (
        <p className="iw-empty">
          No additional analyst research entries yet. Missing evidence remains
          unknown; no absence or zero balance is inferred.
        </p>
      )}
    </section>
  );
}
function RiskResult({ mc }) {
  const b = mc.results.profitDistribution,
    max = Math.max(...b.map((x) => x.count), 1);
  return (
    <section data-testid="risk-result">
      <div className="iw-plain-risk">
        <h3>How to read these results</h3>
        <p>
          PI tested many hypothetical combinations inside the ranges you
          entered. P10 is a lower-profit result, P50 is the middle result and
          P90 is a higher-profit result. These are simulated outcomes—not a
          prediction or the probability that the investment will succeed.
        </p>
      </div>
      <div className="iw-metrics">
        <Metric
          label="Conditional probability of loss"
          value={pct(mc.results.probabilityOfLoss)}
        />
        <Metric label="Profit P10" value={money(mc.results.profit.p10)} />
        <Metric label="Profit P50" value={money(mc.results.profit.p50)} />
        <Metric label="Profit P90" value={money(mc.results.profit.p90)} />
        <Metric
          label="Target attainment"
          value={pct(mc.results.probabilityMeetingTarget)}
        />
      </div>
      <h3>Simulated profit distribution</h3>
      <div
        className="iw-histogram"
        role="img"
        aria-label="Simulated profit histogram"
      >
        {b.map((x, i) => (
          <div
            key={i}
            title={`${money(x.min)}–${money(x.max)}: ${x.count} trials`}
            style={{
              height: `${Math.max(1, (x.count / max) * 100)}%`,
              background: x.max <= 0 ? "#b95c48" : "#19796f",
            }}
          >
            <span>{x.count}</span>
          </div>
        ))}
      </div>
      <div className="iw-row">
        <span>{money(b[0]?.min)}</span>
        <span>{money(b.at(-1)?.max)}</span>
      </div>
      <h3>Paired sensitivity stresses</h3>
      <div className="iw-waterfall">
        {mc.sensitivity.stresses.map((x) => (
          <div key={x.factor}>
            <span>
              {x.factor} · {x.stress}
            </span>
            <b>{money(x.effects.netProfit.meanChange)} mean profit change</b>
          </div>
        ))}
      </div>
      <Source>
        {mc.modelVersion} · seed {mc.simulation.seed} ·{" "}
        {mc.simulation.iterations} accepted trials · no discarded trials
      </Source>
      <ul>
        {mc.limitations?.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </section>
  );
}
