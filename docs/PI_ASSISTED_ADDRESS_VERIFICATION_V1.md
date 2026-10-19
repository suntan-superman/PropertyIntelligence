# PI assisted address verification V1

**READY FOR HUMAN ADDRESS REVIEW**

Historical V1 report. The current local workflow is [Streamlined Review V1.2](PI_STREAMLINED_ADDRESS_REVIEW_V1_2.md), which adds evidence-derived tiers, assembled references and a non-content historical-decision audit without changing original retention deadlines.

Completed October 8, 2026 PDT / October 9 UTC. Local implementation and offline QA only. No new Google request, other provider call, database connection, real analyst decision, canonical resolution, Property creation or deployment occurred.

## Launch and review

```powershell
Set-Location C:\Users\sjroy\Source\PropertyIntelligence
node scripts/identity-resolution-pilot/review-server.js --reviewer "Stan Roy"
```

Open **http://127.0.0.1:4318/** on the same computer and enter the private per-launch access code from the terminal. Do not share that code, expose a tunnel or publish the terminal. Stop with Ctrl+C. No installation, `.env` load or production server is needed. The existing access-code/Host/Origin controls and outbound-network blocker remain in effect.

At handoff, port 4318 is occupied by a pre-existing Node process started before this task. It was not stopped or modified. Identify and stop that listener in its existing terminal before launching this revision; merely refreshing an older running process does not reload its server modules/assets. QA used separate ephemeral loopback ports and closed its own servers.

The small **Suggested Address — Google Geocoding** panel compares county situs and proposed components, with Google Maps attribution, precision, local match classification, differences, retrieval time and the original review deadline. It explicitly states: **Google address matching does not verify county parcel identity.** No map, remote font, image, analytics or third-party browser request is used.

| Pilot | Stored classification | Required human review |
| --- | --- | --- |
| IP-P1 | EXACT ADDRESS CANDIDATE | Verify components and parcel relationship; retain acreage review |
| IP-P2 | EXACT ADDRESS CANDIDATE | Verify components and parcel relationship |
| IP-P3 | PARTIAL/AMBIGUOUS | Resolve county `CI` versus Google `Circle/Cir` with evidence; retain acreage review |

All three original responses have one result and rooftop precision. A missing `partial_match` field is **Not returned**. PI's IP-P3 classification is not a Google partial-match flag. State/country were jurisdiction-supported request constraints; the returned state agrees with jurisdiction evidence, but ZIP was absent from county evidence. No field is analyst-verified by this panel.

- **Use suggested components:** explicitly copies available values into the draft; resets component verification, selected decision and reviewer attestation. Does not save or approve.
- **Review differences:** highlights component differences and missing county components; IP-P3's suffix warning is already visible. No automatic suffix normalization.
- **Needs more evidence:** selects that draft outcome and unresolved assessment, requiring the existing notes, references, acreage controls and personal attestation before an explicit local save.
- **Verify Address:** disabled, with no executable live-lookup handler. An attempted POST to the suggestion resource is denied; no `/verify` route exists.

The existing canonical validator and analyst decision model are reused. There is no new identity engine, shared address cache or production route.

## Evidence and retention boundary

Before returning any Google-derived content, the server requires a single matching initiating-reviewer grant, its original allowed retention basis/scope and deadline, the exact current packet hash, and the independently pinned SHA-256 of the original diagnostic bytes. It also verifies the retained diagnostic's original retention restrictions, timestamp, one-result success and request constraints. Missing, malformed, expired, changed, tracked or symlinked evidence fails closed.

The private gitignored `data/runtime/identity-resolution-pilot/google-review-access.json` pins the existing diagnostics for **Stan Roy** under this local-review authorization. It contains hashes and scope/retention metadata, not copied Google addresses or new provider content. It is not regenerated on launch. It is a trusted-local-filesystem control, not a signed authority or SSO: the reviewer label and local access code do not protect against an attacker who already controls the Windows account/files.

The permitted-basis marker documents the existing conditional end-user review context; it does not establish a new license, override Google's terms or grant shared/permanent retention. The prior POC's retention assessment remains applicable. No evidence deadline or reservation was changed.

| Pilot | Original deadline, UTC | Local deadline, PDT |
| --- | --- | --- |
| IP-P1 | 2026-10-10T03:56:46.934Z | October 9, 8:56:46 PM |
| IP-P2 | 2026-10-10T05:17:53.954Z | October 9, 10:17:53 PM |
| IP-P3 | 2026-10-10T05:17:58.763Z | October 9, 10:17:58 PM |

Any failed gate returns only:

> Previous address suggestion unavailable. New verification requires separate authorization.

The browser rechecks the **local** evidence before suggestion actions, every 30 seconds while visible, and on return to the tab. A conservative expiry timer clears displayed suggestion content and any bound draft; returning from a background tab hides content until rechecked. These are loopback reads, not Google refreshes. Server save/validation also recheck the gate, including immediately before replacing a local decision.

Suggestion actions bind subsequent local decisions to the pilot/packet/evidence hashes. Reopening cannot bypass expiry through saved components or notes: unavailable bound content is redacted and the prior decision becomes ineffective. The binding cannot be silently dropped. After expiration an ordinary save of that bound decision is blocked; independent-source reconciliation requires review, not fabricated hashes or a renewed deadline. Google-derived copies made manually outside this workflow remain the reviewer's responsibility and must not be used to evade retention.

**Retention operations remain separate:** this implementation blocks display and reuse; it does not silently delete original evidence or decision history. Stan must perform the existing review/deletion process for restricted content, including any future Google-derived local decisions/history. Preserve non-content attempt reservations/accounting so expiry or cleanup cannot reset the request budget. Approval does not remove Google's use/retention restrictions. No Google-derived content should enter shared canonical records, public reports, investor PDFs or source control.

## Implementation scope

| Local file | Change |
| --- | --- |
| `scripts/identity-resolution-pilot/google-suggestion.js` | Read-only integrity/retention/scope gate and explicit minimal DTO |
| `review-store.js`, `review-model.js` in that directory | Optional suggestion evidence binding; existing approval checks retained; expired bound-decision redaction |
| `review-http.js` | Authenticated local suggestion GET; explicit denial of suggestion writes; local CSS asset |
| `review-ui/index.html`, `review-ui/review.js`, `review-ui/suggestion.css` | Small panel, draft actions, differences, expiry and disabled future action |
| `suggestion-fixtures.js`, `suggestion.test.js`, `suggestion-ui-qa.js` | Synthetic fixtures, evidence-gate tests, browser/security/expiry QA and screenshots |
| `review-ui-qa.js` | Preservation enumeration recognizes existing evidence subdirectories instead of attempting to hash directories as files |

The DTO excludes coordinates, place IDs, raw payloads, owner/contact fields, credentials and filesystem paths. County evidence remains in its existing private interface; no real addresses or parcel identifiers appear in these reports or screenshots. Existing production app/configuration/dependencies, historical baselines, raw diagnostics, reservations, review packets, decisions, exclusions and Round 1 flags remain unchanged.

## Future lookup requirements — documentation only

Separately authorized work would need a server-only use of `GOOGLE_GEOCODING_API_KEY`, registered pilot identity checks, explicit reviewer confirmation, durable request reservation/budgets, double-click and restart deduplication, no automatic retries, and complete request/source provenance. It must prevent arbitrary public address lookup and re-evaluate permitted use/retention. No such dispatcher, key loading, budget reset or activation was implemented here.

## Certification and stop

**82/82 offline tests PASS, 0 skipped**, plus passing original and added synthetic browser/security QA. All **269** captured protected-file hashes match the pre-change snapshot. New provider calls, database access/writes, real analyst approvals and production changes: **0**. [Detailed QA and screenshots](PI_ASSISTED_ADDRESS_VERIFICATION_QA.md).

**READY FOR HUMAN ADDRESS REVIEW. STOP FOR STAN/CHATGPT REVIEW.** No analyst decision has been made on Stan's behalf. No further request, persistence or Round 1 selection is authorized by this implementation.
