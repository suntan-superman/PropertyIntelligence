const text = (value) => String(value ?? "").trim();

const propertyType = (value) => {
  const normalized = text(value).toUpperCase();
  if (!normalized) return "";
  if (normalized === "MF" || normalized.includes("MULTI")) return "MF";
  if (
    normalized === "SF" ||
    normalized.includes("SINGLE") ||
    normalized.includes("RESIDENTIAL")
  )
    return "SF";
  return "";
};

const fundingOrientation = (value) => {
  const normalized = text(value).toUpperCase();
  if (normalized === "CASH") return "CASH";
  if (normalized && normalized !== "UNKNOWN") return "FINANCING";
  return "UNKNOWN";
};

const strategy = (scenario, fallback) => {
  const saved = text(scenario?.strategy).toUpperCase();
  if (["FIX_AND_FLIP", "BUY_AND_HOLD", "WHOLESALE"].includes(saved))
    return saved;
  return fallback || "FIX_AND_FLIP";
};

export function filterMatchProperties(
  properties = [],
  { search = "", status = "SAVED_PROPERTY" } = {},
) {
  const query = text(search).toLowerCase();
  return properties.filter(
    (property) =>
      (status === "ALL" || property.lifecycleStatus === status) &&
      (!query || text(property.address).toLowerCase().includes(query)),
  );
}

export function latestScenarioForProperty(property, scenarios = []) {
  if (!property) return null;
  return scenarios
    .filter((scenario) => scenario?.propertyRef === property.sourceSubjectRef)
    .sort(
      (left, right) =>
        text(right.savedAt).localeCompare(text(left.savedAt)) ||
        Number(right.revision ?? 0) - Number(left.revision ?? 0),
    )[0] ?? null;
}

export function populateDealFromProperty({
  property,
  evidenceProperties = [],
  scenarios = [],
  current = {},
}) {
  if (!property) return current;
  const evidence = evidenceProperties.find(
      (item) =>
        item?.durablePropertyId === property.id ||
        item?.ref === property.sourceSubjectRef,
    ),
    scenario = latestScenarioForProperty(property, scenarios),
    inputs = scenario?.inputs ?? {},
    components = property.addressComponents ?? evidence?.addressComponents ?? {},
    exactClosingTimeline =
      scenario?.closingTimelineDays ?? inputs.closingTimelineDays ?? "";
  return {
    ...current,
    propertyId: property.id,
    propertyAddress: property.address,
    propertyType: propertyType(
      property.propertyType ?? evidence?.attributes?.propertyType,
    ),
    strategy: strategy(scenario, current.strategy),
    state: text(components.state).toUpperCase(),
    county: text(evidence?.attributes?.county),
    fundingOrientation: fundingOrientation(scenario?.financingMode),
    acquisitionPrice: text(inputs.purchasePrice),
    rehabilitationEstimate: text(inputs.rehabCost),
    estimatedResale: text(inputs.exitValue),
    closingTimelineDays: text(exactClosingTimeline),
  };
}

export function latestReportForProperty(reports = [], propertyId) {
  return reports
    .filter((report) => report.propertyId === propertyId)
    .sort(
      (left, right) =>
        text(right.generatedAt).localeCompare(text(left.generatedAt)) ||
        Number(right.revision ?? 0) - Number(left.revision ?? 0),
    )[0] ?? null;
}
