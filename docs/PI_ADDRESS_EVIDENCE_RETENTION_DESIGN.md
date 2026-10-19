# PI address evidence — retention and durable identity design

**SHARED RETENTION NOT AUTHORIZED**

V1.2 design, October 8, 2026 PDT. This document applies PI's existing POC retention assessment conservatively; it is not legal clearance or a new provider license. No Google terms were re-fetched and no new provider request was made. The previous [IP-P1 assessment](PI_GOOGLE_GEOCODING_IP_P1_POC.md), [three-property assessment](PI_GOOGLE_GEOCODING_THREE_PROPERTY_RESULTS.md) and [V1 controls](PI_ASSISTED_ADDRESS_VERIFICATION_V1.md) document the service-specific terms/policy references and conditional initiating-reviewer context. Their restrictions remain in effect.

## Four distinct records

| Record class | Content and authority | Retention / reuse treatment |
| --- | --- | --- |
| Temporary Google suggestion | Returned address components, precision, partial-match/result metadata, coordinates and related content; not parcel identity | Original allowed reviewer scope/deadline only; no shared canonical cache, investor PDF or source-control copy; preserve attribution while shown |
| County source evidence | Immutable ATN/APN9, exact Assessor relationship, original situs, source row/date/hash and packet fingerprint | Keep under the existing private source/provenance rules; county geography is not postal validation; never overwrite county identities with Google IDs |
| Independent evidence | A separately authorized source or independently documented analyst verification supporting a specific component | Record the actual source, method, date, component coverage, reviewer and applicable rights; permission/availability must be established, not assumed from a typed citation |
| Analyst decision / audit | Outcome, reviewer, timestamp, packet/evidence references, explicit actions and rationale | Historical decision and non-content audit may remain where permitted; embedded provider content and provider-derived rationale still inherit its restrictions |

Receipt time is not a provider-data-as-of date. The source acquisition date is not manufactured. A Google place ID or coordinate is neither a county parcel identity nor a substitute for PI's existing canonical/lineage relationships. The local browser DTO omits both.

## Unchanged original deadlines

| Pilot | Review/deletion deadline (UTC) | PDT |
| --- | --- | --- |
| IP-P1 | 2026-10-10T03:56:46.934Z | October 9, 8:56:46 PM |
| IP-P2 | 2026-10-10T05:17:53.954Z | October 9, 10:17:53 PM |
| IP-P3 | 2026-10-10T05:17:58.763Z | October 9, 10:17:58 PM |

These were local minimization deadlines, not blanket vendor-granted storage rights. No deadline, access grant, original diagnostic or attempt reservation was modified by V1.2. Repackaging content into a reference, accepted draft, screenshot, notes field, history entry or new cache does not restart the clock. Analyst approval grants no additional storage permission.

## Current implementation

The existing gate verifies reviewer scope, recorded retention basis/deadline, original packet hash and diagnostic-byte hash before returning Google content. Attribution identifies **Google Maps** next to the proposal and in the expanded source panel. No remote asset, map, font or tracking request is required. This preserves the prior local display approach; any broader deployment must recheck all applicable attribution requirements.

Component references distinguish `COUNTY_SITUS` from `GOOGLE_TEMPORARY_SUGGESTION`, and retain field-level binding. County citations are assembled only from present source metadata and supplied components. A Google-only ZIP is never described as county-supported or independently verified.

Routine approval requires explicit human component-evidence confirmation plus personal reviewer attestation. Its local decision stores the source metadata, original evidence dependency and deterministic assessment fingerprint. No approved address is copied into a shared canonical record. The detailed path remains an analyst attestation workflow; manually typing a reference is not machine proof of independent source availability. Copying Google text manually and labeling it independent is prohibited, even if technically possible outside the guided actions.

At expiry, permission failure or integrity failure:

1. Stop returning provider content and derived decision fields. Return the existing generic unavailable notice.
2. Classify the review as INSUFFICIENT_EVIDENCE; clear active suggestion-derived browser drafts and pending confirmation state. Do not automatically fetch a replacement.
3. Preserve the historical decision's non-content outcome/reviewer/time and dependency category in the private audit view.
4. Show supporting evidence unavailable/not reusable and local effectiveness SUSPENDED for a Google-dependent decision. Do not present historical APPROVED as current canonical effectiveness.
5. Require separately authorized independent evidence or a genuinely applicable permission before operational reuse. The ordinary save path cannot silently remove an expired binding.

The browser also hides suggestion panels on backgrounding, rechecks locally on return, polls local evidence while visible and uses a conservative expiry timer. Saving rechecks the server gate. These are loopback operations, not new Geocoding calls.

## Proposed durable evidence model — design only

Use logical evidence references attached to the **existing** canonical/decision model, not a new Property identity architecture. Before any future persistence implementation, specify at least:

- Source system and actual source-record reference, immutable county ATN/APN9 and existing Assessor/canonical relationships.
- Packet fingerprint, evidence fingerprint and explicit component coverage.
- Evidence origin: county, temporary provider suggestion, separately acquired independent evidence, or analyst attestation about a named source.
- Source as-of, acquisition/receipt time and freshness limitations, with unknowns preserved.
- Permitted purpose, reviewer scope, shared-use permission basis/reference, expiration and content-cleanup status.
- Content location/access controls separated from non-content audit metadata; hashes/reference IDs do not themselves grant retention permission.
- Analyst outcome, reviewer, timestamp, rationale and exact evidence dependencies, including independent versus temporary support for each component.

Suggested operational checks must answer separately: **historical decision exists**, **support currently available**, **reuse permitted**, and **existing canonical identity operationally effective or suspended**. A canonical record could be effective only with sufficient currently permitted evidence, genuine analyst confirmation and PI's existing exact identity/conflict/lineage checks under separate persistence authority. A historical decision alone is insufficient. Google-only expired support suspends dependent use; independently supported components may be assessed on their own authorized evidence without laundering the provider copy.

V1.2 implements only local source metadata, audit presentation and suspension of bound review decisions. It does not implement independent-evidence acquisition/re-certification, a durable evidence table, migration, database state transition or permanent canonical persistence. The UI explicitly reports that no canonical identity is created or activated here.

## Cleanup responsibilities

Display blocking is not deletion and does not extend lawful retention. Stan must review restricted content by the existing deadlines under the existing retention plan. Inventory diagnostic content and any future Google-derived local draft/decision/history copies; distinguish independently sourced county values from copied provider content. Remove or restrict content as required by the applicable permission, while preserving permitted non-content audit records and consumption/reservation records. Do not delete historical decisions indiscriminately or erase reservations to reopen a request budget.

No automatic cleanup job or real decision/history rewrite was authorized or performed here. A future cleanup tool needs separate scoped authorization, exact targets, a content-versus-audit inventory and verification that no request allowance is reset. Do not claim that retaining unreadable/hidden expired files indefinitely is compliant.

## Unresolved permission questions / gates

- Confirm the applicable account terms and whether the intended business workflow fits the previously assessed conditional end-user use.
- Establish permission for any multi-reviewer, server-side shared canonical database, investor portal/PDF or longer-lived field reuse; no such permission is assumed.
- Determine permitted retention of copied address components, derived notes and decision history versus non-content audit hashes and timestamps.
- Establish what evidence makes a component genuinely independent and how that evidence's separate licensing/privacy rules are recorded.
- Recheck attribution for the actual future presentation medium and obtain appropriate vendor/legal review before changing scope.

Until these are resolved for the intended use: **SHARED RETENTION NOT AUTHORIZED**. No new permission can be manufactured by an analyst checkbox, wrapper record or routine classification.

**STOP FOR STAN/CHATGPT REVIEW.** This is design and local enforcement, not authority to persist real Properties or acquire more evidence.
