# PI Round 1 — Provider rights matrix

2026-10-09. **ACCOUNT TERMS NOT VERIFIED.** No provider was contacted, contract fetched, credential inspected or account changed. This is an evidence inventory, not a legal opinion or new license grant. Technical access, existing retention and human approval are not proof of commercial rights.

## Classification and evidence limits

- **Documented permission (D):** affirmative applicable terms/agreement language establishes the stated scope.
- **Conditional permission (C):** a retained term review/vendor statement supports only the narrow purpose or conditions described below; do not generalize it to new products, users or accounts.
- **Unknown permission (U):** available evidence does not establish permission. Unknown is not permission to proceed.
- **Prohibited use (P):** expressly disallowed by applicable terms. PI's current operational prohibitions are reported separately; do not mislabel policy restrictions as universal vendor terms.

No cell below claims an unconditional, account-verified commercial grant. No signed/executed account-specific provider agreement was located in the reviewed project documents, POC inventories, ledgers or local response directories. This does not establish that no agreement exists elsewhere. Public URLs retained in older assessments were **not fetched now**; their wording/current applicability has not been independently revalidated in this task.

## Use-case matrix

| Use case | County | ATTOM | RentCast | DataTree | Google |
| --- | --- | --- | --- | --- | --- |
| Internal property research | C — county use conditions [C1] | C — prior sample/fixture evaluation only [A1] | C — prior public internal-use terms [R1] | C — provisioned UAT evaluation only [D1] | C — initiating-user temporary/restricted review [G1] |
| Local analyst review | C — retain source/disclaimer [C1] | C — prior evaluation scope, new scope unverified [A1] | C — internal review, subject to account terms [R1] | C — prior UAT scope, new subjects unverified [D1] | C — authorized reviewer and effective evidence only [G1] |
| Retaining complete address | U — inspected county evidence lacks ZIP; mixed-source completion needs its own rights [C1] | U — no applicable duration/use grant [A1] | C — internal storage basis only [R1] | U — no applicable retention grant [D1] | C — restricted evidence only, not indefinite shared retention [G1] |
| Shared canonical database | U — commercial combined use not established [C1] | U [A1] | U — Workside/shared purpose not established [R1] | U [D1] | U — public exception does not establish PI shared-use rights [G1] |
| Multi-user SaaS application | U [C1] | U [A1] | U [R1] | U [D1] | U [G1] |
| Investor-facing PDF | U — disclaimer condition known, full commercial permission not established [C1] | U [A1] | U [R1] | U [D1] | U — no applicable PDF/shared-use grant [G1] |
| Derived analysis | C — internal evaluation; no warranty [C1] | U — distribution/derived rights not established [A1] | C — internal research only; external derived output unknown [R1] | U [D1] | U — durable/commercial derived use not established [G1] |
| Long-term retention | U — no comprehensive duration/termination basis established [C1] | U [A1] | C — surviving obligations/possible deletion, account-specific confirmation needed [R1] | U [D1] | U — place-ID exception is not rights to complete address/parcel evidence [G1] |

The absence of a P cell does not mean unrestricted use. In particular, **Google-derived content in PI shared canonical records or investor PDFs remains prohibited by current PI scope/policy**, regardless of the contract cells being U. An external county copy without the required source disclosure/disclaimer violates the express copy condition. No provider acquisition or commercial redistribution is authorized by this matrix.

## Supporting evidence

### C1 — County

[County-supplied use limitation](SPRINT6_2_SOURCE_DISCLAIMER.md) reproduces resConst/Consts/useLimit from the hash-verified local parcel XML. Section I requires acceptance as-is and disclaims accuracy, completeness, currentness and fitness; section II.A conditions copies or partial copies to other parties, including consultants, on provider-origin disclosure and attaching the Disclaimer of Liability and Warranties paragraph. Section II.B contains indemnification conditions. The underlying XML hash is recorded in the [readiness report](PI_R1_DURABLE_EVIDENCE_READINESS.md).

This is actual retained source language, not a claim that “public data” is license-free. It supports conditional source use/review and establishes an explicit disclosure obligation. It does not by itself establish all rights for a commercial shared database, SaaS, every derived product or indefinitely retained mixed-source complete addresses. Preserve the full required disclaimer with future permitted extracts; a bare hyperlink must not silently replace a required attachment.

### R1 — RentCast

The 2026-10-08 [previous public-term review](PI_ADDRESS_PROVIDER_COMPARISON.md#rentcast-preferred-minimal-reuse-one-unresolved-lookup-question) cites RentCast API terms sections 1, 3 and 7 as allowing internal research/reference/quality-control and storage, with surviving obligations, possible legal/third-party deletion requirements and continued conditional use after termination. Source cited by that review: [RentCast API terms](https://www.rentcast.io/terms-api).

The available evidence here is that retained review and its source citation, **not an executed Workside agreement or newly retrieved current terms**. Therefore internal storage is CONDITIONAL, not account-verified. Permission to retain data internally is not automatically permission to share addresses/IDs across customer accounts, display investor PDFs, redistribute source records, sublicense or ignore termination/deletion provisions. Obtain written coverage for the exact fields and uses before treating this as durable PI evidence. No raw owner data is needed for the proposed pilot.

### A1 — ATTOM

[API POC and written identity guidance](ATTOM_API_CAPABILITY_POC.md), [bulk sample certification](ATTOM_BULK_FIVE_DATASET_POC.md), [sequential certification](ATTOM_SEQUENTIAL_DELIVERY_CERTIFICATION.md) and [Mike questions](ATTOM_CALL_WITH_MIKE_QUESTIONS.md) support the prior evaluation scope, sample deliveries and vendor identity conventions. They do not provide applicable account-level shared-canonical or investor-output rights. The existing commercial/retention questions remain unanswered evidence, not permission.

Authoritative AttomID and verbatim ParcelNumberRaw guidance concerns identity handling. It does not grant durable database, SaaS or PDF rights. Bulk quotes and accessible API reports likewise do not prove those rights, licensed Kern coverage or remaining quota.

### D1 — First American DataTree

[Endpoint inventory](DATATREE_UAT_ENDPOINT_INVENTORY.md) records First American's UAT provisioning statement and exact SearchStandard/TotalView contracts. [Capability evidence](DATATREE_UAT_CAPABILITY_POC.md) records the one-subject test; [commercial questions](DATATREE_COMMERCIAL_QUESTIONS.md) identify unverified retention/display/derived/termination rights. UAT integration testing is a limited purpose. A provisioned product menu is neither production licensing nor approval to test arbitrary additional subjects. No applicable account agreement or fee schedule was available in the reviewed materials.

### G1 — Google

[Three-property POC](PI_GOOGLE_GEOCODING_THREE_PROPERTY_RESULTS.md) establishes historical technical results; [retention design](PI_ADDRESS_EVIDENCE_RETENTION_DESIGN.md) establishes PI's narrower evidence-use policy. The earlier [public-term review](PI_ADDRESS_PROVIDER_COMPARISON.md#google-technically-suitable-geocoding-not-currently-an-enabled-pi-verifier) cites [service terms section 6](https://cloud.google.com/maps-platform/terms/maps-service-terms) and [Geocoding policies](https://developers.google.com/maps/documentation/geocoding/policies): conditional initiating-end-user caching, coordinate-cache provisions, attribution and a distinct place-ID storage exception. Do not turn those exceptions into blanket permission or a blanket assertion that all retention is forbidden.

The three existing pilot response deadlines remain unchanged: IP-P1 2026-10-10T03:56:46.934Z; IP-P2 2026-10-10T05:17:53.954Z; IP-P3 2026-10-10T05:17:58.763Z. These are local review limits, not a promise of universal vendor retention permission. Any earlier expiry/revocation/unavailability still controls. Do not extend/reset deadlines, refresh content, copy ZIPs into new packets, classify Google content as independently licensed, or use reviewer approval as a new license. No Google content is reproduced here.

## Evidence record required before any durable use

For each retained component require provider, product/dataset, actual source record/reference, actual retrieval and source as-of dates (unknown remains unknown), component coverage, separately namespaced provider identity and county relationship, content fingerprint, and transformation/comparison history.

Attach the applicable agreement/term version and vendor confirmation with its fingerprint; authorized purpose, user/account/shared-use scope, retention period, termination/revocation/deletion obligations, redistribution/display restrictions and attribution. Approval must bind the exact packet/evidence/permission fingerprints, reviewer, timestamp, discrepancies and current evidence effectiveness. No source receipt, analyst approval or cryptographic signature independently creates licensing rights.

Persist only necessary licensed subject components, county/source IDs, provider references, dates, comparison outcomes and evidence/permission fingerprints in a private local packet during any later pilot. Provider IDs remain distinct from immutable county IDs. Raw payloads and owner/contact fields are not required. A minimal extract is still licensed data; minimization and hashing do not eliminate its restrictions. No shared database/PDF use until the corresponding rights and execution gates separately pass.

## Rights decision

**VENDOR RIGHTS CLARIFICATION REQUIRED.** RentCast has the strongest available conditional internal-storage basis and existing reusable lookup path; commercial shared-canonical and investor-output rights remain UNKNOWN. Resolve that single provider's narrow contract/account questions first. Do not launch a multi-provider licensing project or contact vendors during this task. All five providers: new calls 0; account changes 0; acquisition authorization 0.
