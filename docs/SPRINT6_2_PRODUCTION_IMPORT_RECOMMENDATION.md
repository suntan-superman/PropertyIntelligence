# Sprint 6.2 — future minimal import recommendation

Certified offline on 2026-09-23.

## Decision

**GO for next-step minimal-import design review; NO-GO for any production import/execution in this POC.** Evidence supports exact source ATN → land APN9 → geometry for 11,263 candidates, but only 1,270 usable situs and no proven KIPS/history recovery. Do not turn successful parcel identification into an address-resolution, enrichment or production-update claim.

| Priority | Proposed fields | Evidence / constraint |
| --- | --- | --- |
| REQUIRED | source edition/date, ZIP/member SHA, raw source row locator/fingerprint | Immutable provenance and replay identity; retain full source privately. |
| REQUIRED | raw/normalized ATN, APN9, crosswalk status and reason | ATN 426,054 unique; APN9 repeated in land. Never merge assessment entities silently. |
| REQUIRED | raw county situs plus presence/malformed/unproven status | Preserve unknown; only 1,270 current candidates have usable land situs. Not geocoded/postally certified. |
| REQUIRED | official use code + description + domain edition | County classification, not inferred physical condition or current occupancy. |
| USEFUL | research use category + mapping version/reason | Conservative mappings must remain distinct from official codes and unknowns. |
| USEFUL | LAND_VAL, IMP_VAL, NET_VAL, BASEYR_VAL + source/null/zero states | Assessment-only namespace; BASEYR_VAL absent for 8,130 exact candidates. Never market value. |
| USEFUL | raw ACRES + explicit-zero/availability state | 6,860 exact candidate rows carry zero; not evidence of zero-sized land. |
| USEFUL | geometry presence + source-edition APN9 link/status | 11,263 exact geometry matches; no production geometry import authorized. |
| OPTIONAL | county shape-area diagnostic metrics | Retain separate from roll acreage; no overwrites or derived boundary authority. |
| OPTIONAL | legal-description presence; full legal description only with later justified need | County-wide populated 426,007; not an identity match key or title proof. |
| OPTIONAL | documented history chain and KIPS fallback provenance | Only after explicit key/relationship evidence; retain branches and STOP ambiguity. |
| DO_NOT_IMPORT | assessee/owner names, billing/care-of/DBA/contact fields | Unneeded for this parcel-resolution use case; no identity, scoring or outreach use. |
| DO_NOT_IMPORT | full raw Access roll, entire FileGDB, polygons, every county column | README explicitly warns raw Access will not join properly; minimal scope first. |
| DO_NOT_IMPORT | market-value/equity/mortgage/lien/condition/motivation guesses | Not established by this source or POC. |

## Future design gates, not implementation

Preserve original source/member hashes, record locators, field-level raw values and null/zero states. Model assessment ATN and parcel APN9 separately; APN9 is nonunique in land. Keep editions immutable and import replays idempotent. Preserve every conflicting source row; quarantine 53 unmatched candidates and uncertain mappings. A new import would need its own reviewed schema/migration authority, dry-run reconciliation, rollback/replay certification and explicit production approval. None is authorized or executed here.

Obtain offline county documentation for the TE_NO relationship and conversion; independently establish any ATN-to-history-APN bridge. Do not infer bridges from shared names, similar digits, nearest timestamps or approximate attributes. Expand abbreviated use-code mappings only with authoritative definitions. Do not contact county services in this task.

## Performance evidence

| Measurement | Observed |
| --- | --- |
| zipAuditExtractMs | 5757.90 ms |
| dbfLoadProfileMs | 2707.05 ms |
| atnJoinMs | 16.39 ms |
| kipsAuditMs | 175.55 ms |
| kipsFallbackMs | 0.00 ms |
| historyAuditFallbackMs | 801.51 ms |
| geometryLoadJoinMs | 669.86 ms |
| totalRunMs | 5979.88 ms |
| processPeakRssBytes | 511156224 bytes (487.5 MiB) |

DBF processing uses 4 MiB record-aligned batches and keeps candidate land rows only; profile ID counters and whole SHP/SHX presence checks contribute to peak memory. ZIP audit/extraction is a separate phase, so totalRunMs excludes that earlier phase. KIPS fallback time is zero because no fallback executed; KIPS audit is measured separately. Future ETL can stream SHP record headers, use bounded ATN/APN indexes and parameterized batches in a separately approved importer. Do not ship this audit/cache or raw county files to Functions/browser bundles. No premature runtime integration.

## Future v2 research

Future kern-screen-v2 **research only**: evaluate official residential-use support, improvement-assessment positive/zero/missing, explicit vacant-use support, source situs presence and exact geometry availability. Separate confidence/completeness from review priority; preserve v1 scores and historical editions. Zero IMP_VAL with positive LAND_VAL occurs in 10433 exact candidates (114 High), but is only a land-only **assessment** pattern, not proof of vacant land or no building. Never treat assessed value as market value or combine it with tax amounts to infer equity, mortgages, other liens, condition or seller motivation. No new score/weights implemented.

No Supabase connection or write; no migration (including 004); no source import; no production opportunity/status/address changes; no scoring, runtime, UI, PDF or analytical changes; no deployment; no RentCast, Google, county, GIS, title or other network calls. No inferred equity, mortgage, liens, physical condition, seller motivation or investment suitability. No geocoding. Provider calls = **0**.

**STOP — await review.**

County data: Kern County Assessor, 2026 Final. Internal research only. Retain the accompanying [county disclaimer](SPRINT6_2_SOURCE_DISCLAIMER.md) with any copy or extract. No warranty of legal boundaries, ownership, completeness or postal deliverability.
