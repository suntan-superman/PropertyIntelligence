# PI V3.4.1 — Investor Intake UX & Data Quality

## Implementation result

V3.4.1 redesigns the existing organization-private Investor CRM intake surface without replacing the CRM, campaign, report, authentication or administration architecture.

The investor dialog now uses four sections:

1. Contact information
2. Investment criteria
3. Purchasing capability
4. Communication and relationship

The form requires a name plus either an email address or telephone number. First and last names are stored separately and a canonical full name is retained for compatibility. Existing records that contain only an ambiguous full name keep that value intact; PI does not guess name parts.

## Data-quality behavior

- `ANY` is mutually exclusive with specific property-type and strategy selections.
- Acquisition-budget presets normalize to explicit minimum and maximum amounts. Blank maximum values remain open-ended, and an unspecified budget is not treated as verified purchasing capacity.
- Ambiguous imported thresholds such as `200K` retain their source value and are flagged for review without inventing a minimum or maximum.
- Structured preferences support multiple statewide and county-specific locations. Duplicate locations and counties assigned to the wrong state are rejected.
- The deterministic geographic reference is generated from the U.S. Census Bureau 2020 national county code file. It currently contains 56 states/territories and 3,234 county-equivalent records. Run `node scripts/update-investor-geography.mjs` to refresh the committed reference from the documented Census source.
- Legacy location strings are preserved. Only unambiguous state and county forms are normalized; ambiguous strings remain marked for analyst review.
- New profiles default to `Unknown` purchase method, `Not provided` proof-of-funds status and `Not confirmed` email permission.
- A received proof-of-funds item is not promoted to reviewed. Reviewed means analyst-reviewed, not independently verified.
- Existing opt-out and suppression states cannot be cleared through ordinary profile editing or import updates.
- Consent and opt-out dates are recorded when their statuses are established and the date is available.

## Import and matching compatibility

The existing CSV/XLSX architecture now maps separate names, mailing-address fields, property types, strategies, budget thresholds/ranges, structured geographic columns, purchasing method, proof-of-funds status, response frequency and relationship notes.

Original mapped values are retained in the private import history. Formula, hyperlink and external-reference protections remain in force. Imports remain idempotent and organization-owned. The synthetic 250-record certification created no live records.

Matching remains deterministic and explainable. Statewide preferences match any known county in that state; county preferences match only the selected county. An unknown property county is reported as missing information rather than treated as a match or conflict. Unspecified geography creates no verified nationwide preference. Unknown purchasing capability is never represented as verified capacity.

## Security and ownership

- Workside Platform Administrator cross-organization access remains authorized and audited.
- Customer organizations remain isolated.
- The owner test organization is displayed as **Workside Software, LLC** while preserving the durable ID `property-intelligence-local`.
- No GNZ Marketing LLC investor record was read or changed during development or automated QA.
- No email campaign, RentCast request, Stripe charge or live investor import was executed.

## Certification

- V3.4.1 focused CRM/authentication tests: 40 passed, 0 failed.
- V3.4 CRM/administration regression tests: 29 passed, 0 failed.
- Investor-report, financial, Monte Carlo, photo and commercial regression tests: 107 passed, 0 failed.
- Production web build: passed.
- Dependency audit: 0 vulnerabilities.
- Synthetic import: 250 records, idempotent replay confirmed.

Production deployment and browser-verification identifiers are recorded in the final implementation handoff after the existing Netlify GitHub workflow completes.
