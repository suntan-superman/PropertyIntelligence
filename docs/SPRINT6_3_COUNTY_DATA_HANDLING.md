# Sprint 6.3 county-data handling

Status: source reconciliation, local UI/API, isolated PG and authorized production migration 004/schema certification complete. Both new tables remain empty. STOP at Gate 12 QA namespace failure; no county import or deployment authorized.

Kern County Assessor data remains internal acquisition/research evidence. Retain [the county disclaimer](SPRINT6_2_SOURCE_DISCLAIMER.md) with every county-derived copy/extract. Original ZIP and certified 6.2 artifacts are immutable; extracted working data must remain ignored and must not enter browser bundles, deployed fixtures or public downloads.

The intended import contains one current observation for each existing PTS candidate, not the 426,054-row county roll. No owner/assessee/billing/care-of/DBA/contact information, raw Access/FileGDB payloads, polygons or outreach lists may be imported or exposed. API responses must use an explicit safe projection; existing discovery-record raw payloads must not leak through enhanced candidate detail.

Official use descriptions and PI research interpretations must remain separately labeled. Assessment evidence is not market value. County situs must carry: “County-reported situs; not independently verified as a postal or deliverable address.” No geocoding, postal completion or identity merge follows automatically.

CSV decision: **defer all new Assessor-derived export fields this sprint**. Leave only the approved pre-Assessor export contract; enhanced list/detail does not imply redistribution permission. Do not append county situs, APN9, assessments, category, geometry or other enrichment columns to CSV.

The two new tables were certified as server-only/RLS-protected in both isolated and production namespaces. Explicit safe list/detail/review projections and local browser privacy checks pass; no new Assessor fields enter CSV. Local visual extracts retain the county disclaimer beside screenshots. Deployed response privacy remains a later gate. Existing public accessibility concerns on older tables are not claimed fixed by this additive migration.
