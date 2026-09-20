# Sprint 6 Opportunity Model

Sprint 6 models a public distress record as an investigation candidate, not as canonical Property evidence. The imported Kern source is `KERN_POWER_TO_SELL`; its rows retain raw and normalized payloads, source row/page, source edition and a SHA-256 file hash.

## Identity boundary

The audited CSV contains an `atn` but no `apn`, address, situs, parcel geometry, owner address or property characteristics. ATN is normalized for comparison only. An exact stable identifier may group source rows from the same source edition; owner name and similar addresses are never merge keys. Missing identifiers create an unresolved row candidate. Conflicting identifier hints remain ambiguous/STOP and are not silently merged.

Candidates begin `PARTIAL` / `NEEDS_ADDRESS` when an ATN is present but no address is supplied. A candidate becomes `RESOLVED` / `READY_FOR_ENRICHMENT` only after an analyst supplies a complete address and provenance. Canonical Property, Evidence, Deal and Acquisition Decision links are explicit and retain the source candidate.

## Queue statuses

`NEW`, `REVIEWING`, `NEEDS_ADDRESS`, `READY_FOR_ENRICHMENT`, `ENRICHED`, `DEAL_CREATED`, `DEFERRED`, `REJECTED`, and `ARCHIVED` are operational states. `REJECTED` is not an investment conclusion; it removes a record from the current investigation queue with an audited reason.

## Future-source adapter boundary

Future sources implement `normalizeSourceRecord()`, `candidateIdentityHints()` and `deriveSignals()` against only fields actually supplied. Assessor, GIS, legal-notice and title integrations are not part of Sprint 6.
