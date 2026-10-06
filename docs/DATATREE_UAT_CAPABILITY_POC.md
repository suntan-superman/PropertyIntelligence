# First American / DataTree UAT Capability POC

## Result

**STOPPED at Gate 3 request-contract ambiguity — capability evaluation incomplete.**

### 2026-10-02 update

The corrected authoritative host is `https://dtapiuat.datatree.com/api`; its Swagger UI and Swagger JSON were reachable. The earlier `dtiapiuat.datatree.com` DNS failure remains historical only. DataTree property authentication then passed using the local `.env` credentials, with a JWT held in memory and discarded.

This was a local, read-only evaluation scoped to the single fixture `3484 Haven St, Rosamond, CA 93560` (Kern County, FIPS 06029, PI APN9 251091302, PI ATN 25109130001). No property-data request was made, no application/database data was changed, and no provider other than the First American authentication service was contacted.

## Gate results

### Gate 1 — DataTree property API authentication

- Authentication: **PASS**
- DataTree property API token received: **YES**
- Token type: **JWT**
- Credentials remained in local environment memory only.

### Gate 2 — Endpoint inventory

**PASS.** Swagger JSON was retrieved and inspected. Exact routes, request models, required headers, and documented response types are recorded in the endpoint inventory.

### Gate 3 — Identity resolution

**BLOCKED before request.** `PropertySearch` requires `SearchRequestVm.Filters`, but Swagger leaves `FilterName` and `FilterOperator` unconstrained and gives no examples. `SearchType` is an undocumented integer enum `[0..5]`. Sending a guessed address query could return an unexpected population or create an unsafe identity result, so the 3484 Haven request was not made.

Because the specification requires endpoint documentation before consuming property requests, the evaluation stopped without attempting address, APN, transaction, mortgage, lien, foreclosure, or title calls.

## Fixture identity

Not evaluated against DataTree. The PI fixture identity remains unchanged and no APN transformation or provider identity claim was made.

## Capability answers

All capability questions are **UNKNOWN / NOT TESTED**, not negative findings. No provider comparison or recommendation is made.

## Request accounting

- DataTree property authentication requests: 2
- Unrelated DCIS authentication requests: 2 (historical, not counted toward property evaluation)
- Property-data requests: **0**
- Internal property-query ceiling: not consumed

## Security

- No client ID, client secret, bearer token, Authorization header, ATTOM key, database URL, or other credential appears in this report.
- Raw provider responses: none.
- No DataTree adapter, migration, deployment, Supabase write, or Property Intelligence mutation was performed.

## Required next step

Provide an authoritative `PropertySearch` request example or filter dictionary from First American/DataTree, specifically the address filter name/operator and the address search type value. Resume at Gate 3 only then. This report intentionally does not recommend First American or DataTree integration.

