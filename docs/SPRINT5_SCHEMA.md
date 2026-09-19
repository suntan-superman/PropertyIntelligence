# Sprint 5 schema

Migration `002_acquisition_decisions.sql` is additive and does not modify migration 001. It creates append-only `acquisition_decisions`, historical `property_encumbrances`, `property_condition_assessments` and `property_condition_items` tables with restrictive foreign keys and indexes.

An acquisition decision stores the property/evidence/deal references, strategy/version, hurdle definition, selected exit, MAO/walk-away/target values, seller constraints, encumbrance summary, completeness, exact input/output/warning payloads and model fingerprint. Child encumbrance and condition rows are historical observations; parent archive operations do not delete them.
