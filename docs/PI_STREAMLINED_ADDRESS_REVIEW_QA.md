# PI streamlined address review V1.2 — QA

**READY FOR HUMAN REVIEW**

October 8, 2026 PDT / October 9 UTC. Existing Node **v20.19.4** and installed Playwright/Chromium; no dependency installation, runtime change or download. All saves, corruption/expiry experiments and screenshots are **synthetic**. Actual pilot packets/evidence were read locally only; all three real decisions remain unreviewed.

## Automated results

**105/105 unit/regression tests PASS; 0 failed, 0 skipped.** This is 68 original review/identity/canonical/lineage/harness/persistence checks + 14 V1 suggestion checks + 23 new V1.2 checks. Repeated runs are not added to the unique test count.

| Required behavior | Result and evidence |
| --- | --- |
| Routine classification | PASS — derived from current evidence; changing the pilot code alone does not determine the tier |
| Acreage exception | PASS — quality flag alone blocks routine review |
| Suffix exception | PASS — unresolved `CI`/`Circle/Cir` remains an exception even with acreage flag removed in synthetic assessment |
| Missing ZIP | PASS — insufficient evidence, no invented component |
| Expiry / tampering | PASS — no reusable proposal or provider references; pinned diagnostic and packet gate retained |
| Exact Assessor relationship | PASS — exact/unique flags, source row and relationship identifier required |
| Identity conflicts / duplicates | PASS — canonical conflict, inactive/existing linked identity or duplicate registry representation blocks routine/loads as appropriate |
| Multiple results / partial / precision | PASS — multiple results, true/malformed partial-match or lower precision cannot be routine; absence remains distinct from false |
| Source-specific references | PASS — county situs versus temporary Google distinguished per field; absent county ZIP is not given a county citation |
| No fabricated evidence | PASS — missing source metadata cannot generate a fictional county reference; actual row/date/hash binding checked |
| Explicit human approval | PASS — selected outcome, explicit group component review and personal attestation required; no default approval |
| Server validation | PASS — fresh tier recomputation, injected component rejection, bound suggestion, correct reviewer/packet/revision and existing validator |
| Exception controls | PASS — detailed component controls, changed-address explanation, contradiction assessment and acreage acknowledgment/notes retained |
| No durable Google conversion | PASS — local review scope only, no canonical/Property persistence method, separate persistence authority null |
| Historical decisions | PASS — synthetic approval remains in audit after expiry; derived fields hidden, effectiveness suspended, file bytes unchanged |
| Independent references | PASS — manual citations do not falsely establish independently revalidated availability or retention rights |
| No duplicate Property creation | PASS — no Property/canonical creation route or store method; existing lineage/conflict regressions remain green |
| No provider / database access | PASS — existing outbound blocker, credential-free QA worker and network accounting; database cases use existing synthetic/mocked tests |

## Browser results

New Playwright certification completed **2026-10-09T05:59:21.957Z**. All required **1440px desktop / 768px tablet / 390px mobile** checks pass:

- Compact routine controls with no repetitive reference entry or preselected approval.
- Expandable supporting evidence, source-specific citations and long-address wrapping.
- Visible exception suffix/acreage warnings and detailed controls.
- Explicit compact validation/save/reopen using synthetic data; group attestation resets after save; notes preserved.
- Opening detailed controls switches modes and clears pending confirmation.
- Forged compact API request for an exception rejected by the server.
- No horizontal overflow, overlapping action buttons, unexpected page/console errors or external browser requests.
- Unavailable evidence cannot be reused; historical approval remains auditable as suspended without modifying its artifact.
- Lock clears private comparison/audit display; no localStorage/sessionStorage.

The previous browser regressions also pass: original reviewer (68-test prerequisite) and V1 suggestion expiry/integrity/security suite. The V1 script now explicitly expands supporting evidence when testing its previously always-visible panel and checks the clarified suffix labels. No assertion was removed to accommodate the compact layout. One new browser run initially reported Chromium's expected HTTP-error console entry for submitting an unchecked confirmation; the UI now explains that missing acknowledgment locally before a request. Independent API tests still verify the server rejection. Final runs report zero console/page errors.

## Local machine-readable artifacts

- [V1.2 browser summary](../data/runtime/identity-review-qa/synthetic-44rcRH/streamlined-ui-qa.json)
- [Sanitized certification / preservation summary](../data/runtime/identity-review-qa/synthetic-44rcRH/streamlined-certification-summary.json)
- [Original review regression](../data/runtime/identity-review-qa/synthetic-uTrafB/human-review-qa.json)
- [V1 suggestion regression](../data/runtime/identity-review-qa/synthetic-AXbpLB/suggestion-ui-qa.json)

All are local/gitignored. Browser fixtures use deliberately artificial addresses, source identifiers and evidence; no real Google/address/parcel content was used for screenshots. Screenshots are prominently labeled synthetic, not extra provider evidence.

| View | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Routine | [1440px](../data/runtime/identity-review-qa/synthetic-44rcRH/routine-desktop.png) | [768px](../data/runtime/identity-review-qa/synthetic-44rcRH/routine-tablet.png) | [390px](../data/runtime/identity-review-qa/synthetic-44rcRH/routine-mobile.png) |
| Supporting evidence | [1440px](../data/runtime/identity-review-qa/synthetic-44rcRH/supporting-evidence-desktop.png) | [768px](../data/runtime/identity-review-qa/synthetic-44rcRH/supporting-evidence-tablet.png) | [390px](../data/runtime/identity-review-qa/synthetic-44rcRH/supporting-evidence-mobile.png) |
| Exception | [1440px](../data/runtime/identity-review-qa/synthetic-44rcRH/exception-desktop.png) | [768px](../data/runtime/identity-review-qa/synthetic-44rcRH/exception-tablet.png) | [390px](../data/runtime/identity-review-qa/synthetic-44rcRH/exception-mobile.png) |

[Suspended decision with preserved historical audit](../data/runtime/identity-review-qa/synthetic-44rcRH/suspended-history-desktop.png).

## Reproduce offline

```powershell
node --import ./src/analysis/offline.js --test scripts/identity-resolution-pilot/review.test.js scripts/identity-resolution-pilot/suggestion.test.js scripts/identity-resolution-pilot/streamlined.test.js scripts/identity-resolution-pilot/pilot.test.js scripts/mls-validation-round1/gate1b-identity-audit.test.js scripts/mls-validation-round1/harness.test.js scripts/sprint6_3_1/address.test.js scripts/sprint6_3_3/linkage.test.js tests/persistence.test.js
node scripts/identity-resolution-pilot/review-ui-qa.js
node scripts/identity-resolution-pilot/suggestion-ui-qa.js
node scripts/identity-resolution-pilot/streamlined-ui-qa.js
```

Real-data checks accept fail-closed insufficient evidence after original deadlines pass. They do not renew evidence. Synthetic tests independently verify the successful routine path, exceptions, expiry and saved history. Browser workers use ephemeral loopback ports and close at completion; no existing port-4318 listener is stopped or altered.

## Accounting and boundaries

| Activity | Result |
| --- | ---: |
| Actual analyst approvals / real decisions changed | **0 / 0** |
| New Google / other provider calls | **0 / 0** |
| Database connections / reads / writes | **0 / 0 / 0** |
| Canonical resolutions / Properties created | **0 / 0** |
| Round 1 properties selected / MLS access | **0 / 0** |
| Production changes / deployments | **0 / 0** |
| Final V1.2 browser loopback requests | **27** |
| Final original reviewer / V1 suggestion browser loopback requests | **30 / 19** |
| External browser requests / server outbound attempts | **0 / 0** |

Loopback counts refer to those successful runs, not every local QA iteration. File writes are confined to authorized local reviewer code/documentation and synthetic QA artifacts; no real packet/decision/evidence/access grant was rewritten. The 270-file pre-change snapshot protects application/configuration/environment, raw pilot evidence and reservations, decisions, exclusions, Round 1 flags and historical protected baselines. No blanket re-baselining or production audit was performed.

Final check at **2026-10-09T06:02:29.919Z**: **270/270 protected files unchanged**, zero mismatches. Privacy scan of 17 edited/new code/document files against actual private pilot address/parcel/candidate/Assessor values and API-key patterns found **zero matching files**. No credential or actual private field value was printed in the scan.

This certifies a local evidence-review workflow, not postal deliverability, parcel identity, shared retention rights or production readiness. **SHARED RETENTION NOT AUTHORIZED**. The original evidence deadlines and cleanup responsibility remain; see [retention design](PI_ADDRESS_EVIDENCE_RETENTION_DESIGN.md).

**READY FOR HUMAN REVIEW. STOP FOR STAN/CHATGPT REVIEW.**
