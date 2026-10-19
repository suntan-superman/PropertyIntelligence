# PI V1.5.2 — Workspace Cleanup and Smart Address Resolution

**Status:** Implemented and certified locally; no permanent deletion, production deployment, database access or live provider call.  
**Local URL:** [http://127.0.0.1:4177/#home](http://127.0.0.1:4177/#home)

## Workspace cleanup

- Normal deal management is now under **My Workspace → Deals**.
- Confirmed QA scenarios are excluded from ordinary deal lists, search, reports and the ordinary investment-workspace saved-scenario list.
- Classification requires explicit evidence: `demonstration=true`, a `GABE-*` subject, a QA/fixture/synthetic marker, or explicit QA source metadata. Merely living in a QA output directory is not enough.
- The local **Developer / QA archive** exposes confirmed fixtures separately. No record is deleted, moved or rewritten.
- Property Detail no longer offers GABE fixtures in its ordinary subject selector. A direct historical QA link still opens its exact subject and labels it as Developer / QA.
- The repeated legacy Saved Deals list was removed from the analysis screen and replaced with a link to My Workspace.

The dry run inspected 77 local scenario revision files and selected 58 latest records. All 58 carry explicit QA evidence; the default ordinary scenario store contains zero records. Each record, source path, classification reason, revision, evidence fingerprint and analysis/report dependency is listed in the private generated artifacts:

- [Dry-run report](../data/runtime/discovery-v1-5-2/cleanup-hBNGkO/cleanup-dry-run.md)
- [Machine-readable inventory](../data/runtime/discovery-v1-5-2/cleanup-hBNGkO/cleanup-dry-run.json)

This inventory covers the local filesystem scenario stores used by the V1.2–V1.5.2 workspace. No Supabase/production deal table was queried or changed.

## Smart address resolution

- County street and city prepopulate the review form; state defaults to California only because the record is bound to the Kern County source jurisdiction.
- **Find Address with Google** calls a server-side adapter only. The API key is never returned to the browser, written to evidence, or logged.
- Google and county evidence remain separate cards. The normalized result includes formatted address, street number, route, city, state, ZIP, country, `place_id`, coordinates, partial-match status and precision.
- One-click preliminary acceptance requires exactly one candidate, matching street number/route/city, California and US agreement, a returned ZIP, no partial-match flag, and `ROOFTOP` or `RANGE_INTERPOLATED` precision.
- Ambiguous results require correction or rejection. A reviewer can accept, correct or reject without creating a canonical identity or durable Property.
- No-situs parcels never invoke Google. They open parcel-location research with the retained ATN, APN9 and geometry status instead of inventing a street.
- Identical lookups use a short-lived in-memory cache; the cache is process-local and retains no raw response on disk.
- The adapter uses one request, zero retries, redirects disabled, an eight-second timeout and at most three displayed candidates.

Live Geocoding remains disabled in the running local app. The live-capable server path requires an explicit operator start flag plus the existing server-only key:

```powershell
node --env-file=.env scripts/workbench-server.js --investment --property-detail --google-geocoding --port 4177
```

Before using that command, independently confirm that the intended lookup is authorized under the current Google account, quota, billing and retention terms. V1.5.2 did not perform that account check or transmit a request.

## QA

| Check | Result |
| --- | --- |
| V1.5.2 focused unit tests | **5/5 PASS** |
| V1.5.2 browser/workspace/address checks | **14/14 PASS** |
| V1.5.1 desktop compatibility | **21/21 PASS** |
| V1.5 discovery/PDF workflow | **38/38 PASS** |
| Complete regression selection | **372/372 PASS**, 0 skipped |
| Production build | **PASS**; local workspace remains excluded |
| Mocked Google transmissions | **2**: one exact candidate and one ambiguous lookup |
| Duplicate exact lookup | **Cache hit; no additional transmission** |
| Live provider calls | **0** |
| Database connections/writes | **0 / 0** |
| Records deleted | **0** |

Final QA evidence:

- [V1.5.2 QA results](../data/runtime/discovery-v1-5-2/qa-3xCKzN/qa-results.json)
- [Workspace QA archive](../data/runtime/discovery-v1-5-2/qa-3xCKzN/01-workspace-qa-cleanup-1280.png)
- [Exact Google suggestion](../data/runtime/discovery-v1-5-2/qa-3xCKzN/02-google-address-suggestion-1600.png)
- [No-situs parcel research](../data/runtime/discovery-v1-5-2/qa-3xCKzN/03-no-situs-parcel-research-1280.png)
- [Complete regression result](../data/runtime/investment-workspace-v1/regressions-Yas0Hv/results.json)
- [Discovery/PDF result](../data/runtime/discovery-v1-5/qa-N8MAjG/qa-results.json)

The Ridgecrest `1240 S CHINA LAKE BL` normalization, a Bakersfield county-situs candidate, an ambiguous two-result response, a no-situs ATN/APN parcel, legitimate saved work and explicit QA fixtures are covered. Source evidence, identity decisions, saved scenario bytes, MAO, Monte Carlo and report calculations were not changed.

## Stop boundary

No permanent cleanup, production database operation, live Google call or deployment was performed. Permanent deletion and production activation remain review decisions.
