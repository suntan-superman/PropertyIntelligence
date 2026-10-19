# RentCast Reconciliation V1.1 — Remaining Gaps

2026-10-09. **MORE DEVELOPMENT REQUIRED**.

## 1. Certification blocker: historical protected baseline

The new strategy passes 40 focused tests and the real three-record offline replay, but the existing regression suite passes only 124/125. `scripts/sprint6_2/poc.test.js` stops on an `App.jsx` fingerprint mismatch against its historical baseline. The current hash was already present before this task, and the file is unchanged afterward.

Stan/ChatGPT must review this separately and authorize any narrow correction or baseline reconciliation if the older change is legitimate. No baseline change is implied by this report. Do not blindly accept current hashes, skip the test or weaken protection. The first failure may mask additional baseline discrepancies; those have not been audited here.

## 2. RC-P2: historical relationship is not current identity

The exact documented APN lookup succeeds, retrieves the stored APN9 and reaches the unique expected land assessment. This explains the historical identifier-format discrepancy in a new versioned result. It does not verify current activity, absence of splits/merges, title, ownership or boundaries.

Current identity freshness remains `CURRENT_IDENTITY_FRESHNESS_UNVERIFIED`. A blank historical inactivation field and recent RentCast retrieval are not substitutes for current authoritative county evidence. No suitable independently authorized current evidence was found in this scope. Routine eligibility and persistence remain false; no human approval was created.

Before a later approval/persistence stage: resolve current identity freshness under an explicitly authorized evidence policy, present the source-bound result to the authorized reviewer, require the existing contradiction/component checks, and obtain separate persistence authorization. Do not automatically advance RC-P2 based on this implementation.

## 3. RC-P1 and RC-P3: ATN clarification remains required

Their provider values match observed county ATNs after formatting removal, not the documented eight-digit APN field. Rule C deliberately rejects them. Obtain authoritative county ATN definitions and RentCast's explanation for mixed identifier representations before considering a separate rule. No ATN-to-APN formula or equivalence was enabled.

RC-P1 additionally retains the `AV` / `Ave` suffix discrepancy. Obtain documented equivalence or explicit supporting human-review evidence; no suffix mapping was added. Address agreement must never replace parcel evidence.

## 4. Review and integration remain separate

The existing human-review interface is still scoped to the original IP pilots. This sprint produced versioned reconciliation artifacts, not a new approval route, regenerated packet or expanded UI. A future narrowly authorized adapter would need to show historical/current states separately, bind to the new reconciliation fingerprint and preserve the original source/decision history.

Production integration, database writes, migrations, provider refreshes, real-property creation, Round 1 selection and deployment remain outside authorization. The 2026 source's multi-ATN groups remain hard uniqueness failures, not an invitation to select one assessment.

## Recommended next action

Review the single observed regression blocker and the new result contract. No additional acquisition or broad identity redesign is needed to demonstrate this historical Rule C lookup. Any further baseline investigation, freshness evidence collection, review-interface adaptation or persistence stage requires separate direction.

Original evidence and classifications are preserved; no calls, approvals or real-property writes occurred. **STOP FOR STAN/CHATGPT REVIEW.**
