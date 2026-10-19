# PI V1.5 — Mortgage, Lien and Foreclosure Source Capability Matrix

This matrix is a read-only assessment of retained PI evidence as of 2026-10-14. It authorizes no acquisition, subscription, scraping or live request. `Not checked / not available` means the retained V1.5 candidate evidence cannot support the assertion; it does not mean the condition is absent.

## Capability matrix

| Source | Financial/distress records actually available | Kern coverage and matching | Freshness and identifiers | Rights, plan and cost | PI implementation status |
| --- | --- | --- | --- | --- | --- |
| Kern Power-to-Sell delivery | Historical list membership, source date and historical parcel amount. No current tax balance, NOD, trustee-sale notice, recorded lien, mortgage, ownership or auction outcome. | The 80-candidate pilot is exactly joined through retained county ATN/APN9 evidence. ATN and APN9 remain distinct. | Snapshot dated 2026-09-15. Historical only. | Existing retained delivery and disclaimer only; new portal/commercial-use rights remain separate. No V1.5 cost. | Implemented and tested as `HISTORICAL_POWER_TO_SELL`; never presented as current distress. |
| Kern Assessor/crosswalk/situs snapshots | Assessment/use classification, exact county identity relationships and situs components. No debt, lien, payoff, NOD/NTS, tax-default status or ownership claim in V1.5. | Kern source. Exact joins; no address similarity and no calculated APN9. Retained pilot has no supported ZIP values. | 2026 Final/certified retained artifacts; situs evidence includes its own source dates. Current parcel activity remains unverified. | Existing retained evidence only. The county website/reuse policy does not establish unrestricted new commercial portal acquisition. | Implemented and hash-verified for candidate identity/provenance. |
| Kern County Recorder online search | Recorded documents/maps may establish individual historical instruments. The inspected official notice says online APN search ended 2024-12-09 and directs APN searches to office kiosks. It does not establish an automatable parcel-level NOD/NTS chain. | Kern official source, but APN9/ATN input semantics, complete parcel coverage and current chain were not established. | Individual record dates may be authoritative; exhaustive covered-through/current status is unknown. | Search/order fees, automated access and commercial retention/redistribution rights are unknown. | Not implemented. No search, scrape or order occurred. |
| ATTOM retained bulk sample | Assignment/release links and original mortgage references; Recorder transfer and two mortgage summaries; LoanModel position amounts and modeled LTV/equity; Foreclosure (vendor-confirmed Preforeclosure) and CombinedForeclosure default/judgment/auction fields. These are not payoff statements and modeled balance is not recorded principal. | Delivered sample covers FIPS 06111, 08035, 12031, 27123 and 37119. Kern 06029 is **not established**. ATTOMID is the vendor join key; latest Recorder mapping is authoritative within ATTOM history, not automatically a PI canonical identity. | One certified baseline plus one `_0002` daily delta. Multi-day freshness and current completeness are not proven. TransactionID/ATTOMID and dataset-specific document fields are available. | New Kern entitlement, retention, SaaS/PDF redistribution and exact product scope remain unverified. Historical quotes were $3,000/year and $7,620/year packages, not request pricing. | Bulk integrity/replay adapters are tested offline. They are not wired to the V1.5 pilot and no live acquisition occurred. |
| ATTOM prior API evidence | One excluded fixture demonstrated exact-address property identity, historical transfer, recorded original mortgage, modeled balance and preforeclosure responses. No general proof of lien-release or current payoff coverage for these 80 subjects. | Exact-address fixture only. A failed APN+FIPS experiment remains failed. Kern cohort coverage is not established. | Retrieval-specific prior evidence only; no current V1.5 query. | Evaluation access existed historically. Current entitlement, use rights and per-call economics for this proposed workflow are unknown. | Historical POC only; not invoked or exposed as current candidate evidence. |
| RentCast Property Records | Provider property ID, county-reported `assessorID`/APN, full address and property attributes. Retained evidence does not establish original mortgage, modeled loan balance, recorded lien/release, NOD, NTS, auction or tax default fields. | Nationwide product was described by vendor; street/city/state can be submitted without ZIP, but ZIP is recommended. Identity still requires strict county reconciliation. | Response retrieval time is known per request; provider-wide record as-of is not guaranteed by retrieval time. | Written vendor permission supports retention, combining with county data, commercial SaaS and investor PDFs. Developer plan evidence: $0/month, 50 included, $0.20 overage; current unused allowance must be reverified before future calls. | Controlled one-request client and six-property demo paths exist and were separately certified. V1.5 loads no credential and makes no call. |
| RentCast Value / sold-property search | AVM/range and sold/listing observations where returned. They are valuation/market evidence, not mortgage, lien, foreclosure, tax-default or current-owner evidence. | Address/provider-ID matching implemented in earlier controlled workflows. No bulk 80-candidate entitlement is inferred. | Retrieval times and record dates retained; sold/listing status remains distinct. | Same vendor rights/plan evidence; each successful HTTP 200 request counts. A V1.5 planning estimate conservatively reserves $0.20 per selected Property Records request, subject to a fresh account check and authorization. | Implemented in earlier controlled workflows, not automatically executed from Discovery. |

## Field-level conclusions

| Question | Current retained answer for the 80-candidate pilot |
| --- | --- |
| Original mortgage | `NOT CHECKED / NOT AVAILABLE`; ATTOM can carry recorded original amounts, but Kern coverage/entitlement is not established. |
| Modeled balance | `NOT CHECKED / NOT AVAILABLE`; ATTOM LoanModel capability exists in another geography sample. A model is not payoff evidence. |
| Recorded lien and lien release | `NOT CHECKED / NOT AVAILABLE`; no parcel-level Kern instrument chain is implemented. |
| Recorded NOD | `NOT CHECKED / NOT AVAILABLE`; do not infer from historical Power-to-Sell status. |
| Notice of Trustee's Sale | `NOT CHECKED / NOT AVAILABLE`; no automated Kern source is certified. |
| Auction outcome | `NOT CHECKED / NOT AVAILABLE`. |
| Current tax default | `NOT CHECKED / NOT AVAILABLE`; the 2026-09-15 list is deliberately historical. |
| Current ownership | `NOT CHECKED / NOT AVAILABLE`; no owner/contact data is used or displayed. |

## Minimum viable next acquisition path

Before a private beta claims current foreclosure or recorded-document status, obtain one licensed source that explicitly covers Kern County/FIPS 06029 and provides dated parcel-matched NOD, trustee-sale, cancellation/outcome, mortgage, lien and release instruments. First obtain written confirmation of: exact datasets/fields and codebooks; record identifiers and correction/delete semantics; current covered-through date and refresh lag; APN/address/ATTOMID match rules; Kern coverage sample; commercial retention, SaaS and investor-report rights; price and request/delivery limits; and whether release/cancellation chains are complete.

ATTOM is the shortest technical evaluation path because PI already has offline bulk/replay experience, but it is not selected or authorized until Kern coverage, rights and economics are answered. If it cannot provide the necessary Kern record chain, evaluate another licensed recorded-document/foreclosure feed. Do not automate or scrape the county Recorder site as a substitute.

## Operational accounting

- Provider calls in V1.5: **0**
- Database connections/writes in V1.5: **0 / 0**
- New subscriptions or purchases: **0**
- Incremental V1.5 cost: **$0.00**
- Credentials loaded: **0**

Source basis: retained ATTOM certification/profile artifacts, retained RentCast vendor correspondence and controlled-client evidence, and the existing Kern official parcel-verification discovery. This document is a technical/data-rights readiness assessment, not legal advice.
