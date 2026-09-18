# Foundation Sprint 1 completion report

Generated: 2026-09-18T18:41:45.123Z

**Outcome: STOPPED_AT_SPECIFICATION_GATE.**

The independent adapter, domain models, sponsor seed, deterministic underwriting, comparison outputs and offline tests are implemented. Live verification is incomplete whenever a STOP gate is listed below. No UI, Monte Carlo, investor package, collateral verification or Kern enrichment was performed.

## Audit and independence

Home Advisor was read only. Referenced files and detailed behavior are listed in [the audit](HOME_ADVISOR_RENTCAST_AUDIT.md): web `lib/api.js`; API `config/env.js`, `services/rentcastClient.js`, `services/compsProvider.js`, `services/pricingEngine.js`, pricing service/routes/tests, property service, and pricing usage policy.

Home Advisor calls `/avm/value` and `/listings/sale`. This independent adapter implements `/properties` (documented identity lookup addition) and `/avm/value` (including all returned comps). It needs no extra listing calls. No Home Advisor modules or files are imported by the adapter at runtime.

Configuration names: `RENTCAST_API_KEY` (preferred), `MARKET_DATA_API_KEY` (fallback), `RENTCAST_BASE_URL` (official URL only). The initial reference key was passed through the launch process environment. After Stan supplied an updated key in `.env.example`, that file was moved to ignored `.env` and `.env.example` was restored to blank placeholders. No key value or auth header is included in source, report or cache.

## Tests and validation

Offline tests: 25/25 passed; 0 failed. Command: npm test. No RentCast quota used by tests.

- sponsorArithmeticReproduced: PASS
- comparisonReproducible: PASS
- threeDealRowsPreserved: PASS
- sponsorClaimsUnmodified: PASS
- joyceIdentityNotInferred: PASS
- unitTestsPass: PASS
- provenanceReferencesReadable: PASS

Fixture coverage includes property/no/multiple matches, missing city/state, wrong address/unit, manufactured-type gate, AVM/range/comps, provider/malformed errors, transient/network/429 retries, credential redaction, cache reuse/refresh, sponsor arithmetic and user-confirmed address corrections with original sponsor values preserved.

Cache-only replay: fantasia identical; bass identical. 3 cache hits; 0 API attempts. Live networking was disabled for this check; see data/validation/foundation-cache-replay.json.

## Provider execution and STOP gates

API attempts: 5; cache hits: 0; retries: 0; 429 responses: 0. These count local HTTP attempts, not provider-confirmed billable usage.

Latest invocation: bass; 1 API attempt(s), 0 cache hit(s).

- bass: MANUFACTURED_REPRESENTATION_STOP

- fantasia: Stan confirmed 8426 Fantasia Park Way, Riverview, FL, 33578 on 2026-09-18. Original sponsor address retained. Source: docs/FLORIDA_ADDRESS_CONFIRMATIONS.md.

- Candidate for fantasia: 8426 Fantasia Park Way, Riverview, FL 33578; provider type Manufactured; selected: yes.
- Candidate for bass: 95 Bass Cir, Winter Haven, FL 33881; provider type Unavailable; selected: no.

- bass: Provider property type: missing; manufactured-home identity not established. No AVM was requested after this STOP. Address matching alone does not establish manufactured-home representation.

| Address | Resolution | AVM USD | Low / high USD | Comps | Variance USD / percent |
| --- | --- | ---: | --- | ---: | --- |
| 8426 Fantasia Park Way | INDEPENDENT_EVIDENCE_AVAILABLE | 122000 | 40000 / 204000 | 15 | 157000 / 128.68852459016392 |
| 95 Bass Circle | MANUFACTURED_REPRESENTATION_STOP | Unavailable | Unavailable / Unavailable | 0 | Unavailable / Unavailable |
| 131 Joyce Place | ADDRESS_AMBIGUOUS | Unavailable | Unavailable / Unavailable | 0 | Unavailable / Unavailable |

8426 Fantasia Park Way: sponsor projected price $279,000; provider AVM $122,000; difference $157,000 (128.7% of provider AVM). Status: ABOVE_INDEPENDENT_RANGE. The provider result is evidence, not verified resale proceeds or an investment recommendation.

Fantasia review: the provider reports 3 beds, 2 baths, 1,242 square feet, built 2006, and an assessor parcel identifier. Its 15 retained comps are manufactured-home listings, including active and inactive listings; none is relabeled a proven closing. The wide $40,000–$204,000 range and varying lot/unit attributes warrant land-tenure/comparability review. Provider land assessments do not establish ownership or make a comp equivalent. No proprietary ARV adjustment or comp removal was performed.

Joyce remains ADDRESS_AMBIGUOUS: city, state and ZIP are not supplied. No discovery call was needed or made. The Florida portfolio context has not been used to assign Joyce a state.

## Deterministic sponsor arithmetic

| Deal | Sponsor-defined profit USD | Cash invested USD | Cash-on-cash (rounded) |
| --- | ---: | ---: | ---: |
| fantasia | 99000 | 173000 | 57.2% |
| bass | 30600 | 29400 | 104.1% |
| joyce | 22378 | 13122 | 170.5% |
| Portfolio | 151978 | 215522 | 70.5% |

Net proceeds = list price − commission − escrow/closing − supplied space rent. Profit = net proceeds − acquisition − repairs. Cash invested = acquisition + repairs + space rent. Cash-on-cash = profit / cash invested. Space rent is deducted once, not twice. These reproduce sponsor arithmetic; they do not verify the inputs.

The model is not fully burdened. Missing cost categories remain null/unknown: acquisition closing, taxes, insurance, utilities, financing, repair contingency, extra holding, community/park fees, transfer/application fees, price reductions, other disposition. Supplied three-month rent is not silently extended to match the 120-day timeline.

## Evidence limitations and readiness

Provider valuations are displayed above where available. Sponsor values and claim statuses remain intact. No RentCast value is marked VERIFIED.

- fantasia: ABOVE_INDEPENDENT_RANGE
- bass: NO_INDEPENDENT_EVIDENCE
- joyce: ADDRESS_AMBIGUOUS

Fantasia property details and AVM subject agree on the user-confirmed address, provider ID and Manufactured type. Bass coverage remains insufficient because the record omits type and structural/parcel details. Park/unit identity, land tenure, title, lien existence/priority, repairs and selling condition remain unknown. The promissory-note, three-property lien and 713 Bryce Drive free-and-clear/$230,000 statements remain sponsor claims; collateral was not queried.

Fantasia now has actual evidence ready for Stan/ChatGPT review, but the portfolio remains incomplete because Bass stopped and Joyce lacks a full address. UI implementation remains gated on that review and explicit later scope.

## Exact next step

Review the sparse Bass response and obtain corroborating parcel/home identity and manufactured-home details. Agree on a reliable evidence source or representation before resuming Bass enrichment; do not override the missing type or guess its characteristics to force an AVM. Obtain the sponsor-confirmed full address for Joyce. Review Fantasia’s provider range and all 15 comps, including whether land tenure is comparable, before any later UI work.

Only after the current STOP gate is resolved and any confirmed identity mapping is implemented and tested, resume the first-property gate:

```powershell
cd C:\Users\sjroy\Source\PropertyIntelligence
npm run rentcast:audit
npm run deals:verify:florida -- --property fantasia
```

Inspect the sanitized raw response and `data/normalized/florida-verification.json`. Only if Fantasia has INDEPENDENT_EVIDENCE_AVAILABLE, correct identity and reliable manufactured-home representation, continue:

```powershell
npm run deals:verify:florida -- --property bass
npm run deals:compare:florida
npm test
npm run foundation:summarize
```

`--refresh` replaces cache selection while retaining older raw snapshots. A normal rerun reuses successful cached evidence and its original retrieval timestamp. Do not repeatedly retry a STOP condition.

## Property Intelligence files created/changed

- .env.example
- .gitignore
- README.md
- data/comparisons/florida-comparisons.csv
- data/comparisons/florida-comparisons.json
- data/deals/florida-portfolio.json
- data/normalized/florida-underwriting.json
- data/normalized/florida-verification.json
- data/raw/rentcast/988be361cf4184980e2656c76344de2305e627c95258c2feed5a2d2009739c80/4eb7d353749bdb83fcc8228588bb01fecea01fd2f87f96c5e36128da40a4b901.json
- data/raw/rentcast/b9f4b102132387564b6982660690b9947d792ddfbb3908828231703e6eff3d62/1d56702f0f22f299bd7cbf0cf788df3901c7535db691a15a3398914e1e99df46.json
- data/raw/rentcast/b9f4b102132387564b6982660690b9947d792ddfbb3908828231703e6eff3d62/23aaea18ff7e014ac26282a09d0d2ceeec7cfe6877ca9d20e458220c516689f4.json
- data/validation/foundation-cache-replay.json
- data/validation/foundation-tests.json
- data/validation/foundation-validation.json
- docs/DATA_DICTIONARY.md
- docs/DEAL_VERIFICATION_ARCHITECTURE.md
- docs/FLORIDA_ADDRESS_CONFIRMATIONS.md
- docs/FOUNDATION_SPRINT1_COMPLETION_REPORT.md
- docs/FUTURE_WORK.md
- docs/HOME_ADVISOR_RENTCAST_AUDIT.md
- package.json
- scripts/compare-sponsor-to-evidence.js
- scripts/rentcast-inspect-config.js
- scripts/seed-florida-deals.js
- scripts/summarize-foundation-sprint1.js
- scripts/test-foundation.js
- scripts/verify-florida-properties.js
- src/domain/claim.js
- src/domain/deal.js
- src/domain/evidence.js
- src/domain/floridaSeed.js
- src/domain/property.js
- src/io/files.js
- src/provenance/provenance.js
- src/sources/rentcast/cache.js
- src/sources/rentcast/client.js
- src/sources/rentcast/comps.js
- src/sources/rentcast/config.js
- src/sources/rentcast/normalizer.js
- src/sources/rentcast/propertyLookup.js
- src/sources/rentcast/valuation.js
- src/sources/rentcast/verify.js
- src/underwriting/comparison.js
- src/underwriting/deterministic.js
- tests/fixtures/rentcast.json
- tests/foundation.test.js

The parent Source repository ignores this project via its existing wildcard rule; no parent ignore rules or Home Advisor files were changed. Artifacts are present on disk.
