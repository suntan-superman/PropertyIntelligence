# Sprint 6.3.2 — Opportunity Detail UX

Status: `PREVIEW CERTIFIED — OPPORTUNITY DETAIL UX OPERATIONAL`

Production status: `PRODUCTION CERTIFIED — OPPORTUNITY DETAIL SCREENING UX OPERATIONAL` (deploy `6ab54f6d6d9373c4b938bec4`)

## Scope and root cause

This was a read-only presentation patch. The existing `View` request already reached the candidate-detail endpoint, but the result was rendered as an inline article below a paginated table. The action therefore appeared inert when the user was scrolled in the queue. It also lacked a clear loading/error surface and keyboard focus lifecycle.

`View` now opens a right-side desktop drawer and a full-width mobile sheet. The queue, filters, pagination, sort and scroll state stay mounted. Closing or pressing Escape returns focus to the originating button. The resolver and Analyze Property actions remain separate existing workflows; opening detail itself performs no mutation and no provider request.

## Read-only detail contract

`safeOpportunityDetail` in `src/persistence/assessorOpportunityRepository.js` is an explicit allowlist. It exposes candidate identity, score/status, safe Power-to-Sell records/signals, a distress summary (amount, source, edition/date/page), safe Assessor evidence, canonical-address summary and linkage counts/statuses. `getCandidate` adds only a read-only linked-deal count. The router never spreads a raw candidate, discovery record, Assessor row or provenance object.

The drawer presents:

- screening distress signal, priority, score and Kern Power-to-Sell source;
- PTS ATN, Assessor ATN, APN9, crosswalk, official County Use Code/Description and separately labeled PI Research Category;
- land/improvement/net/base-year assessments with the required tax-roll/not-market-value warning;
- county/shape acreage, square feet, geometry and the acreage-difference warning;
- immutable County Situs and separately labeled canonical-address status/source/confirmation;
- Property, Deal and canonical-address linkage plus collapsed data-quality notes.

Null remains Unknown/Not available; explicit zero remains zero. No ZIP inference, polygons, owner/contact/assessee/billing data, raw provider payload, filesystem/source paths or database material is returned.

## Protected boundaries

No migration, schema write, import, score/status/rule change, provider call, CSV expansion, Property/Deal creation, KIPS/history/MAO/report change or background enrichment was added. Existing `Analyze Property` confirmation and address-resolution gates are unchanged.
