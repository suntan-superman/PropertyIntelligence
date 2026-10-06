# DataTree UAT Gap Analysis

## Evaluation status

The corrected UAT property host is reachable and the Swagger contract is available. The POC nevertheless stopped before property-data evaluation because the `PropertySearch` filter names/operators and numeric search-type meanings are not defined by Swagger and no authoritative request example was supplied. Consequently, no capability gap can be classified as proven, absent, or provider-specific.

The written entitlement list establishes access to Enhanced Transaction History, Transaction History, TotalView, Last Transfer/Finance Document, Foreclosure, HOA Contact/HOA Lien, Specific Document, Flex Search, Property Status Indicator, and related products. Open Lien and PACE are not claimed because the written correction explicitly excludes treating earlier screenshot-only appearances as authoritative. These are package-access indications only; they are not evidence of returned fixture records or field availability.

## ATTOM comparison status

The following are **NOT TESTED** against DataTree in this run:

- Exact property identity resolution
- February 2025 transaction corroboration
- Mortgage and loan-position corroboration
- Estimated mortgage balance comparison
- Mortgage lifecycle (assignments/releases/reconveyances)
- Foreclosure/default evidence
- Open liens and lien categories
- Recorded-document and title-chain coverage

The existing ATTOM findings remain unchanged. No DataTree result was used to reinterpret them.

## Key blocker

The authoritative property UAT host is `dtapiuat.datatree.com`; it resolved and Swagger returned HTTP 200. DataTree authentication passed. The remaining blocker is contract ambiguity in `PropertySearch`, not networking or credentials.

## Required clarification from First American

Please provide the exact property-data UAT base URL, Swagger/OpenAPI URL, supported authentication method for that product, and confirmation that the supplied client is entitled to address/APN and report endpoints. Do not send secrets in email or chat.

