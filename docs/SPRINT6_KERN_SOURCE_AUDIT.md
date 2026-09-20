# Sprint 6 Kern Source Audit

Audited: 2026-09-20T23:34:27.790Z
Source file: data/raw/kern_power_to_sell_2026-09-15.csv
SHA-256: 89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3
Bytes: 1159321
Record count (rows excluding header): 11321
Valid-width rows: 11321
Header matches audited schema: yes

## Observed columns

owner_name, atn, parcel_amount_owed, owner_total_owed, source_date, source, source_page

Edition/source names: Kern County Power to Sell Listing
Observed source dates: 2026-09-15
ATN non-null: 11321; unique normalized ATNs: 11316; duplicate ATN values: 5
APN field present: no; APN non-null: 0
Owner name non-null: 11321; distinct normalized names: 9099 (names are not identity keys)
Address/situs fields: none
Source-page non-null: 11321; numeric page range: 1–595
Exact duplicate row groups: 0; extra duplicate rows: 0
Malformed-width rows: 0; malformed critical amount rows: 0

The current artifact contains 11321 records, not an assumed count. No county scraping or provider enrichment was performed. Owner names, identifiers and amounts are not copied into this audit narrative.
