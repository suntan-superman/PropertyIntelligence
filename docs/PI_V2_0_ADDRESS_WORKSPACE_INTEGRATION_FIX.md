# PI V2.0 — Address Lookup and Workspace Integration Fix

Date: 2026-10-15

## Result

The retained Crestview research subject is now reachable through both `1708 Crestview Dr, Bakersfield, CA 93305` and `1708 Crestview Drive, Bakersfield, CA 93305`. Haven remains a durable saved Property; Crestview remains preliminary research and is not promoted into the durable Property collection.

## Root causes

1. The old lookup removed punctuation and spaces but did not canonicalize routine street suffixes. `DRIVE` and `DR` therefore produced different keys.
2. The Analyze Property handoff used the discovery model's nonexistent `fingerprint` field as a fallback, producing `snapshot=undefined` for preliminary subjects that did not carry their fingerprint directly.
3. Scenario cleanup treated every `GABE-*` subject reference as QA, even when the scenario was authentic user-created work with no QA marker.
4. My Workspace deliberately restricted its ordinary property list to durable records and had no separate retained-research view. Report previews/downloads also had no browser-side reference registry.

## Changes

- Added exact canonical address matching for common suffixes, punctuation, capitalization, California naming and five-/nine-digit ZIP formatting.
- Kept house number, street tokens, city and state exact. No edit-distance or other fuzzy identity merge is used.
- When one established retained subject and a separate county index row share the exact normalized situs, PI opens the established subject and explicitly reports that the county row remains separate.
- Bound each preliminary research subject to its original evidence fingerprint.
- Added four workspace views: Saved Properties, Analyses / Deals, Research and Reports.
- Classified QA from explicit demonstration, naming, note or source-purpose markers—not from the subject reference alone.
- Added local report references bound to scenario ID, revision, subject and evidence fingerprint.
- Added a default-deny `Research New Property` action. It displays the expected one RentCast request, $0.20 conservative exposure and zero-retry policy before execution. The local general-property executor remains disabled, and this change made no provider request.

## Verification

- Focused Node tests: 89/89 passed, 0 skipped.
- Address/workspace browser QA: 18 checks passed.
- Existing navigation browser QA: 14 checks passed; four PDFs generated.
- Existing discovery desktop QA: 21 checks passed.
- Production Vite build: passed.
- Provider calls: 0.
- Database connections/writes: 0.
- Production changes/deployment: 0.

Browser evidence is stored under `data/runtime/pi-v2-address-workspace/qa-j3U5dO/`.

## Live runtime follow-up — 2026-10-15

The listener on port 4175 had started at 09:08:36, before the retained-subject source and address index were updated after 12:40. Vite was serving the current browser modules, but the Node process still held the older startup-time investment evidence object. GABE-01 was present, but it lacked `subjectKind`, `addressComponents` and its per-record `evidenceFingerprint`. The exact Crestview address also exists as a separate `KERN-PILOT-024` county index row, so the stale shape made the two records appear ambiguous instead of preferring the retained preliminary subject.

The running browser then exposed a second handoff defect: when a stale subject lacked its per-record fingerprint, Analyze Property used the discovery bootstrap's nonexistent fingerprint and generated `snapshot=undefined`. The fallback now uses `evidenceFingerprint` from the investment bootstrap—the collection that owns GABE-01.

Compatibility is intentionally narrow. A startup-time record is recognized as retained preliminary research only when it has all of the retained revision reference, valuation reference, review timestamp and the explicit `Reviewed preliminary address` identity status. An unrelated or unknown record is not promoted. The county index row remains a separately reported related match.

Follow-up verification:

- Focused address/workspace plus related property, scenario and report tests: 113/113 passed, 0 skipped.
- Complete address/workspace browser QA: 18 checks passed.
- Existing port-4175 browser verification: 7 checks passed for `Drive`, `Dr`, ZIP+4 normalization, exact GABE-01 opening and identity preservation.
- Production Vite build: passed.
- Provider calls transmitted: 0. The live browser harness blocked the configured Google Maps script before transmission.
- Database writes: 0.

Current live-server evidence is stored under `data/runtime/pi-v2-address-workspace/running-server-20261015/`; the complete fresh-server QA is under `data/runtime/pi-v2-address-workspace/qa-mubCgN/`.

## Local launch

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/workbench-server.js --investment --property-detail --port 4175
```

Open `http://127.0.0.1:4175/#analyze-property`.

