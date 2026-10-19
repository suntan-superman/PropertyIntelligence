# First American / DataTree Commercial and Access Questions

These are prospective vendor questions only; no contact was made automatically as part of this POC. The property UAT host/SearchStandard contract and one TotalView request are now empirically verified for the 3484 Haven fixture. First American's written GetReport semantic guidance was used exactly; no enum integer was guessed.

## Access and product scope

1. Please confirm the documented semantic `SearchType="FullAddress"` and `ProductNames=["TotalViewReport"]` example is the supported production-equivalent request contract for this UAT package; the single UAT call succeeded.
2. Does TotalView intend `ListingPropertyDetail`/`ListingHistory` empty for a subject with no listing in the vendor's source, or can these sections be unavailable independently of the empty array/null values returned here?
3. What do nearby-sales `PropertyStatus` codes mean, and are `0001-01-01` dates / zero prices sentinel values? No semantics were inferred from this sample.
4. Does `InvoluntaryLienInfo` represent recorded documents regardless of current enforceability? For the returned Town Lien and Notice records, what source/refresh/status fields establish whether an item remains open?
5. Are the supplied UAT credentials entitled to all listed property-data endpoints, or are any report products separately gated?
6. What is the supported authentication flow, token lifetime, refresh behavior, and required `bci`/customer identifier header?
7. Which products/packages expose Title Chain, Open Lien, TotalView, Mortgage, Foreclosure, and recorded-document data?
8. Can deep lien/title calls be purchased selectively per property?
9. Please provide the exact API request for the Last Finance Document product: whether it must use `GetDocument` or `GetReport`, its exact `ProductNames` wire value, whether the proven semantic `SearchType="FullAddress"` body is accepted for this product, and the document metadata/rights returned. No value or route is inferred from the display label.

## Pricing and limits

9. What is production API pricing and billing unit (request, report, property, document, or package)?
10. Is there a minimum monthly commitment or platform fee?
11. What are UAT and production rate limits, concurrency limits, burst limits, and overage terms?
12. Does nationwide volume pricing become cheaper at scale, and at what tiers?

## Data rights and operations

13. What retention period is permitted for raw responses, normalized fields, document references, and document images?
14. May an authenticated customer display returned data to its analysts/users, and under what attribution requirements?
15. May derived analytics be calculated from the data and combined with ATTOM, RentCast, and county evidence?
16. What caching, refresh, and historical-snapshot rules apply?
17. What attribution, trademark, disclaimer, and audit requirements apply to reports and UI?
18. What are termination/deletion obligations for cached records, raw records, and document images?
19. Are commercial SaaS rights included, or is a separate redistribution/customer-display license required?

