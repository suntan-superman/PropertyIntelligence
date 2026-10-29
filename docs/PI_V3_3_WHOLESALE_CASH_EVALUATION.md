# PI V3.3 — Wholesale & Cash Investor Evaluation

## Status

Implemented, locally certified and production-verified on October 29, 2026. The release is deployed to the private authenticated Netlify application.

## Product behavior

Each saved scenario may now carry an `evaluationMode`:

- `WHOLESALE_CASH` — the default for newly created fix-and-flip scenarios.
- `DETAILED_UNDERWRITING` — the existing complete underwriting workspace and report treatment.

Historical scenarios are not migrated. A scenario without `evaluationMode` continues to resolve to Detailed Underwriting, preserving its prior interface, inputs, calculations and report behavior. Duplicating a scenario preserves its mode and related metadata. Switching modes changes visibility and report emphasis; it does not erase underlying inputs.

The selector is available in both Guided Analysis and Advanced Workspace and is saved with the scenario revision.

## Wholesale / Cash workflow

The simplified view leads with:

- proposed purchase price;
- rehabilitation estimate;
- resale/ARV assumption;
- optional renovation and marketing duration;
- cash or acquisition-financing treatment; and
- wholesale/assignment fee treatment.

Fee treatment is explicit:

- `INCLUDED` — the fee is already contained in the purchase price and is not counted again;
- `ADDITIONAL` — the entered fee is added once to other upfront project cost; or
- `UNKNOWN` — the report identifies the item for recommended follow-up.

Cash scenarios treat loan amount, interest, points and financing fees as not applicable. Stored detailed values are not deleted. Optional costs can be classified as Entered, Not Included or Not Applicable. Only Entered amounts are included in the calculation adapter. Changing a treatment is an explicit analyst action and does not overwrite the stored input.

## Calculation boundary

No certified financial, MAO or Monte Carlo engine was changed. V3.3 is a scenario adapter and presentation layer around the existing engines.

Potential Gross Investment Spread is defined as:

`resale assumption − purchase price − rehabilitation estimate`

It is deliberately separate from modeled result after entered expenses. ROI, cash-on-cash, MAO and break-even remain available as conditional secondary metrics. Monte Carlo continues to use the existing saved assumptions, distributions, seed and certified implementation.

The calculation binding key includes the V3.3 mode, financing, fee and expense-treatment metadata so an unsaved preview cannot be reused after those selections change.

## Reporting

Wholesale Opportunity Briefs are constrained to a single analytical page and prioritize the property, core assumptions, potential gross investment spread, modeled result, comparable-sales context, observations and recommended follow-up.

The required financial qualification is:

> Preliminary estimates based on available information. Gross spread excludes additional transaction, holding, financing and selling expenses where applicable.

The required diligence notice is:

> Property condition, resale assumptions, title and transaction terms should be independently reviewed before purchase.

The Full Investor Package retains the approved cover, then presents the wholesale opportunity summary before detailed research and supporting sections. MAO appears under Additional Investment Metrics. The diligence section is titled `Investment Due Diligence & Recommended Follow-Up`. Outstanding diligence remains visible and audit-preserved but does not prevent generation of a qualified preliminary report.

Detailed Underwriting reports retain their existing treatment. Historical report revisions are not rewritten.

## Local certification

The isolated Tyler fixture used:

| Input | Amount |
| --- | ---: |
| Purchase price | $111,000 |
| Rehabilitation | $20,000 |
| Resale assumption | $176,000 |
| Potential Gross Investment Spread | $45,000 |

The fee was classified as included in the purchase price. Financing was Cash. No live Firebase writes, provider requests, uploads, Stripe operations or deployment occurred during the local report run.

Focused automated coverage verifies:

- legacy scenarios remain Detailed Underwriting without migration;
- scenario metadata validation and revision persistence;
- cash financing fields are not charged;
- included fees are not double counted;
- additional fees are counted once;
- optional expense states affect modeled expenses without deleting stored values;
- the $45,000 Tyler gross-spread calculation;
- deterministic and Monte Carlo invariance when economics are unchanged;
- one-page Opportunity Brief hierarchy and exact qualification language;
- Full Investor Package hierarchy and diligence title;
- report generation with recommended follow-up outstanding; and
- the shared selector and simplified UI in Guided and Advanced workspaces.

Generated local artifacts are in `data/validation/pi-v3-3-wholesale-cash-certified/`. Binary PDFs, HTML and page images remain local and ignored by Git. The compact `qa-results.json` manifest is retained for certification evidence.

## Deployment and rollback

Production deploy `6ae392faf16dd3d98ed4cf55` published commit `8e031bc1984cea942479607bcf268804c59cd258`. An authenticated, read-only browser verification restored saved Tyler scenario revision 3, displayed both evaluation modes, and correctly resolved the legacy scenario to Detailed Underwriting. It recorded no application API failures, page errors, provider requests, scenario writes or report writes. The verification evidence is retained in `production-verification.json`; its screenshot remains a local ignored artifact.

The production release changes only application code and static assets. It creates no new infrastructure and performs no data migration. Existing scenarios without the new metadata remain on the detailed path.

Rollback is the standard Netlify traffic rollback to the immediately preceding production deploy. Because there is no migration, rollback does not require record repair. Scenarios saved with V3.3 metadata remain valid JSON; the prior application ignores fields outside its presentation contract.

