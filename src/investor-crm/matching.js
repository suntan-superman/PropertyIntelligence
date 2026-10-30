const upper = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

export function matchInvestor(investor, deal) {
  const numeric = (value) =>
    value === null || value === undefined || value === ""
      ? Number.NaN
      : Number(value);
  const reasons = [],
    missing = [],
    exclusions = [],
    criteria = investor.criteria ?? {},
    communication = investor.communication ?? {},
    type = upper(deal.propertyType),
    strategy = upper(deal.strategy),
    state = upper(deal.state),
    county = upper(deal.county),
    purchase = numeric(deal.acquisitionPrice),
    rehab = numeric(deal.rehabilitationEstimate);
  if (["DO_NOT_CONTACT", "ARCHIVED", "INACTIVE"].includes(investor.status))
    exclusions.push(
      `Investor status is ${investor.status.replaceAll("_", " ").toLowerCase()}.`,
    );
  if (["OPTED_OUT", "SUPPRESSED"].includes(communication.emailStatus))
    exclusions.push("Email contact is opted out or suppressed.");
  if (!investor.email || communication.bounceStatus === "HARD")
    exclusions.push("No deliverable investor email is available.");

  const types = criteria.propertyTypes ?? [];
  if (!types.length) missing.push("Property-type preference is not recorded.");
  else if (types.includes("ANY") || types.includes(type))
    reasons.push(`${type || "Property"} type matches recorded preference.`);
  else exclusions.push("Property type conflicts with the recorded criteria.");

  const strategies = criteria.strategies ?? [];
  if (!strategies.length) missing.push("Investment strategy is not recorded.");
  else if (strategies.includes("ANY") || strategies.includes(strategy))
    reasons.push("Investment strategy matches.");
  else
    exclusions.push(
      "Investment strategy conflicts with the recorded criteria.",
    );

  const geographies = criteria.geographies ?? [];
  if (!geographies.length)
    missing.push("Geographic preference is unspecified.");
  else if (!state)
    missing.push("Property state is unavailable for geographic matching.");
  else {
    const sameState = geographies.filter((item) => upper(item.state) === state),
      statewide = sameState.some(
        (item) => item.scope === "STATEWIDE" || !item.county,
      ),
      countyMatch =
        county &&
        sameState.some(
          (item) =>
            upper(item.county) === county ||
            upper(item.county) === `${county} COUNTY`,
        );
    if (statewide || countyMatch)
      reasons.push(`${county || state} matches recorded geography.`);
    else if (
      !county &&
      sameState.some((item) => item.scope === "COUNTY" || item.county)
    )
      missing.push(
        "Property county is unavailable for county-specific matching.",
      );
    else
      exclusions.push("Deal location conflicts with the recorded geography.");
  }

  if (!Number.isFinite(purchase))
    missing.push("Acquisition price is unavailable.");
  else {
    if (
      criteria.minimumAcquisitionAmount != null &&
      purchase < criteria.minimumAcquisitionAmount
    )
      exclusions.push("Acquisition is below the recorded minimum.");
    if (
      criteria.maximumAcquisitionAmount != null &&
      purchase > criteria.maximumAcquisitionAmount
    )
      exclusions.push("Acquisition exceeds the recorded maximum.");
    if (
      !exclusions.some((item) => /Acquisition/.test(item)) &&
      (criteria.minimumAcquisitionAmount != null ||
        criteria.maximumAcquisitionAmount != null)
    )
      reasons.push("Acquisition price is within the recorded range.");
    if (
      criteria.minimumAcquisitionAmount == null &&
      criteria.maximumAcquisitionAmount == null
    )
      missing.push("Numeric acquisition range is not established.");
  }
  if (Number.isFinite(rehab) && criteria.maximumRehabilitationBudget != null) {
    if (rehab > criteria.maximumRehabilitationBudget)
      exclusions.push(
        "Rehabilitation estimate exceeds the recorded tolerance.",
      );
    else
      reasons.push("Rehabilitation estimate is within the recorded tolerance.");
  }
  if (criteria.activelyBuying === "NO")
    exclusions.push("Investor is not actively buying.");
  else if (criteria.activelyBuying === "YES")
    reasons.push("Investor is recorded as actively buying.");
  else missing.push("Active-buying status is unknown.");

  const funding = upper(criteria.fundingPreference),
    cash = upper(investor.capability?.cashBuyer),
    dealFunding = upper(deal.fundingOrientation);
  if (funding === "UNKNOWN" && cash === "UNKNOWN")
    missing.push("Purchase method is unknown.");
  else if (
    dealFunding === "CASH" &&
    (funding === "CASH" || funding === "EITHER" || cash === "YES")
  )
    reasons.push(
      "Recorded purchasing method supports a cash-oriented acquisition.",
    );
  else if (!dealFunding || dealFunding === "UNKNOWN")
    missing.push(
      "Deal funding orientation is unspecified; purchasing capability was not assumed.",
    );

  const fit = exclusions.length
    ? "NOT_MATCHED"
    : missing.length
      ? reasons.length >= 3
        ? "POSSIBLE_MATCH"
        : "NEEDS_REVIEW"
      : "STRONG_MATCH";
  const eligible = !exclusions.some((item) =>
    /status|opted out|suppressed|deliverable|conflicts|exceeds|below|not actively/i.test(
      item,
    ),
  );
  return {
    investorId: investor.id,
    fit,
    eligible,
    reasons,
    missing,
    exclusions,
  };
}

export function matchInvestors(investors, deal) {
  const rank = {
    STRONG_MATCH: 0,
    POSSIBLE_MATCH: 1,
    NEEDS_REVIEW: 2,
    NOT_MATCHED: 3,
  };
  return investors
    .map((investor) => ({ investor, ...matchInvestor(investor, deal) }))
    .sort(
      (a, b) =>
        rank[a.fit] - rank[b.fit] ||
        a.investor.fullName.localeCompare(b.investor.fullName),
    );
}
