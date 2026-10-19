# PROPERTY INTELLIGENCE — GABE DEMO V2
## Six Real Properties: Address, Distress Evidence, Valuation, Sold Comps and Investor-Ready PDF

**Owner:** Workside Software LLC  
**Priority:** URGENT — prepare for Gabe's October 13 afternoon meeting if feasible  
**Total authorized incremental spend:** **$20 maximum across Google Maps and RentCast combined**  
**Scope:** Up to six Kern County properties; local research/demo only. This authorization supersedes the earlier $1 *budget for this separate demo task*, but does **not** modify the frozen Stage A pilot's $1 cap, sealed candidate, ledger, or permission boundaries.  
**Important:** No production writes, MLS selections, deployment, final investment approvals, or changes to certified calculations.

## 1. Outcome and execution priority

Produce a materially useful, professional investment-research PDF for Gabe, not another generic readiness assessment. The existing 12-page V1 is visually acceptable but commercially weak: no complete addresses, property characteristics, concrete distress reasons, value estimates or comps. Fix these gaps with actual evidence, or mark them unavailable with a precise explanation.

**Prioritize a usable V2 deliverable over expanding certification infrastructure.** Work in a timebox: first establish a viable set of identifiable subjects; then acquire facts/values/comps; then produce and visually inspect the PDF. If time runs out, deliver the best 3–6 complete profiles rather than six empty profiles. Keep V1 intact as a fallback.

## 2. Preserve existing boundaries

- Read existing Gabe demo V1 readiness, private source bindings, original 77 nonpilot pool, exclusions, Google Geocoding pilot, RentCast rights/pricing emails, and certified investor report components.
- Do not modify V3 durable identity, Rule C, Monte Carlo, MAO, existing investor report templates, original Stage A pilot, baseline manifests, historical decisions, or sealed Round 1 selections.
- This is a **separately authorized demo enrichment**. Do not repurpose or bypass the blocked Stage A live engine or reset its ledger. If no safe, already-supported provider-call path exists, stop provider calls and present the precise interface/manual steps needed. Do not silently build a new credential or authorization bypass.
- No owner/contact information in shareable materials. Keep keys server-side and all raw/provider-sensitive evidence in gitignored local directories. Respect Google Maps Platform data retention and caching restrictions: do not presume RentCast's durable rights extend to Google-derived content. Check applicable current terms and keep Google results transient or otherwise compliant.

## 3. Select 5–6 worthwhile candidates, not arbitrary source order

Inspect the six V1 candidates first. For each, recover the actual source situs string, county identifiers, assessor classification, Power-to-Sell record, and source dates. Record the exact **reason for inclusion**: tax-sale list membership, tax amount/date if present, recorded mortgage/foreclosure signal if genuinely supported, or other concrete source facts. **Do not invent tax delinquency, mortgage default, lien balances, auction status, or seller motivation.** Absence of mortgage evidence means UNKNOWN, not 'no mortgage'.

If any of the original six is not addressable or is commercially uninformative, replace it from the eligible nonpilot pool using a transparent, deterministic selection rationale favoring evidence completeness and meaningful *historical* distress indicators. Preserve all technical-pilot exclusions and identity conflicts. Log every substitution privately. This is a demo shortlist, not MLS Round 1 selection or an investment ranking.

## 4. Address resolution — Google + manual analyst review

For each selected county situs, perform an authorized Google Geocoding lookup if needed, with county/city/state constraints and no invented ZIP. Cap at **one initial geocoding attempt per property**, with any follow-up requiring a documented reason and remaining budget. Capture formatted address, components, precision, partial-match status, ambiguity and retrieval time in a private review packet, subject to provider terms.

Provide a compact **local manual-review screen** for Stan: county situs vs Google suggestion; accept as preliminary address, edit with cited evidence, or mark unresolved. Preserve a clear distinction between geographic address match and legal parcel identity. Do not automatically mark verified or create durable canonical Properties. If Google address evidence cannot legally be retained for the intended output, use permitted alternatives and clearly disclose the restriction.

If the user must operate an interface to provide an API key, review a candidate, or confirm a result, show exact local steps and pause **only the affected candidate**, not the entire demo.

## 5. RentCast property facts, values and sold comparables

Once each subject has a defensible source-bound address, use authorized RentCast endpoints to obtain:

1. Property Records: provider ID, full address, beds, baths, floor area, lot, year, type, last sale where returned.
2. Value Estimate: as-is AVM estimate, date, range, and limitations. **Do not call this ARV.**
3. Sold-property candidates: bounded search for recent completed sales with price/date, distance and relevant characteristics; distinguish actual recorded sold transactions from AVM comparable suggestions or active listings.

Verify subject identity before joining provider records: compare address, jurisdiction, provider ID, county APN relationship where possible. RentCast `assessorID` is not authoritative; never infer APN equivalence or strip meaningful zeros. Quarantine conflicts and do not display them as verified.

For each candidate aim for **3–5 credible sold comps**, with source/date, address if licensed, sale price, date, beds/baths, size, distance and a concise comparability note. If insufficient, say so. Proposed geographic/recency bounds should be reasonable for the local market and documented; widening them requires a recorded reason. Do not fabricate adjustment amounts or infer renovation condition.

## 6. Financial presentation rules

- Show as-is AVM and its range **only when returned and correctly subject-bound**.
- ARV is **NOT ESTABLISHED** absent credible post-repair condition assumptions and comparable evidence. A tentative scenario can be shown only if explicitly labeled analyst/investor assumption and visually separated from provider facts.
- Rehab cost and acquisition price remain unknown unless documented. Never turn assessed value, tax amount, mortgage balance or AVM into an asking price.
- If a scenario has missing critical inputs, do not calculate ROI, MAO, profit or Monte Carlo for that real property.
- Where financial inputs are insufficient, use a concise 'What we know / What we need to underwrite' summary, not a page dominated by repeated disclaimers.

## 7. Spend and request limits

**User-authorized combined ceiling: $20 incremental charges** for this six-property demonstration. This is not a target. Before calls, establish the current request charges and Google billing treatment from available evidence. RentCast support confirmed all endpoints are included in the Developer plan and published pricing includes taxes and fees; historically 50 included requests and $0.20 overage. Do not assume the earlier 47 remaining balance is current.

Initial planning allowance: up to **6 Google geocoding + 18 RentCast requests** (one Property Records, one value estimate, one sold-search per property). At $0.20 per billable RentCast overage, 18 would be $3.60 if all were overage. Google charges are separate and must be budgeted. Any additional requests require explicit count and remaining-spend calculation, not an unlimited retry loop.

Use a private append-only call log with request purpose, subject opaque ID, endpoint, time, response status, conservative cost exposure, and outcome. Never log credentials. No uncontrolled retries, pagination, fallback providers or background sweeps. Stop **all paid calls** if the worst-case aggregate incremental cost could exceed $20. If an existing gate requires a separate formal live activation, respect it and request the exact user action instead of bypassing it.

## 8. Investor-quality PDF design

Deliver `PI_GABE_OPPORTUNITY_REPORT_V2.pdf` and matching offline HTML. Aim for a compact cover, executive comparison, 1–2 pages per candidate, valuation/comps summary, risks/missing evidence, methodology/source dates, and required complete county disclaimer. Keep page count proportionate to substance; avoid repetitive empty boilerplate.

Each property page should clearly show:
- **Property address and city** (or a prominent unresolved-address label).
- Property characteristics, with source and date.
- **Why PI surfaced it:** exact historical tax/mortgage/other trigger and its limits.
- As-is value estimate/range if supported; do not imply ARV.
- A concise table of credible sold comps or explicit 'insufficient sold comps'.
- Key risks: current status, title, occupancy, condition, zoning, identity issues.
- A prioritized next diligence action and an evidence-confidence label.

Use the current PI visual identity. Do not use decorative stock property photos as if they depict the subject. Only include subject photos when actual rights and identity are verified. No invented maps or property imagery. Include date/as-of labels and visible 'PRELIMINARY RESEARCH — NOT AN INVESTMENT RECOMMENDATION'. Keep county disclaimer intact with distributed copies.

## 9. Manual interface and review workflow

If manual intervention is required, create a simple local review queue with one row per property and these actions: `Accept address suggestion`, `Needs correction`, `Reject`, `Accept sold comparable`, `Exclude comparable`, `Add evidence note`. Capture reviewer decisions and timestamps genuinely, without preselecting acceptance. Do not make the user type long provenance hashes or reapprove the same claim repeatedly. No manual county phone call is required for this demo.

If a live provider gate is technically blocked, **do not create yet another versioned selector**. Present a concise 'blocked action + exact safe user step' and proceed with other local evidence and PDF work. If manually exported provider results are available, import them only through a provenance-checked, rights-compliant path.

## 10. Quality assurance

- Confirm all candidates are real and non-excluded; source IDs private.
- Confirm every displayed address, distress fact, property characteristic, valuation and sold comp has an exact source reference and date.
- Verify no fake ARV, asking price, rehab, lien, ROI or return claims.
- Verify request count and conservative total cost stay within approved limits.
- Confirm no credentials, owner/contact data or protected identifiers leak into public/shareable files.
- Render PDF and visually inspect **every page**, including overflow, typography, tables, footers and county disclaimer.
- Run focused tests and preservation checks without rewriting frozen historical outputs.
- Zero production database writes, zero MLS selection, zero deployment.

## 11. Deliverables and final report

Provide:

- `data/runtime/gabe-demo-v2-2026-10-13/PI_GABE_OPPORTUNITY_REPORT_V2.pdf`
- `data/runtime/gabe-demo-v2-2026-10-13/PI_GABE_OPPORTUNITY_REPORT_V2.html`
- `data/runtime/gabe-demo-v2-2026-10-13/REVIEW_QUEUE.html` if manual review is required
- `data/runtime/gabe-demo-v2-2026-10-13/ENRICHMENT_LEDGER.json` (private)
- `docs/PI_GABE_DEMO_V2_READINESS.md` (sanitized)

Final Codex summary:

```text
PI GABE DEMO V2 — REAL PROPERTY ENRICHMENT
Candidate count: N
Complete reviewed addresses: N/N
Google calls: N
RentCast calls: N
Actual maximum incremental cost exposure: $X / $20
Property Records matched: N
AVM estimates: N
Sold comps accepted: N
Specific historical distress reasons: N
Unsupported mortgage claims: 0
Unsupported ARV/ROI claims: 0
PDF pages rendered and visually inspected: N/N
Manual review actions needed: [exact steps or NONE]
Production database writes: 0
MLS selections: 0
Unexpected protected changes: 0
Final classification: DEMO_V2_READY / PARTIAL_DEMO_READY / ACTION_REQUIRED
```

**Stop after delivery for Stan/ChatGPT review.** Do not automatically expand to MLS validation, live investor distribution or production deployment.
