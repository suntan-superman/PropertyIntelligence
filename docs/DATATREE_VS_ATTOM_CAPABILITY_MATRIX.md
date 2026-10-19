# DataTree vs ATTOM Capability Matrix

This matrix remains intentionally incomplete. One exact-address SearchStandard request uniquely resolved the fixture and exactly one TotalView report was returned for the same fixture on 2026-10-07. Statuses below describe this tested fixture/report only, not universal product coverage. First American's written semantic `FullAddress` request guidance superseded the historical Swagger enum blocker.

| Capability | ATTOM Premium API | DataTree UAT API | RentCast | PI/County | Notes |
|---|---|---|---|---|---|
| Property identity | PROVEN (existing POC) | PROVEN for one exact-address fixture (`PropertyId=10668360`) and one TotalView subject match | PROVEN for provider-ready address | PROVEN for county source identities | DataTree parcel string retained separately; no APN9 identity claim |
| Transaction history | PROVEN (existing POC) | TotalView returned 2 subject sales (2025 and 1994) | NOT DOCUMENTED | County evidence only | No broader transaction completeness claim |
| Mortgage | PROVEN (existing POC) | NOT RETURNED by TotalView; other products untested | NOT DOCUMENTED | NOT PROVEN | TotalView transactions contain no separate mortgage; one response only |
| Loan position | PROVEN/field-dependent | NOT RETURNED by TotalView | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| Loan type | PROVEN/field-dependent | NOT RETURNED by TotalView | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| Interest rate | UNKNOWN/field-dependent | NOT RETURNED by TotalView | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| Estimated loan balance | PROVEN (existing POC) | NOT RETURNED by TotalView | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| Home equity | PROVEN/field-dependent | Not returned in TotalView | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| Assignments | NOT PROVEN in tested ATTOM fixture | NOT RETURNED in TotalView response | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| Releases | NOT PROVEN in tested ATTOM fixture | NOT RETURNED in TotalView response | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| Reconveyances | NOT PROVEN in tested ATTOM fixture | NOT RETURNED in TotalView response | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| NOD | PROVEN as zero for fixture | No subject foreclosure details returned; **NOT RETURNED** | NOT DOCUMENTED | NOT PROVEN | Null section is not a zero-record confirmation |
| NTS | PROVEN as zero for fixture | No subject foreclosure details returned; **NOT RETURNED** | NOT DOCUMENTED | NOT PROVEN | Null section is not a zero-record confirmation |
| Auction | PROVEN as zero for fixture | No subject foreclosure details returned; **NOT RETURNED** | NOT DOCUMENTED | NOT PROVEN | Null section is not a zero-record confirmation |
| Foreclosure completion | UNKNOWN | No subject foreclosure details returned in TotalView | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| Open liens | NOT PROVEN in tested ATTOM fixture | TotalView returned involuntary-lien flag true and 2 document refs (Town Lien, Notice); current status/amount not established | NOT DOCUMENTED | NOT PROVEN | Do not infer enforceability or balance from labels |
| Judgment liens | UNKNOWN | Not classified by returned TotalView records | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| Federal tax liens | UNKNOWN | Not classified by returned TotalView records | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| State tax liens | UNKNOWN | Not classified by returned TotalView records | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| Mechanic's liens | UNKNOWN | Not classified by returned TotalView records | NOT DOCUMENTED | NOT PROVEN | Other products untested |
| HOA liens | UNKNOWN | TotalView `LienOnProperty=false`, `CountyDataAvailable=true`; no HOA lien item returned | NOT DOCUMENTED | NOT PROVEN | HOA Lien Report enabled; not separately tested |
| PACE liens | UNKNOWN | TotalView `LienOnProperty=false`, `CountyDataAvailable=true`; no PACE item returned | NOT DOCUMENTED | NOT PROVEN | Other products untested; no broader absence claim |
| Subject listing history/status | UNKNOWN | No subject listing returned: detail null, history empty, nearby-listing array empty | NOT DOCUMENTED | NOT PROVEN | Nearby sales have listing fields; raw status semantics undocumented |
| Recorded documents | PROVEN/field-dependent | Subject sale and involuntary-lien document references returned; `FileLink` not usable | NOT DOCUMENTED | County references only | Image/download retrieval not tested |
| Document images | UNKNOWN | Not tested; FileLink was not usable in TotalView response | NOT DOCUMENTED | NOT PROVEN | Retrieval routes not called |
| Title chain | UNKNOWN | Not established by one TotalView response | NOT DOCUMENTED | NOT PROVEN | Other products untested |

TotalView listing/market evidence: no subject listing record was returned; 10 nearby sales included listing-related fields, with raw statuses not interpreted. TotalView returned no comparable subject AVM. The single recommended next test is **Last Finance Document**, not yet ordered. No provider is ranked or commercially recommended.

