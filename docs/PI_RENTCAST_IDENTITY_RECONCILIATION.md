# RentCast Pilot V1 — Identity Reconciliation

Date: 2026-10-09. **PARTIAL COVERAGE — HUMAN REVIEW REQUIRED**.

All three lookups returned a unique record and complete address, but **0/3** met the county APN9 reconciliation requirement. All remain unresolved. `APN_CONFLICT` here means the required APN9 comparison failed; it does not prove that the returned property is a different physical parcel.

## Source identity rules

County ATN, county APN9, candidate ID, Assessor source identity and external RentCast ID are distinct string fields. Source identifiers and leading zeros were preserved. RentCast ID was not used as a PI canonical Property ID.

For comparison only, permit spaces/hyphens to be removed from a provider APN string, then apply the existing Kern nine-digit APN validator. No numeric coercion, truncation, reordering, padding, guessed check digit or fuzzy/address-string property linkage is allowed. Require returned Kern/California context and noncontradictory FIPS fields. A formatting-only normalization is not an authorization to substitute ATN for APN9.

## Empirical identity findings

| Metric | RC-P1 | RC-P2 | RC-P3 |
| --- | --- | --- | --- |
| HTTP / candidate count | 200 / 1 | 200 / 1 | 200 / 1 |
| Provider ID present and unique across pilot | Yes | Yes | Yes |
| County APN9 length | 9 | 9 | 9 |
| Provider parcel digits after spaces/hyphens only | 11 | 8 | 11 |
| Provider representation equals county APN9 | No | No | No |
| Provider representation equals county ATN after spaces/hyphens only | Yes | No | Yes |
| Returned county/state/FIPS context agrees | Yes | Yes | Yes |
| Property type agrees with county SFR classification | Yes | Yes | Yes |
| Match classification | APN_CONFLICT | APN_CONFLICT | APN_CONFLICT |
| Tier | EXCEPTION_REVIEW_REQUIRED | EXCEPTION_REVIEW_REQUIRED | EXCEPTION_REVIEW_REQUIRED |

RC-P1 and RC-P3 exhibit an ATN-shaped provider representation. That observation is preserved as a diagnostic relationship, **not** accepted as APN9 corroboration. RC-P2's eight-digit representation is not a valid APN9; even a hypothetical single leading zero would not make it equal to the county APN9. No identifier was padded, truncated, converted to a number or repaired. Vendor/county interpretation is required before changing any equivalence rule.

## Address findings

| Check | RC-P1 | RC-P2 | RC-P3 |
| --- | --- | --- | --- |
| Street number | Agrees | Agrees | Agrees |
| Street name and suffix under existing comparison | Review required | Agrees | Agrees |
| City / state | Agree | Agree | Agree |
| ZIP-5 returned and format-valid | Yes | Yes | Yes |
| Unit discrepancy | None observed | None observed | None observed |
| Formatted address consistent with returned components | Yes | Yes | Yes |
| Existing canonical validator accepts component format | Yes | Yes | Yes |

RC-P1 differs only in the terminal `AV` / `Ave` street suffix. The existing RentCast comparison maps `AVENUE` to `AVE`, but does not map `AV`. That comparison was not broadened for this pilot; the difference remains visible for review. RC-P2 and RC-P3 passed the address-component comparison. A suffix review alone cannot cure the separate APN conflict.

County street/city are original source evidence. California is jurisdiction-supported source evidence used in the request and also independently returned by RentCast; no ZIP was supplied. Returned ZIPs are RentCast suggestions, not analyst-confirmed or postal-validated components. No Google-derived content was used.

The retained records include provider ID/APN, complete address components, county/FIPS, property type, bedrooms, bathrooms, floor/lot area and year built. No record-wide provider as-of timestamp is available in the retained fields. Local retrieval times and county evidence dates are kept separately. No current-distress or lien/ownership conclusion was drawn.

## Review packets and rights

Three gitignored, sealed packets exist under the private pilot directory. Each binds to the selected county identity, source hashes, minimal RentCast evidence and its own packet fingerprint. They preserve raw source identifiers, comparison-only normalized values (null when not valid APN9), suggested address, source dates, discrepancies and a null analyst decision.

`RENTCAST_DURABLE_LICENSED_EVIDENCE` identifies source-use permission documented by the user-supplied vendor email dated 2026-10-09. It is not an analyst decision or a canonical identity claim. Unresolved APN evidence remains quarantined from routine review/persistence despite licensed retention.

No existing IP packet/decision, canonical resolution, durable Property or production relationship was changed. The current IP-only review interface was not expanded; packet preparation is the deliverable, not a new approval route.

## Counts and decision

- Exact APN matches: **0**; normalized APN matches: **0**.
- APN conflicts: **3**; missing APNs: **0**; ambiguous identities: **0**; no-property responses: **0**.
- Routine review ready: **0**; exception review required: **3**; insufficient evidence: **0**.
- Analyst approvals, durable Properties and Round 1 selections: **0**.

Next action is authoritative human/vendor review of the retained identifier representations, not additional lookups. Do not mark these candidates identity-verified, routinely approvable or persistence-ready until those conflicts are resolved under an explicitly reviewed rule. The existing county source and current API result are not sufficient authority to invent that rule.
