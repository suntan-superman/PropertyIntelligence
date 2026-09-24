-- Sprint 6.3: additive, candidate-scoped county observations. No candidate writes.
-- Migrations 001-003 remain authoritative and unchanged. No county-wide roll import.
CREATE TABLE opportunity_assessor_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_source_id uuid NOT NULL REFERENCES discovery_sources(id) ON DELETE RESTRICT,
  pts_source_sha256 text NOT NULL CHECK (pts_source_sha256 ~ '^[0-9a-f]{64}$'),
  assessor_source_edition text NOT NULL,
  assessor_source_date date NOT NULL,
  county_zip_sha256 text NOT NULL CHECK (county_zip_sha256 ~ '^[0-9a-f]{64}$'),
  county_member_sha256 text NOT NULL CHECK (county_member_sha256 ~ '^[0-9a-f]{64}$'),
  importer_version text NOT NULL,
  candidate_population_sha256 text NOT NULL CHECK (candidate_population_sha256 ~ '^[0-9a-f]{64}$'),
  high_population_sha256 text NOT NULL CHECK (high_population_sha256 ~ '^[0-9a-f]{64}$'),
  candidate_count integer NOT NULL CHECK (candidate_count > 0),
  exact_count integer NOT NULL CHECK (exact_count >= 0),
  unmatched_count integer NOT NULL CHECK (unmatched_count >= 0),
  status text NOT NULL CHECK (status IN ('IMPORTING','COMPLETE')),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(summary)='object'),
  imported_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (exact_count + unmatched_count = candidate_count),
  CHECK ((status='COMPLETE') = (completed_at IS NOT NULL)),
  UNIQUE (discovery_source_id, assessor_source_edition, county_zip_sha256)
);

CREATE TABLE opportunity_assessor_enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES opportunity_candidates(id) ON DELETE RESTRICT,
  import_batch_id uuid NOT NULL REFERENCES opportunity_assessor_import_batches(id) ON DELETE RESTRICT,
  source_reference text NOT NULL,
  disclaimer_reference text NOT NULL DEFAULT 'docs/SPRINT6_2_SOURCE_DISCLAIMER.md'
    CHECK (disclaimer_reference='docs/SPRINT6_2_SOURCE_DISCLAIMER.md'),
  assessor_source_edition text NOT NULL,
  assessor_source_date date NOT NULL,
  county_zip_sha256 text NOT NULL CHECK (county_zip_sha256 ~ '^[0-9a-f]{64}$'),
  county_member_sha256 text NOT NULL CHECK (county_member_sha256 ~ '^[0-9a-f]{64}$'),
  source_row_locator integer CHECK (source_row_locator > 0),
  source_row_fingerprint text NOT NULL CHECK (source_row_fingerprint ~ '^[0-9a-f]{64}$'),
  pts_atn_raw text NOT NULL,
  pts_atn_normalized text NOT NULL CHECK (pts_atn_normalized ~ '^[0-9]{11}$'),
  assessor_atn_raw text,
  assessor_atn_normalized text CHECK (assessor_atn_normalized ~ '^[0-9]{11}$'),
  crosswalk_status text NOT NULL CHECK (crosswalk_status IN ('MATCHED_EXACT','UNMATCHED','MATCHED_MULTIPLE','SOURCE_INVALID')),
  crosswalk_reason text NOT NULL,
  apn9 text CHECK (apn9 ~ '^[0-9]{9}$'),
  situs_raw text,
  situs_status text NOT NULL CHECK (situs_status IN ('SITUS_PRESENT','SITUS_MISSING','SITUS_MALFORMED','NOT_APPLICABLE')),
  use_code text CHECK (use_code ~ '^[0-9]{4}$'),
  use_description text,
  research_use_category text CHECK (research_use_category IN (
    'RESIDENTIAL_SINGLE_FAMILY','RESIDENTIAL_MULTI_FAMILY','MANUFACTURED_MOBILE',
    'VACANT_RESIDENTIAL','VACANT_OTHER','COMMERCIAL','INDUSTRIAL','AGRICULTURAL',
    'GOVERNMENT_EXEMPT','MINERAL','OTHER','UNKNOWN')),
  mapping_version text,
  mapping_reason text,
  land_assessment numeric(19,5),
  improvement_assessment numeric(19,5),
  net_assessment numeric(19,5),
  base_year_value numeric(19,5),
  base_year_status text NOT NULL CHECK (base_year_status IN ('VALUE_PRESENT','VALUE_MISSING','EXPLICIT_ZERO','NOT_APPLICABLE')),
  county_acres numeric(19,5),
  county_acres_status text NOT NULL CHECK (county_acres_status IN ('VALUE_PRESENT','VALUE_MISSING','EXPLICIT_ZERO','NOT_APPLICABLE')),
  geometry_status text NOT NULL CHECK (geometry_status IN ('GEOMETRY_EXACT','GEOMETRY_MISSING','GEOMETRY_MULTIPLE','NOT_APPLICABLE')),
  geometry_source_apn9 text CHECK (geometry_source_apn9 ~ '^[0-9]{9}$'),
  shape_sqft numeric(19,5),
  shape_acres numeric(24,11),
  acreage_delta numeric(24,11),
  review_flags jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(review_flags)='array'),
  imported_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  UNIQUE (candidate_id, import_batch_id),
  CHECK (superseded_at IS NULL OR superseded_at >= imported_at),
  CHECK (pts_atn_raw ~ '^[0-9]{3}-[0-9]{3}-[0-9]{2}-[0-9]{2}-[0-9]$'
    AND replace(pts_atn_raw,'-','')=pts_atn_normalized),
  CHECK (crosswalk_status <> 'MATCHED_EXACT' OR
    (assessor_atn_normalized IS NOT NULL AND assessor_atn_normalized=pts_atn_normalized
      AND assessor_atn_raw IS NOT NULL AND assessor_atn_raw=assessor_atn_normalized AND apn9 IS NOT NULL
      AND source_row_locator IS NOT NULL AND situs_status <> 'NOT_APPLICABLE'
      AND research_use_category IS NOT NULL AND mapping_version IS NOT NULL AND mapping_version='kern-use-map-v1'
      AND mapping_reason IS NOT NULL)),
  CHECK (crosswalk_status='MATCHED_EXACT' OR
    (assessor_atn_raw IS NULL AND assessor_atn_normalized IS NULL AND apn9 IS NULL
      AND source_row_locator IS NULL AND situs_raw IS NULL AND situs_status='NOT_APPLICABLE'
      AND use_code IS NULL AND use_description IS NULL AND research_use_category IS NULL
      AND mapping_version IS NULL AND mapping_reason IS NULL
      AND land_assessment IS NULL AND improvement_assessment IS NULL AND net_assessment IS NULL
      AND base_year_value IS NULL AND base_year_status='NOT_APPLICABLE'
      AND county_acres IS NULL AND county_acres_status='NOT_APPLICABLE'
      AND geometry_status='NOT_APPLICABLE' AND geometry_source_apn9 IS NULL
      AND shape_sqft IS NULL AND shape_acres IS NULL AND acreage_delta IS NULL)),
  CHECK ((situs_status IN ('SITUS_PRESENT','SITUS_MALFORMED') AND situs_raw IS NOT NULL AND length(btrim(situs_raw))>0)
    OR (situs_status IN ('SITUS_MISSING','NOT_APPLICABLE') AND situs_raw IS NULL)),
  CHECK ((base_year_status IN ('VALUE_MISSING','NOT_APPLICABLE') AND base_year_value IS NULL)
    OR (base_year_status='EXPLICIT_ZERO' AND base_year_value IS NOT NULL AND base_year_value=0)
    OR (base_year_status='VALUE_PRESENT' AND base_year_value IS NOT NULL AND base_year_value<>0)),
  CHECK ((county_acres_status IN ('VALUE_MISSING','NOT_APPLICABLE') AND county_acres IS NULL)
    OR (county_acres_status='EXPLICIT_ZERO' AND county_acres IS NOT NULL AND county_acres=0)
    OR (county_acres_status='VALUE_PRESENT' AND county_acres IS NOT NULL AND county_acres<>0)),
  CHECK (geometry_status<>'GEOMETRY_EXACT' OR
    (apn9 IS NOT NULL AND geometry_source_apn9 IS NOT NULL AND geometry_source_apn9=apn9)),
  CHECK (review_flags <@ '["ASSESSOR_UNMATCHED","SITUS_MISSING","SITUS_MALFORMED","USE_CATEGORY_REVIEW","ACREAGE_DELTA_GT_0_01","BASE_YEAR_VALUE_MISSING","ROLL_ACRES_EXPLICIT_ZERO"]'::jsonb)
);

CREATE UNIQUE INDEX opportunity_assessor_current_candidate_idx
  ON opportunity_assessor_enrichments(candidate_id) WHERE superseded_at IS NULL;
CREATE INDEX opportunity_assessor_current_filters_idx
  ON opportunity_assessor_enrichments(crosswalk_status,research_use_category,situs_status,candidate_id)
  WHERE superseded_at IS NULL;
CREATE INDEX opportunity_assessor_current_geometry_idx
  ON opportunity_assessor_enrichments(geometry_status,candidate_id) WHERE superseded_at IS NULL;
CREATE INDEX opportunity_assessor_current_review_idx
  ON opportunity_assessor_enrichments(candidate_id) WHERE superseded_at IS NULL AND review_flags <> '[]'::jsonb;
CREATE INDEX opportunity_assessor_history_idx
  ON opportunity_assessor_enrichments(candidate_id,imported_at DESC);
-- Deliberately nonunique: many assessment entities can reference one parcel APN9.
CREATE INDEX opportunity_assessor_apn9_idx ON opportunity_assessor_enrichments(apn9);

CREATE FUNCTION guard_opportunity_assessor_observation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE candidate_atn text; batch opportunity_assessor_import_batches%ROWTYPE;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ASSESSOR_HISTORY_IMMUTABLE'; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.superseded_at IS NOT NULL OR NEW.superseded_at IS NULL
      OR (to_jsonb(NEW)-'superseded_at') IS DISTINCT FROM (to_jsonb(OLD)-'superseded_at')
    THEN RAISE EXCEPTION 'ASSESSOR_HISTORY_IMMUTABLE'; END IF;
    RETURN NEW;
  END IF;
  SELECT atn INTO candidate_atn FROM opportunity_candidates WHERE id=NEW.candidate_id;
  IF candidate_atn IS DISTINCT FROM NEW.pts_atn_normalized THEN RAISE EXCEPTION 'ASSESSOR_CANDIDATE_IDENTITY_MISMATCH'; END IF;
  SELECT * INTO batch FROM opportunity_assessor_import_batches WHERE id=NEW.import_batch_id;
  IF batch.id IS NULL OR batch.status<>'IMPORTING'
    OR batch.assessor_source_edition IS DISTINCT FROM NEW.assessor_source_edition
    OR batch.assessor_source_date IS DISTINCT FROM NEW.assessor_source_date
    OR batch.county_zip_sha256 IS DISTINCT FROM NEW.county_zip_sha256
    OR batch.county_member_sha256 IS DISTINCT FROM NEW.county_member_sha256
  THEN RAISE EXCEPTION 'ASSESSOR_BATCH_PROVENANCE_MISMATCH'; END IF;
  IF NOT EXISTS (SELECT 1 FROM opportunity_record_links l JOIN discovery_records r ON r.id=l.discovery_record_id
    WHERE l.candidate_id=NEW.candidate_id AND r.discovery_source_id=batch.discovery_source_id AND r.atn=NEW.pts_atn_normalized)
  THEN RAISE EXCEPTION 'ASSESSOR_SOURCE_CANDIDATE_MISMATCH'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER opportunity_assessor_observation_guard BEFORE INSERT OR UPDATE OR DELETE
  ON opportunity_assessor_enrichments FOR EACH ROW EXECUTE FUNCTION guard_opportunity_assessor_observation();

CREATE FUNCTION guard_opportunity_assessor_batch() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_hash text;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ASSESSOR_BATCH_IMMUTABLE'; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.status<>'IMPORTING' OR NEW.status<>'COMPLETE'
      OR (to_jsonb(NEW)-'status'-'summary'-'completed_at') IS DISTINCT FROM
         (to_jsonb(OLD)-'status'-'summary'-'completed_at')
    THEN RAISE EXCEPTION 'ASSESSOR_BATCH_IMMUTABLE'; END IF;
    IF (SELECT count(*) FROM opportunity_assessor_enrichments WHERE import_batch_id=NEW.id)<>NEW.candidate_count
      OR (SELECT count(*) FROM opportunity_assessor_enrichments WHERE import_batch_id=NEW.id AND crosswalk_status='MATCHED_EXACT')<>NEW.exact_count
      OR (SELECT count(*) FROM opportunity_assessor_enrichments WHERE import_batch_id=NEW.id AND crosswalk_status='UNMATCHED')<>NEW.unmatched_count
    THEN RAISE EXCEPTION 'ASSESSOR_BATCH_COUNTS_MISMATCH'; END IF;
  ELSE
    IF NEW.status<>'IMPORTING' THEN RAISE EXCEPTION 'ASSESSOR_BATCH_STATE_INVALID'; END IF;
    SELECT source_file_hash INTO source_hash FROM discovery_sources WHERE id=NEW.discovery_source_id;
    IF source_hash IS DISTINCT FROM NEW.pts_source_sha256 THEN RAISE EXCEPTION 'ASSESSOR_PTS_HASH_MISMATCH'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER opportunity_assessor_batch_guard BEFORE INSERT OR UPDATE OR DELETE
  ON opportunity_assessor_import_batches FOR EACH ROW EXECUTE FUNCTION guard_opportunity_assessor_batch();

-- Internal server SQL only; no public Supabase Data API access to county extracts.
ALTER TABLE opportunity_assessor_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_assessor_enrichments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON opportunity_assessor_import_batches, opportunity_assessor_enrichments FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
      EXECUTE format('REVOKE ALL ON opportunity_assessor_import_batches, opportunity_assessor_enrichments FROM %I',api_role);
    END IF;
  END LOOP;
END $$;
