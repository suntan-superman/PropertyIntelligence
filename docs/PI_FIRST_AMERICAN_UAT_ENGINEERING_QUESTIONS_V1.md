# PI First American UAT Engineering Questions V1

Date: 2026-10-14  
Purpose: obtain vendor-authored answers required for a minimal, controlled UAT

Please answer with a current request/response example or versioned schema wherever possible. PI will not infer product selectors, filter names, enum meanings, or prices.

## P0 — executable discovery contract

1. Is **Advanced Search** a distinct API product/endpoint, or is it implemented through `POST /api/Report/GetFlexSearch`? Please provide the exact UAT URL, HTTP method, product identifier, headers, and complete JSON body.
2. Please provide one UAT example for ZIP `93312` limited to Kern County residential/SFR properties and a supported distress condition.
3. What exact filter names, operators, and values represent:
   - ZIP, county/FIPS, and residential/SFR;
   - Notice of Default or preforeclosure;
   - Notice of Trustee Sale, scheduled auction, postponement, cancellation, rescission, completed sale, and later arms-length sale;
   - filing, recording, publication, auction, and status-effective date ranges?
4. Please provide the event/status/code dictionary and explain which field represents current status versus historical events. Are rescissions, releases, cancellations, postponements, and subsequent sale-status changes retained?
5. What fields identify a result: DataTree PropertyId, First American geocode ID, APN, FIPS, standardized address, source document ID, event ID, and order/reference ID?
6. How are maximum results, deterministic sorting, total count, cursors/pages, truncation, and batch size specified? What are the hard record and request limits?
7. Please provide representative validation, authorization, no-match, over-limit, throttling, timeout, and product-not-entitled error responses.

## P0 — report and document selectors

8. Confirm whether `?Ver=1.0` is required for `GetReport`, `GetDocument`, and `ExportReport`, and explain version compatibility.
9. Confirm the exact `ProductNames` wire values and supported search methods for:
   - TotalView Report;
   - Foreclosure Report;
   - Open Lien Report;
   - Last Finance Document.
10. For Foreclosure Report, provide a full request/response example and field definitions for NOD, trustee sale, auction, postponement, rescission/cancellation, completed foreclosure, release, and subsequent sale. Explain coverage and current-status derivation.
11. Is Open Lien Report enabled for the Workside UAT account? Provide its request/response example and definitions for lien type, amount, priority, status, release/satisfaction, document relationship, and as-of date.
12. For Last Finance Document, provide the exact `GetDocument` body. Does it accept FullAddress, DataTree PropertyId, or a document/order identifier? Is a prior property/document search required?
13. Does Last Finance initially return metadata, document image/PDF, extracted fields, or a download link? Which download route applies, how long does the link remain valid, and are the order and download billed separately?
14. For mortgage evidence, distinguish the recorded original amount, any foreclosure unpaid-balance value, current/estimated balance, and payoff. Confirm the methodology/as-of date for algorithmic outstanding-balance estimates and that they are not lender-verified payoffs.

## P0 — export behavior

15. Provide exact product/add-on identifiers and request examples for Foreclosure Detail Export, Open Lien Export, and Property Detail Export.
16. What output formats are available? Is export synchronous or asynchronous, which status endpoint applies, and how is the resulting file downloaded?
17. What are the record, file-size, geographic, date-window, concurrency, polling, and retention limits? How are partial failures and duplicate records represented?

## P0 — pricing, limits, and rights

18. Which requests are billable: authentication, search, report order, document order, status polling, image/PDF download, and export download? Please provide the Workside-specific UAT allowance and production prices. The previously shared pricing table was withdrawn as belonging to another client and will not be used.
19. What are the UAT and production rate, concurrency, daily/monthly, result, report, document, and export limits? Are unsuccessful, no-match, throttled, or validation-error requests charged?
20. Confirm the Workside account's current product entitlements, including Advanced Search, Flex Search, TotalView, Foreclosure Report, Open Lien Report, Last Finance Document, and export add-ons.
21. Please provide the applicable license terms for retaining raw responses, normalized fields, identifiers, event history, modeled balances, extracted document metadata, and document images.
22. The stated investor-facing requirement is access through a password-protected website or interface. Please clarify whether authorized users may download PDFs, forward reports, export fields, or receive emailed attachments, and identify any attribution, redistribution, audit, termination, revocation, or deletion obligations.
23. May PI combine permitted DataTree evidence with county, ATTOM, and RentCast evidence and display derived analysis to authenticated commercial SaaS users?

## P1 — completeness and operations

24. What are the coverage start dates, refresh frequency, source latency, correction policy, and known county/product exclusions for Kern County?
25. How should PI detect corrected, superseded, rescinded, released, or deleted events while retaining historical lineage?
26. Is DataTree PropertyId stable across product endpoints and parcel/address changes? How are parcel splits, merges, renumbering, and multiple situs addresses represented?
27. Which source/as-of timestamps should PI retain for reproducibility, and does the response include a schema/product version?
28. What polling interval and terminal states are supported for report/document/export orders? Which failures are safe to retry, and can an idempotency key prevent duplicate billing?
29. Can First American provide a sanitized UAT fixture that exercises an NOD, a trustee-sale lifecycle change, a rescission/cancellation or release, a recorded finance document, and a subsequent sale?

## Requested vendor package

The smallest package that would clear the technical gate is:

1. a current OpenAPI/Swagger file or versioned endpoint excerpts;
2. one complete Advanced/Flex Search ZIP-distress example;
3. one Foreclosure Report example;
4. one Open Lien Report example and entitlement confirmation;
5. one Last Finance Document order-and-download example;
6. one ExportReport example with limits;
7. the code dictionaries, Workside-specific pricing/entitlements, and applicable use-rights terms.

Until those P0 items are answered, the classification remains **`ADDITIONAL_DOCUMENTATION_REQUIRED`**.

