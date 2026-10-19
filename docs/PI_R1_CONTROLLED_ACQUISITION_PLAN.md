# PI Round 1 — Controlled acquisition plan

2026-10-09. **DESIGN ONLY — NOT AUTHORIZED.** Primary provider: **RentCast property records**. Proposed size: **three nonpilot candidates, three maximum outbound property requests**, no other endpoint/provider. Actual technical candidates selected: zero. No provider, database, realtor or MLS contact occurred.

## Why this is the shortest defensible path

The [readiness audit](PI_R1_DURABLE_EVIDENCE_READINESS.md) verifies county identities/street/city for 77 potential nonpilot candidates but no ZIPs in inspected situs and no durable identity at the prior snapshot. RentCast's existing lookup can submit street/city/state without ZIP, and historical caches include one such response passing component comparison. Its previous public-term review provides conditional internal storage support. Neither current Kern coverage nor shared/commercial rights is established. The [rights matrix](PI_R1_PROVIDER_RIGHTS_MATRIX.md) controls; this is not a provider-purchase recommendation.

A three-record local test is sufficient to measure initial address completion and reveal ambiguity; it cannot establish population coverage, six eligible Properties or investment accuracy. No AVM, comps, report, document, mortgage, title or current-distress enrichment belongs in this test.

## Minimum vendor and account confirmations

Prepare these questions for RentCast/Stan; **not sent by this task**:

1. **Supported input and identity:** Is GET /v1/properties with one street + city + state and no ZIP a supported single-property lookup for Kern County? Does zipCode describe the subject situs, and how are ambiguous/multiple results returned? What do id and assessorID identify, are they persistent, and is there a documented relationship to Kern APN9/ATN (including splits/merges)? If no reliable parcel crosswalk is supplied, say so; PI will preserve uncertainty rather than infer one. No response addresses are needed to answer this contract question.
2. **Exact licensed uses:** Under Workside Software LLC's applicable account/product agreement, may PI retain street/city/state/ZIP, provider property/parcel IDs, source dates and provenance long term; combine them with county IDs in a shared canonical Property database; expose allowed fields to authorized SaaS users; and show allowed address/evidence/derived analysis in investor PDFs? Specify allowed fields, user scope, attribution, retention/termination/deletion and redistribution restrictions. Internal research permission alone is insufficient.
3. **Controlling agreement:** Which current agreement, API-term version, amendments and third-party restrictions govern this account? Provide the applicable written basis, including whether the proposed private three-candidate evaluation is allowed. Confirm how rights differ between raw responses, minimal subject extracts and derived outputs. No credentials should be supplied.
4. **Entitlement and cost:** Confirm active property-record/Kern access, current plan, remaining allowance, successful/empty/ambiguous/non-200/timeout billing, per-call/overage fees and any fixed fees. Stan must then approve a monetary ceiling as well as a three-attempt ceiling. Do not assume historical advertised rates or free quota apply.

If a vendor cannot affirm the necessary rights, stop for review. Do not silently narrow the question to temporary storage and claim the durable-evidence objective achieved. No automatic alternative provider is proposed.

## Request economics — scenarios, not authorization or match forecasts

Assume uncached candidates and at most one narrowly targeted lookup each. These are first-attempt counts, **not the number of calls guaranteed to obtain N usable identities**. A zero, ambiguous, mismatched or insufficient response may leave fewer usable candidates than requests. Do not expand budget to force the desired count.

| Existing source/path | 1 candidate | 6 candidates | 20 candidates | 77 candidates | Separate activity and cost basis |
| --- | ---: | ---: | ---: | ---: | --- |
| RentCast property lookup | 1 | 6 | 20 | 77 | API-key auth in request, 0 login calls; 0 AVMs/reports/documents; account COST NOT VERIFIED |
| ATTOM basic property/address lookup | 1 | 6 | 20 | 77 | HTTP lookup estimates, not confirmed API Report units; 0 separate auth calls/reports/doc orders proposed; no-ZIP contract and COST NOT VERIFIED |
| DataTree SearchStandard search | 1 | 6 | 20 | 77 | Separate 1 authentication per new valid session assumed, more only if separately authorized; 0 TotalView/doc orders; no-ZIP contract and COST NOT VERIFIED |
| Google Geocoding suggestion | 1 | 6 | 20 | 77 | No separate auth call; temporary suggestion does not meet durable-use gate; COST NOT VERIFIED for this account; not selected |
| Existing local county evidence | 0 | 0 | 0 | 0 | Local reads only; $0 incremental remote requests, but missing ZIP remains; no new county acquisition planned |

An exact, effective, appropriately licensed cache hit consumes zero provider attempts. There is **no established reusable candidate-bound complete-address cache for the 77**. Never count a lookup on another property, an expired response, or a Google-derived suggestion as a licensed cache hit. No refreshing is authorized. ATTOM's prior 25-report ceiling and DataTree's target 10/hard 20 ceiling remain historical POC controls, not new budgets or verified account balances.

### Historical prices versus actual exposure

The 2026-10-08 [retained public pricing review](PI_ADDRESS_PROVIDER_COMPARISON.md#request-and-cost-scenarios--not-spending-authorization) recorded RentCast Developer $0/month with 50 included requests and $0.20 per successful overage; Foundation $74/month with 1,000 included and $0.06 overage. These have **not been re-fetched or confirmed for Workside**. Public billing was described as HTTP 200 with a response body; ambiguous success can still consume billing, and a timeout's outcome may be unknown. Do not infer an account hard cap from local code.

| Illustrative historical Developer scenario only | 1 | 6 | 20 | 77 | Proposed 3 |
| --- | ---: | ---: | ---: | ---: | ---: |
| If all requests billed at historical $0.20 overage | $0.20 | $1.20 | $4.00 | $15.40 | $0.60 |
| If 50 unused included requests are actually available in same period | $0 | $0 | $0 | $5.40 | $0 |

These arithmetic examples exclude taxes, other usage, subscriptions and changed/account-specific terms. **Actual pilot cost exposure: COST NOT VERIFIED.** They are not an approved spend ceiling. No minimum package purchase is recommended. ATTOM's retained annual bulk quotes are not applicable API lookup prices; a price posed as a question in a call sheet is not a confirmed quote. DataTree UAT success does not establish free searches or production pricing. Google's old public schedule does not establish today's project allowance and does not solve licensing. Verified current account prices across these options: none established by the inspected local evidence.

## Future technical selection rule — describe now, execute only after authority

Use the existing 80-candidate Gate 1/Gate 1B intersection and exact permanent exclusions to obtain the 77-potential source pool. Preserve the historical fixture exclusion and all three IP-P exclusions. Before future selection, confirm input fingerprints, scope and available current authoritative relationships under separately authorized read-only access if the snapshot is no longer sufficient. Do not assume the snapshot is still current or discover links by address.

Proposed deterministic rule: within the unchanged exact-ID eligible technical pool, sort by fixed-width county ATN then APN9; take the first two candidates with no additional acreage-review flag and the first one with the existing acreage-review flag. Require present street/city, county-supported state evidence, missing ZIP, exact Assessor identity, historical SFR, no known archive/QA/conflict or already linked identity. If a required bucket is insufficient, stop rather than substitute or broaden. There are presently 54/23 records in these historical buckets, but **no sorting/selection was executed**. This rule is not the Round 1 six-property selection methodology; do not touch its seed or cohort fingerprint.

The future technical test must not use value, score, distress amount, MAO, likely MLS status or attractiveness to choose subjects. No new automatic permanent exclusions are imposed by this document; later Round 1 authority must explicitly account for prior technical exposure without removing the three permanent pilot exclusions or changing the preregistered blind protocol.

## Future one-shot execution gates

1. Record vendor/account answers, applicable rights evidence and Stan's separate authorization for the exact three private candidates, endpoint, attempt cap and monetary ceiling. If shared/durable permissions or exact input semantics remain unresolved, no call.
2. Bind a private acquisition manifest to existing county/candidate/Assessor references, source packet fingerprints, selection rule and authorization. County California evidence must be explicitly cited/reviewed; it is not Google verification. Do not invent ZIP or alter original situs.
3. Reuse the property lookup only, not full Analyze/verifyOne workflows. Configure maximum one attempt per candidate, maximum three total, zero retries, no fallback, no pagination and no AVM. A durable per-candidate/global reservation must survive timeouts, crashes and restarts; never release or reset an uncertain attempt to gain another call. The existing six-per-client default is not this control. No implementation is authorized now.
4. Execute sequentially, server-side only, with the existing bounded timeout. Do not expose keys. Log request class/count/status/elapsed time and allowlisted usage metadata, not request addresses, raw payloads or secrets in public logs. Stop the batch on an error, ambiguity, unexpected population, schema/rights/budget conflict or material identity discrepancy; no replacement candidate or retry.
5. In memory, require one subject result and complete subject street/city/state/ZIP. Compare supplied components with existing deterministic rules; differences outside those rules remain unresolved, not fuzzy matches. Reject incomplete ZIP/state, units/multi-parcel ambiguity or contradictory geography/type. Record provider id, assessorID if actually returned, county/FIPS, match evidence/absence and actual source dates; never relabel retrieval as source-effective time.
6. Keep provider identity separate from county ATN/APN9. Use only a documented county-aware relationship and the existing authoritative source context to assess parcel corroboration. Missing/unproven assessorID semantics remain NOT ESTABLISHED even when street/city agree. Do not create a crosswalk by deleting punctuation, borrowing nearby identifiers or treating provider id as canonicalPropertyId.
7. Store only the minimal licensed subject/provenance extract in a private gitignored local artifact, separate from original packets/decisions/caches. No owner/contact data, unnecessary coordinates or full response cache. Fingerprint source response in memory and retained extract separately if permitted, preserving transformations and request/as-of dates. Record account/terms evidence, authorized purposes, retention period/review deadline, display restrictions and required attribution. Unknown rights/retention means stop before acquisition, not indefinite retention by default.
8. Produce per-candidate outcomes: ADDRESS_COMPLETE_CANDIDATE or incomplete/ambiguous/error; separate county relationship, provider identity, rights and analyst-review status. Preserve acreage flags and require acknowledgment/notes. Prepare for genuine human review, never auto-approve or modify existing decisions. No automatic current-distress inference.
9. Report actual attempts, billable/unknown billing counts, cache hits, usable results and remaining gaps; stop before canonical-resolution, durable Property, lineage or evidence-row persistence. Acquisition success alone is not persistence authorization or Round 1 eligibility.

Expected fields are subject street/city/state/ZIP, id, county/FIPS and assessorID only if returned; lack of a match-confidence field must be recorded, not invented. Retained evidence must meet the [provenance/rights requirements](PI_R1_PROVIDER_RIGHTS_MATRIX.md#evidence-record-required-before-any-durable-use). Genuine reviewer approval must bind current evidence and permission fingerprints and acknowledge the 23-record cohort's relevant quality flags. Historical pilot approval is neither approval for these new candidates nor a current durable-use authorization.

## Remaining gates — independent, not closed by address success

| Gate | Present status and minimum next evidence |
| --- | --- |
| Durable evidence rights | BLOCKED: written applicable retention/shared/display scope and account terms |
| Actual provider coverage | UNKNOWN for 77: separately authorized three-request evidence; no coverage-rate claim from old fixtures |
| Real analyst approval | NOT OBTAINED for proposed candidates: genuine current reviewer, exact evidence/permission binding, discrepancy review |
| Real-property persistence authorization | NOT AUTHORIZED: V3 certifies synthetic isolated integration, not production approval issuance or real writes |
| Provider budget | NOT AUTHORIZED / COST NOT VERIFIED: approved endpoint, global reservations and monetary ceiling; broader enrichment has a separate budget |
| Monte Carlo readiness | NOT ESTABLISHED for real Round 1 subjects: versioned engine/output, seed, distributions/dependencies, iterations and reproducibility; no assumption changes now |
| Investor-report integration | Real analysis-to-snapshot-to-PDF/freeze integration not certified for six subjects; template/Puppeteer QA does not establish it |
| MLS blind-test controls | Protocol exists; execution remains closed, selection/assumption locks unset, no pre-freeze MLS; reviewer independence and licensed MLS handling still required |

Preserve [V3's synthetic scope and remaining production boundaries](PI_DURABLE_IDENTITY_V3_REMAINING_GAPS.md), [Round 1 readiness](MLS_VALIDATION_ROUND1_READINESS.md), and the [blind comparison protocol](MLS_VALIDATION_ROUND1_COMPARISON_SPEC.md). Obtaining a commercial license does not itself implement real approval authority or authorize the synthetic persistence wrapper for real records.

## Critical path to six-property validation — all future gates

1. Resolve contract/account questions and **authorize controlled evidence acquisition** for the bounded technical test.
2. Obtain complete, durable-permitted address evidence; insufficient results stop for review, not expanded calls.
3. Validate county/property/provider identity, dates, conflicts and representation with authoritative relationships.
4. Obtain genuine analyst approval with current component/evidence/rights coverage.
5. Separately authorize controlled real-property persistence in the expressly approved environment; retain all V3 safety gates and verify actual persisted identities. No production-readiness claim from synthetic tests.
6. Confirm at least six distinct eligible nonpilot candidates with supported durable identities and all existing eligibility requirements. A three-candidate pilot cannot meet this count; any further acquisition/persistence needs its own authorization and budget.
7. Lock selection methodology, eligible cohort, seed, assumptions, evidence/model versions and blind rules under Round 1 execution authority; no investment ranking or preread MLS.
8. Execute the separately approved enrichment and underwriting stack. A property-only address test does not supply AVM/comps/title/condition or current distress; unknowns remain unknown.
9. Run the approved reproducible Monte Carlo process; do not use report placeholders as simulation evidence.
10. Generate and freeze the six real investor report/evidence/assumption/model packages and PDF/manifest hashes, completing privacy and rights checks first.
11. Obtain independent permitted MLS evidence and locked realtor judgment under the established blind protocol, then compare without rewriting the pre-MLS reports; later what-ifs remain separately versioned.

This sequence defines dependencies, not execution authority. No new development workstream, selection, enrichment, real persistence, report generation or outreach was initiated.

## Stop decision

**VENDOR RIGHTS CLARIFICATION REQUIRED. Controlled acquisition ready: NO.** Request the narrow RentCast answers above, then Stan/ChatGPT may authorize a three-attempt, cost-bounded local acquisition. No alternate provider request, production integration or additional identity system is proposed.

Current-task accounting: provider calls **0**, database reads/connections/writes **0/0/0**, real Properties **0**, technical selections **0**, Round 1 selections **0**, analyst approvals **0**, MLS access **0**. **STOP FOR STAN/CHATGPT REVIEW.**
