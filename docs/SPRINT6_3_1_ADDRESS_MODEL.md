# Sprint 6.3.1 Address Model

`candidate_address_resolutions` is an additive, candidate-scoped address layer. It never rewrites `opportunity_assessor_enrichments.situs_raw`, the Kern source row, screening fields, or historical Property/Evidence/Analysis/Decision records.

Each confirmed row stores normalized street, city, two-letter state, ZIP-5, optional ZIP+4, and a deterministic formatted address together with source/method, confirmation, version, and idempotency metadata. No provider response payload is stored. A partial unique index permits one active confirmed row per candidate. Corrections supersede the prior row; the prior version remains readable and immutable.

Address precedence for a provider action is: active analyst/provider-confirmed canonical row, complete linked Property identity, complete county situs, then the manual resolver. Incomplete county situs never receives an inferred ZIP. `ANALYST / MANUAL_EXTERNAL_LOOKUP` is the source label for manual lookup; it is not presented as Google verification.

The canonical layer is intentionally separate from county evidence. UI labels retain `County situs` and `Canonical address · Analyst confirmed` as distinct facts. Automatic address resolution is deferred.
