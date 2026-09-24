-- Sprint 6.3.1: analyst-confirmed canonical address history.
-- Additive only. County evidence and opportunity identities remain unchanged.
CREATE TABLE candidate_address_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES opportunity_candidates(id) ON DELETE RESTRICT,
  county_enrichment_id uuid REFERENCES opportunity_assessor_enrichments(id) ON DELETE RESTRICT,
  county_situs_raw text,
  street text NOT NULL CHECK (length(btrim(street)) > 0),
  city text NOT NULL CHECK (length(btrim(city)) > 0),
  state text NOT NULL CHECK (state ~ '^[A-Z]{2}$'),
  postal_code text NOT NULL CHECK (postal_code ~ '^[0-9]{5}$'),
  postal_code_extension text CHECK (postal_code_extension IS NULL OR postal_code_extension ~ '^[0-9]{4}$'),
  formatted_address text NOT NULL CHECK (length(btrim(formatted_address)) > 0),
  resolution_source text NOT NULL CHECK (resolution_source IN ('ANALYST','ADDRESS_PROVIDER','EXISTING_PROPERTY_RECORD','OTHER_VERIFIED_SOURCE')),
  resolution_method text NOT NULL CHECK (resolution_method IN ('MANUAL_EXTERNAL_LOOKUP','MANUAL_DOCUMENT_REVIEW','PROVIDER_SUGGESTION_CONFIRMED','EXISTING_CANONICAL_MATCH')),
  verification_status text NOT NULL CHECK (verification_status IN ('ANALYST_CONFIRMED','PROVIDER_CONFIRMED','EXISTING_PROPERTY_CONFIRMED','SUPERSEDED')),
  provider_name text,
  provider_place_id text,
  provider_payload_fingerprint text CHECK (provider_payload_fingerprint IS NULL OR provider_payload_fingerprint ~ '^[0-9a-f]{64}$'),
  analyst_confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  created_by_context text,
  notes text,
  version integer NOT NULL CHECK (version > 0),
  idempotency_key text,
  CHECK ((analyst_confirmed AND confirmed_at IS NOT NULL) OR (NOT analyst_confirmed AND confirmed_at IS NULL)),
  CHECK (verification_status <> 'SUPERSEDED' OR superseded_at IS NOT NULL),
  CHECK (verification_status = 'SUPERSEDED' OR superseded_at IS NULL),
  CHECK (verification_status <> 'ANALYST_CONFIRMED' OR analyst_confirmed)
);

CREATE UNIQUE INDEX candidate_address_resolutions_active_candidate_idx
  ON candidate_address_resolutions(candidate_id)
  WHERE superseded_at IS NULL AND verification_status IN ('ANALYST_CONFIRMED','PROVIDER_CONFIRMED','EXISTING_PROPERTY_CONFIRMED');
CREATE UNIQUE INDEX candidate_address_resolutions_idempotency_idx
  ON candidate_address_resolutions(candidate_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX candidate_address_resolutions_history_idx
  ON candidate_address_resolutions(candidate_id,version DESC);

CREATE FUNCTION guard_candidate_address_resolution() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_candidate uuid; county_situs text;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ADDRESS_RESOLUTION_HISTORY_IMMUTABLE'; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.superseded_at IS NOT NULL OR NEW.superseded_at IS NULL
      OR NEW.verification_status <> 'SUPERSEDED'
      OR (to_jsonb(NEW)-'superseded_at'-'verification_status') IS DISTINCT FROM
         (to_jsonb(OLD)-'superseded_at'-'verification_status')
    THEN RAISE EXCEPTION 'ADDRESS_RESOLUTION_HISTORY_IMMUTABLE'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.verification_status='SUPERSEDED' OR NEW.superseded_at IS NOT NULL THEN
    RAISE EXCEPTION 'ADDRESS_RESOLUTION_ACTIVE_REQUIRED';
  END IF;
  IF NEW.analyst_confirmed IS NOT TRUE OR NEW.confirmed_at IS NULL THEN
    RAISE EXCEPTION 'ADDRESS_ANALYST_CONFIRMATION_REQUIRED';
  END IF;
  IF NEW.county_enrichment_id IS NOT NULL THEN
    SELECT candidate_id,situs_raw INTO linked_candidate,county_situs
      FROM opportunity_assessor_enrichments WHERE id=NEW.county_enrichment_id;
    IF linked_candidate IS NULL OR linked_candidate IS DISTINCT FROM NEW.candidate_id
      THEN RAISE EXCEPTION 'ADDRESS_COUNTY_LINK_MISMATCH'; END IF;
    IF NEW.county_situs_raw IS DISTINCT FROM county_situs THEN
      RAISE EXCEPTION 'ADDRESS_COUNTY_SITUS_MISMATCH';
    END IF;
  END IF;
  IF NEW.version <> COALESCE((SELECT max(version)+1 FROM candidate_address_resolutions WHERE candidate_id=NEW.candidate_id),1)
    THEN RAISE EXCEPTION 'ADDRESS_VERSION_INVALID'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER candidate_address_resolution_guard
  BEFORE INSERT OR UPDATE OR DELETE ON candidate_address_resolutions
  FOR EACH ROW EXECUTE FUNCTION guard_candidate_address_resolution();

ALTER TABLE candidate_address_resolutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON candidate_address_resolutions FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
      EXECUTE format('REVOKE ALL ON candidate_address_resolutions FROM %I',api_role);
    END IF;
  END LOOP;
END $$;
