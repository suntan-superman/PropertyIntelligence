# PI V2.2 Live Arosa Acceptance

Date: 2026-10-16 (America/Los_Angeles)

Result: **LIVE ACCEPTANCE PASS**

## Authorization and account evidence

- Subject: 21950 Arosa Road, Tehachapi, CA 93561
- Provider / endpoint: RentCast Property Records / `/properties`
- Explicit approval: recorded at 2026-10-16 10:57:13 Pacific
- Authorization expiry: 2026-10-16 11:27:13 Pacific
- Dashboard evidence: API Developer active; 23 of 50 requests used and 27 remaining at capture
- Screenshot SHA-256: `1b741a4f7e1bf7e1b50ab866ec4fb66b559ad029e2696ad330d86f4d23607ffc`
- Authorized maximum: one request, $0.20 conservative exposure, zero retries
- Additional enrichment: prohibited and not performed
- Durable Property creation: prohibited and not performed

## Live result

- Requests transmitted: **1**
- Provider HTTP status: **200**
- Match classification: **EXACT_SUPPORTED_MATCH**
- Cache hit: **No**
- Automatic retries: **0**
- Estimated maximum cost: **$0.20**
- Actual provider charge: **Unverified**; no post-request provider call was made
- Additional provider requests: **0**
- Preliminary subject reference: `RESEARCH-5E20929A08C8`

RentCast returned the authorized address as `21950 Arosa Rd, Tehachapi, CA 93561`, Kern County. The response reported a Single Family property with 3 bedrooms, 2 bathrooms, 1,452 square feet, a 13,068-square-foot lot and year built 1991. It included RentCast property ID `21950-Arosa-Rd,-Tehachapi,-CA-93561` and assessor ID `379-473-02-00-5`.

The provider address components agreed with the authorized street, city, state and ZIP after routine `Road` / `Rd` normalization. The assessor ID is provider-reported parcel information and was not independently reconciled to current county records. The result therefore remains preliminary and does not certify legal parcel identity, title, ownership, condition, value or investment suitability.

## Guided Analysis handoff

The live preliminary subject opened successfully in Guided Analysis with the same Arosa address and characteristics. The UI displayed one research warning, showed valuation and recorded-sale research as unavailable/not checked, and retained the explicit preliminary-evidence limitation. No durable Property was created.

## Evidence

- Private machine-readable result: `data/runtime/pi-v2-2/live-acceptance/arosa-2026-10-16-1057-approved/acceptance.json`
- Confirmation screen: `data/runtime/pi-v2-2/live-acceptance/arosa-2026-10-16-1057-approved/01-live-confirmation.png`
- Preliminary result: `data/runtime/pi-v2-2/live-acceptance/arosa-2026-10-16-1057-approved/02-live-preliminary-result.png`
- Guided handoff: `data/runtime/pi-v2-2/live-acceptance/arosa-2026-10-16-1057-approved/03-live-guided-handoff.png`
- Usage ledger: `data/runtime/pi-v2-2/usage/usage.jsonl`

All 14 live acceptance checks passed. Browser errors: 0. External browser requests: 0. Database writes: 0. Durable Properties created: 0.

## Normal workspace retention correction

The first acceptance runner held the preliminary subject only in its server process. The ordinary port-4175 server therefore continued to report that live research was disabled after the acceptance runner closed. This was a local handoff defect, not a failed RentCast request.

The completed response is now registered as hash-verified retained preliminary research. Normal workspace startup reconstructs the sanitized subject from the exact private response and acceptance hashes without loading credentials or contacting RentCast. A focused browser check confirmed that `21950 Arosa Road` resolves through **Research retained evidence** and opens the same subject in Guided Analysis with zero provider requests.

- Retained subject: `RESEARCH-5E20929A08C8`
- Focused unit tests: 11/11 passed
- Offline browser verification: passed
- Verification screenshot: `data/runtime/pi-v2-2/retained-ui-verification/01-retained-arosa-found.png`
