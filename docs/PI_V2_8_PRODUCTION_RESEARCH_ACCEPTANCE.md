# PI V2.8 — Production Property Research Acceptance

## Result

The authenticated production research workflow is deployed and operational for private Administrator use. Property-record and valuation research, durable promotion, scenario persistence, report generation, and fresh-session restoration passed. The bounded comparable-sales request failed at the provider boundary and was not retried, so the full V2.8 milestone is **not yet eligible** for the requested `PI V2.8 — AUTHENTICATED PRODUCTION RESEARCH: ACCEPTED` classification.

## Deployment

- Production site: `https://worksidepropertyintelligence.netlify.app`
- Netlify deploy: `6ad7e8785c76eebd75b97ff2`
- Firebase project: `property-intelligence-8238b`
- Organization: `property-intelligence-local`
- Access: authenticated Administrator only; no public signup or external beta was enabled.

## Implemented controls

- Firebase Authentication and organization/role authorization on every research route.
- RentCast credentials remain server-side.
- Firestore-backed provider cache, daily request deduplication, immutable responses, usage accounting, and audit events.
- Default ceilings: $1 per operation, $10 daily, $50 monthly, zero automatic retries, concurrency one, and a bounded provider timeout.
- Explicit research actions only. Page loads and restoration make no provider requests.
- Firestore-backed address-validation state works across Netlify serverless instances.
- Deployed durable-property preview/save routes use the existing organization-scoped promotion service.
- Retained evidence snapshots are immutable; unchanged evidence is not rewritten.

## Bounded production acceptance

Subject: `40924 173rd St E, Lancaster, CA 93535`

| Operation | Requests | Estimated cost | Result |
| --- | ---: | ---: | --- |
| Property record | 1 | $0.20 | One matching record returned and retained. The first run rejected the equivalent `East`/`E` spelling; the strict failure audit was preserved and normalization was corrected. The cached response was reused, not called again. |
| Valuation | 1 | $0.20 | Complete: AVM $390,000; provider range $360,000–$419,000. |
| Recent sold properties | 1 | $0.20 | Provider request failed without a stored response. It was not retried. No comparable sale was invented or inferred. |
| **Total** | **3** | **$0.60** | Zero automatic retries. |

The retained evidence identity is:

- Subject: `RESEARCH-7B4756C54224`
- Evidence fingerprint: `e961f4f05bceea37ab491de2138904dc8fe09a1537384b464ed8d26f2c1f7dfc`

The failed comparable-sales status remains visible in Guided Analysis and both reports. It is not represented as evidence that no sales exist.

## Durable restoration

- Property ID: `4ae3f6ad-3835-4d1f-b9e2-31aaad641ec9`
- Scenario ID: `0dd8b150-c450-438a-86e7-c24b853e8d8b`
- Scenario revision: `1`
- Scenario: `Lancaster InvestorLift Preliminary`
- Opportunity Brief report ID: `52805185-984f-49a3-b9fe-b1e14e0a6011`
- Full Investor Package report ID: `dd067111-9437-4c26-a24e-c46dd683583c`

The InvestorLift asking price, advertised ARV, rehabilitation range, property characteristics, occupancy, and repair condition are stored as source-reported or analyst assumptions—not verified property evidence. A fresh authenticated session restored the exact property, scenario revision, deterministic analysis, Monte Carlo results, and both report revisions.

## Verification

- Focused V2.8 tests: 22/22 passed.
- Production web build and Netlify function bundle passed.
- Historical retained-evidence fixture remained byte-identical and hash-valid.
- Opportunity Brief: 3 nonblank pages with verified pagination.
- Full Investor Package: 13 nonblank pages with verified pagination and a correct dynamic cover.
- Visual inspection found no clipping, blank pages, broken currency, or synthetic-QA misclassification.

Artifacts are retained locally in:

`data/validation/pi-v2-8/run-2026-10-20T22-19-28-092Z`

This includes both PDFs, Guided Analysis and restored-workspace screenshots, report-page screenshots, and `restoration.json`.

## Final disposition

**NO-GO for full V2.8 milestone closure solely because comparable-sales research did not complete.**

The deployed property-record and valuation workflow is suitable for private authenticated Administrator use. The next comparable-sales attempt must be a new explicit user action after the daily deduplication window; the failed reservation and audit history must not be erased. No further provider request was made during this acceptance run.
