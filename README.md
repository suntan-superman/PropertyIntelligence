# Property Intelligence — Kern County POC-1

## Foundation Sprint 1

An independent, JavaScript-only RentCast adapter, Florida sponsor fixture, deterministic underwriting and neutral evidence comparison are implemented. Stan confirmed Fantasia's corrected address; property and AVM identity checks now pass, with all 15 comps retained. Bass stopped because its provider record lacks manufactured-home type and structural/parcel details. Joyce still lacks a complete address. See [the Foundation completion report](docs/FOUNDATION_SPRINT1_COMPLETION_REPORT.md) and [architecture/run instructions](docs/DEAL_VERIFICATION_ARCHITECTURE.md).

```powershell
npm test
npm run deals:seed:florida
npm run deals:compare:florida
npm run foundation:summarize
```

Live commands require `RENTCAST_API_KEY` in the process environment or a local ignored `.env` (Node 20.19+). Keep `.env.example` as a blank template. `npm run deals:verify:florida -- --property fantasia` reuses successful cached evidence unless `--refresh` is supplied. Do not repeat Bass live enrichment before resolving its representation gate. Joyce remains ambiguous. There is no Home Advisor runtime dependency. No UI, Monte Carlo or investor package is included.

## Historical Kern POC-1

This workspace is limited to proving exact Kern County Power-to-Sell ATN-to-parcel resolution. The first live gate is currently **NO-GO** because the official ArcGIS MapServer requires a token (ArcGIS error 499).

No full enrichment has been run. See `docs/POC1_COMPLETION_REPORT.md` for the stop decision and evidence.

## Available command

```powershell
npm run kern:inspect
```

The command performs sequential, read-only metadata requests. It writes a failure diagnostic without credentials when the service is unavailable. Resolver, sample, enrichment, and validation commands were intentionally not implemented after the mandatory metadata gate failed.

Start with npm run web:dev, 
then open http://127.0.0.1:4173.


npm run pi:local
