-- Sprint 6.3.3: explicit Opportunity -> Property lineage.
-- Additive only. Screening, county evidence, and Property snapshots remain unchanged.
CREATE TABLE opportunity_property_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES opportunity_candidates(id) ON DELETE RESTRICT,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  address_resolution_id uuid REFERENCES candidate_address_resolutions(id) ON DELETE RESTRICT,
  assessor_enrichment_id uuid REFERENCES opportunity_assessor_enrichments(id) ON DELETE RESTRICT,
  origin text NOT NULL CHECK (origin IN ('OPPORTUNITY_ANALYSIS_WORKFLOW')),
  link_method text NOT NULL CHECK (link_method IN ('EXPLICIT_WORKFLOW_CONTEXT')),
  link_status text NOT NULL CHECK (link_status IN ('ACTIVE','SUPERSEDED','CONFLICT')),
  created_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  created_by_context text,
  idempotency_key text,
  CHECK ((link_status='SUPERSEDED' AND superseded_at IS NOT NULL) OR (link_status<>'SUPERSEDED' AND superseded_at IS NULL))
);

CREATE UNIQUE INDEX opportunity_property_links_active_candidate_idx
  ON opportunity_property_links(candidate_id)
  WHERE link_status='ACTIVE' AND superseded_at IS NULL;
CREATE UNIQUE INDEX opportunity_property_links_active_property_idx
  ON opportunity_property_links(property_id)
  WHERE link_status='ACTIVE' AND superseded_at IS NULL;
CREATE UNIQUE INDEX opportunity_property_links_idempotency_idx
  ON opportunity_property_links(candidate_id,idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX opportunity_property_links_history_idx
  ON opportunity_property_links(candidate_id,created_at DESC);

CREATE FUNCTION guard_opportunity_property_link() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE address_candidate uuid; assessor_candidate uuid; existing_property uuid;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'OPPORTUNITY_PROPERTY_LINK_IMMUTABLE'; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.superseded_at IS NOT NULL OR NEW.superseded_at IS NULL
      OR NEW.link_status <> 'SUPERSEDED'
      OR (to_jsonb(NEW)-'superseded_at'-'link_status') IS DISTINCT FROM
         (to_jsonb(OLD)-'superseded_at'-'link_status')
    THEN RAISE EXCEPTION 'OPPORTUNITY_PROPERTY_LINK_IMMUTABLE'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.link_status <> 'ACTIVE' OR NEW.superseded_at IS NOT NULL
    THEN RAISE EXCEPTION 'OPPORTUNITY_PROPERTY_LINK_ACTIVE_REQUIRED'; END IF;
  SELECT resolved_property_id INTO existing_property
    FROM opportunity_candidates WHERE id=NEW.candidate_id;
  IF existing_property IS NOT NULL AND existing_property IS DISTINCT FROM NEW.property_id
    THEN RAISE EXCEPTION 'OPPORTUNITY_PROPERTY_CONFLICT'; END IF;
  IF NEW.address_resolution_id IS NOT NULL THEN
    SELECT candidate_id INTO address_candidate
      FROM candidate_address_resolutions
      WHERE id=NEW.address_resolution_id AND superseded_at IS NULL;
    IF address_candidate IS NULL OR address_candidate IS DISTINCT FROM NEW.candidate_id
      THEN RAISE EXCEPTION 'OPPORTUNITY_ADDRESS_LINK_MISMATCH'; END IF;
  END IF;
  IF NEW.assessor_enrichment_id IS NOT NULL THEN
    SELECT candidate_id INTO assessor_candidate
      FROM opportunity_assessor_enrichments
      WHERE id=NEW.assessor_enrichment_id AND superseded_at IS NULL;
    IF assessor_candidate IS NULL OR assessor_candidate IS DISTINCT FROM NEW.candidate_id
      THEN RAISE EXCEPTION 'OPPORTUNITY_ASSESSOR_LINK_MISMATCH'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER opportunity_property_link_guard
  BEFORE INSERT OR UPDATE OR DELETE ON opportunity_property_links
  FOR EACH ROW EXECUTE FUNCTION guard_opportunity_property_link();

ALTER TABLE opportunity_property_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON opportunity_property_links FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
      EXECUTE format('REVOKE ALL ON opportunity_property_links FROM %I',api_role);
    END IF;
  END LOOP;
END $$;
