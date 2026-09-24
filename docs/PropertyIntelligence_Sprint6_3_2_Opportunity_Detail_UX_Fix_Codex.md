# Property Intelligence — Sprint 6.3.2
## Opportunity Detail UX Fix

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Language:** JavaScript only
**Baseline:** Sprint 6.3.1 production-certified
**Scope:** narrow read-only Opportunity screening UX patch
**Defect:** `View` in Opportunities currently produces no useful visible action.

## Mission
Make `View` the free, read-only screening surface for a candidate so the analyst can inspect already-persisted Power-to-Sell, Assessor and address evidence before deciding whether to resolve an address or spend a RentCast call.

Required flow:
`81 High SFR -> View -> inspect existing evidence -> close/next -> shortlist -> resolve address -> Analyze Property -> provider only after explicit confirmation`.

`View` must make zero provider calls and zero data mutations. `Analyze Property` remains the separate enrichment path.

## Hard boundaries
Allowed: fix View; safe candidate-detail DTO; read-only drawer/panel; persisted distress/Assessor/address/linkage/provenance; responsive/accessibility work.

Forbidden: migrations/schema writes; score/rule changes; kern-screen-v2; RentCast/Google/county calls; address auto-resolution; KIPS/history; owner/contact exposure; county import; MAO/report changes; Property/Deal creation from View; background enrichment; CSV expansion.

Provider calls from View: RentCast 0, Google 0, county 0. Supabase reads are expected/reported separately.

## Preserve baseline
Reverify 11,316 candidates; 11,263 exact/53 unmatched; 312/701/10,303; High Residential 118; High SFR 81; all 81 with county situs; Assessor batch/migrations 001–005/kern-screen-v1 fingerprint unchanged; canonical-address semantics/privacy DTOs unchanged.

No migration.

## UX
Prefer a right-side detail drawer/overlay on desktop so filters, pagination, sort and scroll position remain intact. At mobile width use full-width sheet/overlay if appropriate. Closing returns to exact list state.

`View` click must visibly select/open the candidate, show loading, fetch only the allowlisted detail DTO, render detail, show actionable error on failure, make no provider call and mutate nothing. No silent click, blank panel or Overview navigation. Keyboard activation required.

## Detail header
Show county situs if available, otherwise ATN; priority; score; PI Category; candidate status; address-resolution status.

If canonical address exists, header may prefer it with `Canonical address · Analyst confirmed`, while still showing immutable County Situs separately.

## Distress Signal
Show existing:
- Tax Delinquency / parcel amount
- Investigation Priority
- Screening Score
- Source = Kern Power-to-Sell
- safe source edition/date/provenance

Do not imply foreclosure certainty, seller motivation, mortgage default, equity or willingness to sell.

## County Property Record
Where available show:
- PTS ATN
- Assessor ATN
- APN9 / Parcel
- Assessor crosswalk status
- official County Use Code
- official County Use Description
- separately labeled PI Research Category
- Assessor source edition/date

Preserve leading zeros. Official county evidence and PI interpretation must be visually distinct.

## County Assessments
Show when available:
- County Land Assessment
- County Improvement Assessment
- County Net Assessment
- County Base-Year Value

Preserve null vs explicit zero.

Required visible note:
`County assessment data is tax-roll evidence and is not an independent market valuation.`

Never infer/display market value, equity, ARV or assessment-to-debt equity.

## Parcel / Acreage
Show where available:
- County Roll Acreage
- Parcel Shape Acreage
- Parcel Shape Square Feet if useful
- Geometry Status
- acreage diagnostic/delta if applicable

Explicit zero must display as zero/county-reported explicit zero, not Unknown.
If flagged, show: `County acreage sources differ; review before relying on lot size.`
No polygon rendering in this patch.

## Address
Show both evidence layers.

County Situs: raw immutable value/status plus:
`County-reported situs; not independently verified as a postal or deliverable address.`

Canonical Address: formatted address/status/source-method/confirmation if present, otherwise `Not yet resolved`.

Never infer ZIP.

## Linkage
Show Property, Deal and Canonical Address linkage/status. Existing navigation only if already safe/supported. Do not create anything from View.

## Review flags
If useful, place humanized data-quality diagnostics under collapsed `Data Quality / Review Notes`. Do not dump raw enums or call them deal risks.

## Actions
Bottom actions:
- Close
- Resolve Address when appropriate (invoke existing 6.3.1 resolver)
- Analyze Property (existing 6.3.1 precedence/gates)

Incomplete address -> resolver, never provider call.

## API/privacy
Use existing candidate-detail endpoint if sufficient. If persisted fields are missing, extend the response via explicit allowlist only.

Never return raw `provenance_payload`, owner/assessee, billing/care-of/DBA/contact, raw discovery/Assessor rows, filesystem paths, county source file paths, DB metadata or polygon vertices. Reuse hostile-future-key tests. Never return entire DB objects to solve a UI problem.

## No provider tripwire
Opening/closing/refreshing detail must never invoke RentCast, Google, county network, maps, Street View, Places, geocoding, remote property photos or static maps.

## Formatting
Currency human-readable; acreage `0.17 acres`; IDs preserve zeros. Unknown stays Unknown/Not available; explicit zero stays zero.

## Unmatched/empty states
One of 53 Assessor-unmatched candidates must still render distress evidence + ATN + `Assessor match: Unmatched`; Assessor sections become unavailable rather than erroring. Missing situs uses ATN header and `County situs unavailable`.

## Error state
Detail fetch failure:
`Unable to load opportunity detail. The candidate list has not been changed. [Retry] [Close]`
No navigation/provider fallback.

## Accessibility
Real button; keyboard activation; focus into drawer; Escape closes; focus returns to originating View; semantic headings; contained mobile scrolling.

## Tests
Add focused coverage:
1 View opens; 2 correct candidate; 3 fetch error; 4 zero provider calls; 5 county situs immutable; 6 canonical separately labeled; 7 ATN/APN zeros; 8 County Use vs PI Category; 9 land/improvement/net/base-year; 10 not-market-value warning; 11 null vs zero; 12 acreage; 13 acreage warning; 14 unmatched; 15 missing situs; 16 privacy; 17 zero DB mutation; 18 list state preserved; 19 Resolve Address uses existing resolver; 20 Analyze uses existing gate; 21 mobile/desktop; 22 keyboard/focus.

Run Sprint 6.3 population/filter/privacy, Sprint 6.3.1 address persistence, Property analysis, maps, reports/PDFs, MAO, persistence, runtime/security regressions.

## Visual QA
At 1366px and 390px inspect:
- High SFR with full Assessor evidence
- canonical address candidate
- no canonical address
- unmatched
- explicit-zero acreage
- acreage-delta warning
- long use description
- loading/error
- resolver handoff
- close/return

No clipping/overflow/hidden actions.

## Deployment gates
1 protect current baseline;
2 inspect root cause of inert View;
3 implement smallest safe fix/detail presentation;
4 tests/API/privacy/UI/regressions/security;
5 fresh Netlify preview;
6 certify production-backed read-only data;
7 High SFR=81;
8 inspect representative real candidates read-only;
9 provider calls=0;
10 DB mutations from View=0;
11 STOP for Stan/ChatGPT review;
12 production application deploy only after explicit approval;
13 final read-only production certification;
14 STOP.

No canonical-address creation or RentCast call during automated certification.

## Preview cases
Read-only inspect at least: High SFR with situs; High multifamily/manufactured; vacant; missing-situs; Assessor-unmatched; explicit-zero acreage; acreage-delta. Record candidate IDs; do not save/change them.

## Performance
Measure detail latency over small controlled sample. Do not load all 11,316 records or add caching/search infrastructure.

## Documentation
Create/update:
- `docs/SPRINT6_3_2_OPPORTUNITY_DETAIL_UX.md`
- `docs/SPRINT6_3_2_QA.md`
- `docs/SPRINT6_3_2_COMPLETION_REPORT.md`

Report root cause, files, DTO changes, displayed fields, privacy, zero-provider/zero-mutation proof, QA candidates, responsive artifacts, performance, regressions, preview/production status and limitations.

## Acceptance
GO only if View visibly works, is read-only, makes zero provider calls, preserves list state, shows distress + ATN/APN + official County Use + separate PI Category + assessments + warning + acreage/geometry + county/canonical address distinction, safely handles unmatched/missing data, preserves privacy, changes no scores/statuses/schema/imports, keeps regressions green and passes preview before production.

## Final principle
**View is for deciding whether a candidate deserves more work. Analyze Property is for spending resources to learn more.**

Property Intelligence already owns valuable county/distress evidence. Expose it quickly, safely and for free before resolving addresses or consuming provider quota.

**STOP after fresh deploy-preview certification for Stan/ChatGPT review before production deployment.**
