-- Property Intelligence Sprint 4 initial schema.
-- This migration is the repository-owned source of truth.  Snapshot tables are
-- append-only from the application; there are intentionally no update paths for
-- evidence or analysis rows.
-- Netlify Postgres exposes gen_random_uuid() without requiring an extension.
-- Keeping extension installation out of the migration also makes preview
-- branches with restricted extension privileges rebuildable.

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_address text NOT NULL UNIQUE,
  address_line1 text NOT NULL,
  city text NOT NULL,
  state text NOT NULL CHECK (char_length(state) = 2),
  postal_code text NOT NULL,
  county text,
  latitude numeric,
  longitude numeric,
  property_type text,
  apn text,
  atn text,
  provider_property_id text,
  identity_status text NOT NULL DEFAULT 'UNCONFIRMED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS property_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  alias_type text NOT NULL,
  address_text text NOT NULL,
  normalized_address text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  source text NOT NULL,
  source_record_id text,
  retrieved_at timestamptz NOT NULL,
  snapshot_type text NOT NULL,
  status text NOT NULL,
  property_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  valuation_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  tax_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  assessment_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sale_history_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  features_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  legal_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  provenance_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  evidence_snapshot_id uuid NOT NULL REFERENCES evidence_snapshots(id) ON DELETE RESTRICT,
  source text NOT NULL,
  valuation_type text NOT NULL,
  estimated_value numeric,
  low_value numeric,
  high_value numeric,
  effective_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comparable_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  evidence_snapshot_id uuid NOT NULL REFERENCES evidence_snapshots(id) ON DELETE RESTRICT,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comparables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comparable_snapshot_id uuid NOT NULL REFERENCES comparable_snapshots(id) ON DELETE RESTRICT,
  provider_comp_id text,
  address text NOT NULL,
  latitude numeric,
  longitude numeric,
  property_type text,
  status text,
  price numeric,
  price_label text,
  bedrooms numeric,
  bathrooms numeric,
  square_feet numeric,
  lot_size numeric,
  year_built integer,
  distance_miles numeric,
  days_on_market integer,
  correlation numeric,
  land_tenure_status text,
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  name text NOT NULL,
  deal_status text NOT NULL DEFAULT 'DRAFT' CHECK (deal_status IN ('DRAFT','UNDER_REVIEW','ON_HOLD','CLOSED','ARCHIVED')),
  origin text NOT NULL DEFAULT 'ANALYST_ENTERED',
  sponsor_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS deal_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE RESTRICT,
  field_key text NOT NULL,
  value_numeric numeric,
  value_text text,
  value_json jsonb,
  unit text,
  origin text NOT NULL,
  status text NOT NULL,
  cash_timing text,
  source_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz
);

CREATE TABLE IF NOT EXISTS analysis_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE RESTRICT,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  evidence_snapshot_id uuid REFERENCES evidence_snapshots(id) ON DELETE RESTRICT,
  analysis_version text NOT NULL,
  model_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  cost_completeness text NOT NULL,
  modeled_proceeds numeric,
  cash_invested numeric,
  modeled_profit numeric,
  cash_on_cash numeric,
  break_even_sale_price numeric,
  inputs_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings_payload jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS diligence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE RESTRICT,
  analysis_snapshot_id uuid REFERENCES analysis_snapshots(id) ON DELETE RESTRICT,
  category text NOT NULL,
  question_key text NOT NULL,
  question_text text NOT NULL,
  materiality text,
  status text NOT NULL DEFAULT 'UNANSWERED' CHECK (status IN ('UNANSWERED','ANSWERED','RESOLVED','NOT_APPLICABLE')),
  related_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  answer_text text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discovery_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  source text NOT NULL,
  signal_type text NOT NULL,
  source_date timestamptz,
  external_identifier text,
  amount_numeric numeric,
  signal_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  provenance_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE RESTRICT,
  deal_id uuid REFERENCES deals(id) ON DELETE RESTRICT,
  document_type text NOT NULL,
  filename text NOT NULL,
  storage_reference text,
  source text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE RESTRICT,
  deal_id uuid REFERENCES deals(id) ON DELETE RESTRICT,
  analysis_snapshot_id uuid REFERENCES analysis_snapshots(id) ON DELETE RESTRICT,
  report_type text NOT NULL,
  storage_reference text,
  generated_at timestamptz,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Server-side retry protection and append-only historical audit trail.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_key text NOT NULL UNIQUE,
  operation text NOT NULL,
  response_status integer NOT NULL,
  response_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type text NOT NULL,
  aggregate_id uuid,
  event_type text NOT NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS properties_state_county_idx ON properties (state, county);
CREATE INDEX IF NOT EXISTS properties_apn_jurisdiction_idx ON properties (state, county, apn);
CREATE INDEX IF NOT EXISTS property_aliases_normalized_idx ON property_aliases (normalized_address);
CREATE INDEX IF NOT EXISTS evidence_property_retrieved_idx ON evidence_snapshots (property_id, retrieved_at DESC);
CREATE INDEX IF NOT EXISTS valuation_property_effective_idx ON valuations (property_id, effective_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS comp_snapshot_property_created_idx ON comparable_snapshots (property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deals_property_status_idx ON deals (property_id, deal_status);
CREATE INDEX IF NOT EXISTS analysis_deal_created_idx ON analysis_snapshots (deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS discovery_source_type_date_idx ON discovery_signals (source, signal_type, source_date DESC);
CREATE INDEX IF NOT EXISTS diligence_deal_status_idx ON diligence_items (deal_id, status);
CREATE INDEX IF NOT EXISTS audit_aggregate_created_idx ON audit_events (aggregate_type, aggregate_id, created_at DESC);
