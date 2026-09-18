# Kern POC-1 Runbook

## Current stop state

The metadata gate is **NO-GO**. On 2026-09-17, both documented official hosts returned ArcGIS error 499 (`Token Required`) for the MapServer and Layer 2 metadata endpoints.

## Safe retry

After Kern County restores unauthenticated public access, or supplies Stan with a documented authorized access method:

```powershell
cd C:\Users\sjroy\Source\PropertyIntelligence
npm run kern:inspect
```

Do not run any enrichment until metadata discovery succeeds and an exact ATN query is verified through code. Do not use credentials copied from public web-map configuration, and do not run a full enrichment.

## Query strategy

Not verified. The specification's likely `Assessor_Tax_No` mapping has not been accepted as fact because live Layer 2 metadata and a record query could not be lawfully completed.
