# PI RentCast Stage A — preflight completion

Date: 2026-10-12. Classification: **ADDITIONAL EVIDENCE REQUIRED**. Preparation only; no live request or execution authorization.

## Outcome

The two actual dashboard PNGs and the operator-supplied complete support correspondence are now retained privately, with exact byte hashes. Complete current official terms, pricing, billing and Property Records documentation are also retained. This closes the missing-original-source discovery gap; it does not manufacture a human review, fee ceiling or live approval.

Active-plan and usage facts are visible in the screenshots. The remaining gates are account-specific entitlement/applicable pricing review, bounded endpoint/tax/other charges, human rights/terms review, pilot exclusivity, certified membership acceptance, and a separate dated expiring authorization. The key has not been loaded.

## Evidence and date basis

Private package root: `data/runtime/rentcast-financial-controlled-client-v1/live-stage-a-v1/operator-preflight-completion-2026-10-12/` (called `P` below). All new evidence copies and drafts are gitignored and untracked.

The user identified `source_docs` and reported capture on October 12, 2026 at 2:17 PM, later confirming Los Angeles for all times. Retained metadata preserves the wording “PST (Los Angeles)” and uses `America/Los_Angeles`: daylight-time offset UTC-07:00 on this date. Precision is one minute, not filename-derived seconds. No human review timestamp was supplied or inferred from that capture time.

| Source | Private retained file | SHA-256 |
| --- | --- | --- |
| Billing PNG | `P/billing-original-v2.png` | `c00839575c5e26c165d0a2417c2edbd00a0b014c9656770ae6610f1ea70c1523` |
| Usage PNG | `P/usage-original-v2.png` | `48563fd578cfef21eb3781f98a688f20d21bcb2a0366af0de439a4bc5307c1b7` |
| Complete operator-saved correspondence | `P/correspondence-original-v3.md` | `013a720e3ce3ee93d04ad5b2c82a5014a99b854f9e3780b7a98bf9c2e973bf08` |
| Earlier APN-only correspondence, preserved | `P/apn-followup-original-v2.md` | `b75f9a64d053e981038959ce702b2e13421610e72fe89e3a39ceb417292bf667` |
| Complete current API terms HTML | `P/public-terms.html` | `758a10de6b5d085b8c79c1161b43b991cb63e873f9f5d371aac2b8acabd40d39` |
| Current pricing HTML | `P/public-pricing.html` | `1744272a12efb8976346888feaa967627274e94cc80a6b195ec2c7b1c89ba5d7` |
| Official billing Markdown | `P/public-billing.md` | `1ce9f76a3165deea60a5a800a65938ab99ce0c8603bd79cd0c92e429c7620c65` |
| Official Property Records Markdown | `P/public-property-records.md` | `34692e8564df3588378e29a4cb046069274925f1f0b36fea013d8d62aa99b248` |

Original screenshot paths and exact copied lengths are recorded privately in `image-observations-v3.json`. The assistant visually inspected both files. `image-transcription-v3.txt` is a faithful **unapproved** transcription for human review, not OCR promoted into an operator attestation.

The first email file contained only an identifier follow-up. The operator subsequently replaced that input with the full correspondence; both byte versions were separately retained. The rights/billing message has a displayed sent time of October 9, 2026 at 1:44 PM, interpreted in the user-confirmed Los Angeles zone. It is user-saved original correspondence text, not a native authenticated EML/MSG export. This limitation is recorded without continuing to call the original message missing. The assistant did not edit the source file.

Public originals were retrieved October 12 at 21:19:21–22 UTC; exact retrieval times/URLs are in `public-documents.json`. The billing document displays an August 24, 2026 update timestamp; that is not a contract effective date. No API-terms revision/effective date was established. Earlier missing-source drafts are retained; the `v3` supplements are the current evidence state.

**Privacy warning:** the user-owned originals in `source_docs` are untracked but **not gitignored**. The full correspondence includes contact information. Do not commit that folder. Originals were neither moved nor hidden with new ignore rules during this task; private copies use the already-ignored runtime directory.

## Claim matrix

`PARTIAL` below distinguishes supported source facts from incomplete operational verification. No row is an operator approval. Exact local source paths, hashes, authentic excerpts and date bases are in `claims-v3.private.json`, `source-supplement-v3.json`, and the schema-aligned draft evidence references.

| Claim | Status | Support and remaining limitation |
| --- | --- | --- |
| Active Workside Developer plan | PARTIAL | Actual billing image shows API Developer - Active and $0/month. Account provenance/transcription awaits human attestation. |
| Usage | PARTIAL | Both images show 3/50 at the reported capture; 47 remaining is arithmetic. Billing period 16/30 days; displayed last-week errors 0. No guarantee against later/concurrent usage. |
| Property Records entitlement | PARTIAL | Current general plan documentation includes the same datasets/endpoints; prior success and correspondence establish historical access. Current account-specific applicability has not been independently reviewed. |
| General HTTP-200 billing | VERIFIED | Current official billing documentation and retained correspondence support success-based request billing. Account applicability review remains required; ambiguous/empty 200 responses are conservatively charged against PI's limit. |
| General Developer overage | VERIFIED | Current public rate is $0.20/request with 50 included at $0/month. This is not a new account-specific fee attestation. |
| Bounded endpoint extras | BLOCKED | No defensible account-specific extra-charge upper bound established; absence of a surcharge on a page is not an attested zero. |
| Bounded taxes/other fees | BLOCKED | Governing terms exclude applicable taxes from quoted charges. No account-specific bound is supplied. |
| Rights and terms | PARTIAL | Original correspondence permits retention, combination with county records, commercial SaaS display and investor PDFs. Complete current terms retained; genuine review of governing/third-party qualifications still pending. |
| Pilot exclusivity | UNKNOWN | Fixed registry is empty, but operator exclusivity is not attested. |
| Credential readiness | BLOCKED | Deliberately deferred until the other gates pass; no key load or probe. |

Official general plan/rate support: [RentCast API pricing](https://www.rentcast.io/api), [billing documentation](https://developers.rentcast.io/reference/billing-and-pricing). General product support: [Property Records](https://developers.rentcast.io/reference/property-records). These pages are not an authenticated check of this account.

The terms permit data uses subject to their conditions. Section 3.3 gives applicable third-party licensing priority; section 7 permits continued use of previously lawfully obtained data subject to surviving restrictions and possible legally/licensing-required cessation or deletion. Section 13.5 excludes applicable taxes. Broad support language is not treated as overriding those qualifications. This is an evidence review, not a legal opinion. [Current API terms](https://www.rentcast.io/terms-api).

## Request and budget remain proposed

Only technical ordinal 1 of the original sealed shortlist is contemplated. Seal: `ee8cbc9be5e739d8aa4f4b93f83f1f3aaa0a70fb6a8a1d99fc34511d6538c8f4`. Exact candidate/context/request fingerprints stay private in `request-binding.private.json` and `authorization-for-human-review-v3.txt`.

The proposed request remains one `GET https://api.rentcast.io/v1/properties`, with original county street/city plus jurisdiction-supported CA in the address parameter, and no invented ZIP. Maximum transmissions 1; retries, redirects, pagination, substitution and fallback 0. Every transmission consumes the single attempt, even if billing or outcome is uncertain.

The conservative request reserve stays **$0.20**, with a **$1 all-in ceiling** only after evidence-backed extras are bounded. The $95.80 credit and 47 arithmetically remaining requests do not lower that reserve, establish a vendor cap or authorize spending. RentCast documents that quota overages are not automatically hard-blocked. [Billing controls](https://developers.rentcast.io/reference/billing-and-pricing).

Current private drafts are `account.review-v3.draft.json` and `authorization.review-v3.draft.json`. They use the unchanged `preflight.js` fields. Reviewer, review/approval time and expiry remain unset; independently reviewed claims are unset/false; extras and maximum billable exposure remain null. The account's observed active-plan flag is not an entitlement or review attestation. No draft was copied to active `operator-inputs`; no reservation exists. Do not merely toggle the approval flag: review source/claim bindings and recompute affected hashes together at actual authorization time.

## Membership — proposal only, no certified code edited

The original guard checks all historical hashes and separately compares new Git-visible paths against a hard-coded `NEW_FILES` list. The certified worker invokes it; the engine's certificate pins the guard, paths, worker and engine. There is no detached extension hook for a safe two-document addition. Changing these files would invalidate the original certificate. Therefore the conditional implementation gate in the completion instruction requires stopping with a proposal.

The only two exact document exceptions contemplated by that instruction remain:

| Path | Verified SHA-256 |
| --- | --- |
| `docs/PI_RENTCAST_STAGE_A_OPERATOR_PREFLIGHT_CODEX.md` | `a374ef0bc41294177d493cbe55bd80c0fbab75c43b6b6b63d131a5ecb6a64d06` |
| `docs/PI_RENTCAST_STAGE_A_OPERATOR_PREFLIGHT_REVIEW.md` | `c2a9b0e6a4ff2072f10b9580c290248a6171ab85f1e901c8c601eb25803c3107` |

They do not cover the new completion instruction, the two completion reports, or the three user source files. Those exact additional paths are inventoried privately; no documentation-directory exemption or ignored-file trick was applied.

Proposed next authorization: design a versioned guard/worker/engine/certificate-selection successor with a detached, non-self-referential exact-path/content-hash seal; preserve old versions and every original protected check; separately approve the final additional-document hashes and handling of private user inputs; run full applicable offline recertification and wrong-hash/missing/unrelated-path negative controls. This is **not implemented or authorized as a source transition here**. Preserve the original certificate and manifest; do not edit the old guard in place or broadly rebaseline.

## Validation and remaining actions

Focused offline QA: **19/19 PASS, 0 failed, 0 skipped**; see the companion QA report. **5,593/5,593 pre-existing files unchanged**, with zero unexpected protected modifications. Original 342-test certificate/TAPs, 50 implementation pins and 4,826 historical file hashes were checked rather than represented as newly rerun tests. The unchanged real draft rejection is a required safety result, not live readiness. The original membership guard remains blocked; no successor was implemented.

Before any future request, obtain genuine human review of the actual sources and current entitlement/applicable rate, an evidence-backed endpoint/tax/other-fee bound, applicable rights/third-party terms review and exclusivity attestation. Resolve membership through separately authorized versioning. Then—and only then—obtain the exact dated short-expiry Stage A authorization and separate activation instruction. Credential checks remain deferred. No further screenshots or correspondence are claimed missing; source review is still distinct from supplying files.

Provider-data API requests 0; credential loads 0; reservations 0; active authorizations 0; database connections/writes 0; real Properties/financial analyses 0; MLS selections 0; deployments 0. Public documentation access is separate: **4 direct unauthenticated HTTPS downloads**, all 200 with no redirects/retries, plus **6 web-tool page opens** across 4 public pages (not a claim about the tool's underlying HTTP count). No authenticated dashboard or property-specific endpoint was accessed.

## Final summary

```text
PI RENTCAST STAGE A — PREFLIGHT COMPLETION
Current active plan: PARTIAL (source verified; human review pending)
Property Records entitlement: PARTIAL
Current usage evidence: PARTIAL (source verified; human review pending)
Rate and bounded endpoint/tax/other fees: BLOCKED
Rights and terms: PARTIAL (originals retained; human review pending)
Document-membership integrity: BLOCKED (historical hashes intact)
Stage A operator authorization: NOT ISSUED
Live requests: 0
Reservations: 0
Database connections/writes: 0
Real financial analyses: 0
MLS selections: 0
Unexpected protected changes: 0
QA: 19/19 PASS
Final classification: ADDITIONAL EVIDENCE REQUIRED
```

**STOP FOR STAN/CHATGPT REVIEW.** Stage A, Stage B/C and all real analyses remain unauthorized.
