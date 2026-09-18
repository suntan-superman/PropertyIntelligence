# Sprint 2 scenario catalog

Base case: preserved sponsor inputs, $3,000 supplied rent and fixed-dollar $5,000 commission / $2,000 escrow. All scenarios exclude material unknown costs and assign no probability. See SPRINT2_ANALYTICAL_MODEL.md for formulas and the 30-day holding convention.

| ID | Description | Overrides | Sale evidence basis |
| --- | --- | --- | --- |
| SPONSOR_CASE | Sponsor case | {} | SPONSOR_ONLY_CONFLICTING_WITH_PROVIDER_RANGE |
| INDEPENDENT_AVM_POINT | Independent AVM point | {"salePrice":122000} | INDEPENDENT_ESTIMATE_UNVERIFIED |
| INDEPENDENT_AVM_LOW | Independent AVM low | {"salePrice":40000} | INDEPENDENT_ESTIMATE_UNVERIFIED |
| INDEPENDENT_AVM_HIGH | Independent AVM high | {"salePrice":204000} | INDEPENDENT_ESTIMATE_UNVERIFIED |
| SALE_MINUS_5 | Sponsor sale -5% | {"salePrice":265050} | HYPOTHETICAL_DETERMINISTIC |
| SALE_MINUS_10 | Sponsor sale -10% | {"salePrice":251100} | HYPOTHETICAL_DETERMINISTIC |
| SALE_MINUS_15 | Sponsor sale -15% | {"salePrice":237150} | HYPOTHETICAL_DETERMINISTIC |
| SALE_MINUS_20 | Sponsor sale -20% | {"salePrice":223200} | HYPOTHETICAL_DETERMINISTIC |
| REPAIR_PLUS_20 | Repairs +20% at sponsor sale | {"repairs":12000} | SPONSOR_ONLY_CONFLICTING_WITH_PROVIDER_RANGE |
| REPAIR_PLUS_50 | Repairs +50% at sponsor sale | {"repairs":15000} | SPONSOR_ONLY_CONFLICTING_WITH_PROVIDER_RANGE |
| REPAIR_PLUS_100 | Repairs +100% at sponsor sale | {"repairs":20000} | SPONSOR_ONLY_CONFLICTING_WITH_PROVIDER_RANGE |
| AVM_HIGH_REPAIR_PLUS_0 | AVM high, repairs +0% | {"salePrice":204000,"repairs":10000} | INDEPENDENT_ESTIMATE_UNVERIFIED |
| AVM_HIGH_REPAIR_PLUS_20 | AVM high, repairs +20% | {"salePrice":204000,"repairs":12000} | INDEPENDENT_ESTIMATE_UNVERIFIED |
| AVM_HIGH_REPAIR_PLUS_50 | AVM high, repairs +50% | {"salePrice":204000,"repairs":15000} | INDEPENDENT_ESTIMATE_UNVERIFIED |
| COMBINED_10_20 | Sale -10%, repairs +20% | {"salePrice":251100,"repairs":12000} | HYPOTHETICAL_DETERMINISTIC |
| COMBINED_15_50 | Sale -15%, repairs +50% | {"salePrice":237150,"repairs":15000} | HYPOTHETICAL_DETERMINISTIC |
| COMBINED_20_100 | Sale -20%, repairs +100% | {"salePrice":223200,"repairs":20000} | HYPOTHETICAL_DETERMINISTIC |
| HOLD_120 | Replace the 3-month rent with derived monthly rent × days/30; all other unknown holding costs excluded. | {"holdDays":120} | SPONSOR_ONLY_CONFLICTING_WITH_PROVIDER_RANGE |
| HOLD_150 | Replace the 3-month rent with derived monthly rent × days/30; all other unknown holding costs excluded. | {"holdDays":150} | SPONSOR_ONLY_CONFLICTING_WITH_PROVIDER_RANGE |
| HOLD_180 | Replace the 3-month rent with derived monthly rent × days/30; all other unknown holding costs excluded. | {"holdDays":180} | SPONSOR_ONLY_CONFLICTING_WITH_PROVIDER_RANGE |
| HOLD_240 | Replace the 3-month rent with derived monthly rent × days/30; all other unknown holding costs excluded. | {"holdDays":240} | SPONSOR_ONLY_CONFLICTING_WITH_PROVIDER_RANGE |

Sensitivity grids: sale −30/−25/−20/−15/−10/−5/0/+5%; repairs −20/0/+20/+50/+100/+150%; hold 90/120/150/180/240 days. Matrix rows: sponsor, −10%, −20%, AVM high, AVM point. Columns: base repairs, +20%, +50%, +100%.
