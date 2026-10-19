# PI V1.6 — Residential Discovery & Batch Enrichment

## Result

`OFFLINE WORKFLOW READY FOR REVIEW`

PI now turns the retained Kern County Power-to-Sell evidence into a local, desktop-first residential research workflow. It indexes all 11,316 unique retained county candidates, defaults to 472 residential opportunities, retains the original 80-property high-readiness subset for the existing underwriting handoff, and keeps 10,896 records in the Needs Research population.

Historical Power-to-Sell evidence remains a dated screening signal. It is not represented as current delinquency, foreclosure, owner motivation, seller availability, mortgage, lien, equity, or investment merit.

## Implemented workflow

- Residential Opportunities, All County Records, and Needs Research views.
- Filters for sourced city/ZIP, assessor category, source date, historical amount, situs state, assessor match, enrichment state, shortlist state, and sort order.
- A deterministic 100-point research-readiness score covering residential use, historical source evidence, address readiness, source age, property-data completeness, and researchability. Historical amount and potential profitability are excluded from scoring.
- Compact desktop triage table and candidate evidence drawer.
- Named, locally persisted research batches with configurable limits (currently 80 candidates and six shortlisted candidates), duplicate rejection, reload, undo, and batch-isolated shortlists.
- ATN/APN and bounded geometry metadata for no-situs parcels. Coordinates, geometry payload, approximate pins, and fabricated addresses are not exposed.
- Offline enrichment preview with per-candidate cache state, proposed Google/RentCast actions, reported Google quota pressure, conservative RentCast exposure, and explicit blockers. Live execution remains disabled.
- Subject-bound Analyze handoff into the existing Property Detail and V1.4 underwriting workspace.
- CSV exports, a six-page 80-property batch PDF, and a two-page individual research brief. Both PDF forms retain the complete county disclaimer and explicit supported/unknown boundaries.

## Operator walkthrough

Run with the repository's required Node 22 runtime:

```powershell
& 'C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe' scripts/workbench-server.js --investment --property-detail --port 4175
```

Open `http://127.0.0.1:4175/#discover`.

1. Start in Residential Opportunities, apply evidence filters, and open a candidate drawer to inspect the score components and source limitations.
2. Select up to 80 records, name the batch, and save it locally.
3. Reload or activate a saved batch; use Undo for the most recent saved change.
4. Shortlist up to six batch members.
5. Select Preview Enrichment to review cache hits, request counts, quotas, estimated exposure, and blockers. The Run action is disabled.
6. Use Analyze on an underwriting-compatible candidate to open the same subject and source snapshot in Property Detail and the existing underwriting workspace.
7. Export the filtered table/shortlist as CSV, the batch as a PDF, or a candidate as an individual research brief.

## Enrichment accounting

The certified 80-property preview showed one cached address result, 79 proposed Google requests, 240 proposed RentCast requests, 319 total proposed requests, and a conservative RentCast overage exposure of `$48.00`. The current Google incremental price was not established and is therefore reported as unknown. The preview also identifies that the Google proposal exceeds the reported 25/day quota and must be split across days.

- Live provider calls: `0`
- Actual provider cost: `$0`
- Mocked QA address transmissions: `1`
- Database connections/writes: `0 / 0`
- Durable Properties created: `0`
- Production changes/deployments: `0`

## QA

All validation used Node `v22.12.0` and local/mocked transports.

- Foundation regression suite: `380/380 PASS`, `0 skipped`.
- Focused discovery, Property Detail, investment-workspace, report, MAO, Monte Carlo, and unified-workflow suite: `129/129 PASS`, `0 skipped`.
- Final V1.6 browser/PDF certification: `19/19 PASS` with Chrome `154.0.8037.57`.
- Production web build: PASS (62 modules transformed).
- Browser external-network escape: none.
- Protected identity, MAO, Monte Carlo, and investor-report paths: byte-identical during certification.
- Visual QA: discovery table, saved 80-property batch, enrichment preview, six-property shortlist, underwriting handoff, all six batch-PDF pages, and both brief-PDF pages inspected. The actual batch PDF was also opened in Chrome's PDF viewer after PDF.js produced an intermittent raster-preview artifact; Chrome confirmed that the PDF content and margins are intact. No PDF clipping, blank pages, or fabricated data were observed.

Final evidence is in `data/runtime/discovery-v1-6/qa-LIFXyT/`:

- `01-discovery-filters-table.png`
- `02-saved-80-property-batch.png`
- `03-enrichment-preview.png`
- `04-six-property-shortlist.png`
- `05-underwriting-handoff.png`
- `v16-batch-summary.pdf`
- `v16-research-brief.pdf`
- `chrome-pdf-page-3.png`, `chrome-pdf-page-4.png`, and `chrome-pdf-page-5.png`
- `qa-results.json`

## Known limitations

- The retained evidence has no supported current NOD, trustee-sale, lien, mortgage, payoff, ownership, seller-availability, or current-delinquency feed.
- Source ZIP values are absent for the retained 80-property county-situs subset; ZIP 93312 coverage is not inferred.
- Only the preserved 80-property subset currently has the detailed evidence model required for the existing underwriting handoff. The broader cohort remains screening/research evidence until identity and evidence requirements are satisfied.
- No-situs parcels require official identifier/location research before an address workflow is appropriate.
- Google and RentCast entitlement, current billing-period usage, rates/fees, batch membership, and a batch-specific request/budget authorization must be reverified before any live execution.
- First American geographic foreclosure search remains blocked pending an exact documented vendor contract; no speculative implementation was added.

## Focused next recommendation

Authorize a separately reviewed enrichment run for the six-property shortlist only after current Google/RentCast entitlement, billing usage, exact call count, and a batch-bound spending ceiling are verified. Schedule Google work within the reported 10/minute and 25/day limits; do not authorize all 80 candidates as one live run.
