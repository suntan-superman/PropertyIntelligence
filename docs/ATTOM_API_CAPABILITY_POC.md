# ATTOM API Capability POC

_Status: LOCAL READ-ONLY; one-property fixture only. Generated 2026-09-26T03:32:44.301Z._

## Fixture and identity

- Fixture: 3484 Haven St, Rosamond, CA 93560; APN9 251091302; ATN 25109130001; FIPS 06029.
- ATTOM identity: **RESOLVED VIA UNIQUE EXACT-ADDRESS MATCH** (`ExaStr`); the returned `AttomID` is the authoritative persistent ATTOM join key for supported downstream requests.
- KERN APN ↔ ATTOM APN CORROBORATION: **NOT REQUIRED AS A BLOCKING GATE**. The original failed APN+FIPS evidence remains preserved historically in the POC ledger/raw/sanitized artifacts and is not rewritten as a successful match.
- Address identity: 3484 HAVEN ST, ROSAMOND, CA 93560; match ExaStr.
- APN identity: not returned; FIPS not returned.
- Continuation calls use only the unique exact-address ExaStr ATTOM ID; no further APN-format experiment was performed.

### Identity conclusion

**ATTOM IDENTITY RESOLVED VIA UNIQUE EXACT-ADDRESS MATCH; KERN APN ↔ ATTOM ParcelNumberRaw CORROBORATION NOT REQUIRED AS A BLOCKING GATE.**

ATTOM identity fields must remain distinct from Kern source identity. `ParcelNumberRaw` is retained exactly as ATTOM returns it. `ParcelNumberFormatted` is deprecated and must not be used for new integration work. `ParcelNumberAlternate` is supplemental only.

Kern `APN9` and `ATN` remain immutable source identities and are never overwritten by ATTOM parcel identifiers.

Historical identity evidence: the exact address returned one `ExaStr` property; the supplied Kern APN9+FIPS query returned no corroborating property. That failed corroboration remains unchanged in the original usage ledger and protected response artifacts.

## Future integration identity requirements

Any future ATTOM integration must persist these separate provenance fields:

| Field | Meaning |
|---|---|
| `source_system` | Originating source system, such as Kern Power-to-Sell/Assessor |
| `source_atn` | Original Kern ATN; immutable |
| `source_apn9` | Original Kern APN9; immutable |
| `attom_id` | Authoritative persistent ATTOM join key |
| `attom_parcel_number_raw` | Exact ATTOM-returned `ParcelNumberRaw` |
| `canonical_address_id` | Link to the separately versioned canonical-address record |

No adapter, schema migration, production write, or ATTOM call is part of this documentation update.

## Endpoint calls

| Endpoint | Mode | HTTP | Properties | Usefulness |
|---|---|---:|---:|---|
| `preforeclosuredetails` | attom-id | 200 | 1 | preforeclosure |
| `saleshistory/expandedhistory` | attom-id | 200 | 1 | transfer / Feb-2025 |
| `property/detailmortgage` | attom-id | 200 | 1 | mortgage |
| `preforeclosuredetails` | attom-id | 400 | 0 | preforeclosure |
| `valuation/homeequity` | attom-id | 200 | 1 | equity / loan model |
| `preforeclosuredetails` | attom-id | 200 | 1 | preforeclosure |

The runner sends the API key only in the apikey request header, keeps raw response bodies out of logs, and performs at most one transient retry.

## Capability findings

- Transfer/Feb-2025 question: inspect the sanitized sales-history extract for a dated event; this POC does not label an event an open-market sale without ATTOM transaction evidence.
- Preforeclosure: distinguish an accessible endpoint with no fixture record from package denial; NOD/LIS, NTS/NOS, auction, foreclosure and REO values are represented in the field matrix.
- Mortgage/equity: mortgage positions, original terms and any amortized/estimated balances are reported as ATTOM estimates with as-of context; no PI balance estimator is created.
- Assignments/releases and judgment, tax, mechanic's, HOA and PACE liens are not assumed from a null value; they are marked as documentation/package gaps pending ATTOM confirmation.

## Usage

- HTTP requests issued: **6**; successful HTTP 200 responses: **5**; estimated API Reports consumed: **5** (an estimate, not an account-billing assertion).
- Useful non-identity reports: **5**; hard ceiling 25, continuation target no more than 8 additional reports.
- Projected production reports/property: cannot be established from one property or equated to HTTP calls; obtain ATTOM billing definition and endpoint report costs from Mike.

## API-only feasibility and gaps

API-only enrichment is feasible for identity, property detail and whichever transfer/mortgage/foreclosure/equity fields are returned above. Full lien/mortgage-lifecycle depth, historical preforeclosure completeness and bulk-scale coverage remain unproven and may require package/licensed Bulk, Cloud or Snowflake delivery. No multi-property, pagination, bulk or cloud request was made.

## Boundary and evidence

No Netlify, Supabase, Property Intelligence data, RentCast, Google, county or First American service was used. Raw responses are local protected artifacts under the ignored POC directory; sanitized extracts contain no shareable owner/contact names. See [ATTOM API documentation](https://api.developer.attomdata.com/docs) and [endpoint conventions](https://cloud-help.attomdata.com/article/598-endpoints).


## Empirical endpoint findings

- Feb-2025 event: date 2025-02-11; amount 117500; transaction Resale; document 0000015503; transaction ID 1050958823; arms-length indicator not returned.
- Mortgage: original/recorded amount 117500; date 2025-02-12; loan type SCB; estimated amortized balance not returned by this endpoint.
- Home Equity / Loan Model: LTV 96; available equity 7120; lendable equity 5696; total estimated loan balance 114181; as-of 2026-09-05.
- Preforeclosure: HTTP 200; endpoint accessible; Default records 0; Auction records 0.
- Cumulative observed local POC accounting: 20 HTTP requests / 10 estimated ATTOM Reports; continuation additional-report budget remained within 8.
