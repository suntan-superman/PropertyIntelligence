# PI Monitoring V1.1 — Visual QA

Status: **Synthetic investor UX PASS; real ATTOM certification remains NOT DEMONSTRATED.**

## What was verified

- Three clearly separated synthetic demo properties feed the investor priority table; high priority sorts first, then medium by recency.
- Summary values are derived from active synthetic events: 3 monitored properties, 3 requiring attention, 3 new material changes, and `None verified` upcoming critical dates.
- Quarantine examples are excluded from the table/feed/alert inbox and displayed only in analyst Data Quality & Review.
- The default Recent Property Changes view is actionable-only; optional informational changes are filterable.
- Priority, event type, source, date and local alert read/acknowledgment filters work.
- Event detail uses human-readable terms and keeps source transaction/fingerprint/status details expandable.
- Property selection updates chronological history, diligence and reassessment context.
- Local alerts sort by priority/recency, can be marked read, and are not sent externally.
- Source Processing Diagnostics is collapsed by default and contains the actual certified aggregate statistics separately from synthetic metrics.
- Certified ATTOM Evidence is a separate mode showing zero row-level certified events; it does not display synthetic property cards.
- 1366px desktop, 768px tablet and 390px mobile: no horizontal overflow; long text wraps.
- Browser console errors: 0. External requests: 0. PI API/database requests: 0.

## Screenshots

- Desktop: `data/validation/monitoring-v1-1/screenshots/monitoring-v1-1-desktop-1366.png`
- Tablet: `data/validation/monitoring-v1-1/screenshots/monitoring-v1-1-tablet-768.png`
- Mobile: `data/validation/monitoring-v1-1/screenshots/monitoring-v1-1-mobile-390.png`

Machine results: `data/validation/monitoring-v1-1/qa-results.json`.

## Local launch

From the PI repository root:

```powershell
npm run monitoring:prototype -- --port 5173
```

Then open `http://127.0.0.1:5173/#monitoring`. This is the local Vite UI only.

## Run tests

```powershell
npm run monitoring:test
npm run web:build
npm run monitoring:qa
```

Screenshots show synthetic demonstration content unless the UI explicitly says Certified ATTOM Evidence. No real addresses or owner/contact information are present. No deployment or production operation occurred.
