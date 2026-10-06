# Property Intelligence — ATTOM API Capability POC

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Credential:** `ATTOM_API_KEY` is in local `.env` and Netlify.
**Scope:** LOCAL, READ-ONLY capability evaluation. Do not use Netlify.
**Fixture:** 3484 Haven St, Rosamond, CA 93560; Kern FIPS `06029`; PI APN9 `251091302`; ATN `25109130001`.

## Mission
Empirically determine what the ATTOM Premium API trial exposes before choosing an integration or bulk/cloud architecture.

Answer:
1. Does address and APN+FIPS resolve to the same ATTOM ID?
2. Which available endpoints expose mortgage, sale/transfer, preforeclosure/NOD/NTS, auction, loan-position/home-equity and lien-relevant data?
3. Which requirements are API-inaccessible/package-denied and likely Bulk/Cloud/Snowflake?
4. How many HTTP requests and ATTOM API Reports are consumed per useful enrichment?
5. Can ATTOM clarify the unusual Feb-2025 ~$117,500 event?

## Hard boundaries
LOCAL ONLY. No Netlify, Supabase writes, migrations, app/runtime adapters, UI, production changes, Property/Evidence/Opportunity/Deal mutation, RentCast/Google/county/First American calls, bulk searches, pagination, or owner/contact enrichment. Never print/log/commit the API key. Raw responses remain protected/gitignored until licensing/retention rights are confirmed.

Hard ceiling: **25 successful property-report-producing requests/reports**; target first pass <=12 useful reports. Every query must target exactly one property. STOP before any request that may return multiple properties.

## Preflight
Create `scripts/attom-poc/`. Load `.env` using the project's existing safe approach. Require `ATTOM_API_KEY`; send it only in ATTOM's documented `apikey` header. JSON Accept, timeout, no blind 4xx retries, max one transient retry. Log endpoint/status/elapsed/result count/ATTOM status metadata, never credentials.

## Identity
Test exact canonical address, then APN+FIPS using documented APN matching rules. Do not invent APN transformations beyond safe formatting normalization.

Capture ATTOM ID, formatted APN, FIPS, standardized address, match code, lat/lon and basic property characteristics.

Address and APN must resolve to SAME ATTOM ID. Otherwise STOP for identity conflict.

ATTOM ID stays local in POC artifacts only.

## Inventory before calls
Inspect current ATTOM docs/OpenAPI/account package. Create `data/validation/attom-poc/endpoint-inventory.json` classifying:
- identity/basic profile/property detail
- detail mortgage
- sales history/all events
- preforeclosure
- home equity/loan model
- deeds/transactions
- lien endpoints if present
- assignments/releases if present

For each record endpoint, exact-property search mode, expected fields, package/access indication, test yes/no and reason. Do not call everything.

## Controlled endpoint priorities
Priority A:
1. identity/basic profile/detail as needed
2. Property Detail Mortgage/current equivalent
3. Sales History or All Events sufficient for Feb-2025 question
4. Preforeclosure

Priority B only if documented and accessible:
5. Home Equity/Loan Model
6. mortgage/deed endpoint needed for positions/terms
7. lien endpoint
8. assignment/release endpoint

Do not call ATTOM AVM merely to duplicate RentCast unless required by an ATTOM equity endpoint.

## Field matrix
Create `ATTOM_API_FIELD_MATRIX.csv` and markdown summary with status:
`API_AVAILABLE`, `API_RETURNED_FOR_3484`, `API_AVAILABLE_BUT_NULL`, `ACCESS_DENIED_PACKAGE_REQUIRED`, `NOT_FOUND_IN_CURRENT_API_DOCS`, `BULK_CLOUD_CANDIDATE`, `UNKNOWN_REQUIRES_ATTOM_CONFIRMATION`.

Track:

Identity: ATTOM ID, APN, FIPS, standardized address, type, beds/baths, living area, year.

Transfer: sale/transfer date, amount, document type/number, arms-length indicator, transfer classification; note grantor/grantee availability but redact personal names from shareable output.

Mortgage: original principal, origination/recording date, lender, position, 1st/2nd/3rd, loan type, term, interest rate/type, HELOC, maturity, amortized/estimated balance, total balance, LTV/CLTV, ATTOM estimated equity.

Foreclosure: active status, NOD/Lis Pendens + date, NTS/Notice of Sale + date, trustee, auction date/time, opening bid, default amount, transaction/document ID.

Mortgage lifecycle: assignment/date, release/satisfaction/reconveyance/date, active-loan indicator.

Other encumbrances: judgment, federal/state tax, mechanic's, HOA, PACE liens.

A null fixture value does NOT mean the API lacks the field.

## Specific fixture questions
### Feb-2025 event
Determine whether ATTOM returns a transaction near Feb 2025 and record date, amount, document/transaction type, arms-length classification and document number if available. Do not call it an open-market sale unless ATTOM evidence supports that.

### Preforeclosure
Determine whether 3484 currently/historically has NOD, NTS, auction, foreclosure or REO evidence. Distinguish `endpoint accessible/no fixture record` from `endpoint unavailable`.

### Mortgage balance
If ATTOM returns amortized/estimated balances, label them `ATTOM estimate` and record positions/as-of dates. Do not build PI's own balance estimator in this POC. If only original loans are available, document inputs for future modeling.

## Raw/sanitized artifacts
Raw JSON only under gitignored `data/validation/attom-poc/raw/`, with secret headers removed. Sanitized normalized extracts under `data/validation/attom-poc/sanitized/`. Do not commit raw provider responses until licensing rights are confirmed.

## Usage ledger
Create `usage-ledger.json` per request:
sequence, UTC timestamp, endpoint, address/APN/ATTOM-ID mode, HTTP status, ATTOM total/page/pageSize, reports/properties returned, estimated API Reports consumed, elapsed ms, usefulness, package/access note.

Summarize HTTP requests, successful/zero-result requests, API Reports consumed, reports per enriched property and projected production reports/property.

**Do not equate HTTP calls with API Reports.**

## Security
Scan code/artifacts for ATTOM key value, `ATTOM_API_KEY=`, populated apikey headers, DATABASE_URL and other secrets.

## Required outputs
- `docs/ATTOM_API_CAPABILITY_POC.md`
- `docs/ATTOM_API_GAP_ANALYSIS.md`
- `docs/ATTOM_CALL_WITH_MIKE_QUESTIONS.md`
- `data/validation/attom-poc/endpoint-inventory.json`
- `data/validation/attom-poc/ATTOM_API_FIELD_MATRIX.csv`
- `data/validation/attom-poc/usage-ledger.json`
- sanitized fixture extracts

Capability report must state identity match/ATTOM ID; endpoints tested/denied; fields returned/missing; NOD/NTS; mortgage data; estimated balance/equity; Feb-2025 transaction; assignments/releases; lien/PACE/HOA availability; HTTP requests/API Reports; projected reports/property; API-only feasibility; Bulk/Cloud/Snowflake gaps.

## Mike call sheet
Base questions on empirical gaps:
- Which required fields are Bulk/Cloud only?
- Assignments/Releases API availability?
- Home Equity/Loan Model 1st/2nd/3rd estimated balances in Premium API?
- Judgment/tax/mechanic/HOA/PACE liens via API?
- Historical preforeclosure detail vs latest/current only?
- Kern/California update latency?
- Does $500/month mean 5,000 HTTP calls or 5,000 API Reports? ATTOM docs describe report-based billing.
- Commercial SaaS rights: persistence, authenticated display, derived analytics, combining providers, attribution, retention and termination/deletion.
- Incremental Bulk/Snowflake pricing for API gaps.
- Can selective API enrichment coexist with narrowly scoped bulk/cloud licensing?

## STOP
After this one-property POC, STOP for Stan/ChatGPT review. Do not test more properties, deploy, consume the remaining trial, or begin ATTOM integration.
