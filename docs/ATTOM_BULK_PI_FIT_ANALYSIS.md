# ATTOM Bulk Fit for Property Intelligence

**Conclusion: `MORE EVIDENCE REQUIRED`.** This assessment is based only on the one local ATTOM SFTP sample and the separate one-property API POC. It is not a purchase recommendation or authorization to integrate.

## 1. Can ATTOM Bulk continuously introduce new PI opportunities?

Potentially. The sample has 32,574 Preforeclosure rows with NOD/NOS/NTS/LIS codes and 6,109 CombinedForeclosure rows with LIS/NTS/NOD/NFS/REO codes. Stable property-level joins use AttomID and overlap is measurable. But a single snapshot cannot distinguish new events from pre-existing rows, prove weekly incremental delivery, or define eligibility/current state. **Capability plausible; continuous discovery not yet proven.**

## 2. Can it detect meaningful changes to existing opportunities?

The fields include record/update/create/recording dates, auction dates, stage codes, and a RecorderDeletes transaction-ID list. Multiple fixture records show different foreclosure stages and auction dates. The data does not tell us whether a changed date is a postponement, correction, or replacement event; missing rows do not prove cancellation. A second delivery and ATTOM's correction/delete contract are required.

## 3. Can Assignments & Releases materially improve mortgage-state confidence?

Yes, as corroborating document-event evidence: AssignmentRelease contains document type, recording/contract/original-mortgage dates, original document identifiers and amounts, mortgage position, and `MortgageTransactionID`. In this sample, the explicit MortgageTransactionID → Recorder.TransactionID match is sparse (128,620 distinct IDs from 2,216,743 unique non-null values). The supplied layout does not decode RTCode values. It can improve evidence when a specific link is present, but it is not yet a complete or authoritative active-loan ledger.

## 4. Can Loan Model replace or reduce PI's need for its own amortization estimator?

Not as a replacement on current evidence. LoanModel has first/second/third position amount fields plus LTV and available/lendable equity, but the non-zero field rates vary greatly by position and its layout/sample does not establish calculation method, current balance versus original balance, as-of date semantics, refinance treatment, or accuracy. It can be benchmarked as independent modeled evidence after definitions and legal rights are confirmed. Keep PI's estimator and ATTOM's model separate until validated.

## 5. Can Recorder provide sufficient underlying provenance?

It is a useful source for five-county transaction/document evidence: unique in-delivery TransactionID, document identifiers/types, recording dates, mortgage summaries, ATTOM IDs, parcel values, and party fields. It is not enough to certify complete title/encumbrance provenance: only one bounded history window was supplied; document images, complete chain, standardized code dictionary, corrected/deleted history, and event-ID stability were not demonstrated. The current sample also contains sensitive owner/borrower/contact fields and should remain restricted.

## 6. What remains unresolved for liens/title?

The sample does not establish comprehensive current judgment, tax, mechanic's, HOA, PACE, municipal, or other encumbrances; legal priority; payoff/release completion; title chain; or whether a foreclosure is legally effective/active. No event's absence is evidence of no lien. Obtain explicit product and jurisdiction coverage, source-record access, status semantics, and legal-use/retention terms.

## 7. Which gaps still justify First American evaluation?

Continue vendor-neutral evaluation of First American/DataTree for title/encumbrance breadth, recorder document retrieval/images, county coverage, update timing, lien search, and authoritative status/record support—especially where ATTOM's current and Bulk POCs show gaps. Compare equivalent county/property fixtures, response completeness, accuracy, licensing, API/SFTP charges, retention rights, service levels, and required manual work. This does not recommend purchasing either provider.

## 8. What must a real second/delta delivery prove?

Using the same geography and a known delivery sequence, reconcile source hashes/counts and demonstrate:

- new, unchanged, corrected, and removed records with stable event identifiers;
- exact replay is idempotent and cannot duplicate or silently rewrite an event;
- a changed auction date is represented with clear prior/new values and effective/observed timestamps;
- postponement, rescission/cancellation, completed sale, trustee deed/REO and record-delete cases are explicit and distinguishable;
- RecorderDeletes points to a stable prior record and supplies its required reason/state/timing;
- AssignmentRelease linkage to the original Recorder mortgage and LoanModel positions is explained;
- publication, extraction, delivery, and event-effective dates have distinct documented meanings;
- file/schema corrections are versioned, geographies reconcile, and no unexpected population enters unnoticed.

Do not test those cases by changing PI production data; require ATTOM's controlled second delivery and vendor documentation.

## 9. Is the schema sufficiently normalized for expansion beyond Kern?

It is promising: the five sampled counties share field names, use FIPS, and join through ATTOM ID. It is not yet certified nationwide. Field sparsity differs by county (for example CombinedForeclosure AuctionDate ranges from 2.70% in Duval to 97.13% in Douglas), type mismatches exist, code dictionaries are missing, and one FIPS 55017 row lies outside the stated geography. Validate additional regions and multiple deliveries before claiming portability or writing jurisdiction adapters.

## Recommendation

Continue only with written dictionary/identity answers and the controlled second-delivery proof plan. The existing exact-address API identity for the 3484 Haven fixture does not solve bulk delta, lien completeness, title, event identity, or licensing questions. Do not purchase ATTOM or implement the production importer based on this POC.
