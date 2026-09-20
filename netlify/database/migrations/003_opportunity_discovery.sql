-- Sprint 6 opportunity discovery. Additive only; migrations 001 and 002 are unchanged.
CREATE TABLE IF NOT EXISTS discovery_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  jurisdiction text NOT NULL,
  source_name text NOT NULL,
  edition text NOT NULL,
  source_date date,
  source_file_hash text NOT NULL UNIQUE,
  record_count integer NOT NULL CHECK (record_count >= 0),
  imported_at timestamptz NOT NULL DEFAULT now(),
  provenance_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_type, jurisdiction, source_name, edition, source_file_hash)
);

CREATE TABLE IF NOT EXISTS discovery_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_source_id uuid NOT NULL REFERENCES discovery_sources(id) ON DELETE RESTRICT,
  source_row_number integer NOT NULL CHECK (source_row_number > 1),
  source_page integer,
  external_identifier text NOT NULL,
  atn text,
  apn text,
  owner_name text,
  amount_owed numeric,
  raw_payload jsonb NOT NULL,
  normalized_payload jsonb NOT NULL,
  record_fingerprint text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (discovery_source_id, source_row_number),
  UNIQUE (discovery_source_id, record_fingerprint)
);

CREATE TABLE IF NOT EXISTS opportunity_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction text NOT NULL,
  candidate_key text NOT NULL UNIQUE,
  atn text,
  apn text,
  normalized_owner_name text,
  resolved_property_id uuid REFERENCES properties(id) ON DELETE RESTRICT,
  identity_status text NOT NULL CHECK (identity_status IN ('UNRESOLVED','PARTIAL','RESOLVED','AMBIGUOUS','SOURCE_STOP')),
  candidate_status text NOT NULL CHECK (candidate_status IN ('NEW','REVIEWING','NEEDS_ADDRESS','READY_FOR_ENRICHMENT','ENRICHED','DEAL_CREATED','DEFERRED','REJECTED','ARCHIVED')),
  priority_band text NOT NULL CHECK (priority_band IN ('HIGH_REVIEW_PRIORITY','MEDIUM_REVIEW_PRIORITY','LOW_REVIEW_PRIORITY','INSUFFICIENT_DATA')),
  screening_score integer CHECK (screening_score IS NULL OR (screening_score >= 0 AND screening_score <= 100)),
  score_version text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunity_record_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES opportunity_candidates(id) ON DELETE RESTRICT,
  discovery_record_id uuid NOT NULL REFERENCES discovery_records(id) ON DELETE RESTRICT,
  link_type text NOT NULL,
  confidence_basis text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, discovery_record_id, link_type)
);

CREATE TABLE IF NOT EXISTS opportunity_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES opportunity_candidates(id) ON DELETE RESTRICT,
  signal_type text NOT NULL,
  numeric_value numeric,
  text_value text,
  status text NOT NULL,
  source_record_id uuid REFERENCES discovery_records(id) ON DELETE RESTRICT,
  evidence_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  UNIQUE (candidate_id, signal_type, source_record_id)
);

CREATE TABLE IF NOT EXISTS opportunity_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES opportunity_candidates(id) ON DELETE RESTRICT,
  action text NOT NULL,
  reason_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discovery_records_source_row_idx ON discovery_records (discovery_source_id, source_row_number);
CREATE INDEX IF NOT EXISTS discovery_records_identifier_idx ON discovery_records (external_identifier);
CREATE INDEX IF NOT EXISTS opportunity_candidates_queue_idx ON opportunity_candidates (candidate_status, priority_band, screening_score DESC NULLS LAST, updated_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_candidates_identity_idx ON opportunity_candidates (identity_status, candidate_status);
CREATE INDEX IF NOT EXISTS opportunity_candidates_atn_idx ON opportunity_candidates (atn);
CREATE INDEX IF NOT EXISTS opportunity_links_candidate_idx ON opportunity_record_links (candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_signals_candidate_idx ON opportunity_signals (candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_reviews_candidate_idx ON opportunity_reviews (candidate_id, created_at DESC);
