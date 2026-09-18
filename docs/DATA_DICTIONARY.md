# Kern POC-1 Data Dictionary

Live ArcGIS metadata could not be retrieved on 2026-09-17 because the official MapServer returned ArcGIS error 499 (`Token Required`). No field definitions are asserted here from stale or indirect sources.

When authorized access is restored, `npm run kern:inspect` will regenerate this file from observed Layer 2 metadata and will fail if the required object-ID or ATN mapping is ambiguous.

## Foundation Sprint 1 domain and evidence

These are application field definitions and fixture-tested provider mappings. After Stan confirmed the corrected address, Fantasia's live property record and AVM subject passed identity checks. Bass returned sparse address-only evidence and stopped before AVM. Joyce remains ambiguous.

Address corrections are separate from sponsor claims: `addressConfirmation` records the supplied address, supplier, supplied date, USER_CONFIRMED status and source-document reference. `verificationAddress` shows the exact address used for lookup. `sponsorAddress` and the original address claim remain unchanged. USER_CONFIRMED refers only to intended identity, not verification of independent property or valuation data.

| Record | Fields and semantics |
| --- | --- |
| Property | id; provider-reported address/county/coordinates; identifiers (APN/ATN/provider ID); propertyType, bedrooms, bathrooms, squareFeet, lotSize, yearBuilt; taxes, assessments, saleHistory; valuation, all comps and provenance IDs. Missing is null, distinct from zero. |
| Deal | id, name, propertyRef, sponsor, claims, evidence, underwriting. Seed underwriting/evidence slots are empty; derived run artifacts are separate. |
| Claim | field, value, unit, suppliedBy, sourceDocument, suppliedAt (null if unknown), status, evidenceRefs, notes. Status enum: SPONSOR_SUPPLIED, INDEPENDENTLY_SUPPORTED, VERIFIED, CONTRADICTED, MISSING, AMBIGUOUS. No automatic VERIFIED promotion. |
| Evidence | stable content-derived id, source, sourceType, retrievedAt (ISO), field, value (including range objects), rawResponseRef, notes. |
| Raw cache | schemaVersion, sanitized request endpoint/params, retrievedAt, httpStatus, body and bodyHash. No request headers. Immutable response file plus success index. |
| Verification | propertyId, original sponsorAddress, status, nullable normalized property, evidence, raw candidate set, rawResponseRefs, anomalies and optional stopReason. Null property means no resolved independent record. |
| Comparison | original sponsor projected price; nullable independent AVM/low/high; varianceDollars = sponsor − AVM; variancePercent = difference / AVM × 100; comp count; resolution and comparison statuses; claim/evidence references. |

### RentCast mappings

| Provider field | Normalized field |
| --- | --- |
| id / assessorID | identifiers.rentcastId / identifiers.apn; ATN remains null |
| formattedAddress / county / latitude / longitude | address / county / coordinates |
| propertyType / bedrooms / bathrooms | same named fields |
| squareFootage / lotSize / yearBuilt | squareFeet / lotSize / yearBuilt |
| propertyTaxes / taxAssessments / history | taxes / assessments / saleHistory, unchanged provider objects |
| lastSaleDate / lastSalePrice / features / legalDescription / zoning | separate material-field evidence when supplied; raw response retained |
| AVM price / priceRangeLow / priceRangeHigh | valuation.price / low / high; no fabricated bounds |
| AVM comparables | all normalized comps in provider order; includes original provider attributes |
| comp price / lastSalePrice / lastSaleDate / listedDate / removedDate | distinct fields; listing price/date never asserted to be a closing |
| comp distance / correlation / daysOnMarket / status | provider metrics without custom ranking or reinterpretation |

Monetary sponsor claims use USD, returns use ratios (0.572 means 57.2%), timeline uses days. Derived arithmetic uses integer cents for sums; ratios remain unrounded except presentation and the three-decimal sponsor reconciliation. Missing fully burdened costs are listed, never assigned zero.

Comparison statuses: NO_INDEPENDENT_EVIDENCE, WITHIN_INDEPENDENT_RANGE, ABOVE_INDEPENDENT_RANGE, BELOW_INDEPENDENT_RANGE, INDEPENDENT_ESTIMATE_ONLY, ADDRESS_AMBIGUOUS. These do not grade investment merit.

Provider mapping references: [property records](https://developers.rentcast.io/reference/property-records), [value estimate](https://developers.rentcast.io/reference/value-estimate). Home Advisor's older Kern inspection command regenerates the Kern dictionary; review this combined file before running that unrelated command.
