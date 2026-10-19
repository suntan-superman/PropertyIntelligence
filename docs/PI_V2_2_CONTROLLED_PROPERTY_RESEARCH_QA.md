# PI V2.2 — Controlled Property Research QA

## Certification boundary

All provider responses were synthetic. Browser traffic was restricted to the loopback PI server. No RentCast credential was loaded, no live provider request was made, no database was connected or changed, and no production deployment occurred.

## Focused coverage

- exact Arosa address-bound authorization and explicit confirmation
- one request, zero retries and bounded timeout
- missing confirmation, credentials, account evidence and role rejection
- changed address, changed user, reused confirmation and duplicate address rejection
- user/day, provider/day, per-request and monthly spending limits
- exact match, ambiguous match, no match, provider failure and quota result classification
- estimated cost separate from unknown actual billing
- preliminary identity boundary and no durable Property creation
- successful handoff into Guided Analysis with no automatic enrichment cascade
- retained-first Crestview and Haven behavior
- exact private evidence hash validation
- financial/report regression suites and production build

## Results

| Suite | Result |
| --- | ---: |
| V2.2 controlled research + Guided/address source contracts | 23/23 PASS |
| Arosa controlled browser path | 9/9 PASS |
| Existing retained-address/workspace browser path | 23/23 PASS |
| Seven-step Guided browser regression | 35/35 PASS |
| Certified financial, Monte Carlo, seller-position and report unit regressions | 149/149 PASS |
| Investor PDF visual/content regression | 44/44 PASS; 4 PDFs / 24 pages |
| Production web build | PASS; 66 modules |

The Arosa browser path recorded one synthetic transport call, zero external browser requests and zero browser errors. Live provider calls remained **0**.

Screenshots are retained in the ignored directory `data/runtime/pi-v2-2/browser-qa/run-lGJWvh/`:

- `01-confirmation-disclosure.png`
- `02-preliminary-result.png`
- `03-guided-research-subject.png`

## Live acceptance status

`BLOCKED BEFORE REQUEST`

Required evidence not present: a genuine current Arosa/user-bound authorization record and fresh account/quota observation for the execution date. The older fixed-subject Stage A authorization is not reusable.

