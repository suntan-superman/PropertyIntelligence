# Future Work

- Obtain a documented, authorized public-access method from Kern County for the Assessor Public MapServer, or retry after public access is restored.
- Re-run the live metadata gate before implementing any resolver logic.
- The official public mapping directory still describes Assessor Public Layer 2 (`Parcels Land`) and candidate fields, but indirect configuration data was not used to circumvent the MapServer token requirement.

All application, scoring, valuation, additional-source, and full-enrichment work remains out of scope for POC-1.

## Foundation Sprint 1 follow-up (not implemented)

- Correct RentCast authentication, then resume the first-property gate. Initial property request returned 401; no alternative credentials were attempted after that STOP.
- Authentication was subsequently corrected with Stan's replacement key. Current gate: confirm whether provider `8426 Fantasia Park Way, Riverview, FL 33578` is the intended sponsor `8426 Fantasia Parkway`. Candidate is Manufactured but was not selected; no valuation or Bass request was sent.
- Stan subsequently confirmed Fantasia's full address. Its property and AVM subjects match, with 15 retained comps. Current gate: Bass matches by address but the provider supplies no type or structural/parcel identifiers. Obtain corroborating identity/representation evidence and agree on an appropriate source before resuming Bass. Do not invent subject attributes to force an AVM.
- Review Fantasia's wide provider range and all comps for possible land-tenure differences; no such difference has been established as fact. No comp was removed or repriced.
- Obtain sponsor-confirmed city/state/ZIP and any unit/lot identifier for 131 Joyce Place.
- Assess manufactured/mobile-home coverage using actual property and AVM subject evidence; distinguish home/chattel value from land/park ownership. No property data was available to establish this during the blocked live run.
- Obtain original sponsor package/date, cost support, full holding costs, and clarify supplied three-month rent versus 120-day timeline.
- Verify promissory-note terms, lien instruments/priority, title and the claimed 713 Bryce Drive collateral only in a later authorized scope.
- Preserve all provider comps; investigate whether listing evidence adequately represents the specific park/home tenure before treating it as comparable sale evidence.
- Deal Verification UI, Monte Carlo and investor packages remain gated on Stan/ChatGPT review of actual Florida results.
