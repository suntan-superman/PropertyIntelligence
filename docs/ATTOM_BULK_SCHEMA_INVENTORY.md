# ATTOM Bulk Schema Inventory

Generated from the local read-only sample. Field values are never included.

| Dataset | Rows | JSON layout | Layout parse |
|---|---:|---|---|
| Recorder | 1,230,016 | `Recorder.json` | VALID |
| RecorderDeletes | 166,532 | `RecorderDeletes.json` | VALID |
| AssignmentRelease | 3,865,063 | `AssignmentRelease.json` | VALID |
| CombinedForeclosure | 6,109 | `CombinedForeclosure.json` | INVALID source JSON; in-memory diagnostic normalization only |
| LoanModel | 1,187,700 | `LoanModel.json` | VALID |
| Preforeclosure | 32,574 | `Foreclosure.json` | VALID |

Status classifications: `MATCH` = exact field name and compatible type; `PARQUET_ONLY` = field absent from the JSON layout; `JSON_ONLY` = layout field absent from Parquet; `TYPE_MISMATCH` = same exact field name with incompatible declared/physical type. JSON nullable values are vendor declarations; Parquet nullability is inferred from the physical schema. Case is significant for reporting.

## Recorder

Rows: **1,230,016**; JSON fields: **238**; Parquet fields: **238**; Parquet layout table: `Recorder`; declared key: `TransactionID`.

| Field | JSON type | JSON nullable | Parquet type | Parquet nullable | Status | Description (ATTOM layout) |
|---|---|---|---|---|---|---|
| `APNFormatted` | string | True | VARCHAR | True | MATCH | Primary Parcel Number; candidate: parcel identity |
| `APNOriginal` | string | True | VARCHAR | True | MATCH | Legacy Parcel - Depricated - No longer supported.; candidate: parcel identity |
| `ATTOMID` | integer | False | INTEGER | True | MATCH | ATTOM Data's Unique parcel identifier.; candidate: candidate property join |
| `ArmsLengthFlag` | integer | True | INTEGER | True | MATCH | Deed representing a transfer between two otherwise unrelated or affiliated parties. |
| `Book` | string | True | VARCHAR | True | MATCH | The transaction document number book (parsed). Can contain either the Recorder document book or the legal description book as provided on the document. |
| `DocumentNumberFormatted` | string | True | VARCHAR | True | MATCH | Document number created from document book/page or instrument number. Provided to enable a single column reference.; candidate: transaction/document linkage |
| `DocumentNumberLegacy` | string | True | VARCHAR | True | MATCH | Contains the document number from previous platform(s), if different than the current value in DocumentNumberFormatted.; candidate: transaction/document linkage |
| `DocumentRecordingCountyFIPs` | string | True | VARCHAR | True | MATCH | 5 digit numeric Federal Information Processing Standard (FIPS) code combining state and county codes where the document is recorded.; candidate: county identity |
| `DocumentRecordingCountyName` | string | True | VARCHAR | True | MATCH | The county name associated with the Federal Information Processing Standards (FIPS) county code. |
| `DocumentRecordingJurisdictionName` | string | True | VARCHAR | True | MATCH | Name of the tax jurisdiction. This is typically the county with some exceptions. Exceptions are primarily in the New England area where the townships are the taxing authorities. |
| `DocumentRecordingStateCode` | string | True | VARCHAR | True | MATCH | The USPS standardized abbreviation for the state where the document was recorded. |
| `DocumentTypeCode` | string | True | VARCHAR | True | MATCH | Code identifying the type of document; grant deed, quit claim, etc.; candidate: status/type |
| `ForeclosureAuctionSale` | integer | True | BOOLEAN | True | TYPE_MISMATCH | Indicates that the transaction was the result of a foreclosure auction. |
| `Grantee1InfoEntityClassification` | string | True | VARCHAR | True | MATCH | Derived field describing the type of entity based on examination of the name and vesting. |
| `Grantee1InfoOwnerType` | string | True | VARCHAR | True | MATCH | Owner relationship type, i.e. married man, beneficiary, etc.; candidate: status/type |
| `Grantee1NameFirst` | string | True | VARCHAR | True | MATCH | First name of the first individual on the recorded document. |
| `Grantee1NameFull` | string | True | VARCHAR | True | MATCH | Full name of the first individual on the recorded document. |
| `Grantee1NameLast` | string | True | VARCHAR | True | MATCH | Last name of the first buyer listed on the recorded document. If name is a company, the name will be present in this field. |
| `Grantee1NameMiddle` | string | True | VARCHAR | True | MATCH | Middle name or middle initial of the first individual listed on the recorded document. |
| `Grantee1NameSuffix` | string | True | VARCHAR | True | MATCH | Suffix of the first individual listed on the recorded document. |
| `Grantee2InfoEntityClassification` | string | True | VARCHAR | True | MATCH | Derived field describing the type of entity based on examination of the name and vesting. |
| `Grantee2NameFirst` | string | True | VARCHAR | True | MATCH | First name of the second individual on the recorded document. Left blank if entity is not defined as an individual. |
| `Grantee2NameFull` | string | True | VARCHAR | True | MATCH | Full name of the second individual on the recorded document. |
| `Grantee2NameLast` | string | True | VARCHAR | True | MATCH | Last name of the second individual listed on the recorded document. If the entity is not an individual, will contain the full entity name. |
| `Grantee2NameMiddle` | string | True | VARCHAR | True | MATCH | Middle name or middle initial of the second individual listed on the recorded document. |
| `Grantee2NameSuffix` | string | True | VARCHAR | True | MATCH | Suffix of the second buyer listed on the recorded document. |
| `Grantee3InfoEntityClassification` | string | True | VARCHAR | True | MATCH | Derived field describing the type of entity based on examination of the name and vesting. |
| `Grantee3NameFirst` | string | True | VARCHAR | True | MATCH | First name of the third individual on the recorded document. Left blank if entity is not defined as an individual. |
| `Grantee3NameFull` | string | True | VARCHAR | True | MATCH | Full name of the third individual on the recorded document. |
| `Grantee3NameLast` | string | True | VARCHAR | True | MATCH | Last name of the third individual listed on the recorded document. If the entity is not an individual, will contain the full entity name. |
| `Grantee3NameMiddle` | string | True | VARCHAR | True | MATCH | Middle name or middle initial of the third individual listed on the recorded document. |
| `Grantee3NameSuffix` | string | True | VARCHAR | True | MATCH | Suffix of the third individual listed on the recorded document. |
| `Grantee4InfoEntityClassification` | string | True | VARCHAR | True | MATCH | Derived field describing the type of entity based on examination of the name and vesting. |
| `Grantee4NameFirst` | string | True | VARCHAR | True | MATCH | First name of the fourth individual on the recorded document. Left blank if entity is not defined as an individual. |
| `Grantee4NameFull` | string | True | VARCHAR | True | MATCH | Full name of the fourth individual on the recorded document. |
| `Grantee4NameLast` | string | True | VARCHAR | True | MATCH | Last name of the fourth individual listed on the recorded document. If the entity is not an individual, will contain the full entity name. |
| `Grantee4NameMiddle` | string | True | VARCHAR | True | MATCH | Middle name or middle initial of the fourth individual listed on the recorded document. |
| `Grantee4NameSuffix` | string | True | VARCHAR | True | MATCH | Suffix of the fourth individual listed on the recorded document. |
| `GranteeGrantorOwnerRelationshipCode` | string | True | VARCHAR | True | MATCH | Identifies the relationship, if any, between the grantee and the grantor |
| `GranteeInfoEntityCount` | integer | True | INTEGER | True | MATCH | Count of all the distinct entities found on the Deed. |
| `GranteeInfoVesting1` | string | True | VARCHAR | True | MATCH | Identifies the legal co-ownership method when more than one party is named as the Grantee on the recorded document. In cases where a single Grantee is listed, Sole Ownership is implied. |
| `GranteeInfoVesting2` | string | True | VARCHAR | True | MATCH | Identifies the legal co-ownership method when more than one party is named as the Grantee on a deed. In cases where a single Grantee is listed, Sole Ownership is implied. |
| `GranteeInvestorFlag` | integer | True | BOOLEAN | True | TYPE_MISMATCH | Non-lending entity with more than 10 purchases in a calendar year. The 10th transaction (and any transaction thereafter) will have this flag set to 1. |
| `GranteeMailAddressCRRT` | string | True | VARCHAR | True | MATCH | Carrier route segment of the mailing address. |
| `GranteeMailAddressCity` | string | True | VARCHAR | True | MATCH | City segment of the mailing address. |
| `GranteeMailAddressFull` | string | True | VARCHAR | True | MATCH | Full Mailing address of buyer(s) or borrower(s) on the recorded document. |
| `GranteeMailAddressHouseNumber` | string | True | VARCHAR | True | MATCH | House number and fraction segment of the mailing address. |
| `GranteeMailAddressInfoFormat` | string | True | VARCHAR | True | MATCH | Derived field. Code to indicate the classification of the address. Examples include U.S. Standard, PO Box, and Rural Route. |
| `GranteeMailAddressInfoPrivacy` | integer | True | BOOLEAN | True | TYPE_MISMATCH | Identifies if legal restrictions may apply in order to limit direct marketing campaigns. (Not associated with the DMAA's "No Mail" list ) |
| `GranteeMailAddressState` | string | True | VARCHAR | True | MATCH | Two character State segment of the mailing address. |
| `GranteeMailAddressStreetDirection` | string | True | VARCHAR | True | MATCH | Street direction segment of the mailing address. |
| `GranteeMailAddressStreetName` | string | True | VARCHAR | True | MATCH | Street name segment of the mailing address. |
| `GranteeMailAddressStreetPostDirection` | string | True | VARCHAR | True | MATCH | Street post direction segment of the mailing address. |
| `GranteeMailAddressStreetSuffix` | string | True | VARCHAR | True | MATCH | Street suffix segment of the mailing address. |
| `GranteeMailAddressUnitPrefix` | string | True | VARCHAR | True | MATCH | Unit prefix segment of the mailing address. |
| `GranteeMailAddressUnitValue` | string | True | VARCHAR | True | MATCH | Unit value segment of the mailing address. |
| `GranteeMailAddressZIP` | string | True | VARCHAR | True | MATCH | Five Digit ZIP Code segment of the mailing address. |
| `GranteeMailAddressZIP4` | string | True | VARCHAR | True | MATCH | ZIP-4 segment of the mailing address. |
| `GranteeMailCareOfName` | string | True | VARCHAR | True | MATCH | Alternate or Care Of name used by the grantee. |
| `Grantor1InfoEntityClassification` | string | True | VARCHAR | True | MATCH | Derived field describing what type of entity the party is based on examination of the name and vesting. Sample values include individual / trust / company. |
| `Grantor1InfoOwnerType` | string | True | VARCHAR | True | MATCH | Owner relationship type, i.e. married man, beneficiary, etc.; candidate: status/type |
| `Grantor1NameFirst` | string | True | VARCHAR | True | MATCH | First name of the first seller listed on the deed. |
| `Grantor1NameFull` | string | True | VARCHAR | True | MATCH | Full name of the first seller listed on the deed. |
| `Grantor1NameLast` | string | True | VARCHAR | True | MATCH | Last name of the first seller listed on the deed. |
| `Grantor1NameMiddle` | string | True | VARCHAR | True | MATCH | Middle name or middle initial of the first seller listed on the deed. |
| `Grantor1NameSuffix` | string | True | VARCHAR | True | MATCH | Suffix (Jr, III, etc.) of the first seller listed on the deed. |
| `Grantor2InfoEntityClassification` | string | True | VARCHAR | True | MATCH | Derived field describing what type of entity the party is based on examination of the name and vesting. Sample values include individual / trust / company. |
| `Grantor2InfoOwnerType` | string | True | VARCHAR | True | MATCH | Owner relationship type, i.e. married man, beneficiary, etc.; candidate: status/type |
| `Grantor2NameFirst` | string | True | VARCHAR | True | MATCH | First name of the second seller listed on the deed. |
| `Grantor2NameFull` | string | True | VARCHAR | True | MATCH | Full name of the second seller listed on the deed. |
| `Grantor2NameLast` | string | True | VARCHAR | True | MATCH | Last name of the second seller listed on the deed. |
| `Grantor2NameMiddle` | string | True | VARCHAR | True | MATCH | Middle name or middle initial of the second seller listed on the deed. |
| `Grantor2NameSuffix` | string | True | VARCHAR | True | MATCH | Suffix (Jr, III, etc.) of the second seller listed on the deed. |
| `Grantor3InfoEntityClassification` | string | True | VARCHAR | True | MATCH | Derived field describing what type of entity the party is based on examination of the name and vesting. Sample values include individual / trust / company. |
| `Grantor3NameFirst` | string | True | VARCHAR | True | MATCH | First name of the third seller listed on the deed. |
| `Grantor3NameFull` | string | True | VARCHAR | True | MATCH | Full name of the third seller listed on the deed. |
| `Grantor3NameLast` | string | True | VARCHAR | True | MATCH | Last name of the third seller listed on the deed. |
| `Grantor3NameMiddle` | string | True | VARCHAR | True | MATCH | Middle name or middle initial of the third seller listed on the deed. |
| `Grantor3NameSuffix` | string | True | VARCHAR | True | MATCH | Suffix (Jr, III, etc.) of the third seller listed on the deed. |
| `Grantor4InfoEntityClassification` | string | True | VARCHAR | True | MATCH | Derived field describing what type of entity the party is based on examination of the name and vesting. Sample values include individual / trust / company. |
| `Grantor4NameFirst` | string | True | VARCHAR | True | MATCH | First name of the fourth seller listed on the deed. |
| `Grantor4NameFull` | string | True | VARCHAR | True | MATCH | Full name of the fourth seller listed on the deed. |
| `Grantor4NameLast` | string | True | VARCHAR | True | MATCH | Last name of the fourth seller listed on the deed. |
| `Grantor4NameMiddle` | string | True | VARCHAR | True | MATCH | Middle name or middle initial of the fourth seller listed on the deed. |
| `Grantor4NameSuffix` | string | True | VARCHAR | True | MATCH | Suffix (Jr, III, etc.) of the fourth seller listed on the deed. |
| `GrantorAddressCRRT` | string | True | VARCHAR | True | MATCH | The carrier route of the address on the deed. |
| `GrantorAddressCity` | string | True | VARCHAR | True | MATCH | The city of the address on the deed. |
| `GrantorAddressFull` | string | True | VARCHAR | True | MATCH | Full unparsed address on the deed. |
| `GrantorAddressHouseNumber` | string | True | VARCHAR | True | MATCH | The house number and fraction of the address on the deed. |
| `GrantorAddressInfoFormat` | string | True | VARCHAR | True | MATCH | Standard U.S., PO Box, Rural Route, etc. |
| `GrantorAddressInfoPrivacy` | integer | True | BOOLEAN | True | TYPE_MISMATCH | Identifies if legal restrictions may apply in order to limit direct marketing campaigns. (Not associated with the DMAA's "No Mail" list ) |
| `GrantorAddressState` | string | True | VARCHAR | True | MATCH | The state of the address on the deed. |
| `GrantorAddressStreetDirection` | string | True | VARCHAR | True | MATCH | The street direction of the address on the deed. |
| `GrantorAddressStreetName` | string | True | VARCHAR | True | MATCH | The street name of the address on the deed. |
| `GrantorAddressStreetPostDirection` | string | True | VARCHAR | True | MATCH | The street post direction of the address on the deed. |
| `GrantorAddressStreetSuffix` | string | True | VARCHAR | True | MATCH | The street suffix of the address on the deed. |
| `GrantorAddressUnitPrefix` | string | True | VARCHAR | True | MATCH | The unit prefix of the address on the deed. |
| `GrantorAddressUnitValue` | string | True | VARCHAR | True | MATCH | The unit value of the address on the deed. |
| `GrantorAddressZIP` | string | True | VARCHAR | True | MATCH | The zip of the address on the deed. |
| `GrantorAddressZIP4` | string | True | VARCHAR | True | MATCH | The zip+4 of the address on the deed. |
| `InstrumentDate` | date | True | DATE | True | MATCH | The date that the document was executed by the parties. May be the same or pre-date the recording date.; candidate: date/time |
| `InstrumentNumber` | string | True | VARCHAR | True | MATCH | When the county indexes by a recorder's reference in the document or instrument format, this field will contain that value. Typical instructions call for the recording year to not be added to this field unless there are regional requirements. A stamped value of 2012 - 00012345 will generally be delivered as 12345.; candidate: transaction/document linkage |
| `LastUpdated` | date | True | DATE | True | MATCH | Date on which this record was updated due to a correction within any of the fields and/or update to the same.; candidate: date/time |
| `LegalBlock` | string | True | VARCHAR | True | MATCH | The legal block number(s) associated with the subject property, or portions thereof |
| `LegalDescriptionPart1` | string | True | VARCHAR | True | MATCH | Maps to the LegalLot, LegalBlock, LegalTract and LegalUnit where both are populated. Where the parsed fields do not contain a value, this value is populated based on jurisdictional rules. |
| `LegalDescriptionPart2` | string | True | VARCHAR | True | MATCH | Maps to the Legasubdivision where both are populated. Where the parsed fields do not contain a value, this value is populated based on jurisdictional rules. |
| `LegalDescriptionPart3` | string | True | VARCHAR | True | MATCH | Maps to the LegalPlatMapBook and LegalPlatMapPage where both are populated. Where the parsed fields do not contain a value, this value is populated based on jurisdictional rules. |
| `LegalDescriptionPart4` | string | True | VARCHAR | True | MATCH | Maps to the LegalSection, LegalTownship and LegalRange where both are populated. Where the parsed fields do not contain a value, this value is populated based on jurisdictional rules. |
| `LegalDistrict` | string | True | VARCHAR | True | MATCH | The district in which the property is located. |
| `LegalLot` | string | True | VARCHAR | True | MATCH | The legal lot number(s) associated with the subject property, or portions thereof. |
| `LegalPlatMapBook` | string | True | VARCHAR | True | MATCH | The plat map book where the parcel plat map is located |
| `LegalPlatMapPage` | string | True | VARCHAR | True | MATCH | The plat map book where the parcel page map is located |
| `LegalRange` | string | True | VARCHAR | True | MATCH | The Range segment in relationship to the Public Land Survey System (Section/Township/Range) |
| `LegalSection` | string | True | VARCHAR | True | MATCH | The Section segment in relationship to the Public Land Survey System (Section/Township/Range) |
| `LegalSubDivision` | string | True | VARCHAR | True | MATCH | The name of the subdivision, plat, or tract in which the property is located. |
| `LegalTownship` | string | True | VARCHAR | True | MATCH | The Township segment in relationship to the Public Land Survey System (Section/Township/Range) |
| `LegalTract` | string | True | VARCHAR | True | MATCH | The number of the tract in which the property is located. Followed by "POR" (portion of) when applicable. |
| `LegalUnit` | string | True | VARCHAR | True | MATCH | The subdivision unit number. Common for condominiums, townhomes, etc. Not necessarily the same as the Property Unit Number |
| `Mortgage1AdjustableRateIndex` | string | True | VARCHAR | True | MATCH | The benchmark interest rate to which an adjustable rate mortgage is tied; candidate: mortgage/loan |
| `Mortgage1Amount` | integer | True | INTEGER | True | MATCH | Loan Amount for the 1st mortgage/deed of trust.; candidate: mortgage/loan |
| `Mortgage1Book` | string | True | VARCHAR | True | MATCH | The instrument's book number referenced/stamped for the 1st mortgage/deed of trust.; candidate: mortgage/loan |
| `Mortgage1DocumentInfoRiderAdjustableRateFlag` | string | True | VARCHAR | True | MATCH | Flag to indicate if an adjustable rate rider was part of the document.; candidate: mortgage/loan |
| `Mortgage1DocumentNumberFormatted` | string | True | VARCHAR | True | MATCH | Document number created from document book/page or instrument number. Provided to enable a single column reference. Raw data are delivered in 3 additional columns.; candidate: transaction/document linkage, mortgage/loan |
| `Mortgage1DocumentNumberLegacy` | string | True | VARCHAR | True | MATCH | Contains the loan instrument or book/page number stamped or printed on the first sequence trust deed that is recorded with the purchase transaction.; candidate: transaction/document linkage, mortgage/loan |
| `Mortgage1FixedStepConversionRate` | string | True | VARCHAR | True | MATCH | The rate to which the interest will change in a fixed step conversion mortgage.; candidate: mortgage/loan |
| `Mortgage1InfoInterestTypeChangeDay` | integer | True | INTEGER | True | MATCH | The day of the month the loan converts from fixed rate to adjustable rate. Month and year of the conversion, if known, are housed in separate fields.; candidate: status/type, mortgage/loan |
| `Mortgage1InfoInterestTypeChangeMonth` | integer | True | INTEGER | True | MATCH | The month the loan converts from fixed rate to adjustable rate. Year and day of the conversion, if known, are housed in separate fields.; candidate: status/type, mortgage/loan |
| `Mortgage1InfoInterestTypeChangeYear` | integer | True | INTEGER | True | MATCH | The year the loan converts from fixed rate to adjustable rate. Month and day of the conversion, if known, are housed in separate fields.; candidate: status/type, mortgage/loan |
| `Mortgage1InfoPrepaymentPenaltyFlag` | string | True | VARCHAR | True | MATCH | Flag to indicate if the loan terms includes pre-payment penalty.; candidate: mortgage/loan |
| `Mortgage1InfoPrepaymentTerm` | string | True | VARCHAR | True | MATCH | The number of months that the originated loan must remain active. If the loan is paid off early, the borrower will pay a prepayment penalty. Always expressed in months: 12, 18, 24, 36 are the most common.; candidate: mortgage/loan |
| `Mortgage1InstrumentNumber` | string | True | VARCHAR | True | MATCH | Document or instrument format, this field will contain that value. Typical instructions call for the recording year to not be added to this field unless there are regional requirements. A stamped value of 2012 - 00012345 will generally be delivered as 12345.; candidate: transaction/document linkage, mortgage/loan |
| `Mortgage1InterestChangeFrequency` | string | True | VARCHAR | True | MATCH | The time defined between interest rate resets in an adjustable rate loan; candidate: mortgage/loan |
| `Mortgage1InterestIndex` | float | True | DECIMAL(5,2) | True | TYPE_MISMATCH | The benchmark interest rate an adjustable-rate mortgage's fully indexed interest rate is based on; candidate: mortgage/loan |
| `Mortgage1InterestMargin` | integer | True | INTEGER | True | MATCH | A fixed percentage rate that is added to an index value to determine the fully indexed interest rate of an adjustable rate mortgage; candidate: mortgage/loan |
| `Mortgage1InterestOnlyFlag` | integer | True | BOOLEAN | True | TYPE_MISMATCH | Flag to indicate if the loan has an interest only period. No longer supported.; candidate: mortgage/loan |
| `Mortgage1InterestOnlyPeriod` | string | True | VARCHAR | True | MATCH | If available, the actual length of interest only period in years.; candidate: mortgage/loan |
| `Mortgage1InterestRate` | float | True | DECIMAL(8,4) | True | TYPE_MISMATCH | Interest rate for the loan related to Mortgage1DocumentNumber; candidate: mortgage/loan |
| `Mortgage1InterestRateMax` | float | True | DECIMAL(8,4) | True | TYPE_MISMATCH | Applies to adjustable rate loans. The maximum interest rate allowed for the loan.; candidate: mortgage/loan |
| `Mortgage1InterestRateMaxFirstChangeRateConversion` | float | True | DECIMAL(5,2) | True | TYPE_MISMATCH | Applies only to adjustable rate loans. The maximum interest rate allowed on the first change date (date when loan switched from a fixed to an adjustable interest rate); candidate: mortgage/loan |
| `Mortgage1InterestRateMinFirstChangeRateConversion` | float | True | DECIMAL(5,2) | True | TYPE_MISMATCH | Applies only to adjustable rate loans. The minimum interest rate allowed on the first change date (date when loan switched from a fixed to an adjustable interest rate); candidate: mortgage/loan |
| `Mortgage1InterestRateType` | string | True | VARCHAR | True | MATCH | When available will indicate the type of interest rate terms for the concurrent Deed of Trust. Left blank if unknown.; candidate: status/type, mortgage/loan |
| `Mortgage1InterestTypeInitial` | string | True | VARCHAR | True | MATCH | Indicates the initial state of the interest rate on the loan is fixed or adjustable.; candidate: status/type, mortgage/loan |
| `Mortgage1LenderAddress` | string | True | VARCHAR | True | MATCH | 1st Lender's address; candidate: mortgage/loan |
| `Mortgage1LenderAddressCity` | string | True | VARCHAR | True | MATCH | City segment of the 1st Lender's address.; candidate: mortgage/loan |
| `Mortgage1LenderAddressState` | string | True | VARCHAR | True | MATCH | Two character State segment of the 1st Lender's address.; candidate: mortgage/loan |
| `Mortgage1LenderAddressZIP` | string | True | VARCHAR | True | MATCH | Five Digit ZIP Code segment of the 1st Lender's address.; candidate: mortgage/loan |
| `Mortgage1LenderAddressZIP4` | string | True | VARCHAR | True | MATCH | ZIP-4 segment of the 1st Lender's address.; candidate: mortgage/loan |
| `Mortgage1LenderCode` | integer | True | INTEGER | True | MATCH | Unique Lender Code assigned to the respective lender's name below.; candidate: mortgage/loan |
| `Mortgage1LenderInfoEntityClassification` | string | True | VARCHAR | True | MATCH | Not Supported; candidate: mortgage/loan |
| `Mortgage1LenderInfoSellerCarryBackFlag` | integer | True | INTEGER | True | MATCH | An indicator whether a seller is the lender on this particular loan.; candidate: mortgage/loan |
| `Mortgage1LenderNameFirst` | string | True | VARCHAR | True | MATCH | For private individuals, the first name of the first lender. For companies, the complete name of the first lender.; candidate: mortgage/loan |
| `Mortgage1LenderNameFullStandardized` | string | True | VARCHAR | True | MATCH | Standardized Full Lender Name; candidate: mortgage/loan |
| `Mortgage1LenderNameLast` | string | True | VARCHAR | True | MATCH | For private individuals, the last name of the first lender.; candidate: mortgage/loan |
| `Mortgage1Page` | string | True | VARCHAR | True | MATCH | The instrument's page number referenced/stamped for the 1st mortgage/deed of trust.; candidate: mortgage/loan |
| `Mortgage1RecordingDate` | date | True | DATE | True | MATCH | The recording date referenced/stamped on the 1st mortgage/deed of trust.; candidate: date/time, mortgage/loan |
| `Mortgage1Term` | integer | True | INTEGER | True | MATCH | The term/duration of the loan. Refer to Mortgage1TermType for the term unit.; candidate: mortgage/loan |
| `Mortgage1TermDate` | date | True | DATE | True | MATCH | The date the loan represented on Mortgage1DocumentNumberFormatted is due; candidate: date/time, mortgage/loan |
| `Mortgage1TermType` | string | True | VARCHAR | True | MATCH | Indicates the term type (month, year) of the mortgage term indicated in Mortgage1Term.; candidate: status/type, mortgage/loan |
| `Mortgage1Type` | string | True | VARCHAR | True | MATCH | Loan Type on the 1st mortgage/deed of trust - See Technical Details tab.; candidate: status/type, mortgage/loan |
| `Mortgage2AdjustableRateIndex` | string | True | VARCHAR | True | MATCH | The benchmark interest rate to which an adjustable rate mortgage is tied.; candidate: mortgage/loan |
| `Mortgage2Amount` | integer | True | INTEGER | True | MATCH | Indicates the loan amount, as present on the deed of trust, for the loan represented by Mortgage1DocumentNumberFormatted on the transaction.; candidate: mortgage/loan |
| `Mortgage2Book` | string | True | VARCHAR | True | MATCH | The transaction document number book (parsed). Can contain either the Recorder document book or the legal description book as provided on the document.; candidate: mortgage/loan |
| `Mortgage2DocumentInfoRiderAdjustableRateFlag` | string | True | VARCHAR | True | MATCH | Flag to indicate if an adjustable rate rider was part of the document.; candidate: mortgage/loan |
| `Mortgage2DocumentNumberFormatted` | string | True | VARCHAR | True | MATCH | Document number created from document book/page or instrument number. Provided to enable a single column reference. Raw data are delivered in 3 additional columns.; candidate: transaction/document linkage, mortgage/loan |
| `Mortgage2DocumentNumberLegacy` | string | True | VARCHAR | True | MATCH | Contains the loan instrument or book/page number stamped or printed on the first sequence trust deed that is recorded with the purchase transaction.; candidate: transaction/document linkage, mortgage/loan |
| `Mortgage2FixedStepConversionRate` | string | True | VARCHAR | True | MATCH | The rate to which the interest will change in a fixed step conversion mortgage.; candidate: mortgage/loan |
| `Mortgage2InfoInterestTypeChangeDay` | integer | True | INTEGER | True | MATCH | The day of the month the loan converts from fixed rate to adjustable rate. Month and year of the conversion, if known, are housed in separate fields.; candidate: status/type, mortgage/loan |
| `Mortgage2InfoInterestTypeChangeMonth` | integer | True | INTEGER | True | MATCH | The month the loan converts from fixed rate to adjustable rate. Year and day of the conversion, if known, are housed in separate fields.; candidate: status/type, mortgage/loan |
| `Mortgage2InfoInterestTypeChangeYear` | integer | True | INTEGER | True | MATCH | The year the loan converts from fixed rate to adjustable rate. Month and day of the conversion, if known, are housed in separate fields.; candidate: status/type, mortgage/loan |
| `Mortgage2InfoPrepaymentPenaltyFlag` | string | True | VARCHAR | True | MATCH | Flag to indicate if the loan terms includes pre-payment penalty.; candidate: mortgage/loan |
| `Mortgage2InfoPrepaymentTerm` | string | True | VARCHAR | True | MATCH | The number of months that the originated loan must remain active. If the loan is paid off early, the borrower will pay a prepayment penalty. Always expressed in months: 12, 18, 24, 36 are the most common.; candidate: mortgage/loan |
| `Mortgage2InstrumentNumber` | string | True | VARCHAR | True | MATCH | Document or instrument format, this field will contain that value. Typical instructions call for the recording year to not be added to this field unless there are regional requirements. A stamped value of 2012 - 00012345 will generally be delivered as 12345.; candidate: transaction/document linkage, mortgage/loan |
| `Mortgage2InterestChangeFrequency` | string | True | VARCHAR | True | MATCH | The time defined between interest rate resets in an adjustable rate loan.; candidate: mortgage/loan |
| `Mortgage2InterestIndex` | float | True | DECIMAL(5,2) | True | TYPE_MISMATCH | The benchmark interest rate an adjustable-rate mortgage's fully indexed interest rate is based on.; candidate: mortgage/loan |
| `Mortgage2InterestMargin` | integer | True | INTEGER | True | MATCH | A fixed percentage rate that is added to an index value to determine the fully indexed interest rate of an adjustable rate mortgage.; candidate: mortgage/loan |
| `Mortgage2InterestOnlyFlag` | integer | True | BOOLEAN | True | TYPE_MISMATCH | Flag to indicate if the loan has an interest only period. No longer supported.; candidate: mortgage/loan |
| `Mortgage2InterestOnlyPeriod` | string | True | VARCHAR | True | MATCH | If available, the actual length of interest only period in years.; candidate: mortgage/loan |
| `Mortgage2InterestRate` | float | True | DECIMAL(8,4) | True | TYPE_MISMATCH | Interest rate for the loan related to Mortgage2DocumentNumber; candidate: mortgage/loan |
| `Mortgage2InterestRateMax` | float | True | DECIMAL(8,4) | True | TYPE_MISMATCH | Applies to adjustable rate loans. The maximum interest rate allowed for the loan.; candidate: mortgage/loan |
| `Mortgage2InterestRateMaxFirstChangeRateConversion` | float | True | DECIMAL(5,2) | True | TYPE_MISMATCH | Applies only to adjustable rate loans. The maximum interest rate allowed on the first change date (date when loan switched from a fixed to an adjustable interest rate); candidate: mortgage/loan |
| `Mortgage2InterestRateMinFirstChangeRateConversion` | float | True | DECIMAL(5,2) | True | TYPE_MISMATCH | Applies only to adjustable rate loans. The minimum interest rate allowed on the first change date (date when loan switched from a fixed to an adjustable interest rate); candidate: mortgage/loan |
| `Mortgage2InterestRateType` | string | True | VARCHAR | True | MATCH | When available will indicate the type of interest rate terms for the concurrent Deed of Trust. Left blank if unknown.; candidate: status/type, mortgage/loan |
| `Mortgage2InterestTypeInitial` | string | True | VARCHAR | True | MATCH | Indicates the initial state of the interest rate on the loan is fixed or adjustable.; candidate: status/type, mortgage/loan |
| `Mortgage2LenderAddress` | string | True | VARCHAR | True | MATCH | Full address of the lender on the second mortgage.; candidate: mortgage/loan |
| `Mortgage2LenderAddressCity` | string | True | VARCHAR | True | MATCH | City of the lender on the second mortgage.; candidate: mortgage/loan |
| `Mortgage2LenderAddressState` | string | True | VARCHAR | True | MATCH | State of the lender on the second mortgage.; candidate: mortgage/loan |
| `Mortgage2LenderAddressZIP` | string | True | VARCHAR | True | MATCH | Zip Code of the lender on the second mortgage.; candidate: mortgage/loan |
| `Mortgage2LenderAddressZIP4` | string | True | VARCHAR | True | MATCH | Zip +4 of the lender on the second mortgage.; candidate: mortgage/loan |
| `Mortgage2LenderCode` | integer | True | INTEGER | True | MATCH | Contains the standard id code identifying the Lender/Beneficiary, for the loan represented by Mortgage2DocumentNumberFormatted.; candidate: mortgage/loan |
| `Mortgage2LenderInfoEntityClassification` | string | True | VARCHAR | True | MATCH | Not Supported; candidate: mortgage/loan |
| `Mortgage2LenderInfoSellerCarryBackFlag` | integer | True | INTEGER | True | MATCH | An indicator whether a seller is the lender on this particular loan.; candidate: mortgage/loan |
| `Mortgage2LenderNameFirst` | string | True | VARCHAR | True | MATCH | If the lender is a company, indicates the complete lender name for the loan represented by Mortgage2DocumentNumberFormatted field on the transaction. If the lender is an individual, indicates the lender's first name for the loan represented by Mortgage2DocumentNumberFormatted field on the transaction.; candidate: mortgage/loan |
| `Mortgage2LenderNameFullStandardized` | string | True | VARCHAR | True | MATCH | Full lender name, standardized to manage abbreviations, remove mis-spelling, etc. Partner field to Lender code. Can be used for lender matching.; candidate: mortgage/loan |
| `Mortgage2LenderNameLast` | string | True | VARCHAR | True | MATCH | If the lender is an individual, indicates the lender last name for the loan represented by Mortgage2DocumentNumberFormatted field on the transaction.; candidate: mortgage/loan |
| `Mortgage2Page` | string | True | VARCHAR | True | MATCH | The transaction document number page (parsed). Can contain either the Recorder document page or the legal description page as provided on the document.; candidate: mortgage/loan |
| `Mortgage2RecordingDate` | date | True | DATE | True | MATCH | Contains the official filing date for the transaction that is normally stamped or printed on the document.; candidate: date/time, mortgage/loan |
| `Mortgage2Term` | integer | True | INTEGER | True | MATCH | The term/duration of the loan. Refer to Mortgage2TermType for the term unit; candidate: mortgage/loan |
| `Mortgage2TermDate` | date | True | DATE | True | MATCH | The date the loan represented on Mortgage2DocumentNumberFormatted is due.; candidate: date/time, mortgage/loan |
| `Mortgage2TermType` | string | True | VARCHAR | True | MATCH | Indicates the term type (month, year) of the mortgage term indicated in Mortgage2Term; candidate: status/type, mortgage/loan |
| `Mortgage2Type` | string | True | VARCHAR | True | MATCH | Loan Type on the 2nd mortgage/deed of trust.; candidate: status/type, mortgage/loan |
| `Page` | string | True | VARCHAR | True | MATCH | The transaction document number page (parsed). Can contain either the Recorder document page or the legal description page as provided on the document. |
| `PartialInterest` | string | True | VARCHAR | True | MATCH | Indicates if a percentage of the legal ownership was transferred. |
| `PropertyAddressCRRT` | string | True | VARCHAR | True | MATCH | Carrier route segment of the subject property address. |
| `PropertyAddressCity` | string | True | VARCHAR | True | MATCH | City segment of the subject property address. |
| `PropertyAddressFull` | string | True | VARCHAR | True | MATCH | Full standardized subject property address. |
| `PropertyAddressHouseNumber` | string | True | VARCHAR | True | MATCH | House number and fraction segment of the subject property address. |
| `PropertyAddressInfoFormat` | string | True | VARCHAR | True | MATCH | Standard U.S., PO Box, Rural Route, etc |
| `PropertyAddressInfoPrivacy` | integer | True | BOOLEAN | True | TYPE_MISMATCH | Identifies if legal restrictions may apply in order to limit direct marketing campaigns. (Not associated with the DMAA's "No Mail" list ) |
| `PropertyAddressState` | string | True | VARCHAR | True | MATCH | Two character State segment of the subject property address. |
| `PropertyAddressStreetDirection` | string | True | VARCHAR | True | MATCH | Street direction segment of the subject property address. |
| `PropertyAddressStreetName` | string | True | VARCHAR | True | MATCH | Street name segment of the subject property address. |
| `PropertyAddressStreetPostDirection` | string | True | VARCHAR | True | MATCH | Street post direction segment of the subject property address. |
| `PropertyAddressStreetSuffix` | string | True | VARCHAR | True | MATCH | Street suffix segment of the subject property address. |
| `PropertyAddressUnitPrefix` | string | True | VARCHAR | True | MATCH | Unit prefix segment of the subject property address. |
| `PropertyAddressUnitValue` | string | True | VARCHAR | True | MATCH | Unit value segment of the subject property address. |
| `PropertyAddressZIP` | string | True | VARCHAR | True | MATCH | Five Digit ZIP Code segment of the subject property address. |
| `PropertyAddressZIP4` | string | True | VARCHAR | True | MATCH | ZIP-4 segment of the subject property address. |
| `PropertyUseGroup` | string | True | VARCHAR | True | MATCH | General property type description; residential, commercial, industrial, etc. |
| `PropertyUseStandardized` | string | True | VARCHAR | True | MATCH | Standardized value to describe the property's intended land use. Derived from specific land use information obtained from the Assessor. |
| `PublicationDate` | date | True | DATE | True | MATCH | Date the output data file was created; candidate: date/time |
| `QuitclaimFlag` | integer | True | BOOLEAN | True | TYPE_MISMATCH | Indicates that the transaction is a Quit Claim. |
| `RecorderMapReference` | string | True | VARCHAR | True | MATCH | Standardized to identify each portion. Multiples indicated with the ampersand (&), and ranges separated with a hyphen (-). Depending on the length of the Map Reference, spaces may be omitted. |
| `RecordingDate` | date | True | DATE | True | MATCH | Recordng date on document/instrument for the latest ownership change transaction.; candidate: date/time |
| `TitleCompanyRaw` | string | True | VARCHAR | True | MATCH | Name of the title company as keyed. Name is not standardized. |
| `TitleCompanyStandardizedCode` | string | True | VARCHAR | True | MATCH | Standard code identifying the title company. |
| `TitleCompanyStandardizedName` | string | True | VARCHAR | True | MATCH | Standardized name of the title company. |
| `TransactionID` | integer | False | BIGINT | True | MATCH | The unique transaction identifier for the transaction.; candidate: transaction/document linkage |
| `TransactionType` | string | True | VARCHAR | True | MATCH | Place holder for future field. Currently, not populated.; candidate: status/type |
| `TransferAmount` | float | True | DECIMAL(14,0) | True | TYPE_MISMATCH | Sale Price |
| `TransferAmountInfoAccuracy` | string | True | VARCHAR | True | MATCH | Details the type of transaction represented by the document. |
| `TransferInfoDistressCircumstanceCode` | integer | True | INTEGER | True | MATCH | ATTOM Data derived distress scenario. |
| `TransferInfoMultiParcelFlag` | integer | True | INTEGER | True | MATCH | Flag used to indicate a multiple parcel transaction. |
| `TransferInfoPurchaseDownPayment` | integer | True | INTEGER | True | MATCH | Derived field showing the estimated downpayment made at the time of purchase. |
| `TransferInfoPurchaseLoanToValue` | float | True | DECIMAL(8,4) | True | TYPE_MISMATCH | Derived field showing the estimated loan to value at the time of purchase; candidate: mortgage/loan |
| `TransferInfoPurchaseTypeCode` | integer | True | INTEGER | True | MATCH | For resale transactions, defines the type of resale; construction, subdivision, etc.; candidate: status/type |
| `TransferTaxCity` | float | True | DECIMAL(10,2) | True | TYPE_MISMATCH | Documentary Transfer Tax paid when recording a deed at the county, and based on the respective sale price. This tax is at the city level |
| `TransferTaxCounty` | float | True | DECIMAL(10,2) | True | TYPE_MISMATCH | Documentary Transfer Tax paid when recording a deed at the county, and based on the respective sale price. This tax is at the county level |
| `TransferTaxTotal` | float | True | DECIMAL(10,2) | True | TYPE_MISMATCH | Sum of Documentary Transfer Tax paid when recording a deed at the county, and based on the respective sale price. This amount is the sum of the City and County Transfer Tax |

Schema comparison counts: MATCH=215, PARQUET_ONLY=0, JSON_ONLY=0, TYPE_MISMATCH=23.

## RecorderDeletes

Rows: **166,532**; JSON fields: **1**; Parquet fields: **1**; Parquet layout table: `RecorderDeletes`; declared key: `TransactionID`.

| Field | JSON type | JSON nullable | Parquet type | Parquet nullable | Status | Description (ATTOM layout) |
|---|---|---|---|---|---|---|
| `TransactionID` | integer | False | BIGINT | True | MATCH | The unique transaction identifier for the transaction.; candidate: transaction/document linkage |

Schema comparison counts: MATCH=1, PARQUET_ONLY=0, JSON_ONLY=0, TYPE_MISMATCH=0.

## AssignmentRelease

Rows: **3,865,063**; JSON fields: **35**; Parquet fields: **35**; Parquet layout table: `AssignmentRelease`; declared key: `TransactionID`.

| Field | JSON type | JSON nullable | Parquet type | Parquet nullable | Status | Description (ATTOM layout) |
|---|---|---|---|---|---|---|
| `AttomID` | integer | False | INTEGER | True | MATCH | The ATTOM Property ID; candidate: candidate property join |
| `BorrowerFullName` | string | True | VARCHAR | True | MATCH | Full name of borrower. |
| `ContractDate` | date | True | DATE | True | MATCH | Date of execution of the document; candidate: date/time |
| `DocumentNumber` | string | True | VARCHAR | True | MATCH | Recorders Document Number; candidate: transaction/document linkage |
| `DocumentType` | string | True | VARCHAR | True | MATCH | ATTOM's RTCode for the type of document use to record the assignment and release; candidate: status/type |
| `MortgageLoanPosition` | integer | True | INTEGER | True | MATCH | The position of the loan that was assigned or released; candidate: mortgage/loan |
| `MortgageTransactionID` | integer | True | INTEGER | True | MATCH | The recorder record of the mortgage for the assignment or release; candidate: transaction/document linkage, mortgage/loan |
| `NewLenderName` | string | True | VARCHAR | True | MATCH | Name of the new lender on assignment documents |
| `OriginalBook` | string | True | VARCHAR | True | MATCH | Original recorders book number from the original mortgage |
| `OriginalDocumentNumber` | string | True | VARCHAR | True | MATCH | Original recorders document number from the original mortgage; candidate: transaction/document linkage |
| `OriginalLenderName` | string | True | VARCHAR | True | MATCH | Original lender name from the original mortgage recording |
| `OriginalLoanAmount` | integer | True | BIGINT | True | MATCH | Loan amount from the original recorded mortgage; candidate: mortgage/loan |
| `OriginalMortgageDate` | date | True | DATE | True | MATCH | Original recording date of the original mortgage; candidate: date/time, mortgage/loan |
| `OriginalPage` | string | True | VARCHAR | True | MATCH | Original recorders page number from the original mortgage |
| `ParcelNumberRaw` | string | True | VARCHAR | True | MATCH | Primary Parcel Number and unique identifier within the county/jurisdiction; candidate: parcel identity |
| `PropertyAddressCRRT` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address Carrier Route. |
| `PropertyAddressCity` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address city name. |
| `PropertyAddressFull` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Full site address line |
| `PropertyAddressHouseNumber` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Site address house number and fraction. |
| `PropertyAddressState` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address state. |
| `PropertyAddressStreetDirection` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Site address pre directional. |
| `PropertyAddressStreetName` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Site address street name. |
| `PropertyAddressStreetPostDirection` | string | True | VARCHAR | True | MATCH | 100 Center NW Pl., Unit 4a - Site address post-directional. |
| `PropertyAddressStreetSuffix` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Site address street name suffix. |
| `PropertyAddressUnitPrefix` | string | True | VARCHAR | True | MATCH | 100 Center NW Pl., Unit 4a - Site address unit number Prefix. |
| `PropertyAddressUnitValue` | string | True | VARCHAR | True | MATCH | 100 Center NW Pl., Unit 4a - Site address unit number. |
| `PropertyAddressZIP` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address Zip Code. |
| `PropertyAddressZIP4` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address Zip Plus 4 code. |
| `PropertyUseStandardized` | string | True | VARCHAR | True | MATCH | Standardized value to describe property use. Derived from jurisdiction-specific zoned use value obtained from the Assessor. |
| `PublicationDate` | date | True | DATE | True | MATCH | Date the output data file was created; candidate: date/time |
| `RecordingBook` | string | True | VARCHAR | True | MATCH | Recorders Book Number |
| `RecordingDate` | date | True | DATE | True | MATCH | RECORDING Date; candidate: date/time |
| `RecordingPage` | string | True | VARCHAR | True | MATCH | Recorders Page Number |
| `SitusStateCountyFIPS` | string | True | VARCHAR | True | MATCH | 5 digit numeric Federal Information Processing Standard (FIPS) code combining state and county codes where the property is located.; candidate: county identity |
| `TransactionID` | integer | False | INTEGER | True | MATCH | Internal Unique Record ID; candidate: transaction/document linkage |

Schema comparison counts: MATCH=35, PARQUET_ONLY=0, JSON_ONLY=0, TYPE_MISMATCH=0.

## CombinedForeclosure

Rows: **6,109**; JSON fields: **111**; Parquet fields: **111**; Parquet layout table: `CombinedForeclosure`; declared key: `not supplied`.

**Source layout syntax issue:** line 670, column 3: Illegal trailing comma before end of object. In-memory diagnostic parse removed 1 trailing comma(s); source was not edited. SHA-256: `7feebb7d589bfca8bdb4497a3bc6880b1ed21931d5d1b127226ad9f2f711879f`.


| Field | JSON type | JSON nullable | Parquet type | Parquet nullable | Status | Description (ATTOM layout) |
|---|---|---|---|---|---|---|
| `ATTOMID` | integer | True | INTEGER | True | MATCH | ATTOM Datas Unique parcel identifier; candidate: candidate property join |
| `AreaBuilding` | integer | True | INTEGER | True | MATCH | Total area square feet of all structures on the property, which can include; Hallways, Common Areas (Gym, Laundry, Mail, Pool, etc) and any other area determined by the specific county assessor |
| `AreaBuildingDefinitionCode` | string | True | VARCHAR | True | MATCH | Details the area described by the AreaBuilding value |
| `AreaGross` | integer | True | INTEGER | True | MATCH | The total square footage of the property as provided by the assessor |
| `AreaLotAcres` | float | True | DECIMAL(18,7) | True | TYPE_MISMATCH | Indicates the lot size, in acres |
| `AreaLotSF` | float | True | DECIMAL(18,7) | True | TYPE_MISMATCH | Indicates the lot size, in square feet |
| `AuctionAddress` | string | True | VARCHAR | True | MATCH | Full unparsed address where the foreclosure auction is to be held |
| `AuctionCity` | string | True | VARCHAR | True | MATCH | The city name of the location of the foreclosure auction |
| `AuctionCourthouse` | string | True | VARCHAR | True | MATCH | Name or description of courthouse hosting the public auction |
| `AuctionDate` | date | True | DATE | True | MATCH | Date of the foreclosure auction; candidate: date/time |
| `AuctionDirection` | string | True | VARCHAR | True | MATCH | The pre directional of the location of the foreclosure auction |
| `AuctionHouseNumber` | string | True | VARCHAR | True | MATCH | The house number and fraction of the location of the foreclosure auction |
| `AuctionPostDirection` | string | True | VARCHAR | True | MATCH | The post-directional of the location of the foreclosure auction |
| `AuctionStreetName` | string | True | VARCHAR | True | MATCH | The street name  of the location of the foreclosure auction |
| `AuctionSuffix` | string | True | VARCHAR | True | MATCH | The street name suffix of the location of the foreclosure auction |
| `AuctionTime` | string | True | VARCHAR | True | MATCH | The start time of the foreclosure auction; candidate: date/time |
| `AuctionUnit` | string | True | VARCHAR | True | MATCH | The unit number of the location of the foreclosure auction |
| `BathCount` | float | True | DECIMAL(9,3) | True | TYPE_MISMATCH | The total number of rooms that are utilized as bathrooms.  Includes partial bathrooms.  Value may be interpreted |
| `BedroomsCount` | integer | True | INTEGER | True | MATCH | The total number of rooms that can be qualified as bedrooms |
| `BorrowerNameOwner` | string | True | VARCHAR | True | MATCH | Mortgagee, concatenated name(s) of borrower in default |
| `CaseNumber` | string | True | VARCHAR | True | MATCH | A unique identifier established by the court in a judicial foreclosure proceeding. It is important to note that this is not a document level identifier, rather it is case level. A case consists of many documents. Thus, to match future documents regarding a case, for example, associating a release or dismissal of the foreclosure complaint, the case number must be matched |
| `ContactOwnerMailAddressCity` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Mailing city |
| `ContactOwnerMailAddressFull` | string | True | VARCHAR | True | MATCH | Full mailing address |
| `ContactOwnerMailAddressState` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Mailing state |
| `ContactOwnerMailAddressZIP` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Mailing zip code |
| `ContactOwnerMailAddressZIP4` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Mailing zip plus 4 code |
| `ContactOwnerMailingCounty` | string | True | VARCHAR | True | MATCH | Mailing county of the property owner |
| `ContactOwnerMailingFIPS` | string | True | VARCHAR | True | MATCH | Mailing Federal Information Processing Standard (FIPS) code for the county; candidate: county identity |
| `CreateDate` | date | True | DATE | True | MATCH | Date the record was first created; candidate: date/time |
| `DefaultAmount` | float | True | DECIMAL(15,2) | True | TYPE_MISMATCH | Default amount noted on the instrument |
| `EstimatedValue` | float | True | DECIMAL(15,2) | True | TYPE_MISMATCH | Estimated value based on ATTOM Datas Valuation Model as of the CreateDate below |
| `ForeclosureBookPage` | string | True | VARCHAR | True | MATCH | Book and page of the foreclosure instrument |
| `ForeclosureInstrumentDate` | date | True | DATE | True | MATCH | Creation / Signature date on the instrument; candidate: date/time |
| `ForeclosureInstrumentNumber` | string | True | VARCHAR | True | MATCH | Recording date of a related document, generally provided in the county records, that is associated with the foreclosure instrument. It may represent a mortgage, deed, or foreclosure record connected to that instrument; candidate: transaction/document linkage |
| `ForeclosurePublishedDate` | date | True | DATE | True | MATCH | Date when the foreclosure notice was included for publication on a website, newspaper, or another public forum. This date is used in states where the Notice of Foreclosure Sale (NFS) or Notice of Trustee Sale (NTS) is either posted or published but not officially recorded. In certain states (e.g. TX, GA) the NTS is posted at the county but not recorded. In other states (e.g. NY) the NFS is published in newspapers. This date is also used when foreclosure data is obtained from sheriff or trustee sites; candidate: date/time |
| `ForeclosureRecordingDate` | date | True | DATE | True | MATCH | Date when the instrument was recorded at the county; candidate: date/time |
| `GeoQuality` | string | True | VARCHAR | True | MATCH | Code to indicate the level of quality of the geocodes as determined by the geocoding process |
| `JudgmentAmount` | float | True | DECIMAL(19,4) | True | TYPE_MISMATCH | Amount of final judgment, including fees and interest |
| `JudgmentDate` | date | True | DATE | True | MATCH | Date of final judgment if a lis pendens case; candidate: date/time |
| `LenderAddress` | string | True | VARCHAR | True | MATCH | Lender Full site address line |
| `LenderAddressCity` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 - Lender Site address city name |
| `LenderAddressHouseNumber` | string | True | VARCHAR | True | MATCH | Lender Site address house number and fraction |
| `LenderAddressState` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 - Lender Site address state |
| `LenderAddressStreetDirection` | string | True | VARCHAR | True | MATCH | Lender Site address pre directional |
| `LenderAddressStreetName` | string | True | VARCHAR | True | MATCH | Lender Site address street name |
| `LenderAddressStreetPostDirection` | string | True | VARCHAR | True | MATCH | Lender Site address post-directional |
| `LenderAddressStreetSuffix` | string | True | VARCHAR | True | MATCH | Lender Site address street name suffix |
| `LenderAddressUnitValue` | string | True | VARCHAR | True | MATCH | Lender Site address unit number |
| `LenderAddressZIP` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 - Lender Site address Zip Code |
| `LenderNameFullStandardized` | string | True | VARCHAR | True | MATCH | Full lender name, standardized to manage abbreviations, remove misspelling, etc.  Partner field to Lender code.  Can be used for lender matching |
| `LenderPhone` | string | True | VARCHAR | True | MATCH | Phone number of the lender |
| `LoanBalance` | float | True | DECIMAL(15,2) | True | TYPE_MISMATCH | Remaining balance on defaulted loan; candidate: mortgage/loan |
| `LoanMaturityDate` | date | True | DATE | True | MATCH | Maturity date of loan in default in YYYY-MM-DD format; candidate: date/time, mortgage/loan |
| `OriginalLoanAmount` | float | True | DECIMAL(19,4) | True | TYPE_MISMATCH | Original amount of loan in default; candidate: mortgage/loan |
| `OriginalLoanInterestRate` | float | True | DECIMAL(5,0) | True | TYPE_MISMATCH | Interest rate of the original loan in default; candidate: mortgage/loan |
| `OriginalLoanLoanNumber` | string | True | VARCHAR | True | MATCH | Original loan account number of loan in default; or HOA for HOA preforeclosure notice; or MUN to represent a municipality foreclosure; candidate: mortgage/loan |
| `ParcelNumberRaw` | string | True | VARCHAR | True | MATCH | Primary Parcel Number and unique identifier within the county/jurisdiction; candidate: parcel identity |
| `Payment` | float | True | DECIMAL(15,2) | True | TYPE_MISMATCH | Regular monthly payment from related mortgage document |
| `PenaltyInterest` | float | True | DECIMAL(15,2) | True | TYPE_MISMATCH | Amount of penalty interest accrued |
| `PropertyAddressCRRT` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address Carrier Route |
| `PropertyAddressCity` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address city name |
| `PropertyAddressFull` | string | True | VARCHAR | True | MATCH | Full site address line |
| `PropertyAddressHouseNumber` | string | True | VARCHAR | True | MATCH | Site address house number and fraction |
| `PropertyAddressState` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address state |
| `PropertyAddressStreetDirection` | string | True | VARCHAR | True | MATCH | Site address pre directional |
| `PropertyAddressStreetName` | string | True | VARCHAR | True | MATCH | Site address street name |
| `PropertyAddressStreetPostDirection` | string | True | VARCHAR | True | MATCH | Site address post-directional |
| `PropertyAddressStreetSuffix` | string | True | VARCHAR | True | MATCH | Site address street name suffix |
| `PropertyAddressUnitPrefix` | string | True | VARCHAR | True | MATCH | Site address unit number Prefix |
| `PropertyAddressUnitValue` | string | True | VARCHAR | True | MATCH | Site address unit number |
| `PropertyAddressZIP` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address Zip Code |
| `PropertyAddressZIP4` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address Zip  Plus 4 code |
| `PropertyJurisdictionName` | string | True | VARCHAR | True | MATCH | Name of the tax jurisdiction.  This is typically the county with some exceptions.  Exceptions are primarily in the New England area where the townships are the taxing authorities |
| `PropertyLatitude` | float | True | DOUBLE | True | MATCH | The latitude of the property in degrees |
| `PropertyLongitude` | float | True | DOUBLE | True | MATCH | The longitude of the property in degrees |
| `PropertyUseGroup` | string | True | VARCHAR | True | MATCH | General property type description; residential, commercial, other, etc |
| `PropertyUseMuni` | string | True | VARCHAR | True | MATCH | County-specific use code which is used to map the PropertyUseStandardized field |
| `PropertyUseStandardized` | string | True | VARCHAR | True | MATCH | Standardized value to describe property use.  Derived from jurisdiction-specific zoned use value obtained from the Assessor |
| `PublicationDate` | date | True | DATE | True | MATCH | The date on which the clients data file was extracted and delivered.Not to be associated with a countys publication,fiilng, or posted date; candidate: date/time |
| `RecordLastUpdated` | date | True | DATE | True | MATCH | The last update date for the record; candidate: date/time |
| `RecordType` | string | True | VARCHAR | True | MATCH | NOD (Notice of Default); LIS (Lis Pendens); NTS (Notice of Trustee Sale); NFS or NOS (Notice of Foreclosure Sale); REO (Real Estate Owned); candidate: status/type |
| `RecordedAuctionOpeningBid` | float | True | DECIMAL(15,2) | True | TYPE_MISMATCH | Anticipated Opening Bid at the scheduled auction |
| `RelatedDocumentBookPage` | string | True | VARCHAR | True | MATCH | Book and page of the related document |
| `RelatedDocumentInstrumentNumber` | string | True | VARCHAR | True | MATCH | Document number of the related document; candidate: transaction/document linkage |
| `RelatedDocumentRecordingDate` | date | True | DATE | True | MATCH | Recording date of a related document, generally provided in the county records, that is associated with the foreclosure instrument. It may represent a mortgage, deed, or foreclosure record connected to that instrument; candidate: date/time |
| `ServicerAddress` | string | True | VARCHAR | True | MATCH | Address of the entity providing servicing for the loan |
| `ServicerCity` | string | True | VARCHAR | True | MATCH | City of the entity providing servicing for the loan |
| `ServicerName` | string | True | VARCHAR | True | MATCH | Name of the entity providing servicing for the loan |
| `ServicerPhone` | string | True | VARCHAR | True | MATCH | Phone number of the entity providing servicing for the loan |
| `ServicerState` | string | True | VARCHAR | True | MATCH | State of the entity providing servicing for the loan |
| `ServicerZip` | string | True | VARCHAR | True | MATCH | Zip code of the entity providing servicing for the loan |
| `SitusCounty` | string | True | VARCHAR | True | MATCH | County where the property is situated |
| `SitusStateCode` | string | True | VARCHAR | True | MATCH | State where the property is situated |
| `SitusStateCountyFIPS` | string | True | VARCHAR | True | MATCH | 5 digit numeric Federal Information Processing Standard (FIPS) code combining state and county codes where the property is located; candidate: county identity |
| `TransactionID` | integer | True | INTEGER | True | MATCH | The unique transaction identifier for the transaction; candidate: transaction/document linkage |
| `TrusteeAddress` | string | True | VARCHAR | True | MATCH | Trustee Full address line |
| `TrusteeAddressCity` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 - Trustee address city name |
| `TrusteeAddressHouseNumber` | string | True | VARCHAR | True | MATCH | Trustee address house number and fraction |
| `TrusteeAddressState` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 - Trustee address state |
| `TrusteeAddressStreetDirection` | string | True | VARCHAR | True | MATCH | Trustee address pre directional |
| `TrusteeAddressStreetName` | string | True | VARCHAR | True | MATCH | Trustee address street name |
| `TrusteeAddressStreetPostDirection` | string | True | VARCHAR | True | MATCH | Trustee address post-directional |
| `TrusteeAddressStreetSuffix` | string | True | VARCHAR | True | MATCH |  Trustee address street name suffix |
| `TrusteeAddressUnitValue` | string | True | VARCHAR | True | MATCH | Trustee address unit number |
| `TrusteeAddressZIP` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 - Trustee address Zip Code |
| `TrusteeName` | string | True | VARCHAR | True | MATCH | Trustee or attorney handling the foreclosure event |
| `TrusteePhone` | string | True | VARCHAR | True | MATCH | Trustee phone number |
| `TrusteeReferenceNumber` | string | True | VARCHAR | True | MATCH | Unique number assigned by the trustee to track status of foreclosure and auction proceedings |
| `YearBuilt` | integer | True | INTEGER | True | MATCH | Year built of the primary structure |
| `YearBuiltEffective` | integer | True | INTEGER | True | MATCH | Adjusted year built based on condition and / or major structural changes of the structure |
| `ZonedCodeLocal` | string | True | VARCHAR | True | MATCH | The jurisdiction-specific zoned use value.  Typically codified by the controlling jurisdiction |

Schema comparison counts: MATCH=99, PARQUET_ONLY=0, JSON_ONLY=0, TYPE_MISMATCH=12.

## LoanModel

Rows: **1,187,700**; JSON fields: **42**; Parquet fields: **42**; Parquet layout table: `LoanModel`; declared key: `ATTOMID`.

| Field | JSON type | JSON nullable | Parquet type | Parquet nullable | Status | Description (ATTOM layout) |
|---|---|---|---|---|---|---|
| `ATTOMID` | integer | False | INTEGER | True | MATCH | Unique parcel identifier.; candidate: candidate property join |
| `AvailableEquity` | integer | True | INTEGER | True | MATCH | The difference between the current market value represented by the AVM value and the sum of the current outstanding loan amounts. |
| `CurrentFirstPositionMortgageType` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, indicates what type of loan; conventional, construction, HELOC, FHA, etc. for the loan that was determined by the model for the loan in the first lien position.; candidate: status/type, mortgage/loan |
| `CurrentFirstPositionOpenLoanAmount` | integer | True | INTEGER | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the original amount of the loan that is modelled to be in the first lien position.; candidate: mortgage/loan |
| `CurrentFirstPositionOpenLoanDocumentNumberFormatted` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the recorded Document Number associated with the loan that is modelled to be in the first lien position.; candidate: transaction/document linkage, mortgage/loan |
| `CurrentFirstPositionOpenLoanInterestRate` | float | True | DECIMAL(8,4) | True | TYPE_MISMATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the interest rate for the loan that was determined by the model for the loan in the first lien position.; candidate: mortgage/loan |
| `CurrentFirstPositionOpenLoanInterestRateType` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, when available will indicate the type of interest rate terms for the loan that was determined by the model for the loan in the first lien position. Left blank if unknown.; candidate: status/type, mortgage/loan |
| `CurrentFirstPositionOpenLoanLenderInfoEntityClassification` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the lender type for the loan that was determined by the model for the loan in the first lien position..; candidate: mortgage/loan |
| `CurrentFirstPositionOpenLoanLenderNameFirst` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, if the lender is a company, indicates the complete lender name for the loan represented by CurrentFirstPositionOpenLoanDocumentNumberFormatted field. If the lender is an individual, indicates the lender's first name for the loan represented by CurrentFirstPositionOpenLoanDocumentNumberFormatted field.; candidate: mortgage/loan |
| `CurrentFirstPositionOpenLoanLenderNameLast` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, if the lender is an individual, indicates the lender last name for the loan represented by CurrentFirstPositionOpenLoanDocumentNumberFormatted field.; candidate: mortgage/loan |
| `CurrentFirstPositionOpenLoanRecordingDate` | date | True | DATE | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the recording date of the Document associated with the loan that is modelled to be in the first lien position.; candidate: date/time, mortgage/loan |
| `CurrentFirstPositionOpenLoanTransactionID` | integer | True | INTEGER | True | MATCH | Internal ATTOM Data Solutions primary key value for the transaction containing the first modelled open loan.; candidate: transaction/document linkage, mortgage/loan |
| `CurrentFirstPositionOpenLoanType` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the type of loan (P - Purchase, R - Refinance, E-Equity) that was determined by the model for the loan in the first lien position.; candidate: status/type, mortgage/loan |
| `CurrentSecondPositionMortgageType` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, indicates what type of loan; conventional, construction, HELOC, FHA, etc. for the loan that was determined by the model for the loan in the second lien position.; candidate: status/type, mortgage/loan |
| `CurrentSecondPositionOpenLoanAmount` | integer | True | INTEGER | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the original amount of the loan that is modelled to be in the second lien position.; candidate: mortgage/loan |
| `CurrentSecondPositionOpenLoanDocumentNumberFormatted` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the recorded Document Number associated with the loan that is modelled to be in the second lien position.; candidate: transaction/document linkage, mortgage/loan |
| `CurrentSecondPositionOpenLoanInterestRate` | float | True | DECIMAL(8,4) | True | TYPE_MISMATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the interest rate for the loan that was determined by the model for the loan in the second lien position.; candidate: mortgage/loan |
| `CurrentSecondPositionOpenLoanInterestRateType` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, when available will indicate the type of interest rate terms for the loan that was determined by the model for the loan in the second lien position. Left blank if unknown.; candidate: status/type, mortgage/loan |
| `CurrentSecondPositionOpenLoanLenderInfoEntityClassification` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the lender type for the loan that was determined by the model for the loan in the second lien position..; candidate: mortgage/loan |
| `CurrentSecondPositionOpenLoanLenderNameFirst` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, if the lender is a company, indicates the complete lender name for the loan represented by CurrentSecondPositionOpenLoanDocumentNumberFormatted field. If the lender is an individual, indicates the lender's first name for the loan represented by CurrentSecondPositionOpenLoanDocumentNumberFormatted field.; candidate: mortgage/loan |
| `CurrentSecondPositionOpenLoanLenderNameLast` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, if the lender is an individual, indicates the lender last name for the loan represented by CurrentSecondPositionOpenLoanDocumentNumberFormatted field.; candidate: mortgage/loan |
| `CurrentSecondPositionOpenLoanRecordingDate` | date | True | DATE | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the recording date of the Document associated with the loan that is modelled to be in the second lien position.; candidate: date/time, mortgage/loan |
| `CurrentSecondPositionOpenLoanTransactionID` | integer | True | INTEGER | True | MATCH | Internal ATTOM Data Solutions primary key value for the transaction containing the second modelled open loan.; candidate: transaction/document linkage, mortgage/loan |
| `CurrentSecondPositionOpenLoanType` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the type of loan (P - Purchase, R - Refinance, E-Equity) that was determined by the model for the loan in the second lien position.; candidate: status/type, mortgage/loan |
| `CurrentThirdPositionMortgageType` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, indicates what type of loan; conventional, construction, HELOC, FHA, etc. for the loan that was determined by the model for the loan in the third lien position.; candidate: status/type, mortgage/loan |
| `CurrentThirdPositionOpenLoanAmount` | integer | True | INTEGER | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the original amount of the loan that is modelled to be in the third lien position.; candidate: mortgage/loan |
| `CurrentThirdPositionOpenLoanDocumentNumberFormatted` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the recorded Document Number associated with the loan that is modelled to be in the third lien position.; candidate: transaction/document linkage, mortgage/loan |
| `CurrentThirdPositionOpenLoanInterestRate` | float | True | DECIMAL(8,4) | True | TYPE_MISMATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the interest rate for the loan that was determined by the model for the loan in the third lien position.; candidate: mortgage/loan |
| `CurrentThirdPositionOpenLoanInterestRateType` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, when available will indicate the type of interest rate terms for the loan that was determined by the model for the loan in the third lien position. Left blank if unknown.; candidate: status/type, mortgage/loan |
| `CurrentThirdPositionOpenLoanLenderInfoEntityClassification` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the lender type for the loan that was determined by the model for the loan in the third lien position..; candidate: mortgage/loan |
| `CurrentThirdPositionOpenLoanLenderNameFirst` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, if the lender is a company, indicates the complete lender name for the loan represented by CurrentThirdPositionOpenLoanDocumentNumberFormatted field. If the lender is an individual, indicates the lender's first name for the loan represented by CurrentThirdPositionOpenLoanDocumentNumberFormatted field.; candidate: mortgage/loan |
| `CurrentThirdPositionOpenLoanLenderNameLast` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, if the lender is an individual, indicates the lender last name for the loan represented by CurrentThirdPositionOpenLoanDocumentNumberFormatted field.; candidate: mortgage/loan |
| `CurrentThirdPositionOpenLoanRecordingDate` | date | True | DATE | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the recording date of the Document associated with the loan that is modelled to be in the third lien position.; candidate: date/time, mortgage/loan |
| `CurrentThirdPositionOpenLoanTransactionID` | integer | True | INTEGER | True | MATCH | Internal ATTOM Data Solutions primary key value for the transaction containing the third modelled open loan.; candidate: transaction/document linkage, mortgage/loan |
| `CurrentThirdPositionOpenLoanType` | string | True | VARCHAR | True | MATCH | Based on the ATTOM Data Solutions Loan Model algorithm, the type of loan (P - Purchase, R - Refinance, E-Equity) that was determined by the model for the loan in the third lien position.; candidate: status/type, mortgage/loan |
| `LTV` | integer | True | INTEGER | True | MATCH | Loan To Value calculated by dividing the sum of currently open loan amounts by the AVM value for the property |
| `LendableEquity` | integer | True | INTEGER | True | MATCH | 80% of the difference between the current market value represented by the AVM value and the sum of the current outstanding loan amounts. |
| `PropertyJurisdictionName` | string | True | VARCHAR | True | MATCH | Name of the tax jurisdiction. This is typically the county with some exceptions. Exceptions are primarily in the New England area where the townships are the taxing authorities. |
| `PublicationDate` | date | True | DATE | True | MATCH | Date the output data file was published; candidate: date/time |
| `SitusCounty` | string | True | VARCHAR | True | MATCH | Name of county where the property is situated. |
| `SitusStateCode` | string | True | VARCHAR | True | MATCH | USPS standard abbreviation for the state where the property is situated. |
| `SitusStateCountyFIPS` | string | True | VARCHAR | True | MATCH | 5 digit numeric Federal Information Processing Standard (FIPS) code combining state and county codes where the property is located.; candidate: county identity |

Schema comparison counts: MATCH=39, PARQUET_ONLY=0, JSON_ONLY=0, TYPE_MISMATCH=3.

## Preforeclosure

Rows: **32,574**; JSON fields: **103**; Parquet fields: **103**; Parquet layout table: `Foreclosure`; declared key: `TransactionID`.

| Field | JSON type | JSON nullable | Parquet type | Parquet nullable | Status | Description (ATTOM layout) |
|---|---|---|---|---|---|---|
| `ATTOMID` | integer | False | INTEGER | True | MATCH | ATTOM Data's Unique parcel identifier.; candidate: candidate property join |
| `AreaBuilding` | integer | True | INTEGER | True | MATCH | Total / Gross building square footage. |
| `AreaBuildingDefinitionCode` | string | True | VARCHAR | True | MATCH | Details the area described by the AreaBuilding value. |
| `AreaLotAcres` | float | True | DOUBLE | True | MATCH | Indicates the lot size, in acres. |
| `AreaLotSF` | float | True | DOUBLE | True | MATCH | Indicates the lot size, in square feet. |
| `AuctionAddress` | string | True | VARCHAR | True | MATCH | Full unparsed address where the foreclosure auction is to be held. |
| `AuctionCity` | string | True | VARCHAR | True | MATCH | The city name of the location of the foreclosure auction. |
| `AuctionDate` | date | True | DATE | True | MATCH | Date of the foreclosure auction in YYYY-MM-DD format.; candidate: date/time |
| `AuctionDirection` | string | True | VARCHAR | True | MATCH | The pre directional of the location of the foreclosure auction. |
| `AuctionHouseNumber` | string | True | VARCHAR | True | MATCH | The house number and fraction of the location of the foreclosure auction. |
| `AuctionPostDirection` | string | True | VARCHAR | True | MATCH | The post-directional of the location of the foreclosure auction. |
| `AuctionStreetName` | string | True | VARCHAR | True | MATCH | The street name of the location of the foreclosure auction. |
| `AuctionSuffix` | string | True | VARCHAR | True | MATCH | The street name suffix of the location of the foreclosure auction. |
| `AuctionTime` | string | True | VARCHAR | True | MATCH | The start time of the foreclosure auction.; candidate: date/time |
| `AuctionUnit` | string | True | VARCHAR | True | MATCH | The unit number of the location of the foreclosure auction. |
| `BathCount` | float | True | DECIMAL(9,3) | True | TYPE_MISMATCH | Sum of bathrooms on the property. |
| `BedroomsCount` | integer | True | INTEGER | True | MATCH | Sum of bedrooms on the property. |
| `BorrowerNameOwner` | string | True | VARCHAR | True | MATCH | Mortgagee, concatenated name(s) of borrower in default. |
| `CaseNumber` | string | True | VARCHAR | True | MATCH | A unique identifier established by the court in a judicial foreclosure proceeding. It is important to note that this is not a document level identifier, rather it is case level. A case consists of many documents. Thus, to match future documents regarding a case, for example, associating a release or dismissal of the foreclosure complaint, the case number must be matched. |
| `Courthouse` | string | True | VARCHAR | True | MATCH | Name or description of courthouse hosting the public auction. |
| `CreateDate` | date | True | DATE | True | MATCH | Date the record was first created in YYYY-MM-DD format.; candidate: date/time |
| `DefaultAmount` | float | True | DECIMAL(15,2) | True | TYPE_MISMATCH | Default amount noted on the instrument. |
| `EstimatedValue` | float | True | DECIMAL(15,2) | True | TYPE_MISMATCH | Estimated value based on ATTOMData's Valuation Model as of the CreateDate below. |
| `ForeclosureBookPage` | string | True | VARCHAR | True | MATCH | Book and page on the instrument. |
| `ForeclosureInstrumentDate` | date | True | DATE | True | MATCH | Creation / Signature date on the instrument. Format YYYY-MM-DD. Not to be confused with the recording date.; candidate: date/time |
| `ForeclosureInstrumentNumber` | string | True | VARCHAR | True | MATCH | Document number on the instrument.; candidate: transaction/document linkage |
| `ForeclosureRecordingDate` | date | True | DATE | True | MATCH | Date on which the instrument was officially recorded at the county. Format YYYY-MM-DD.; candidate: date/time |
| `GeoQuality` | string | True | VARCHAR | True | MATCH | Code to indicate the level of quality of the geocodes as determined by the geocoding process. |
| `JudgmentAmount` | float | True | DECIMAL(19,4) | True | TYPE_MISMATCH | Amount of final judgment, including fees and interest. |
| `JudgmentDate` | date | True | DATE | True | MATCH | Date of final judgment if a lis pendens case in YYYY-MM-DD format.; candidate: date/time |
| `LenderAddress` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Lender's Full site address line. |
| `LenderAddressCity` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 - Lender's Site address city name. |
| `LenderAddressHouseNumber` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Lender's Site address house number and fraction. |
| `LenderAddressState` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 - Lender's Site address state. |
| `LenderAddressStreetDirection` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Lender's Site address pre directional. |
| `LenderAddressStreetName` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Lender's Site address street name. |
| `LenderAddressStreetPostDirection` | string | True | VARCHAR | True | MATCH | 100 Center NW Pl., 4a - Lender's Site address post-directional. |
| `LenderAddressStreetSuffix` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Lender's Site address street name suffix. |
| `LenderAddressUnitValue` | string | True | VARCHAR | True | MATCH | 100 Center NW Pl., 4a - Lender's Site address unit number. |
| `LenderAddressZIP` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 - Lender's Site address Zip Code. |
| `LenderNameFullStandardized` | string | True | VARCHAR | True | MATCH | Full lender name, standardized to manage abbreviations, remove misspelling, etc. Partner field to Lender code. Can be used for lender matching. |
| `LenderPhone` | string | True | VARCHAR | True | MATCH | Phone number of the lender. |
| `LoanBalance` | float | True | DECIMAL(15,2) | True | TYPE_MISMATCH | Remaining balance on defaulted loan.; candidate: mortgage/loan |
| `LoanMaturityDate` | date | True | DATE | True | MATCH | Maturity date of loan in default in YYYY-MM-DD format.; candidate: date/time, mortgage/loan |
| `OriginalLoanAmount` | float | True | DECIMAL(19,4) | True | TYPE_MISMATCH | Original amount of loan in default.; candidate: mortgage/loan |
| `OriginalLoanBookPage` | string | True | VARCHAR | True | MATCH | Book and page of the original loan document.; candidate: mortgage/loan |
| `OriginalLoanInstrumentNumber` | string | True | VARCHAR | True | MATCH | recorder's Instrument Number of the original loan document.; candidate: transaction/document linkage, mortgage/loan |
| `OriginalLoanInterestRate` | float | True | DECIMAL(5,2) | True | TYPE_MISMATCH | Interest rate of the original loan in default.; candidate: mortgage/loan |
| `OriginalLoanLoanNumber` | string | True | VARCHAR | True | MATCH | Original loan account number of loan in default; or 'HOA' will found for HOA preforeclosure notice; or 'MUN' to represent a municipality foreclosure; candidate: mortgage/loan |
| `OriginalLoanRecordingDate` | date | True | DATE | True | MATCH | Contains the official filing date for the original loan transaction that is normally stamped or printed on the document in YYYY-MM-DD format.; candidate: date/time, mortgage/loan |
| `ParcelNumberFormatted` | string | True | VARCHAR | True | MATCH | Primary Parcel Number and unique identifier within the county/jurisdiction; candidate: parcel identity |
| `Payment` | float | True | DECIMAL(15,2) | True | TYPE_MISMATCH | Regular monthly payment from related mortgage document |
| `PenaltyInterest` | float | True | DECIMAL(15,2) | True | TYPE_MISMATCH | Amount of penalty interest accrued. |
| `PropertyAddressCRRT` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address Carrier Route. |
| `PropertyAddressCity` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address city name. |
| `PropertyAddressFull` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Full site address line. |
| `PropertyAddressHouseNumber` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Site address house number and fraction. |
| `PropertyAddressInfoPrivacy` | string | True | VARCHAR | True | MATCH | Indicator of whether is a legal restriction on the property address being used for marketing. |
| `PropertyAddressState` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address state. |
| `PropertyAddressStreetDirection` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Site address pre directional. |
| `PropertyAddressStreetName` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Site address street name. |
| `PropertyAddressStreetPostDirection` | string | True | VARCHAR | True | MATCH | 100 Center NW Pl., Unit 4a - Site address post-directional. |
| `PropertyAddressStreetSuffix` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Site address street name suffix. |
| `PropertyAddressUnitPrefix` | string | True | VARCHAR | True | MATCH | 100 Center NW Pl., Unit 4a - Site address unit number Prefix. |
| `PropertyAddressUnitValue` | string | True | VARCHAR | True | MATCH | 100 Center NW Pl., Unit 4a - Site address unit number. |
| `PropertyAddressZIP` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address Zip Code. |
| `PropertyAddressZIP4` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 CR0523 - Site address Zip Plus 4 code. |
| `PropertyJurisdictionName` | string | True | VARCHAR | True | MATCH | Name of the tax jurisdiction. This is typically the county with some exceptions. Exceptions are primarily in the New England area where the townships are the taxing authorities. |
| `PropertyLatitude` | float | True | DOUBLE | True | MATCH | Latitude based on Situs Address. |
| `PropertyLongitude` | float | True | DOUBLE | True | MATCH | Longitude based on Situs Address. |
| `PropertyUseGroup` | string | True | VARCHAR | True | MATCH | General property type description; residential, commercial, other, etc. |
| `PropertyUseMuni` | string | True | VARCHAR | True | MATCH | County-specific use code which is used to map the PropertyUseStandardized field. |
| `PropertyUseStandardized` | string | True | VARCHAR | True | MATCH | Standardized value to describe the property's intended land use. Derived from specific land use information obtained from the Assessor. |
| `PublicationDate` | date | True | DATE | True | MATCH | The date on which the client's data file was extracted and delivered. Not to be associated with a county's publication,fiilng, or posted date.; candidate: date/time |
| `RecordLastUpdated` | date | True | DATE | True | MATCH | The last update date for the record in YYYY-MM-DD format.; candidate: date/time |
| `RecordType` | string | True | VARCHAR | True | MATCH | NOD (Notice of Default); LIS (Lis Pendens); NTS (Notice of Trustee Sale); NFS or NOS (Notice of Foreclosure Sale); REO (Real Estate Owned); candidate: status/type |
| `RecordedAuctionOpeningBid` | float | True | DECIMAL(15,2) | True | TYPE_MISMATCH | Anticipated Opening Bid at the scheduled auction |
| `ServicerAddress` | string | True | VARCHAR | True | MATCH | Address of the entity providing servicing for the loan. |
| `ServicerCity` | string | True | VARCHAR | True | MATCH | City of the entity providing servicing for the loan. |
| `ServicerName` | string | True | VARCHAR | True | MATCH | Name of the entity providing servicing for the loan. |
| `ServicerPhone` | string | True | VARCHAR | True | MATCH | Phone number of the entity providing servicing for the loan. |
| `ServicerState` | string | True | VARCHAR | True | MATCH | State of the entity providing servicing for the loan. |
| `ServicerZip` | string | True | VARCHAR | True | MATCH | Zip code of the entity providing servicing for the loan. |
| `SitusCounty` | string | True | VARCHAR | True | MATCH | County where the property is situated. |
| `SitusStateCode` | string | True | VARCHAR | True | MATCH | State where the property is situated. |
| `SitusStateCountyFIPS` | string | True | VARCHAR | True | MATCH | State and county FIPS code where subject property is geographically located.; candidate: county identity |
| `TransactionID` | integer | False | INTEGER | True | MATCH | The unique transaction identifier for the transaction.; candidate: transaction/document linkage |
| `TrusteeAddress` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Trustee's Full address line. |
| `TrusteeAddressCity` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 - Trustee's address city name. |
| `TrusteeAddressHouseNumber` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Trustee's address house number and fraction. |
| `TrusteeAddressState` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 - Trustee's address state. |
| `TrusteeAddressStreetDirection` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Trustee's address pre directional. |
| `TrusteeAddressStreetName` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Trustee's address street name. |
| `TrusteeAddressStreetPostDirection` | string | True | VARCHAR | True | MATCH | 100 Center NW Pl., 4a - Trustee's address post-directional. |
| `TrusteeAddressStreetSuffix` | string | True | VARCHAR | True | MATCH | 123 1/2 N Main St - Trustee's address street name suffix. |
| `TrusteeAddressUnitValue` | string | True | VARCHAR | True | MATCH | 100 Center NW Pl., 4a - Trustee's address unit number. |
| `TrusteeAddressZIP` | string | True | VARCHAR | True | MATCH | Anytown CA 90001-0001 - Trustee's address Zip Code. |
| `TrusteeName` | string | True | VARCHAR | True | MATCH | Trustee or attorney handling the foreclosure event. |
| `TrusteePhone` | string | True | VARCHAR | True | MATCH | Trustee's phone number. |
| `TrusteeReferenceNumber` | string | True | VARCHAR | True | MATCH | Unique number assigned by the trustee to track status of foreclosure and auction proceedings. |
| `YearBuilt` | integer | True | INTEGER | True | MATCH | Year built of the primary structure. |
| `YearBuiltEffective` | integer | True | INTEGER | True | MATCH | Adjusted year built based on condition and / or major structural changes of the structure. |
| `ZonedCodeLocal` | string | True | VARCHAR | True | MATCH | The jurisdiction-specific zoned use value. Typically codified by the controlling jurisdiction. |

Schema comparison counts: MATCH=93, PARQUET_ONLY=0, JSON_ONLY=0, TYPE_MISMATCH=10.

