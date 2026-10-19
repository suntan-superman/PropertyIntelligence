# PI Kern Official Parcel Verification Discovery — QA

2026-10-09. Scope: read-only official documentation/generic metadata research plus two new documentation files. See the [discovery report](PI_KERN_OFFICIAL_PARCEL_VERIFICATION_DISCOVERY.md).

Research decision: **COUNTY METHOD CLARIFICATION REQUIRED**. Research completion does not certify a real parcel or authorize a county submission.

## 1. Network accounting

Six web-tool batches contained **11 generic search queries** and **15 explicit page open/click operations**. Page results: **6 usable public forms/catalog/metadata responses, 7 HTTP 403 failures, 1 retrieval error without a reported HTTP status, and 1 login redirect**. These are tool-operation counts, not an assertion about underlying HTTP exchanges, search-engine crawling or redirects. The tool does not expose a complete wire-level count.

No property ID, APN, APN9, ATN, real address or private evidence was supplied to a search query or URL. Generic documentation retrieval is counted separately from property-specific county queries, which remain zero. No feature-query endpoint was invoked, including unfiltered/count-only queries.

### Explicit page inventory

Each entry was opened once. U09 and U11 are configuration metadata, not property features. The U08 login was a server redirect, not an authenticated request or manually submitted login.

| ID / batch | Requested official URL | Observed result |
| --- | --- | --- |
| U01 / 1 | [Assessor GIS data](https://www.kerncounty.com/government/departments/assessor-recorder/property/mapping-gis/gis-data) | 403; official search-index text used with freshness limitation |
| U02 / 3 | [Assessor search documentation](https://www.kerncounty.com/government/departments/assessor-recorder/property/assessor-property-search) | 403; official indexed instructions available |
| U03 / 3 | [County GIS menu](https://www.kerncounty.com/government/gis-menu/) | 403; indexed county GIS navigation available |
| U04 / 3 | [Assessor applications root](https://assessorapps.kerncounty.com/) | Public navigation; followed only its two blank search-form links |
| U05 / 3 | [Public map catalog](https://maps.kerncounty.com/Geocortex/Essentials/REST/sites/New_Kern_Essentials_Public/map) | Public service/layer catalog; no map features requested |
| U06 / 4 | [Blank parcel-search form](https://assessorapps.kerncounty.com/PropertySearch/Parcels/index.aspx) | Public form; no search term or submission |
| U07 / 4 | [Blank map-search form](https://assessorapps.kerncounty.com/PropertySearch/AssessorMaps/index.aspx) | Public form; no search term or submission |
| U08 / 4 | [Assessor backend service](https://maps.co.kern.ca.us/arcgis/rest/services/Assessor/Assessor_Public/MapServer) | Redirect to same host's `/arcgis/rest/login`, with original generic service URL as redirect target; no credentials/token |
| U09 / 4 | [Land-layer configuration](https://maps.kerncounty.com/Geocortex/Essentials/REST/sites/New_Kern_Essentials_Public/map/mapservices/46/layers/2) | Public generic field/schema description |
| U10 / 5 | [Blank roll-purchase application](https://www.kerncounty.com/home/showpublisheddocument/6467/637723329979070000) | Tool retrieval error; no status code supplied; official indexed form text available |
| U11 / 5 | [Assessor map-service configuration](https://maps.kerncounty.com/Geocortex/Essentials/REST/sites/New_Kern_Essentials_Public/map/mapservices/46) | Public generic configuration; no underlying service query |
| U12 / 6 | [Website usage policy](https://www.kerncounty.com/community/website-usage-policy) | 403; official indexed policy text available |
| U13 / 6 | [Legacy assessment-roll layout](https://www.kerncounty.com/home/showpublisheddocument/6453/637562348789330000) | 403; official indexed dictionary text available |
| U14 / 6 | [Recorder search instructions](https://www.kerncounty.com/government/departments/assessor-recorder/records/search-for-recorded-documents-or-maps) | 403; official indexed instructions available |
| U15 / 6 | [Interactive map terms](https://www.kerncounty.com/government/gis-menu/interactive-county-map-gis-tool) | 403; official indexed terms available; interactive application not launched |

No automated retries, alternative-host/proxy bypasses, authenticated sessions, cookies containing credentials, purchases or personnel contacts were used. Public wrapper metadata was inspected as its own public documentation, not used to proxy around U08's login. A backup viewer found in search results was not opened or used.

### Generic search inventory

| Batch | Search text | Restriction |
| --- | --- | --- |
| 2 | `site.kerncounty.com assessor parcel search ATN assessment tax number` | Official-domain term in query |
| 2 | `site.kerncounty.com mapping GIS parcel history current parcels` | Official-domain term in query |
| 2 | `site.kerncounty.com GIS data parcel mapping contact` | Official-domain term in query |
| 5 | `Assessor Tax Number ATN definition parcel` | Tool domain filter: `kerncounty.com` |
| 5 | `parcel history mapping verification contact` | Same |
| 5 | `Recorder recorded maps records search official` | Same |
| 5 | `website privacy disclaimer use GIS data retention` | Same |
| 6 | `"Permission to use documents" "restrictions" "commercial"` | Same |
| 6 | `"GIS" "larner" "3378"` | Same; official business contact, not a parcel identifier |
| 6 | `"Assessor Tax Number" "parcel" difference` | Same |
| 6 | `"Mapping" "parcel" "history" "contact"` | Same |

The first batch's domain terms did not prevent unsolicited third-party results. Those results were not opened, copied into reports or used as parcel/status evidence. Later queries used the explicit domain filter. Search results also contained unrelated official documents; they were not treated as relevant evidence. No parcel record was intentionally requested as a fixture.

## 2. Source-verification boundaries

| Check | Result |
| --- | --- |
| Official provenance | County informational pages and county-hosted Assessor/map applications; backend URL obtained from public county map catalog |
| Live versus indexed distinction | PASS: blocked pages are not called successfully retrieved/current; indexed official text is identified as such |
| Public access | Verified only for blank forms/configuration actually retrieved; no guarantee of backend feature access |
| Current-status authority | Not established; no map presence, field name, search snippet or HTTP success promoted to parcel activity |
| Identifier semantics | Existing APN/APN9 source contract preserved; official ATN acronym/legacy definition recorded with temporal/cardinality limits |
| Date distinctions | Publication, layer maintenance, roll, event, record-effective and retrieval dates separated |
| Retention | Existing county disclaimer preserved; proposed-source rights remain a gating clarification, not presumed from public access |
| Recorder scope | Official instructions reviewed, no grantor/grantee, map or document search performed |
| Contact | Public Mapping business contact documented; formal verification service and current availability unverified; no outreach |

Official search-index text is not an authoritative copy of today's website. Direct 403 responses may reflect this research client's access, not universal unavailability. No effort was made to bypass them. No current record or status inference is based on the indexed “latest edition” statement that conflicts with the retained edition.

## 3. Local preservation method

Before edits, an offline Node 22.12.0 command built a deterministic census of **3,885 pre-existing files**. It reused the existing file-hash reader and SHA helper with `src/analysis/offline.js` loaded first. No credential/environment loader, database client, provider client or acquisition entry point was invoked.

Coverage is the union of:

- Paths in the retained versioned-baseline reconciliation preservation inventory.
- Current Git-listed tracked and nonignored untracked files.
- Existing private RentCast pilot, Rule C, identity-review, identity-persistence, durable-identity and MLS Round 1 artifacts.
- Retained Sprint 6.2 county extraction/package artifacts and original county archive.
- Monte Carlo/investor-report validation artifacts and the immediately preceding RC-P2 readiness artifacts.

Only these two newly authorized reports are excluded from the census comparison. No pre-existing file is exempted. The census is not a claim to hash every unrelated ignored file on the computer. Historical manifests were read/fingerprinted, never regenerated or accepted as new baselines.

| Before-edit receipt | Value |
| --- | --- |
| Timestamp UTC | `2026-10-09T23:55:25.496Z` |
| Existing files | 3,885 |
| Sorted path-list SHA-256 | `38c6bc397d5eba6fd5ab7f13b5ba69b3f184ef8eea7ddbfb8e9cc02bc7324457` |
| SHA-256 over sorted `[path, file SHA-256]` pairs | `84d5982d3dc834a6a077408c897b701967b5df896bb451f381630b9cf284d3e6` |

Post-write preservation result: **PASS** at `2026-10-10T00:01:00.346Z` UTC (still October 9 locally). All **3,885 files**, the exact path set and the aggregate content fingerprint match the before-edit receipt. **Zero pre-existing files changed, disappeared or were added to the compared set.** Actual analyst decisions, original county/RentCast evidence, historical manifests, current v3 pins and authorization artifacts are unchanged. Only the two new requested reports are excluded from this comparison.

No application-source change required a regression rerun. Broad certifications, replay writers, report regeneration, database certification, decision saves and source-table reimports were not executed. Existing county data was fingerprinted/read locally; no new county data was downloaded.

## 4. Privacy and documentation QA

Final checks cover both new reports and the exact outbound web-tool argument inventory, comparing them locally against RC-P2's private identifiers and complete street/address strings. Shared city/state names are not unique parcel identifiers. Keys/addresses are never printed by the check. Credential-like assignments, broken local Markdown links and missing required report sections are checked separately.

Final automated check result: **22/22 PASS**, zero failures. The private comparison used **11 distinct sensitive identity/address values** against both reports and all six outbound web-tool argument batches. No match was found. Additional assertions checked required private bindings, no feature-query/parcel-parameter requests, exact network-operation counts, eight option labels, date distinctions, historical conflict preservation, no ATN equivalence, unresolved current status, rights gate, no contact claim, final stop/classification, credential-like assignments and resolvable local documentation links. Values stayed in process memory; only counts and check names were emitted.

The separate preservation comparison adds one passing check: **23/23 task-specific checks PASS**. These are discovery/privacy/preservation checks, not a rerun of application regressions or live county functional tests. `git diff --check` also returned exit code 0; Git reported existing LF/CRLF conversion warnings, with no normalization performed. The new untracked reports received their own local content/link checks.

The reports contain generic field names, official source URLs, official business contact information and file fingerprints only—not private county/provider/candidate identifiers, situs, ZIP, coordinates or owner/contact records. No screenshot, private response or public property-detail URL was created. Public official contacts are deliberately distinguished from property-owner PII.

## 5. Safety accounting

| Operation | Count |
| --- | ---: |
| Generic web search queries / explicit public page operations | 11 / 15 |
| Property-specific county queries | 0 |
| Feature queries / record enumeration / bulk downloads | 0 / 0 / 0 |
| Credential loads / authenticated county access / payments | 0 / 0 / 0 |
| RentCast / ATTOM / DataTree / Google calls | 0 / 0 / 0 / 0 |
| Database connections / writes / migrations | 0 / 0 / 0 |
| Analyst decisions changed / approvals | 0 / 0 |
| Canonical resolutions / durable Properties created | 0 / 0 |
| Round 1 selections / authorization changes | 0 / 0 |
| MLS access / deployment / dependency installations | 0 / 0 / 0 |
| County personnel contacted | 0 |

Only the two requested documentation files are new deliverables. No main application, reconciliation, persistence, model, report template, monitoring, protected baseline or original evidence changes are authorized or required.

## 6. Remaining limitations and stop

Unresolved: authoritative current-status meaning; covered-through date/update lag; intervening history and pending events; current assessment/parcel semantics; precise one-property confirmation process; fee; approved private submission channel; and PI retention/commercial-use permission for that source. ATN terminology discovery alone resolves none of those operational gates.

The report provides a proposed county question and one-property procedure only. No claim of completed current identity verification, approval, persistence or Round 1 readiness is made.

Final classification: **COUNTY METHOD CLARIFICATION REQUIRED**.

**STOP FOR STAN/CHATGPT REVIEW.**
