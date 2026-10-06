# ATTOM API Gap Analysis

Generated 2026-09-26T03:32:44.302Z for the single 3484 Haven fixture. ATTOM identity is **RESOLVED VIA UNIQUE EXACT-ADDRESS MATCH** (`ExaStr`). KERN APN ↔ ATTOM APN corroboration remains historically unresolved but is **not a blocking gate**.

## Identity interpretation update

ATTOM's written guidance makes `AttomID` the authoritative persistent join key. `ParcelNumberRaw` must be retained exactly as returned. `ParcelNumberFormatted` is deprecated for new integration work, and `ParcelNumberAlternate` is supplemental only.

The prior APN9+FIPS failure remains preserved as historical evidence. It is not converted into a successful corroboration and does not invalidate the unique exact-address resolution. Kern `APN9` and `ATN` remain separate immutable source identities.

Historical evidence remains explicit: exact address produced a unique `ExaStr` result; the supplied APN9+FIPS request returned no corroborating property. No APN-format experiment is required for the resolved ATTOM join.

**ATTOM IDENTITY RESOLVED VIA UNIQUE EXACT-ADDRESS MATCH; KERN APN ↔ ATTOM ParcelNumberRaw CORROBORATION NOT REQUIRED AS A BLOCKING GATE.**

## Future integration requirements

Future persistence must keep source identity, ATTOM identity, and canonical-address identity separate:

- `source_system`
- `source_atn`
- `source_apn9`
- `attom_id`
- `attom_parcel_number_raw`
- `canonical_address_id`

Do not use `ParcelNumberFormatted` as a new integration key, do not overwrite Kern identifiers, and do not introduce a migration or adapter until separately authorized.

## Empirical gaps

- **Transfer — arms-length indicator**: API_AVAILABLE_BUT_NULL via saleshistory/expandedhistory. HTTP 200
- **Transfer — grantor/grantee**: API_AVAILABLE_BUT_NULL via saleshistory/expandedhistory. HTTP 200
- **Mortgage — origination/recording date**: API_AVAILABLE_BUT_NULL via property/detailmortgage. HTTP 200
- **Mortgage — 1st/2nd/3rd position**: API_AVAILABLE_BUT_NULL via property/detailmortgage. HTTP 200
- **Mortgage — loan type/term/rate**: API_AVAILABLE_BUT_NULL via property/detailmortgage. HTTP 200
- **Mortgage — amortized/estimated balance**: API_AVAILABLE_BUT_NULL via property/detailmortgage. HTTP 200
- **Foreclosure — NOD/LIS/Pendens**: API_AVAILABLE_BUT_NULL via preforeclosuredetails. HTTP 200
- **Foreclosure — NTS/NOS/auction**: API_AVAILABLE_BUT_NULL via preforeclosuredetails. HTTP 200
- **Foreclosure — default/opening bid**: API_AVAILABLE_BUT_NULL via preforeclosuredetails. HTTP 200
- **Foreclosure — foreclosure/REO**: API_AVAILABLE_BUT_NULL via preforeclosuredetails. HTTP 200
- **Mortgage lifecycle — assignment/release/satisfaction**: NOT_FOUND_IN_CURRENT_API_DOCS via assignment/release. Endpoint not called in controlled budget.
- **Other encumbrances — judgment/tax/mechanic/HOA/PACE**: NOT_FOUND_IN_CURRENT_API_DOCS via lien endpoints. Endpoint not called in controlled budget.

The continuation used only the unique exact-address ExaStr ATTOM ID. ATTOM's current search-parameter documentation states that ATTOM ID is the most accurate property key and that most property endpoints accept it; the Home Equity documentation explicitly describes ATTOM ID as its combining key. A null fixture value is not treated as proof that ATTOM lacks a field. Package denial, endpoint documentation gaps and fixture-null values remain separate.

## API-only boundary

The API can be evaluated for exact-property identity, transfer, mortgage, preforeclosure and home-equity capabilities returned in the matrix. Required mortgage lifecycle and encumbrance completeness cannot be certified until ATTOM confirms endpoint/package coverage and licensed retention/display rights.
