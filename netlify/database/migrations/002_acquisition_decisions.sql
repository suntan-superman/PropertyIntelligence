-- Property Intelligence Sprint 5 acquisition-decision snapshots.
-- Append-only decision/history records.  Migration 001 remains unchanged.
CREATE TABLE IF NOT EXISTS acquisition_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  deal_id uuid REFERENCES deals(id) ON DELETE RESTRICT,
  evidence_snapshot_id uuid NOT NULL REFERENCES evidence_snapshots(id) ON DELETE RESTRICT,
  analysis_snapshot_id uuid REFERENCES analysis_snapshots(id) ON DELETE RESTRICT,
  strategy text NOT NULL CHECK (strategy = 'FIX_AND_FLIP'),
  decision_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  hurdle_type text NOT NULL CHECK (hurdle_type IN ('CASH_ON_CASH','RETURN_ON_TOTAL_PROJECT_COST','PROFIT_MARGIN_ON_SALE')),
  hurdle_rate numeric NOT NULL CHECK (hurdle_rate > 0 AND hurdle_rate < 1),
  selected_exit_basis text NOT NULL,
  selected_exit_value numeric NOT NULL CHECK (selected_exit_value >= 0),
  calculated_mao numeric,
  manual_walkaway_cap numeric,
  effective_walkaway_price numeric,
  target_offer numeric,
  target_policy_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  seller_asking_price numeric,
  auction_minimum numeric,
  known_encumbrance_total numeric,
  unknown_encumbrance_count integer NOT NULL DEFAULT 0 CHECK (unknown_encumbrance_count >= 0),
  encumbrance_gap numeric,
  cost_completeness text NOT NULL CHECK (cost_completeness IN ('COMPLETE','INCOMPLETE','UNAVAILABLE')),
  inputs_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings_payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_fingerprint text NOT NULL
);

CREATE TABLE IF NOT EXISTS property_encumbrances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  evidence_snapshot_id uuid REFERENCES evidence_snapshots(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('FIRST_MORTGAGE','SECOND_MORTGAGE','HELOC','DELINQUENT_PROPERTY_TAX','TAX_LIEN','JUDGMENT_LIEN','HOA_LIEN','MECHANICS_LIEN','OTHER')),
  amount numeric,
  amount_status text NOT NULL CHECK (amount_status IN ('VERIFIED','DOCUMENTED','REPORTED','ESTIMATED','UNKNOWN')),
  source text NOT NULL,
  as_of_date date,
  payoff_verified boolean NOT NULL DEFAULT false,
  priority_known boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz
);

CREATE TABLE IF NOT EXISTS property_condition_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  deal_id uuid REFERENCES deals(id) ON DELETE RESTRICT,
  assessment_date date NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_condition_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES property_condition_assessments(id) ON DELETE RESTRICT,
  category text NOT NULL,
  condition_status text NOT NULL CHECK (condition_status IN ('NOT_ASSESSED','GOOD','MINOR','MODERATE','MAJOR','REPLACE','UNKNOWN')),
  estimated_cost numeric,
  source text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS acquisition_decisions_property_created_idx ON acquisition_decisions (property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS acquisition_decisions_deal_created_idx ON acquisition_decisions (deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS property_encumbrances_property_created_idx ON property_encumbrances (property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS condition_assessments_property_created_idx ON property_condition_assessments (property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS condition_items_assessment_created_idx ON property_condition_items (assessment_id, created_at DESC);
