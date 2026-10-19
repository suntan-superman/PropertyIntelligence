# PI identity pilot — local human review

**READY FOR HUMAN REVIEW — STREAMLINED V1.2**

Completed 2026-10-08 PDT. This standalone local interface reviews the three existing private packets. It is not part of PI's production app and cannot create canonical resolutions, durable Properties, lineage or database records. No real analyst decisions were made during development or QA.

Streamlined Address Review V1.2 builds on the private Google suggestion panel without making **any new lookup**. See [V1.2 workflow](PI_STREAMLINED_ADDRESS_REVIEW_V1_2.md), [retention design](PI_ADDRESS_EVIDENCE_RETENTION_DESIGN.md) and [QA / synthetic screenshots](PI_STREAMLINED_ADDRESS_REVIEW_QA.md). IP-P3's `CI` versus `Circle/Cir` remains unresolved; no candidate is automatically approved. Original V1 behavior/results remain documented historically.

## Launch

In a local PowerShell terminal:

```powershell
Set-Location C:\Users\sjroy\Source\PropertyIntelligence
node scripts/identity-resolution-pilot/review-server.js --reviewer "Stan Roy"
```

Open **http://127.0.0.1:4318/** in a browser on the same computer. Copy the private access code printed in that terminal into the login form. The code is generated for each process, retained only in memory, and expires when the process stops or after eight hours. Do not share the code, publish the terminal output, use a network tunnel, or bind a public proxy to this interface.

Use the actual authorized reviewer's name in the launch command. The server binds that identity to saves; the reviewer must explicitly attest that they personally performed the review. This is a single-user, trusted-local-machine tool, not organizational SSO or independent identity verification. Protect the Windows account and private filesystem from other users. Someone who can already edit these local files is outside this access-control boundary.

The existing Google evidence is scoped specifically to the initiating reviewer, **Stan Roy**, in a private access manifest. Another reviewer name does not grant access to that content. Do not change that manifest to extend deadlines or expand reuse. The server does not read the Google API key.

Leave the terminal open while reviewing. Stop with **Ctrl+C**. If port 4318 is occupied, stop the previous local review process; the tool does not silently switch to another address or port. No dependency installation, `.env` loading, database provisioning or configuration change is required.

## Review workflow

The local evidence assessment first chooses **Routine address review**, **Exception review**, or **Insufficient evidence**. It does not decide approval. While the original evidence remains permitted, IP-P2 qualifies for routine review; IP-P1/IP-P3 require exceptions. Outcomes are derived from evidence, not hard-coded by pilot code. Expiration makes any affected case insufficient evidence.

For **routine review**, inspect the proposed address and summary; expand **View supporting evidence** as needed. Explicitly confirm review of all component evidence, choose **Confirm address evidence**, and personally attest before saving. Source references and existing components are assembled server-side; retyping them is unnecessary. Needs more evidence/Reject require notes. No checkbox or approval is preselected. **Detailed component review** switches back to individual controls and clears the pending approval/attestation.

For **exception review**, follow the detailed workflow below. The acreage flag and any unresolved suffix disagreement remain separate obligations. For insufficient evidence, no expired provider content is displayed or reusable, and Verify Address stays disabled.

1. Select IP-P1, IP-P2 or IP-P3. Read the private county identifiers, raw situs, official Assessor classification, source dates and canonical status.
2. Review the highlighted missing components. Street/city are unverified county prefill. State and ZIP start blank; no values are automatically inferred or populated.
3. Inspect **Suggested Address — Google Geocoding** if its original retention and integrity gates still pass. **Use suggested components** copies only a draft, leaves every component unverified and clears the selected decision/attestation. **Review differences** compares the county evidence without resolving discrepancies. **Needs more evidence** selects that draft outcome but does not save it. Otherwise enter components manually with supporting evidence. References are plain text: the interface does not open links, geocode, fetch a document or contact a provider.
4. Explicitly mark each component verified, unverified or contradictory. Assess whether any identity/address contradiction remains. Explain supported changes to the county street/city prefill.
5. For IP-P1 and IP-P3, acknowledge the prominent acreage-discrepancy flag and enter acreage-review notes. The flag alone does not force rejection.
6. Check the assembled source references, supply any additional supporting evidence and review notes, choose a decision, and personally acknowledge the review. No decision is selected by default. References reflect actual county/provider metadata and retain their source distinctions.
7. Optionally choose **Validate without saving**, then **Save local decision**. An explicit success message gives the decision and UTC timestamp and confirms that no Property/database record was created.

Do not put owner names, borrower details, phone numbers, email addresses, credentials or other unnecessary personal information in references or notes. No owner/contact fields are sourced from the packets or provided by this interface.

### Decision rules

| Decision | Required conditions |
| --- | --- |
| APPROVED | Complete canonical-validator-compatible address; evidence reference and explicit verification for all four components; no unresolved contradictions; state consistent with the county identity; documented street/city changes; authorized reviewer attestation, supporting references, notes and applicable acreage acknowledgment/notes |
| NEEDS_MORE_EVIDENCE | Reviewer attestation, evidence reviewed/gaps, notes and applicable acreage acknowledgment/notes; components may remain incomplete or unverified |
| REJECTED | Reviewer attestation, supporting references, rejection notes and applicable acreage acknowledgment/notes; components may remain incomplete or unverified |

Allowing incomplete components for non-approval decisions is intentional: missing evidence must be recordable without inventing a confirmed address. Such a record is **not** a confirmed canonical identity. All approval requirements are validated on the server, not just in browser controls.

Routine review uses an explicit group component-evidence attestation to satisfy the same component verification rules; provider return alone does not. Its server-recomputed tier, assembled references and existing validator prevent a client from bypassing exception requirements. Optional confirmation notes default only to an accurate record of that explicit action. The compact mode never supplies fictional document references or independently sources a Google-only component.

The existing `providerReadyAddress` / `validateCanonicalAddress` implementation supplies format validation. Format validity is not postal validation, proof that a document exists, or independent corroboration of the reviewer’s evidence. The reviewer is responsible for that assessment; the UI does not manufacture verification.

Google address matching does not verify county parcel identity. State/country were jurisdiction-supported request constraints; a returned ZIP is a proposal, not a county-verified ZIP. The absence of Google's `partial_match` field is displayed as **Not returned**, not as an explicit false.

### Suggestion expiration

Original review deadlines are unchanged: IP-P1 **October 9, 2026, 8:56 PM PDT**; IP-P2/P3 approximately **October 9, 2026, 10:17 PM PDT**. Exact UTC deadlines are in the V1 report. Once expired, tampered, unscoped or no longer packet-compatible, the panel says: **Previous address suggestion unavailable. New verification requires separate authorization.** The disabled **Verify Address** button cannot issue a replacement request.

Open-tab expiration clears suggestion-derived drafts and verification state. Saved decisions made using the suggestion actions carry its packet/evidence binding; if reuse becomes unavailable, the server hides their derived fields and makes the prior decision ineffective. A bound decision cannot silently drop that binding or be overwritten through ordinary save after expiry. Independent-evidence reconciliation then needs review; do not edit hashes/deadlines to bypass it. Local expiry blocks display/reuse, not filesystem retention: Stan must separately review/delete restricted content, including any derived decision history, under the existing retention plan. Attempt reservations must remain intact.

V1.2's **Historical decision audit** keeps the prior outcome/reviewer/time visible separately from current support availability, reuse permission and effectiveness. Google-dependent expiry means SUSPENDED, not deletion of history. Independently typed references are not claimed to have revalidated availability/retention rights. No canonical identity is created or activated. **SHARED RETENTION NOT AUTHORIZED** remains the policy for Google-derived canonical reuse.

## Private persistence and packet integrity

The only real decision-write targets are the three existing gitignored files:

```text
data/runtime/identity-resolution-pilot/IP-P1-analyst-decision.json
data/runtime/identity-resolution-pilot/IP-P2-analyst-decision.json
data/runtime/identity-resolution-pilot/IP-P3-analyst-decision.json
```

Each save records the review code, packet SHA-256, named reviewer, server-captured UTC review/save time, confirmed or partial components, component evidence/verification, general references, decision, notes, contradiction assessment and applicable acreage acknowledgment. Prior decision contents are retained in `history` inside the same artifact. A temporary same-directory file is atomically renamed over the decision file; raw packets, source evidence and exclusions are not overwritten.

Every read verifies the packet's content fingerprint and its exact relationship to the permanent pilot-exclusion registry. Every save also requires the current packet fingerprint and decision-file revision. A stale browser tab cannot silently overwrite a newer decision. Concurrent saves within the local server are serialized per review code.

If a packet changes with a new valid fingerprint, the saved decision remains historical but is no longer effective for that packet. The UI shows a stale warning, clears the selected outcome and resets verification/acknowledgment controls. A malformed/tampered fingerprint or mismatched registry identity fails closed. The server rechecks packet and decision revision immediately before replacement. Do not run multiple writers or manually edit a decision while the server is saving.

Reloading/reopening a saved decision preserves its content. Fresh personal attestation is required for another save. Browser storage is not used; reloading requires the access code again. **Lock review** clears the in-memory key and private displayed content; unsaved edits require an explicit discard before navigation/locking.

`APPROVED` in this local artifact does not authorize persistence elsewhere. `separateIsolatedPersistenceAuthorization` remains null. No apply operation, migration, database connection or Property-creation action exists here. The original pilot persistence gate and Round 1 authorization remain closed.

## Local security boundary

- Listener fixed to `127.0.0.1:4318`; nonloopback peers and unexpected Host headers are rejected.
- A random 256-bit per-launch access code is required for every private API request. It is not embedded in a URL, cookie, browser storage, saved file or request log.
- Failed-code attempts are rate-limited; sessions expire after eight hours.
- Saves and validation requests require exact same-origin headers and JSON content type. Cross-origin/cross-site requests are rejected; no CORS is enabled.
- Strict CSP, frame denial, no-referrer and no-store headers; local-only assets and system fonts; no third-party scripts, maps, analytics or geocoding.
- The API allows only the three review codes and explicit DTO fields. No arbitrary filesystem route, `.env` access, raw-packet download or directory listing is provided. Private files must be gitignored, untracked and nonsymlinked.
- Server entry loads the existing offline network blocker. Outbound HTTP(S), fetch, socket and TLS connection attempts are disabled. Inbound loopback browser traffic is the deliberate exception needed to use the local interface.
- No changes to production routes, Vite entry points, Netlify, packages, application code, migrations, scoring, monitoring or report generation. This code lives only under `scripts/identity-resolution-pilot/`; it is not imported by the production entry points.

Do not describe local browser HTTP as zero network activity: the certification recorded loopback requests separately. No external/provider/database traffic occurred.

## Original workflow QA and limits

Run the reproducible offline/synthetic UI certification:

```powershell
node scripts/identity-resolution-pilot/review-ui-qa.js
```

It reads the three actual packets and decisions without changing them, then exercises saves exclusively in a new gitignored synthetic directory. It uses the already-installed local Playwright/Chromium; it does not download a browser or install dependencies. A missing local browser is a QA prerequisite failure, not permission to install one.

Original workflow coverage: **68/68 unit/regression tests PASS, 0 failed, 0 skipped**, rerun successfully for this extension. The combined V1 suite adds 14 evidence-gate tests for **82/82 PASS**. Current browser results and screenshots are in the [V1 QA report](PI_ASSISTED_ADDRESS_VERIFICATION_QA.md). Original checks include:

- Three actual packets load, with missing state/ZIP highlighted in synthetic browser coverage.
- Approval rejects missing/contradictory/unverified components and missing evidence.
- Acreage acknowledgment and notes are required without forcing rejection.
- Reviewer identity, personal attestation and correct packet fingerprint are required.
- Validate-only leaves files unchanged; synthetic save/reopen preserves decision content.
- Stale revisions cannot overwrite newer decisions; prior decision history is retained.
- Changed packet fingerprints invalidate prior approval, with stale UI state reset.
- Host/origin/cross-site/content-type/access-code controls and denial of raw-file routes pass.
- Desktop (1440px) and mobile (390px) rendering were visually inspected; no horizontal overflow or script errors.
- Actual packets/decisions, pilot exclusions, Round 1 flags and selection code, application configuration and historical protected baselines remain unchanged.

The gitignored QA run directory contains `human-review-qa.json` and synthetic desktop/mobile screenshots. All approving test decisions refer to synthetic records, never the real pilot candidates.

| Accounting | Result |
| --- | ---: |
| Real packets read | 3 |
| Real analyst decisions written during QA | 0 |
| Local browser requests in latest original-workflow rerun | 27 |
| External browser requests | 0 |
| Server outbound connection attempts | 0 |
| Database connections / production writes | 0 / 0 |
| Provider calls / MLS access | 0 / 0 |
| Real Properties / canonical resolutions created | 0 / 0 |
| Round 1 properties selected | 0 |

No source acquisition date was invented; absent acquisition dates display “Not established.” Existing canonical/Property status remains an as-of source-snapshot fact. Future persistence still requires separately authorized human-approved evidence, fresh conflict checks and a verified isolated environment.

## Stop

**READY FOR HUMAN REVIEW.** V1.2 passed 105/105 unit/regression tests and desktop/tablet/mobile browser QA. The local review interface and evidence gates are complete. QA closed its own servers and did not stop an existing listener. Restart the local review process with the command above to load this revision.

**STOP FOR STAN/CHATGPT REVIEW.** No analyst decisions made on the reviewer’s behalf, no real Property persistence and no Round 1 selection.
