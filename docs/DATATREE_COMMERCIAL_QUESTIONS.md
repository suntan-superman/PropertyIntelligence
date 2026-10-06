# First American / DataTree Commercial and Access Questions

These questions are to be sent to First American only after the correct property-data UAT product and contract are identified. No contact was made automatically.

## Access and product scope

1. Please confirm `https://dtapiuat.datatree.com/api` as the authoritative UAT property API base and `https://dtapiuat.datatree.com/swagger/docs/v1` as the current contract URL; the earlier `dtiapiuat.datatree.com` hostname was incorrect.
2. Please provide the authoritative `PropertySearch` filter dictionary: address filter names, operators, value formats, and the meaning of each `SearchType` value (0–5).
3. Are the supplied UAT credentials entitled to all listed property-data endpoints, or are any report products separately gated?
4. What is the supported authentication flow, token lifetime, refresh behavior, and required `bci`/customer identifier header?
4. Which products/packages expose Title Chain, Open Lien, TotalView, Mortgage, Foreclosure, and recorded-document data?
5. Can deep lien/title calls be purchased selectively per property?

## Pricing and limits

6. What is production API pricing and billing unit (request, report, property, document, or package)?
7. Is there a minimum monthly commitment or platform fee?
8. What are UAT and production rate limits, concurrency limits, burst limits, and overage terms?
9. Does nationwide volume pricing become cheaper at scale, and at what tiers?

## Data rights and operations

10. What retention period is permitted for raw responses, normalized fields, document references, and document images?
11. May an authenticated customer display returned data to its analysts/users, and under what attribution requirements?
12. May derived analytics be calculated from the data and combined with ATTOM, RentCast, and county evidence?
13. What caching, refresh, and historical-snapshot rules apply?
14. What attribution, trademark, disclaimer, and audit requirements apply to reports and UI?
15. What are termination/deletion obligations for cached records, raw records, and document images?
16. Are commercial SaaS rights included, or is a separate redistribution/customer-display license required?

