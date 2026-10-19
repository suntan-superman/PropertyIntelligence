# PI RentCast Stage A — operator preflight preparation

Date: 2026-10-12. **ADDITIONAL EVIDENCE REQUIRED.** This is preparation for human review, not approval, activation or acquisition. Stage A was not executed.

## Result and scope

The historical offline certificate remains intact: **342/342 PASS**, zero failures/skips/cancellations, with all **50 pinned implementation files** and the **4,826 historical protected files** unchanged. The original candidate, county source and sealed shortlist passed the unchanged read-only inspection. No new regression run is represented here; the prior certificate/TAP bytes were checked, and certified implementation was not edited.

The new private package is at `data/runtime/rentcast-financial-controlled-client-v1/live-stage-a-v1/operator-review-draft/`. It contains unapproved schema-aligned account and authorization drafts, an eleven-claim matrix, exact retained-source excerpts, SHA-256 provenance, a private exact request binding, and preservation/validation artifacts. Neither `operator-inputs/account.json` nor `operator-inputs/authorization.json` was created.

The existing inspector additionally reports `ERR_ASSERTION`: the new operator-preflight instruction document is outside its original immutable new-file membership list. The requested review report adds another such path. This is a **current inspection/certificate acceptance blocker**, separate from the unchanged historical PASS certificate and missing account evidence. No guard, manifest, certificate, allowlist, test or source hash was changed to make it pass.

## Retained evidence inventory

Search was confined to project documentation and RentCast-related retained local evidence, plus the exact original authorization attachment referenced by the retained authorization record. Filename discovery did not locate original dashboard images or a full terms snapshot in those locations. No unrelated personal folders, browser sessions, account login, credentials or live documentation were accessed. Synthetic QA documents were excluded as account evidence. No provider payloads were mined for account claims.

| Source | Retained evidence and provenance | Limitation |
| --- | --- | --- |
| S1 `historical-plan` | Original user-supplied controlled-pilot authorization, section 3; reference recorded `2026-10-09T20:55:00.197Z`; exact original file SHA verified | Describes Developer, $0/month, 50 included and $0.20 overage; earlier usage 0/50. Not the original screenshot or a current authenticated account observation |
| S2 `historical-rights-authorization` | Same original authorization, section 2; private verbatim excerpt of the user's permission summary | User-attested summary, not the original Cindy Bellford email |
| S3 `vendor-summary` | `data/runtime/rentcast-controlled-pilot/vendor-confirmation-2026-10-09.json`; preserved conversation summary, date 2026-10-09 | Email receipt date derives from Stan's report; exact incoming time/message ID absent. Wording is a retained summary, not a reconstructed vendor quote |
| S4 `reported-usage` | Exact paragraph from the prior Stage A report dated 2026-10-12 | Reports 3/50 used and 47 remaining. Original screenshot and exact observation timestamp not locally available; no fresh balance attestation |
| S5 `public-review` | Exact contiguous excerpt from `docs/PI_REAL_FINANCIAL_EVIDENCE_PROVIDER_MATRIX.md` | Earlier public terms/billing/pricing review and citations, not retained full source pages or authenticated account evidence. Current terms version/retrieval date unknown |

Exact excerpt text, original path, original/source hash, excerpt hash, source date/basis and absent human-review timestamp are recorded together in `claim-matrix.private.json`. The excerpts are private; no claim that a summarized sentence is Cindy's verbatim original has been made. No new vendor email, invoice or billing statement was fabricated.

| Source | Original file SHA-256 | Private excerpt SHA-256 |
| --- | --- | --- |
| S1 | `67ce02c7b02ef2a74f118ed98ff814bceccc4c7e14f65da023f228979d8d2dfc` | `be2911c5130d3f95545636bce0cb8a03513c5667c3c4971b5367a2e6de62571f` |
| S2 | `67ce02c7b02ef2a74f118ed98ff814bceccc4c7e14f65da023f228979d8d2dfc` | `f660879861351d55c2e3fcc884a9e30224df549092af65a29752888c54ec361e` |
| S3 | `890a21a8d28df258ea6326ca00c41cf7f14af18d59aec1e545044b5dece06993` | `890a21a8d28df258ea6326ca00c41cf7f14af18d59aec1e545044b5dece06993` |
| S4 | `ca1f83666afefaf3589ad73ed933354bcb16d62728d3fad743dade6ef900e953` | `14d7388d1e1cabbd07d8b3e3eab75cade1987e248ae56c7ebf6c5baa7103bfe8` |
| S5 | `d7f437dbefe3d7f4ccbd6ba25aa13c1b24e9626c8db51aafc8ed4c22ccaf47c8` | `fb3596220f384208dd7d57f2d84df3de843214060cb6a82ebcef8a028c27898c` |

## Claim matrix — current facts versus historical support

Every row still requires actual human review. No reviewer identity or review time was invented. Prior dates are source dates only; they do not satisfy the current 24-hour review window.

| Required claim | Current verified value | Available support | What it does not establish / required action |
| --- | --- | --- | --- |
| Active Workside Developer plan | UNKNOWN | S1: historical Developer/$0 statement | Provide current redacted authenticated plan/account status |
| Property Records entitlement | UNKNOWN | S5: general product availability; earlier pilot success | Public capability and prior access are not current Workside entitlement; provide account-specific confirmation |
| Usage/balance | UNKNOWN; reported 3/50 used, 47 remaining | S4 dated report | Supply original redacted dashboard capture and exact observation time; acknowledge concurrent-use uncertainty |
| HTTP-200-only billing | UNKNOWN as current applicable account fact | S3 historical support statement; S5 public review | Review currently applicable billing contract, including ambiguous/empty 200 outcomes |
| Maximum overage rate | UNKNOWN; historical $0.20 | S1/S5 | Current account rate must be verified at no more than $0.20 per HTTP-200 request |
| Additional endpoint charge maximum | UNKNOWN | S5 says no separate public surcharge was found | Absence in a historical public review is not evidence of zero; obtain a defensible upper bound |
| Tax/other-charge maximum | UNKNOWN | No retained bounded-charge evidence | **Cost gate BLOCKED**; do not write zero or invent a maximum |
| Private retention/workflow/commercial rights | Historically documented; current review pending | S2/S3 cover identifiers/address/provenance, county combination, SaaS and investor PDFs; S5 notes governing terms | Supply original correspondence/full applicable terms for review; retain legal/third-party qualifications. Summary is not a legal override |
| Pilot exclusivity | UNKNOWN | Fixed live registry observed empty | Reviewer must confirm no competing run; empty registry alone is not that attestation |
| Other account usage | UNKNOWN | No current account observation beyond S4 | Record uncertainty; included quota is never credited against the fee reservation |
| Active server key availability/status | UNKNOWN / not inspected | No key loaded or tested | Provide only redacted account-status evidence now. Actual server-side key checks belong to separately authorized later preflight; never paste a key |

## Draft contract and request binding

`account.draft.json` and `authorization.draft.json` use the fields actually consumed by `scripts/rentcast-live-stage-a-v1/preflight.js`. They contain no extra approval-state fields masquerading as a schema extension. Draft state is declared separately in the filename, private README and request-binding summary.

- Account `reviewer`, `reviewedAt`, `expiresAt` and usage `observedAt` are null. Current entitlement flags and bounded extra charges remain null; `verifiedUpperBound`, `pilotExclusive` and `thirdPartyReviewed` are false.
- Historical plan/usage/rate/billing values are visible for review, **not** human-confirmed. Each evidence reference points to real private excerpt bytes/hash and a supporting exact quote, while `independentlyReviewed` is false and reviewer/time/confirmed claims are null.
- Authorization `explicitExecutionAuthorized` is false. Reviewer, actual approval time, expiry, written-authorization quote/hash and maximum all-in exposure are incomplete. No signature or attestation was created for Stan.
- Binding is to technical ordinal 1, unchanged shortlist seal, exact private candidate/context/request fingerprints from `inspect`, and the original offline certificate. Request is only `GET https://api.rentcast.io/v1/properties`, with its source-backed address parameter and no invented ZIP.
- One attempt, zero retries/redirects/pagination/fallbacks; fixed private registry; 20-cent conservative request-fee reservation; $1.00 ceiling conditional on verified bounded extras. The drafts do not permit Stage B/C or any approval, Property creation, database operation, financial analysis, MLS activity or deployment.
- The account fingerprint binds **this unapproved draft**, not future edited evidence. After an actual review, all affected claim/evidence/account/authorization hashes must be recomputed and reviewed together in a separately authorized task. Do not copy these records into active inputs or merely toggle approval flags.

The real contract requires review observations within 24 hours, readable `.txt`/`.json` excerpts with exact source quotes/hashes, matching confirmed claims, a future expiry and authorization validity beyond the 15-second request deadline. It does not provide cryptographic vendor authentication or create authority from locally populated fields.

## Exact human actions still needed

1. Supply the original redacted 3/50 dashboard image and original Developer-plan screenshot if available. Add a current account/product status capture and its actual timestamp. Mask all keys/tokens, account contact details and unrelated information. Images require faithful transcription and human review; none was auto-converted or invented here.
2. Confirm the currently applicable HTTP-200 rate, endpoint fees and a defensible tax/other-charge upper bound from account-specific pricing/billing evidence. If those cannot be bounded, leave the cost gate blocked; do not rely on the 47 reported included requests.
3. Supply/save the original Cindy correspondence, including available date metadata, plus the currently applicable complete API terms/billing text. Review private retention/commercial use and legal/third-party qualifications; historical summaries are supporting evidence, not substitutes for missing originals.
4. Confirm pilot exclusivity and state any uncertainty about other account usage. Review the private exact subject/request binding without publishing its identifiers.
5. Resolve the **separate documentation-membership blocker** through an explicitly reviewed narrow procedure before any future live execution. This preparation does not authorize changing certified guards or baselines, and proposes no wildcard exception.
6. Only after evidence review, provide Stan's explicit dated, short-expiry authorization for the exact request and limits. A separate instruction must authorize activation and any single live transmission. Do not sign, timestamp or extend approval on Stan's behalf.

## Validation and preservation

The preparation snapshot fingerprints **5,573 pre-existing files**, including the 4,826 historical protected files, later certified Stage A implementation/reports/runtime evidence, and this task's instruction file. Aggregate SHA-256: `ad0bc457c0cc33a13950c819053114762acaa51721ec83033c3d2c332043649d`. This snapshot is new private evidence, not a replacement historical baseline.

The first unchanged read-only inspection returned source seal PASS and blockers `ERR_ASSERTION` plus `OPERATOR_REVIEW_RECORDS_MISSING_OR_INVALID`. All original pinned hashes match; the membership difference is exactly the new instruction path (and, after creation, this requested report). The implementation and historical evidence have not drifted. No exemption is applied by this task's artifact validator to the live gate.

Purpose-built local validation completed: **13/13 checks PASS** for unapproved preparation, **5,573/5,573 pre-existing files unchanged**, no protected modifications. It verified exact draft schema keys, source/excerpt bytes and hashes, candidate/request bindings, pending approval fields, unknown-cost handling, empty active inputs/registry, ignored/untracked storage, privacy and offline counters. The unchanged preflight deliberately rejected the draft with `CURRENT_ACCOUNT_REVIEW_STOP`; this rejection is required, not a failed certification to bypass.

The subsequent unchanged `inspect` again returned source seal PASS and both blockers. The exact membership additions are only `docs/PI_RENTCAST_STAGE_A_OPERATOR_PREFLIGHT_CODEX.md` and `docs/PI_RENTCAST_STAGE_A_OPERATOR_PREFLIGHT_REVIEW.md`. No new source drift was found or accepted. The private `validation.json` preserves these results and fingerprints the report draft present at validation; `final-handoff.json` separately fingerprints this final report without rewriting that validation artifact.

No broad regression suite was rerun because certified code is unchanged. The existing 342-test result remains historical, not newly executed. Draft fields are structurally present but deliberately incomplete as approved operator records: **PARTIAL**, not ready for activation.

Provider requests, dashboard logins, credential loads, database connections/writes, Stage A reservations, active authorizations, real Properties, financial analyses, MLS selections and deployments: **0**. No live executor was invoked.

Final classification: **ADDITIONAL EVIDENCE REQUIRED**.

**STOP FOR STAN/CHATGPT REVIEW.** Drafts are not live authorization.
