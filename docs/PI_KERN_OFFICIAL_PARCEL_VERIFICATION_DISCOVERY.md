# PI Kern County — Official Parcel Verification Discovery V1

2026-10-09 (America/Los_Angeles). Documentation and generic metadata discovery only.

Final classification: **COUNTY METHOD CLARIFICATION REQUIRED**

## Determination

An official parcel lookup is documented, but the inspected material does **not** establish a complete current-status, intervening-history and effective-date contract. No option qualifies as `AUTHORITATIVE CURRENT STATUS SOURCE` on the evidence inspected. No real parcel was searched.

Recommended primary method: obtain **Assessor Mapping Section clarification, followed—only with separate authorization—by one written county confirmation for RC-P2**. A written response could supply the missing facts in one step; the existence, scope, cost and evidentiary coverage of that service are not yet confirmed. Do not order another bulk edition or commercial report to resolve this discovery gap.

Eight official verification options/source families were identified below. This count is not eight independent confirmations. Several share the same county data. Directly retrieved pages, search-indexed official documentation and inaccessible endpoints are explicitly distinguished in the [QA inventory](PI_KERN_OFFICIAL_PARCEL_VERIFICATION_DISCOVERY_QA.md).

## 1. Existing evidence remains unchanged

Reviewed:

- [RC-P2 current identity readiness](PI_RC_P2_CURRENT_IDENTITY_READINESS.md).
- [Kern ATN/APN crosswalk investigation](PI_KERN_ATN_APN_CROSSWALK_REVIEW.md).
- [RentCast reconciliation V1.1](PI_RENTCAST_RECONCILIATION_V1_1.md).
- [Reconciliation remaining gaps](PI_RENTCAST_RECONCILIATION_V1_1_REMAINING_GAPS.md).

The historical exact APN → stored APN9 → unique relevant assessment relationship remains established. Current activity, changes since the retained county delivery and current identity freshness remain unverified. Complete address evidence and RentCast retention permission do not resolve those county-status gaps. The original `APN_CONFLICT`, private packets, Rule C, V3, versioned baseline v3, analyst decisions and all financial/report/monitoring systems are preserved. Older reports retain their original certification chronology; this report does not rewrite them.

No new ATN equivalence, check-digit computation, identity rule, freshness threshold, approval route or infrastructure is proposed. Round 1 remains `PRE_EXECUTION`.

## 2. Official options and authority

`UNKNOWN` means not established by the inspected documentation, not proof that the county lacks the capability. Classifications apply to the required identity/status use, not a guarantee of the source's accuracy.

| Option | Official source and department | Observed access | Authority classification |
| --- | --- | --- | --- |
| O1 — Assessor Property Search | Assessor; [instructions](https://www.kerncounty.com/government/departments/assessor-recorder/property/assessor-property-search), [blank search form](https://assessorapps.kerncounty.com/PropertySearch/Parcels/index.aspx) | Form reachable publicly; instructions available through official search-index text, direct request 403 | `UNVERIFIED CAPABILITY` for current status; lookup documented, no result tested |
| O2 — Assessor Map Search | Assessor; [blank map search](https://assessorapps.kerncounty.com/PropertySearch/AssessorMaps/index.aspx) | Public blank form reachable | `INFORMATIONAL VIEWER`; no map retrieved or current-status certification established |
| O3 — Interactive County Map / public layer configuration | County GIS with Assessor content; [viewer terms](https://www.kerncounty.com/government/gis-menu/interactive-county-map-gis-tool), [public map catalog](https://maps.kerncounty.com/Geocortex/Essentials/REST/sites/New_Kern_Essentials_Public/map), [land-layer metadata](https://maps.kerncounty.com/Geocortex/Essentials/REST/sites/New_Kern_Essentials_Public/map/mapservices/46/layers/2) | Catalog/configuration public; terms indexed, direct request 403; interactive feature retrieval not tested | `INFORMATIONAL VIEWER` |
| O4 — Assessor_Public ArcGIS service | County-hosted Assessor backend, linked by O3; [service endpoint](https://maps.co.kern.ca.us/arcgis/rest/services/Assessor/Assessor_Public/MapServer) | Direct metadata request redirected to login; no authentication attempted | `UNVERIFIED CAPABILITY` |
| O5 — GIS editions and Parcel History | Assessor Mapping; [GIS data documentation](https://www.kerncounty.com/government/departments/assessor-recorder/property/mapping-gis/gis-data) | Public indexed documentation, direct request 403; dataset acquisition is a separate process | `OFFICIAL HISTORICAL DATA` |
| O6 — Assessment-roll copy request / extract layout | Assessor-Recorder; [blank purchase application](https://www.kerncounty.com/home/showpublisheddocument/6467/637723329979070000), [extract dictionary](https://www.kerncounty.com/home/showpublisheddocument/6453/637562348789330000) | Official indexed documents; application direct retrieval error, dictionary 403; no order | `UNVERIFIED CAPABILITY` for current verification; old layout alone is not a current-data contract |
| O7 — Mapping contact / written confirmation | Assessor Mapping contact published on O5 | Contact published; no contact made; formal single-parcel confirmation process UNKNOWN | `UNVERIFIED CAPABILITY` pending county clarification |
| O8 — Recorder documents / recorded maps | Recorder; [official search instructions](https://www.kerncounty.com/government/departments/assessor-recorder/records/search-for-recorded-documents-or-maps) | Indexed instructions; direct request 403; no record search | `OFFICIAL HISTORICAL DATA`; recorded-event evidence, not independent present-day parcel clearance |

None is promoted to `AUTHORITATIVE CURRENT PARCEL REFERENCE` merely because its website is official. Current edition/coverage for the particular record must first be established.

### Identifier and evidence capability matrix

| Option | Eight-digit APN / APN9 / ATN input | Parcel and assessment fields | Activity and split/merge evidence |
| --- | --- | --- | --- |
| O1 | APN 8/9 digits; ATN 10/11; separators permitted | Detail page and map link documented; complete returned field contract UNKNOWN | Status meaning, history completeness and successor relationships UNKNOWN |
| O2 | APN search; first five digits required. Exact 8/9 handling and ATN support UNKNOWN | Map output intended; no unique-record test | UNKNOWN; map presence is insufficient |
| O3 | Configuration exposes separate APN, nine-digit APN and ATN fields; accepted interactive input grammar UNKNOWN | See metadata inventory below | No explicit activity/history/date fields identified in this configuration |
| O4 | UNKNOWN; no authenticated schema inspection | UNKNOWN from direct service; do not substitute wrapper configuration for backend contract | UNKNOWN |
| O5 | Dataset tables, not a one-parcel search endpoint | Retained 2026 metadata/source fields described in section 3 | Historical event/date fields available; current coverage UNKNOWN |
| O6 | Application requests 11-digit ATN for individual assessments; APN8/APN9 acceptance UNKNOWN | Legacy layout includes roll number, situs, use code, acreage, valuation, roll type | Current status/history fields UNKNOWN |
| O7 | Ask whether exact stored APN plus separate APN9/ATN references is sufficient; accepted submission contract UNKNOWN | Required confirmation fields specified in section 6, not observed outputs | Must explicitly confirm coverage; not yet documented |
| O8 | Online APN search discontinued; APN kiosk search documented. APN width/APN9/ATN support UNKNOWN | Document number/date/class and recorded-map search categories | Individual recorded events may help; no exhaustive current chain demonstrated |

O1's identifier grammar and detail navigation are documented by the [Assessor](https://www.kerncounty.com/government/departments/assessor-recorder/property/assessor-property-search). Its search excludes owner-name search/results. O2's five-digit requirement is visible on the [blank form](https://assessorapps.kerncounty.com/PropertySearch/AssessorMaps/index.aspx). Neither was submitted.

The [Recorder notice](https://www.kerncounty.com/government/departments/assessor-recorder/records/search-for-recorded-documents-or-maps) states that online APN search ended December 9, 2024, and directs APN searches to office kiosks. Do not transfer that limitation to the separate Assessor search, or use owner searching as a workaround. No in-person visit or document order occurred.

### Cadence, dates, output, cost and rights

| Option | Update / effective-date coverage | Output / export | Cost and retention |
| --- | --- | --- | --- |
| O1 | Cadence, record as-of and publication date UNKNOWN | HTML details, copy-link and map navigation documented; structured export/official certification UNKNOWN | Single lookup fee UNKNOWN; no payment encountered on blank form. Source-specific reuse rights UNKNOWN; see section 5 |
| O2 | Cadence, map revision/effective date UNKNOWN | Map lookup; export/certification UNKNOWN | Fee and reuse rights UNKNOWN |
| O3 | Layer update and record effective dates UNKNOWN; general maintenance disclaimer is not a schedule | Map configuration includes export capability; actual export not invoked, availability/rights not established | Fee UNKNOWN; viewer terms and GEONET policies apply |
| O4 | UNKNOWN | UNKNOWN; login boundary respected | Restricted at inspected route; authorization, fee and rights UNKNOWN |
| O5 | Snapshot editions; details below, not live status | Shapefile/FileGDB plus tabular formats | Published dataset fee below; existing disclaimer retained; future-use rights not presumed |
| O6 | Choice of current update or tax year, without documented delivery cutoff/lag | Assessment-roll copy; exact current format/coverage UNKNOWN | Fee and use/retention rights UNKNOWN from inspected content |
| O7 | Must request explicit as-of, history coverage and pending-change semantics | Proposed dated written reply or official extract, not a confirmed product | Fee, submission channel and retention permission UNKNOWN |
| O8 | Index updated regularly, no exact lag/cutoff supplied | Recorded index/map routes; specific copy formats/cost not established | Fee and retained-evidence use rights UNKNOWN |

For **every option**, retrieval time means when PI obtained a response, never when a parcel was verified. No parcel retrieval timestamp exists for this discovery.

The [GIS documentation](https://www.kerncounty.com/government/departments/assessor-recorder/property/mapping-gis/gis-data) describes Final editions after the July 1 roll close, normally mid-July; Preliminary releases have no fixed cadence. Parcel-number history begins September 1994 and has an event-code table. Hardcopy Assessor maps remain official assessment maps; GIS is supplied as-is. The published fee is **$220 per dataset edition**; this is not a price for single-parcel verification. Indexed text still advertises **2025 Final**, while PI retains fingerprinted **2026 Final** evidence. That discrepancy prevents treating the page/index as a current-edition authority; it does not invalidate or replace the retained package. No purchase or download is recommended here.

## 3. Identifier semantics and limitations

| Identifier | Established meaning | Limits and required handling |
| --- | --- | --- |
| APN | Assessor's Parcel Number; retained county metadata defines the eight-digit source field for assessment/map identification | Preserve exact source string and leading zeros; an assessment parcel is not independently proof of legal title/boundaries |
| APN9 | Retained county metadata defines APN plus a final county-generated check digit and its parcel-to-filtered-roll join role | Relationship `DOCUMENTED`; current RC-P2 pairing not reverified. Read stored values; never calculate, pad or truncate |
| ATN | Official application expands it as **Assessor Tax Number** and requests eleven digits. Legacy extract dictionary describes `WF-ATN` as a secured-roll parcel number | Acronym/legacy roll usage `DOCUMENTED`; present-day permanence, allocation rules, one-to-many relationships and exact filtered-table semantics remain UNKNOWN |
| History identifiers | Retained `APN9`, creation/inactivation event numbers/types and dates; county-provided code domain | Not a documented predecessor/successor algorithm. Event numbers and zero/blank fields cannot be turned into current-status proof |
| Feature OID / TE_NO | Metadata exposes these separately | No durable county-identity or ATN equivalence established |

APN/APN9 and history findings above come from the unchanged [local crosswalk investigation and source references](PI_KERN_ATN_APN_CROSSWALK_REVIEW.md), not a fresh record lookup. The [official purchase application](https://www.kerncounty.com/home/showpublisheddocument/6467/637723329979070000) and [legacy extract dictionary](https://www.kerncounty.com/home/showpublisheddocument/6453/637562348789330000) add ATN terminology only. Search-index age/publication labels do not establish their present applicability. The legacy dictionary's note about omitted leading zeros is **not** adopted as a normalization rule.

The retained full land roll already demonstrates 1,095 APN9 groups with multiple ATNs. Expanding the acronym does not resolve that cardinality or authorize Rule B/ATN substitution. RC-P2's historical unique relevant assessment is preserved as its own finding. No historical report's earlier “undocumented” statement is overwritten.

## 4. Generic GIS metadata assessment

The [public Geocortex land-layer configuration](https://maps.kerncounty.com/Geocortex/Essentials/REST/sites/New_Kern_Essentials_Public/map/mapservices/46/layers/2) describes assessment land/surface polygons. County hosting and the Assessor service reference establish provenance of the configuration, not currency of its records.

| Group | Published fields |
| --- | --- |
| Identifiers, strings | `APN_Label`, `Assessor_Parcel_No`, `APN_9_Digit`, `Assessor_Tax_No` |
| Other keys/geometry | `OID` (Int32), `SHAPE` (Object), `TE_NO` (Double) |
| Parcel | `Situs_Address`, `Legal_Type`, `Short_Legal`, `Assessor_Acres`, `GIS_Acres`, `GIS_SqFt` |
| Assessment | `Roll_Type`, `Use_Code`, `Tax_Rate_Area`, `Supervisor_Dist`, `Land_Value`, `Mineral_Value`, `Improvement_Value`, `OtherImpFixt_Value`, `Personal_Prop_Value`, `Exemption_Type`, `Exemption_Value`, `Net_Assessed_Value`, `Proposition_8`, `BaseYear_Value`, `Ag_Preserve`, `Citrus_Acres` |

Search/query/identify are enabled in the configuration; attachments are absent. No explicit active flag, predecessor/successor, event date, per-record effective date or layer edit date is documented there. `Roll_Type`, `Proposition_8` and `Is Dynamic` are not activity evidence. Field co-presence is not an identity-equivalence rule. No feature query or export was issued. Direct backend metadata redirected to login; no alternative-host bypass was attempted. Actual backend query capability remains unverified.

The configuration contains identifier-bearing detail-link templates, including legacy HTTP links. None was populated or followed. Do not transmit a future parcel through those templates without separately approved privacy/access handling.

## 5. Date semantics, privacy and rights

| Date kind | Evidentiary role |
| --- | --- |
| Publication / edition | Dataset release identity; not a parcel verification |
| GIS edit or metadata modification | Maintenance of layer/description; not proof every parcel was checked |
| Record effective / covered-through | Required county statement about when the individual status is valid and what intervening events are covered |
| Assessment-roll date | Assessment cycle; not automatically current legal or parcel activity |
| Retrieval | PI acquisition time; must remain separate from all source dates |
| Parcel-history event date | Specific documented event; old system conversion is not present activity |

The prior readiness report separates the retained 2026 publication/extract labels, metadata modification and maximum observed history date. None supplies a certified current coverage cutoff. A later verification must bridge that uncertainty explicitly, not simply start at a guessed snapshot cutoff. No arbitrary freshness-age policy is introduced.

The [county website policy](https://www.kerncounty.com/community/website-usage-policy) permits printing but restricts document use to informational/personal purposes, retention of notices and unmodified documents. It also describes collection of visit data and potentially public correspondence. The [viewer terms](https://www.kerncounty.com/government/gis-menu/interactive-county-map-gis-tool) disclaim currency/completeness and reference GEONET usage policies. Their full application to retained parcel evidence, commercial PI profiles and investor outputs is **not established**. This is an access/rights issue to clarify, not a legal conclusion that all county facts are prohibited. Public visibility and a past bulk purchase do not establish unrestricted reuse.

Preserve the [existing source disclaimer](SPRINT6_2_SOURCE_DISCLAIMER.md). Obtain source-specific permission/conditions for minimal private evidence retention and any later commercial display; do not borrow RentCast's permission for county material. Duration, redistribution and deletion requirements for the proposed confirmation remain UNKNOWN.

Future identifier submission may be logged by the county or appear in browser history, copied URLs or correspondence subject to disclosure. Prefer a county-approved HTTPS submission that keeps identifiers out of public/shared URLs, with diagnostic URL/body redaction and restricted evidence storage. POST alone does not guarantee privacy. If query parameters or email are mandatory, obtain explicit transmission approval and explain those risks first. No credentials or real identifiers were transmitted in this sprint.

## 6. Primary recommendation and exact county question

Ask the Assessor Mapping Section to identify/confirm the **single official method** that supplies the required status and history. The [published contact](https://www.kerncounty.com/government/departments/assessor-recorder/property/mapping-gis/gis-data) is **Mark Larner, (661) 868-3378, larner@kerncounty.com**. This is an official business contact, not parcel-owner data. Current staffing and availability were not independently confirmed. No message was sent.

Proposed generic question for Stan to review, containing no parcel identifiers:

> For one Kern assessment parcel retained in a 2026 Final GIS delivery, can Mapping provide a dated written confirmation—or identify an official lookup with documented equivalent semantics—of its current APN, stored APN9, relevant Assessor Tax Number, active/inactive state, and any split, combination, renumbering, transfer or inactivation affecting the identity since that delivery? Please state the source's effective and covered-through dates, update lag/pending-event limitations, and any predecessor/successor references. Does the public Assessor result establish those facts, or only assessment reference information? What does ATN identify, and how should multiple assessments for one APN9 be interpreted? Please confirm the approved private submission method, fee and permission/conditions for retaining a minimal county-attributed evidence extract in PI, including any later commercial reporting restrictions.

This is the least-expansion recommendation because one suitable county response may close the actual gap. A public search result plus a Mapping supplement is needed only if the county says the lookup omits required facts. No multi-provider cascade, broad data purchase or new identity subsystem is warranted.

A published contact is **not** proof of a formal written-verification product. Until the county confirms status/date/rights semantics, the final decision cannot be `READY FOR CONTROLLED RC-P2 COUNTY VERIFICATION`.

## 7. Future one-property procedure — not executed

1. Obtain separate authorization for the precise county method, one RC-P2 submission, permitted cost, privacy channel and evidence retention. Resolve section 6 first.
2. Read RC-P2's original private eight-digit county APN and sealed source bindings. Reverify the existing packet, source-row and Rule C fingerprints without changing them. Do not substitute IP-P2.
3. Submit that exact source APN only through the authorized official method. Include APN9 and ATN as separate references only if its documented contract requires/supports them. No address search, identifier guessing, fallback or second parcel.
4. Require one unambiguous county identity response. Capture current parcel ID, exact stored APN/APN9 relationship or independently reconcilable official alternative, relevant assessment relationship, and situs/use where available. Exclude owner/contact data.
5. Capture official record effective date, history covered-through date, edition/roll date, retrieval time and stated update lag separately. A retrieval timestamp alone fails.
6. Establish documented active/inactive meaning and whether split/combine/renumber/transfer/inactivation occurred since the retained delivery. Require explicit predecessor/successor links and dates for changes; never infer chains from event numbers.
7. Compare exact returned source fields with preserved evidence. No computed check digit, numeric coercion, ATN equivalence or fuzzy/address-only matching. Do not automatically adopt a successor parcel.
8. Record all contradictions, ambiguities, pending events, missing fields and rights constraints. Preserve original `APN_CONFLICT` and later historical interpretation side-by-side.
9. If retention is permitted, keep only necessary evidence privately: county provenance, precise dates, documented status/relationships, response/reference fingerprint and applicable disclaimer/permission. Redact logs and shareable reports.
10. Prepare a fingerprint-bound human-review packet distinguishing historical crosswalk from new current evidence. Approval remains unset; this does not create a canonical resolution or durable Property.
11. Stop for human review and any separate persistence authorization. No provider enrichment, MLS access or Round 1 selection follows automatically.

**Stop before proceeding** for unavailable/unverified authority; insufficient status/date semantics; ambiguous mapping or multiple parcels; conflicting history; unclear rights; unexpected authentication/payment; or inability to bind the result to original RC-P2 evidence. Do not retry with another identifier/provider automatically. No actual step above was executed.

## 8. Summary and stop

| Measure | Result |
| --- | --- |
| Official options/source families | 8 |
| Current parcel lookup | `DOCUMENTED`; blank form reachable, no parcel result tested |
| Current parcel-status evidence | `UNKNOWN` |
| APN lookup | `DOCUMENTED` |
| APN9 relationship | `DOCUMENTED` in retained county metadata; not a current lookup result |
| ATN semantics | `DOCUMENTED` acronym/legacy usage only; current relationship rules unresolved |
| Split/merge history | `PARTIAL` — historical evidence exists; current coverage unverified |
| Official effective-date coverage | `PARTIAL` — edition/roll semantics, no parcel-specific current date |
| Access | `PUBLIC` for discovery/forms; backend route restricted; proposed confirmation access unknown |
| Cost | `UNKNOWN` for recommended method; bulk price is not applicable |
| Property-specific county queries / commercial-provider calls | 0 / 0 |
| Database connections / writes | 0 / 0 |
| Analyst approvals / durable Properties / Round 1 selections | 0 / 0 / 0 |

Final classification: **COUNTY METHOD CLARIFICATION REQUIRED**

**STOP FOR STAN/CHATGPT REVIEW.** No live RC-P2 verification, outreach or production integration is authorized by this report.
