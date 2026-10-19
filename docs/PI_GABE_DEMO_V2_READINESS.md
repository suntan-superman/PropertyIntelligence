# Gabe demo V2 — real-property enrichment

Final classification: `PARTIAL_DEMO_READY`.

Six real nonpilot subjects now have matched RentCast Property Records, complete provider-returned addresses, structural facts, six AVMs with ranges, and exact historical county Power-to-Sell amounts. Human address review and confirmed sold comparables remain outstanding. This is not investment approval, current legal parcel certification or Round 1 MLS selection.

## Deliverables

All presentation/private artifacts are in the gitignored `data/runtime/gabe-demo-v2-2026-10-13/` directory:

- `PI_GABE_OPPORTUNITY_REPORT_V2.pdf` — ten pages, all rendered and visually inspected.
- `PI_GABE_OPPORTUNITY_REPORT_V2.html` — matching, self-contained offline presentation.
- `REVIEW_QUEUE.html` — local-only address decisions, evidence notes and listing exclusions; no live provider/database actions.
- `ENRICHMENT_LEDGER.json` — private summary bound to the fsynced, append-only `CALLS.jsonl`.
- `report-model.json`, `private-subjects.json`, `private-provenance.json`, private responses, QA and final receipt — do not distribute these as investor material.

V1 remains intact. No document was sent to Gabe or deployed.

## Results and limits

| Measure | Result |
| --- | --- |
| Candidates | 6 |
| Complete provider addresses | 6/6 |
| Complete human-reviewed addresses | 0/6 — pending |
| Property Records matched | 6 |
| AVMs subject/ID matched | 6 |
| Historical Power-to-Sell reasons / amounts | 6 |
| Confirmed sold comps / analyst-accepted comps | 0 / 0 |
| AVM listing observations returned | 90 across six responses; may overlap |
| Listing observations displayed | 18 — three per profile; explicitly not sold comps |
| Google / RentCast data requests | 0 / 12 |
| HTTP 200 / retries / pagination requests | 12 / 0 / 0 |
| Conservative incremental cost exposure | $2.40 of $20; actual billing not independently verified |
| Unsupported mortgage / ARV / return claims | 0 |
| Production DB connections/writes / MLS selections / deployments | 0 / 0 / 0 |

Three V1 candidates were retained. Two with more complex historical land-use descriptions and one with an abbreviated city were replaced. The unchanged exclusions leave 74 nonpilot records, 51 passing the existing integrity screen. Twenty-three meet the additional evidence-completeness screen. Replacement order is historical parcel amount descending, original ordinal as tie-breaker; no economic score or certified ranking was modified. Every substitution and source reference is recorded privately.

The source amount is `parcel_amount_owed` from September 15, not owner-level aggregate, asking price, current payoff or mortgage balance. Source rows include the CSV header in their line numbering. County identifiers were never inferred from provider identifiers or stripped of meaningful zeros. All six returned provider parcel values equal the retained ATN; the report explicitly says this is **not APN equivalence or legal parcel proof**. Street/city, Kern/California jurisdiction, Single Family type, unique provider ID and complete returned address were independently compared before requesting AVMs. Each AVM subject ID then matched its Property Records ID.

Beds, baths, area, lot, year and reported historical sales are direct provider fields. Retrieval dates are supplied; a separate provider data-as-of/model-as-of date was not returned. No condition, current title, current distress, ownership, mortgage payoff or renovation value was established. No ROI, MAO, profit or Monte Carlo calculation ran.

## Provider path, budget and rights

This demo reused the existing `src/sources/rentcast/client.js`, supported single-address `/properties` and `/avm/value` contracts, and existing server-only allowlisted credential reader. A small private orchestration script fixes six subjects, checks source hashes, configures zero retries, reserves every attempt in a separate fsynced log, bounds response size, rejects redirects/pagination, and stops on errors. Its exclusive execution lock prevents restarting the run. No Stage A engine, selector, certificate, registry or $1 authorization was used, activated or changed.

The current [RentCast pricing page](https://www.rentcast.io/api) lists Developer overages at $0.20. Every call was reserved as overage; the old 47-request balance was not credited or claimed current. The October 12 account screenshot remains historical account evidence, not a fresh dashboard inspection. Cindy's privately retained October 13 correspondence confirms no endpoint surcharge and pricing inclusive of taxes/fees. All twelve responses returned HTTP 200. No further call is scheduled; $17.60 is unused ceiling, not an instruction to spend it.

Retained vendor correspondence permits the intended research/SaaS/PDF use. Current [RentCast API terms](https://www.rentcast.io/terms-api) permit storage and distribution subject to their restrictions, including applicable third-party conditions. No new legal attestation or human review timestamp was invented.

Google was unnecessary because county street/city and California jurisdiction supported the ZIP-optional lookup permitted in the retained RentCast email. No Google key was loaded. Google's public [pricing table](https://developers.google.com/maps/billing-and-pricing/pricing) lists the initial paid Geocoding tier at $5/1,000 events, but account-specific billing/taxes were not established. Existing Google runners are pilot-bound. No new dispatcher or Google call was made. [Geocoding terms §6.3](https://cloud.google.com/maps-platform/terms/maps-service-terms) restrict cached end-user content reuse; no Google-derived address was placed in these reports or presumed licensed by RentCast permission.

## Sold-comp gap and exact safe next step

The [AVM documentation](https://developers.rentcast.io/reference/property-valuation) describes listing-derived valuation evidence. Returned statuses were Active/Inactive, with listing prices and last-seen dates—not completed-sale confirmation. The PDF labels these solely as market context. It uses a two-mile, 180-day **listing-last-seen** window, same county/state/type, bedrooms within one and size 65%–135%; unit-labeled and duplicate addresses are excluded from presentation. Eighteen observations are displayed, twenty-four retained for local review. No adjustment amount or renovation condition is inferred.

The [Property Records contract](https://developers.rentcast.io/reference/property-records) supports a separate sold search, but PI's existing safe general client rejects `radius`, `saleDateRange` and `limit`; its financial Stage C implementation is synthetic-only. We did not bypass either restriction or make extra address requests to simulate a search.

For Stan: supply a genuine licensed Property Records export from an already approved server-side workflow, or separately authorize the minimum bounded-search client support. Do not activate Stage A/C or paste credentials into the review HTML. The private `SOLD_SEARCH_HANDOFF.json` identifies each already matched subject and the proposed single-page bounds: radius 2 miles, `saleDateRange=180` (days, not a date string), Single Family, limit 50, offset 0. Six eventual requests would reserve another $1.20; none was executed. Any future export needs request parameters, retrieval time, exact subject reference, response hash and applicable rights. Require returned sale date/price and comparability checks; exclude non-sale/ambiguous transfers and units. Never infer a sale from removed/inactive listing status. Do not widen bounds automatically.

## Local manual review

1. Open `REVIEW_QUEUE.html` directly in a local browser; no server or API key is needed.
2. Enter your actual reviewer name. Compare county situs and RentCast suggestion. Choose Accept as preliminary, Needs correction with independent cited evidence, or Reject. Add the source reference and evidence note. No acceptance is preselected.
3. Use Exclude observation for unsuitable listing context. Accept sold comparable is disabled because no completed-sale evidence exists. Unit-labeled observations retained in the private queue were excluded from the PDF.
4. Export and save `REVIEW_DECISIONS.json` in the same private V2 folder. Use the file picker to reopen it; stale/model-mismatched files are rejected. The export does not update the PDF, canonical records or any acquisition authority. Return the file for review before regeneration.

## QA and preservation

Before credential loading: **37/37 offline tests passed, zero skips**, covering 25 existing evidence/report tests and 12 focused acquisition checks. Wrong identities, meaningful-zero changes, changed source hashes, reused reservations, unsupported endpoints, error retries and pagination were rejected. The source bytes and 13,621 protected pre-existing files plus 14 retained links were checked.

Final focused regression selection: **47/47 PASS, zero skips**, recorded in `final-qa.json`: the same 37 plus ten presentation/source/privacy/accounting/review tests. This is not a broad re-certification of frozen production systems. Node 22.12.0, installed Puppeteer 25.12.0 and Chrome 154.0.8037.57 were used without dependency/runtime changes.

Final render r7: ten pages, no blank page, out-of-bounds text, column overflow or footer overlap; complete county disclaimer preserved. Actual PDF images were inspected. Seven final images are byte-identical to already inspected r5 images; changed pages 7–9 were inspected again. Unit-labeled duplicate-like market suggestions discovered during visual review were excluded without new calls. Earlier drafts and failure evidence remain in the isolated output tree.

Early local preparation checks caught the raw formatted county ATN versus normalized-ID distinction and CSV header offset before any provider request. UI QA needed separate browser documents for the script-free report and interactive/synthetic queues. Subsequent rendering caught overflow; text/spacing and the displayed listing count were refined. These were demo-only corrections, not weakened assertions or rewritten historical artifacts.

Final preservation: **13,621 prior file hashes and 14 links unchanged; unexpected changes 0**. Only this new sanitized report is added outside the gitignored demo tree. Original engines, manifests, ledgers, decisions, Rule C, V3, MAO, Monte Carlo, investor templates/calculations, Round 1 flags and V1 outputs remain unchanged. No historical baseline was rewritten or membership automatically expanded.

Stop for Stan/ChatGPT review. No additional calls, MLS validation, investor distribution or production integration are started.
