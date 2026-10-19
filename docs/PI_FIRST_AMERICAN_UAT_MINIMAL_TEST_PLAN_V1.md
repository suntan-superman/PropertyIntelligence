# PI First American UAT Minimal Test Plan V1

Date: 2026-10-14  
Status: planning only; no UAT execution authorized by this document

## Purpose

Validate the smallest useful First American distress-discovery path for Bakersfield ZIP 93312 without guessing contracts, over-ordering products, or treating modeled balances as payoffs.

## Mandatory preflight

Do not authenticate or transmit a provider request until all of these are satisfied:

1. First American supplies the exact Advanced Search contract, or explicitly confirms that Advanced Search is implemented through Flex Search, including route, method, product identifier, complete JSON example, and required headers.
2. The example documents ZIP 93312, residential/SFR, supported Notice of Default/trustee-sale/foreclosure filters, status/event codes, date semantics, sort order, maximum results, and pagination behavior.
3. The exact TotalView search method for returned candidates is confirmed. The proven FullAddress contract may be used only for uniquely reconciled addresses.
4. Any optional specialized product has a vendor-authored endpoint, selector, request body, response example, and charge.
5. PI-specific UAT allowance, billing units, per-call/download fees, rate limits, and a hard approved request ceiling are recorded.
6. Retention and use rights for raw/normalized data, authenticated SaaS display, and any PDF/export behavior are recorded. Investor-facing access remains password protected unless broader rights are explicitly supplied.
7. A dated operator authorization names ZIP 93312, permitted products, maximum result count, maximum requests, maximum spend, no-retry rule, and expiration.

If any preflight item is absent or contradictory, stop before authentication.

## Proposed minimal sequence

| Step | Maximum transmitted operations | Action | Stop rule |
| --- | ---: | --- | --- |
| 1 | 1 authentication | Use the proven authentication route; keep JWT in memory and never log it. | Stop on unexpected status/shape or unresolved billing treatment. |
| 2 | 1 discovery search | Run one vendor-documented geographic search for ZIP 93312, residential/SFR, and one explicitly documented distress condition. Set maximum results to 3. No retries, pagination, alternate filters, owner search, or fallback product. | Stop if the contract, charge, result cap, identity fields, status semantics, or geography differs from documentation. |
| 3 | 0 provider calls | Inspect at most three returned candidates. Validate ZIP/county/FIPS, property type, event/status/date fields, DataTree PropertyId, APN, address completeness, and result uniqueness. | Stop and quarantine any ambiguous, out-of-area, excluded, or conflicting identity. |
| 4 | Initially 1 TotalView; at most 3 only if separately authorized | Order TotalView for a uniquely reconciled candidate using a documented search method. Additional candidates require the approved ceiling and clean prior result. | Stop on subject mismatch, undocumented status, new charge, missing provenance, or nearby data being confused with subject data. |
| 5 | At most 1 optional specialized call | Choose exactly one of Foreclosure Report, Last Finance Document, or Open Lien Report based on the single highest-value unanswered question. Do not order all three. | Do not call unless its exact contract, entitlement, price, and response semantics are documented. Stop after the result. |
| 6 | 0 provider calls | Reconcile and report. No database write, Property creation, scoring change, investor report, or production integration. | Stop for Stan/ChatGPT review. |

Planned maximum after all separate approvals: one discovery request, up to three TotalView requests, and one specialized request. The preferred first execution is smaller: one discovery request, one TotalView request, and zero or one specialized request. Authentication and any documented status polling must be separately counted. No operation may be added implicitly.

## Required discovery output

The vendor contract should establish whether the discovery response supplies:

- DataTree PropertyId and any First American geocode identifier;
- full situs components, ZIP, county, state, FIPS, and APN as reported;
- land-use/property-type code and description;
- foreclosure/distress event type, status, recorded/published/auction dates, and source document identifier;
- result timestamp, data as-of/coverage date, product name, order/reference ID;
- maximum result count, total count, cursor/page information, and truncation indicator.

Unknown or missing fields remain `NOT RETURNED`. Event codes must not be decoded without a vendor dictionary.

## Product decision after discovery

1. Use **TotalView** for broad subject-level evidence and to inventory sale, transaction, lien, foreclosure, and document references.
2. Use **Foreclosure Report** only if the principal gap is lifecycle status such as rescission, cancellation, postponement, completed sale, or later sale.
3. Use **Last Finance Document** only if the principal gap is the latest recorded mortgage/deed of trust, original amount, position, release/reconveyance, or document evidence.
4. Use **Open Lien Report** only if entitlement is confirmed and the principal gap is lien status, amount, priority, or release.
5. Do not use **ExportReport** or bulk processing in this minimal UAT.

## Evidence interpretation rules

- Recorded original mortgage amount, foreclosure unpaid balance, and modeled outstanding balance are different facts.
- Classify any First American outstanding mortgage balance as `ALGORITHMIC_ESTIMATE`, display it as `MODELED / ESTIMATED BALANCE`, and never describe it as a verified payoff.
- A null or missing field is `NOT RETURNED`, not evidence of absence.
- Keep subject data distinct from nearby sales/listings.
- Preserve recorded rescission, release, cancellation, and subsequent-sale events individually; do not collapse them into a single current-status guess.
- Exclude owner/contact PII from shareable artifacts and retain raw results only in protected, gitignored storage consistent with written rights.

## Identity gate

For every candidate:

1. Namespace the DataTree PropertyId, DataTree APN/FIPS, county ATN/APN9, RentCast `id`, and RentCast `assessorID`.
2. Preserve original values and normalized comparison values separately.
3. Require exact jurisdiction and address-component agreement plus authoritative parcel corroboration before linking evidence.
4. Match events by document ID, date, amount, and instrument type; analyze formatting differences rather than silently rewriting identifiers.
5. Quarantine duplicates, conflicting parcels, address ambiguity, and out-of-scope geography.

No result becomes a PI durable Property, investment candidate, or investor alert during this UAT.

## Accounting record

The execution ledger must record authentication, discovery, report, document, status, and download operations separately, including HTTP status, elapsed time, product, order/reference ID, result count, approved ceiling, estimated/actual charge, and whether a retry occurred. Required retry count is zero.

Historical accounting remains one SearchStandard property request and one TotalView report. It does not authorize new requests or establish current pricing.

## Acceptance criteria

- Exactly one documented bounded discovery request returns no more than three in-scope candidates.
- At least one result has a uniquely reconcilable identity and interpretable documented distress evidence.
- TotalView resolves to the same subject and preserves subject/nearby separation.
- Any specialized call answers its selected gap using documented fields.
- All calls stay within the approved count and cost ceiling with zero retries or fallback calls.
- Provider IDs, source dates, document references, and raw fingerprints are preserved privately.
- Modeled balances are not represented as payoffs or recorded current balances.
- No production/database/MLS/deployment action occurs.

## Current disposition

This plan is **not executable yet**. The required discovery contract, specialized-product contracts, price/limit terms, and use rights must be resolved first. See `PI_FIRST_AMERICAN_UAT_ENGINEERING_QUESTIONS_V1.md`.

